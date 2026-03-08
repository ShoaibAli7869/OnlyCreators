const User = require("../models/User");
const crypto = require("crypto");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      channelName: "",
      subscriberCount: 0,
      profilePicture:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      connectedAccounts: {
        youtube: { connected: false },
        instagram: { connected: false },
        tiktok: { connected: false },
      },
    });

    // Generate token
    const token = user.getSignedJwtToken();

    // Send response with token
    sendTokenResponse(user, token, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password.",
      });
    }

    // Check for user (include password since select: false is set in model)
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    // Send response with token
    sendTokenResponse(user, token, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify JWT token validity
 * @route   GET /api/auth/verify
 * @access  Private
 */
const verifyToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid. User not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: user.toProfileJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile / settings
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    // Fields that are allowed to be updated
    const allowedFields = [
      "name",
      "email",
      "channelName",
      "bio",
      "profilePicture",
      "preferences",
      "connectedAccounts",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // If email is being changed, check for duplicates
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase();
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another account.",
        });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: user.toProfileJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password and new password.",
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = user.getSignedJwtToken();

    sendTokenResponse(user, token, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password - send reset token
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // For security, don't reveal that user doesn't exist
      return res.status(200).json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // In a real app, you would send an email here with the reset link
    // For demo, we just return success
    // The reset URL would be: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`

    res.status(200).json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
      // Include token in response for demo purposes (remove in production!)
      resetToken:
        process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using token
 * @route   PUT /api/auth/reset-password/:resetToken
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { resetToken } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password.",
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Find user with valid reset token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new token and send response
    const token = user.getSignedJwtToken();
    sendTokenResponse(user, token, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/delete-account
 * @access  Private
 */
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await User.findByIdAndDelete(req.user.id);

    // Clear cookie
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
    });

    res.status(200).json({
      success: true,
      message: "Account deleted successfully.",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to create token response
 *
 * When frontend and backend are on different origins (e.g. two separate
 * Vercel deployments or Vercel frontend + Railway/Render backend), cookies
 * need `sameSite: "none"` + `secure: true` so the browser actually sends
 * them on cross-origin requests. Using `"strict"` or `"lax"` would silently
 * drop the cookie on cross-origin fetches, causing perpetual 401s.
 */
const sendTokenResponse = (user, token, statusCode, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  // Cookie options
  const options = {
    expires: new Date(
      Date.now() +
        (parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 7) *
          24 *
          60 *
          60 *
          1000,
    ),
    httpOnly: true,
    // In production cross-origin setups, cookies MUST be Secure + SameSite=None
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    // If a custom cookie domain is configured, use it (e.g. ".yourdomain.com")
    ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }),
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user: user.toProfileJSON(),
  });
};

module.exports = {
  signup,
  login,
  logout,
  getMe,
  verifyToken,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
