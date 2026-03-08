const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    channelName: {
      type: String,
      default: "",
      trim: true,
    },
    subscriberCount: {
      type: Number,
      default: 0,
    },
    profilePicture: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    connectedAccounts: {
      youtube: {
        connected: { type: Boolean, default: false },
        channelId: { type: String, default: "" },
        channelName: { type: String, default: "" },
        channelThumbnail: { type: String, default: "" },
      },
      instagram: {
        connected: { type: Boolean, default: false },
      },
      tiktok: {
        connected: { type: Boolean, default: false },
      },
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "light",
      },
      language: {
        type: String,
        default: "en",
      },
      timezone: {
        type: String,
        default: "America/New_York",
      },
      notifications: {
        email: {
          performanceMilestones: { type: Boolean, default: true },
          trendingOpportunities: { type: Boolean, default: true },
          weeklySummary: { type: Boolean, default: true },
        },
        inApp: {
          realTimeAlerts: { type: Boolean, default: true },
          insightUpdates: { type: Boolean, default: true },
        },
      },
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate signed JWT token
UserSchema.methods.getSignedJwtToken = function () {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. " +
        "Set it in your Vercel project settings or .env file.",
    );
  }
  return jwt.sign({ id: this._id, email: this.email }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// Generate password reset token (simple version for demo)
UserSchema.methods.getResetPasswordToken = function () {
  // Generate a simple random token
  const crypto = require("crypto");
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Return user object without sensitive fields
UserSchema.methods.toProfileJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    channelName: this.channelName,
    subscriberCount: this.subscriberCount,
    profilePicture: this.profilePicture,
    bio: this.bio,
    connectedAccounts: this.connectedAccounts,
    preferences: this.preferences,
    joinedDate: this.createdAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("User", UserSchema);
