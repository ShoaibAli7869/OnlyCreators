const mongoose = require("mongoose");

/**
 * Cached connection for serverless environments (Vercel).
 * In serverless, each cold start re-imports modules, but the global scope
 * persists across warm invocations within the same container.
 */
let cachedConnection = null;
let isConnecting = false;

const connectDB = async () => {
  // If we already have a ready connection, reuse it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // If a connection attempt is already in progress, wait for it
  if (isConnecting) {
    // Wait until the existing connection attempt resolves
    await new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
    if (cachedConnection && mongoose.connection.readyState === 1) {
      return cachedConnection;
    }
  }

  isConnecting = true;

  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error(
        "MONGODB_URI environment variable is not set. " +
          "Please configure it in your Vercel project settings or .env file. " +
          "You can get a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas",
      );
    }

    // Mongoose options optimized for serverless
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Buffer commands until connection is established
      bufferCommands: true,
      // Keep the connection pool small for serverless
      maxPoolSize: 10,
      minPoolSize: 0,
      // Close idle connections faster in serverless
      maxIdleTimeMS: 10000,
    };

    const conn = await mongoose.connect(mongoURI, options);

    cachedConnection = conn.connection;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
      cachedConnection = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
      cachedConnection = null;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected successfully");
      cachedConnection = mongoose.connection;
    });

    return cachedConnection;
  } catch (error) {
    cachedConnection = null;
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    throw error;
  } finally {
    isConnecting = false;
  }
};

module.exports = connectDB;
