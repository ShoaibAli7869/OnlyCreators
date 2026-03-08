require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/auth");

// Route imports
const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const trendsRoutes = require("./routes/trendsRoutes");

// Initialize Express app
const app = express();

// Track DB initialization state for serverless
let dbInitialized = false;
let dbInitPromise = null;

/**
 * Auto-seed the database with demo data if collections are empty.
 * This runs on every startup when using in-memory MongoDB so data is always available,
 * and also on the first run with a real MongoDB so you don't have to seed manually.
 */
const autoSeed = async () => {
  try {
    const User = require("./models/User");
    const Analytics = require("./models/Analytics");
    const Video = require("./models/Video");
    const Trend = require("./models/Trend");
    const Insight = require("./models/Insight");

    const userCount = await User.countDocuments();
    const trendCount = await Trend.countDocuments();

    if (userCount > 0 && trendCount > 0) {
      console.log("📦 Database already has data — skipping auto-seed.");
      return;
    }

    console.log("🌱 Auto-seeding database with demo data...");

    // --- Demo User ---
    let user = await User.findOne({ email: "sarah@example.com" });
    if (!user) {
      user = await User.create({
        name: "Sarah Johnson",
        email: "sarah@example.com",
        password: "password123",
        channelName: "TechCreator Daily",
        subscriberCount: 45200,
        profilePicture:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
        bio: "Full-stack developer sharing coding tutorials and tech insights. Making complex topics simple and fun!",
        connectedAccounts: {
          youtube: {
            connected: true,
            channelId: "UC123456789",
            channelName: "TechCreator Daily",
            channelThumbnail:
              "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=88&h=88&fit=crop&crop=face",
          },
          instagram: { connected: false },
          tiktok: { connected: false },
        },
        preferences: {
          theme: "light",
          language: "en",
          timezone: "America/New_York",
          notifications: {
            email: {
              performanceMilestones: true,
              trendingOpportunities: true,
              weeklySummary: true,
            },
            inApp: { realTimeAlerts: true, insightUpdates: true },
          },
        },
      });
      console.log("   ✅ Demo user created (sarah@example.com / password123)");
    }

    const userId = user._id;

    // --- Analytics ---
    if ((await Analytics.countDocuments()) === 0) {
      const analyticsBase = {
        totalViews: 1247500,
        viewsChange: 12.5,
        totalSubscribers: 45200,
        subscribersChange: 5.2,
        engagementRate: 6.8,
        engagementChange: -0.3,
        watchTimeHours: 8547,
        watchTimeChange: 8.1,
        averageViewDuration: "4:32",
        impressions: 2850000,
        impressionsChange: 15.3,
        clickThroughRate: 8.2,
        ctrChange: 1.1,
        viewsOverTime: [
          { date: "2025-01-01", views: 35000 },
          { date: "2025-01-02", views: 42000 },
          { date: "2025-01-03", views: 38000 },
          { date: "2025-01-04", views: 55000 },
          { date: "2025-01-05", views: 48000 },
          { date: "2025-01-06", views: 62000 },
          { date: "2025-01-07", views: 58000 },
          { date: "2025-01-08", views: 71000 },
          { date: "2025-01-09", views: 65000 },
          { date: "2025-01-10", views: 78000 },
          { date: "2025-01-11", views: 85000 },
          { date: "2025-01-12", views: 92000 },
          { date: "2025-01-13", views: 88000 },
          { date: "2025-01-14", views: 95000 },
          { date: "2025-01-15", views: 102000 },
          { date: "2025-01-16", views: 98000 },
          { date: "2025-01-17", views: 115000 },
          { date: "2025-01-18", views: 108000 },
          { date: "2025-01-19", views: 125000 },
          { date: "2025-01-20", views: 118000 },
          { date: "2025-01-21", views: 135000 },
          { date: "2025-01-22", views: 142000 },
          { date: "2025-01-23", views: 138000 },
          { date: "2025-01-24", views: 155000 },
          { date: "2025-01-25", views: 148000 },
          { date: "2025-01-26", views: 165000 },
          { date: "2025-01-27", views: 158000 },
          { date: "2025-01-28", views: 175000 },
          { date: "2025-01-29", views: 168000 },
          { date: "2025-01-30", views: 182000 },
        ],
        engagementBreakdown: { likes: 45, comments: 30, shares: 25 },
        demographicData: {
          ageGroups: [
            { range: "13-17", percentage: 8 },
            { range: "18-24", percentage: 35 },
            { range: "25-34", percentage: 32 },
            { range: "35-44", percentage: 15 },
            { range: "45-54", percentage: 7 },
            { range: "55+", percentage: 3 },
          ],
          gender: [
            { type: "Male", percentage: 62 },
            { type: "Female", percentage: 35 },
            { type: "Other", percentage: 3 },
          ],
          topCountries: [
            { country: "United States", percentage: 45 },
            { country: "United Kingdom", percentage: 15 },
            { country: "Canada", percentage: 12 },
            { country: "Australia", percentage: 8 },
            { country: "India", percentage: 7 },
            { country: "Germany", percentage: 5 },
            { country: "Other", percentage: 8 },
          ],
          devices: [
            { type: "Mobile", percentage: 58 },
            { type: "Desktop", percentage: 32 },
            { type: "Tablet", percentage: 7 },
            { type: "TV", percentage: 3 },
          ],
        },
        peakHours: [
          [2, 3, 5, 4, 3, 2, 1],
          [3, 4, 6, 5, 4, 3, 2],
          [4, 5, 7, 6, 5, 4, 3],
          [5, 6, 8, 7, 6, 5, 4],
          [6, 7, 9, 8, 7, 6, 5],
          [7, 8, 10, 9, 8, 7, 6],
          [8, 9, 11, 10, 9, 8, 7],
          [9, 10, 12, 11, 10, 9, 8],
          [10, 11, 13, 12, 11, 10, 9],
          [11, 12, 14, 13, 12, 11, 10],
          [12, 13, 15, 14, 13, 12, 11],
          [13, 14, 16, 15, 14, 13, 12],
          [14, 15, 17, 16, 15, 14, 13],
          [15, 16, 18, 17, 16, 15, 14],
          [16, 17, 19, 18, 17, 16, 15],
          [17, 18, 20, 19, 18, 17, 16],
          [18, 19, 21, 20, 19, 18, 17],
          [19, 20, 22, 21, 20, 19, 18],
          [20, 21, 23, 22, 21, 20, 19],
          [21, 22, 24, 23, 22, 21, 20],
          [20, 21, 22, 21, 20, 19, 18],
          [18, 19, 20, 19, 18, 17, 16],
          [15, 16, 17, 16, 15, 14, 13],
          [10, 11, 12, 11, 10, 9, 8],
        ],
      };
      await Analytics.create({ userId, dateRange: "30d", ...analyticsBase });
      await Analytics.create({
        userId,
        dateRange: "7d",
        ...analyticsBase,
        totalViews: Math.floor(analyticsBase.totalViews * 0.25),
        viewsChange: 8.3,
        subscribersChange: 2.1,
        engagementRate: 7.2,
        engagementChange: 0.5,
        watchTimeHours: Math.floor(analyticsBase.watchTimeHours * 0.25),
        watchTimeChange: 5.4,
        averageViewDuration: "5:10",
        impressions: Math.floor(analyticsBase.impressions * 0.25),
        impressionsChange: 10.2,
        clickThroughRate: 8.8,
        ctrChange: 0.6,
        viewsOverTime: analyticsBase.viewsOverTime.slice(-7),
      });
      console.log("   ✅ Analytics data seeded");
    }

    // --- Videos ---
    if ((await Video.countDocuments()) === 0) {
      const videosData = [
        {
          videoId: "video_1",
          title:
            "React Hooks Complete Tutorial 2025 - useState, useEffect, and More",
          thumbnail:
            "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300&h=169&fit=crop",
          publishedAt: "2025-01-28",
          views: 125000,
          likes: 8500,
          comments: 342,
          shares: 156,
          engagementRate: 7.1,
          watchTime: 45000,
          avgViewDuration: "8:45",
          status: "published",
        },
        {
          videoId: "video_2",
          title: "Building a Full Stack App with Next.js 15 and Prisma",
          thumbnail:
            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=169&fit=crop",
          publishedAt: "2025-01-25",
          views: 98000,
          likes: 6200,
          comments: 278,
          shares: 134,
          engagementRate: 6.7,
          watchTime: 38000,
          avgViewDuration: "12:30",
          status: "published",
        },
        {
          videoId: "video_3",
          title: "AI Tools Every Developer Should Know in 2025",
          thumbnail:
            "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=300&h=169&fit=crop",
          publishedAt: "2025-01-22",
          views: 215000,
          likes: 15800,
          comments: 892,
          shares: 445,
          engagementRate: 8.2,
          watchTime: 78000,
          avgViewDuration: "10:15",
          status: "published",
        },
        {
          videoId: "video_4",
          title: "TypeScript Best Practices for Large Scale Applications",
          thumbnail:
            "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=300&h=169&fit=crop",
          publishedAt: "2025-01-18",
          views: 76000,
          likes: 4900,
          comments: 198,
          shares: 89,
          engagementRate: 6.8,
          watchTime: 28000,
          avgViewDuration: "15:20",
          status: "published",
        },
        {
          videoId: "video_5",
          title: "CSS Grid vs Flexbox - When to Use What?",
          thumbnail:
            "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=300&h=169&fit=crop",
          publishedAt: "2025-01-15",
          views: 89000,
          likes: 5600,
          comments: 234,
          shares: 112,
          engagementRate: 6.6,
          watchTime: 32000,
          avgViewDuration: "7:45",
          status: "published",
        },
        {
          videoId: "video_6",
          title: "Node.js Authentication with JWT - Complete Guide",
          thumbnail:
            "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=300&h=169&fit=crop",
          publishedAt: "2025-01-12",
          views: 156000,
          likes: 11200,
          comments: 567,
          shares: 289,
          engagementRate: 7.8,
          watchTime: 58000,
          avgViewDuration: "18:30",
          status: "published",
        },
        {
          videoId: "video_7",
          title: "Docker for Beginners - From Zero to Hero",
          thumbnail:
            "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=300&h=169&fit=crop",
          publishedAt: "2025-01-08",
          views: 134000,
          likes: 9800,
          comments: 445,
          shares: 234,
          engagementRate: 7.8,
          watchTime: 52000,
          avgViewDuration: "22:15",
          status: "published",
        },
        {
          videoId: "video_8",
          title: "GraphQL vs REST API - Which Should You Choose?",
          thumbnail:
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=169&fit=crop",
          publishedAt: "2025-01-05",
          views: 67000,
          likes: 4200,
          comments: 178,
          shares: 78,
          engagementRate: 6.6,
          watchTime: 24000,
          avgViewDuration: "11:45",
          status: "published",
        },
        {
          videoId: "video_9",
          title: "Tailwind CSS Tips and Tricks You Need to Know",
          thumbnail:
            "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=300&h=169&fit=crop",
          publishedAt: "2025-01-02",
          views: 112000,
          likes: 7800,
          comments: 312,
          shares: 167,
          engagementRate: 7.4,
          watchTime: 42000,
          avgViewDuration: "9:30",
          status: "published",
        },
        {
          videoId: "video_10",
          title: "Building Real-Time Apps with WebSockets",
          thumbnail:
            "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=169&fit=crop",
          publishedAt: "2024-12-28",
          views: 45000,
          likes: 2800,
          comments: 134,
          shares: 56,
          engagementRate: 6.6,
          watchTime: 16000,
          avgViewDuration: "14:20",
          status: "published",
        },
      ];
      await Video.insertMany(videosData.map((v) => ({ ...v, userId })));
      console.log("   ✅ Videos seeded");
    }

    // --- Trends ---
    if ((await Trend.countDocuments()) === 0) {
      await Trend.insertMany([
        {
          trendId: "trend_1",
          topic: "AI Tools for Content Creators",
          category: "Technology",
          strength: "High",
          hashtags: ["#AI", "#ContentCreation", "#Productivity", "#AITools"],
          growthData: [10, 15, 25, 40, 60, 85, 100],
          opportunityScore: 95,
          searchVolume: "2.5M+",
          relatedVideos: [
            { title: "Best AI Video Editors 2025", views: "450K" },
            { title: "AI Thumbnail Generators Review", views: "320K" },
            { title: "ChatGPT for YouTubers", views: "890K" },
          ],
          description:
            "AI-powered tools are revolutionizing content creation. From automated editing to thumbnail generation, creators are leveraging AI to boost productivity.",
          covered: false,
        },
        {
          trendId: "trend_2",
          topic: "Web Development in 2025",
          category: "Technology",
          strength: "High",
          hashtags: ["#WebDev", "#JavaScript", "#React", "#NextJS"],
          growthData: [20, 28, 35, 48, 62, 78, 92],
          opportunityScore: 88,
          searchVolume: "1.8M+",
          relatedVideos: [
            { title: "Next.js 15 New Features", views: "520K" },
            { title: "React Server Components Explained", views: "380K" },
            { title: "Full Stack Development Roadmap", views: "670K" },
          ],
          description:
            "The web development landscape continues to evolve with new frameworks and tools emerging. React and Next.js remain dominant players.",
          covered: true,
        },
        {
          trendId: "trend_3",
          topic: "Remote Work Productivity",
          category: "Lifestyle",
          strength: "Medium",
          hashtags: [
            "#RemoteWork",
            "#Productivity",
            "#WorkFromHome",
            "#DigitalNomad",
          ],
          growthData: [15, 20, 25, 32, 38, 45, 52],
          opportunityScore: 72,
          searchVolume: "980K+",
          relatedVideos: [
            { title: "My Remote Work Setup 2025", views: "290K" },
            { title: "Best Tools for Remote Teams", views: "180K" },
            { title: "Work-Life Balance Tips", views: "340K" },
          ],
          description:
            "Remote work continues to be a major trend with more companies offering flexible arrangements.",
          covered: false,
        },
        {
          trendId: "trend_4",
          topic: "Cybersecurity Basics",
          category: "Technology",
          strength: "Medium",
          hashtags: ["#Cybersecurity", "#Security", "#Privacy", "#Hacking"],
          growthData: [12, 18, 24, 35, 42, 55, 68],
          opportunityScore: 78,
          searchVolume: "1.2M+",
          relatedVideos: [
            { title: "How to Secure Your Online Accounts", views: "420K" },
            { title: "VPN Comparison 2025", views: "560K" },
            { title: "Password Manager Setup Guide", views: "280K" },
          ],
          description:
            "With increasing cyber threats, there's growing demand for educational content about online security.",
          covered: false,
        },
        {
          trendId: "trend_5",
          topic: "No-Code Development",
          category: "Technology",
          strength: "High",
          hashtags: ["#NoCode", "#LowCode", "#Automation", "#BuildInPublic"],
          growthData: [8, 15, 28, 45, 65, 82, 98],
          opportunityScore: 91,
          searchVolume: "890K+",
          relatedVideos: [
            { title: "Build Apps Without Coding", views: "720K" },
            { title: "Best No-Code Platforms 2025", views: "450K" },
            { title: "Bubble.io Complete Tutorial", views: "380K" },
          ],
          description:
            "No-code platforms are democratizing software development.",
          covered: true,
        },
        {
          trendId: "trend_6",
          topic: "YouTube Shorts Strategy",
          category: "Content Creation",
          strength: "High",
          hashtags: [
            "#YouTubeShorts",
            "#ShortForm",
            "#ViralContent",
            "#ContentStrategy",
          ],
          growthData: [25, 35, 48, 62, 78, 88, 100],
          opportunityScore: 94,
          searchVolume: "1.5M+",
          relatedVideos: [
            { title: "How to Go Viral on Shorts", views: "1.2M" },
            { title: "Shorts Monetization Explained", views: "890K" },
            { title: "Shorts vs Long Form Content", views: "650K" },
          ],
          description:
            "YouTube Shorts continue to grow, offering creators new opportunities for audience reach and monetization.",
          covered: false,
        },
        {
          trendId: "trend_7",
          topic: "Sustainable Tech",
          category: "Technology",
          strength: "Medium",
          hashtags: [
            "#GreenTech",
            "#Sustainability",
            "#EcoFriendly",
            "#CleanEnergy",
          ],
          growthData: [10, 15, 22, 30, 38, 48, 58],
          opportunityScore: 65,
          searchVolume: "650K+",
          relatedVideos: [
            { title: "Eco-Friendly Gadgets 2025", views: "180K" },
            { title: "Solar Tech for Home", views: "290K" },
            { title: "Electric Vehicle Tech Explained", views: "420K" },
          ],
          description:
            "Growing interest in sustainable technology and eco-friendly solutions.",
          covered: false,
        },
        {
          trendId: "trend_8",
          topic: "Machine Learning Basics",
          category: "Technology",
          strength: "High",
          hashtags: ["#MachineLearning", "#ML", "#DataScience", "#Python"],
          growthData: [18, 25, 38, 52, 68, 80, 95],
          opportunityScore: 86,
          searchVolume: "2.1M+",
          relatedVideos: [
            { title: "ML for Beginners", views: "980K" },
            { title: "Python ML Libraries Guide", views: "720K" },
            { title: "Build Your First ML Model", views: "560K" },
          ],
          description: "Machine learning education content is in high demand.",
          covered: true,
        },
      ]);
      console.log("   ✅ Trends seeded");
    }

    // --- Insights ---
    if ((await Insight.countDocuments()) === 0) {
      await Insight.insertMany([
        {
          insightId: "insight_1",
          category: "Performance",
          priority: "High",
          icon: "TrendingUp",
          title: "Optimal Upload Time Detected",
          message:
            "Your videos posted on Tuesday and Thursday at 2 PM get 35% more engagement than other times. Consider scheduling your next upload then.",
          actionable: true,
          actions: ["Schedule Next Video", "View Details"],
          impact: "+35% engagement",
          createdAt: new Date("2025-01-28T10:00:00Z"),
        },
        {
          insightId: "insight_2",
          category: "Audience",
          priority: "Medium",
          icon: "Users",
          title: "Growing International Audience",
          message:
            "60% of your new subscribers this month are from India and UK. Consider creating content that resonates with these demographics.",
          actionable: true,
          actions: ["View Demographics", "Learn More"],
          impact: "+24% international growth",
          createdAt: new Date("2025-01-27T14:30:00Z"),
        },
        {
          insightId: "insight_3",
          category: "Trends",
          priority: "High",
          icon: "Flame",
          title: "Trending Topic Opportunity",
          message:
            "The topic 'AI productivity tools' is trending in your niche with 2.5M+ searches. You haven't covered this yet - high opportunity for growth!",
          actionable: true,
          actions: ["Explore Topic", "Create Content"],
          impact: "95% opportunity score",
          createdAt: new Date("2025-01-27T09:15:00Z"),
        },
        {
          insightId: "insight_4",
          category: "Optimization",
          priority: "High",
          icon: "Image",
          title: "Thumbnail Improvement Needed",
          message:
            "Videos with custom thumbnails featuring faces get 3x more clicks. Only 40% of your recent videos use this strategy.",
          actionable: true,
          actions: ["Update Thumbnails", "View Examples"],
          impact: "+200% CTR potential",
          createdAt: new Date("2025-01-26T16:45:00Z"),
        },
        {
          insightId: "insight_5",
          category: "Performance",
          priority: "Medium",
          icon: "Clock",
          title: "Ideal Video Length",
          message:
            "Your best-performing videos are between 8-12 minutes long. Videos outside this range have 25% lower watch time.",
          actionable: true,
          actions: ["View Analysis", "Dismiss"],
          impact: "+25% watch time",
          createdAt: new Date("2025-01-26T11:20:00Z"),
        },
        {
          insightId: "insight_6",
          category: "Audience",
          priority: "Low",
          icon: "Users",
          title: "Community Engagement",
          message:
            "Videos where you respond to comments in the first hour get 45% more engagement. Try engaging more actively after uploads.",
          actionable: true,
          actions: ["Set Reminder", "Learn More"],
          impact: "+45% engagement",
          createdAt: new Date("2025-01-25T08:00:00Z"),
        },
        {
          insightId: "insight_7",
          category: "Optimization",
          priority: "Medium",
          icon: "TrendingUp",
          title: "SEO Improvement",
          message:
            "Adding timestamps to your descriptions could increase search visibility by 30%. Only 3 of your last 10 videos have them.",
          actionable: true,
          actions: ["Update Videos", "View Guide"],
          impact: "+30% search visibility",
          createdAt: new Date("2025-01-24T13:30:00Z"),
        },
        {
          insightId: "insight_8",
          category: "Trends",
          priority: "Medium",
          icon: "Flame",
          title: "Content Format Suggestion",
          message:
            "Tutorial-style content in your niche gets 50% more shares than other formats. Consider creating more step-by-step guides.",
          actionable: true,
          actions: ["View Examples", "Create Tutorial"],
          impact: "+50% shares",
          createdAt: new Date("2025-01-23T17:00:00Z"),
        },
      ]);
      console.log("   ✅ Insights seeded");
    }

    console.log("🌱 Auto-seed complete!\n");
    console.log("🔑 Demo Login: sarah@example.com / password123\n");
  } catch (error) {
    console.error("❌ Auto-seed failed:", error.message);
    // Don't crash the server if seeding fails
  }
};

/**
 * Initialize database connection and seed (once).
 * Safe for serverless: uses a cached promise so concurrent requests
 * don't trigger multiple connection attempts.
 */
const initDB = async () => {
  if (dbInitialized) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      await connectDB();
      await autoSeed();
      dbInitialized = true;
    } catch (error) {
      dbInitPromise = null; // Allow retry on next request
      throw error;
    }
  })();

  return dbInitPromise;
};

// ---------------------
// MIDDLEWARE
// ---------------------

// CORS configuration - allow frontend to communicate with backend
const corsOptions = {
  origin: function (origin, callback) {
    // Build allowed origins from env + common local dev URLs
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://only-creators.vercel.app",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ];

    // Add CLIENT_URL from env if set
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    // Add any additional origins from ALLOWED_ORIGINS env (comma-separated)
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
        .forEach((o) => allowedOrigins.push(o));
    }

    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow any *.vercel.app origin (covers preview + production deployments)
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    // Check explicit allow list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all origins as a fallback
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 86400, // Cache preflight for 24 hours
};

// Handle preflight OPTIONS requests explicitly for all routes
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// HTTP request logging (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(
    morgan("dev", {
      skip: (req) => req.url === "/api/health",
    }),
  );
}

// Middleware: ensure DB is connected before handling any /api request.
// This MUST come after CORS and body parsing so that preflight OPTIONS
// requests always receive proper CORS headers even if the DB is down.
app.use("/api", async (req, res, next) => {
  // Skip DB init for OPTIONS preflight requests — they only need CORS headers
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    await initDB();
    next();
  } catch (error) {
    console.error("❌ DB initialization failed:", error.message);
    res.status(503).json({
      success: false,
      message: "Service temporarily unavailable. Database connection failed.",
    });
  }
});

// ---------------------
// ROUTES
// ---------------------

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "OnlyCreators API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
  });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to OnlyCreators API",
    version: "1.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/signup": "Register a new user",
        "POST /api/auth/login": "Login user",
        "POST /api/auth/logout": "Logout user",
        "GET /api/auth/me": "Get current user profile",
        "GET /api/auth/verify": "Verify JWT token",
        "PUT /api/auth/update-profile": "Update user profile",
        "PUT /api/auth/update-password": "Change password",
        "POST /api/auth/forgot-password": "Request password reset",
        "PUT /api/auth/reset-password/:token": "Reset password with token",
        "DELETE /api/auth/delete-account": "Delete user account",
      },
      analytics: {
        "GET /api/analytics/overview": "Get dashboard analytics overview",
        "GET /api/analytics/videos": "Get all videos with sorting",
        "GET /api/analytics/videos/:videoId": "Get single video analytics",
        "GET /api/analytics/demographics": "Get audience demographics",
        "GET /api/analytics/views-over-time": "Get views time series",
        "GET /api/analytics/engagement": "Get engagement breakdown",
        "GET /api/analytics/peak-hours": "Get peak hours heatmap",
        "GET /api/analytics/realtime": "Get real-time stats",
        "GET /api/analytics/export": "Export analytics report",
        "GET /api/analytics/compare": "Compare two time periods",
      },
      trends: {
        "GET /api/trends": "Get all trends",
        "GET /api/trends/search": "Search trends",
        "GET /api/trends/content-gaps": "Get uncovered trends",
        "GET /api/trends/insights": "Get AI insights",
        "GET /api/trends/recommendations": "Get content recommendations",
        "GET /api/trends/:trendId": "Get single trend details",
        "POST /api/trends/:trendId/bookmark": "Bookmark a trend",
        "POST /api/trends/insights/:insightId/apply": "Apply an insight",
        "POST /api/trends/insights/:insightId/dismiss": "Dismiss an insight",
      },
    },
  });
});

// Mount route handlers
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/trends", trendsRoutes);

// ---------------------
// ERROR HANDLING
// ---------------------

// Handle 404 - Route not found
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "Visit GET /api to see all available endpoints.",
  });
});

// Global error handler
app.use(errorHandler);

// ---------------------
// START SERVER
// ---------------------

const PORT = process.env.PORT || 5000;

// Track the server instance for graceful shutdown (only set in local mode)
let server = null;

// Only start listening when run directly (not imported by Vercel)
if (require.main === module) {
  // For local development, eagerly initialize DB then start server
  initDB()
    .then(() => {
      server = app.listen(PORT, () => {
        console.log("\n🚀 ==========================================");
        console.log(`   OnlyCreators API Server`);
        console.log("   ==========================================");
        console.log(
          `   🌍 Environment : ${process.env.NODE_ENV || "development"}`,
        );
        console.log(`   🔗 Server URL  : http://localhost:${PORT}`);
        console.log(`   📡 API Base    : http://localhost:${PORT}/api`);
        console.log(`   ❤️  Health      : http://localhost:${PORT}/api/health`);
        console.log(
          `   🖥️  Frontend    : ${process.env.CLIENT_URL || "http://localhost:5173"}`,
        );
        console.log("   ==========================================\n");
      });
    })
    .catch((err) => {
      console.error("❌ Failed to start server:", err.message);
      process.exit(1);
    });
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`\n❌ Unhandled Promise Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`\n❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown (only relevant in local server mode)
process.on("SIGTERM", () => {
  console.log("\n👋 SIGTERM received. Shutting down gracefully...");
  if (server) {
    server.close(() => {
      console.log("💤 Server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on("SIGINT", () => {
  console.log("\n👋 SIGINT received. Shutting down gracefully...");
  if (server) {
    server.close(() => {
      console.log("💤 Server closed.");
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Export the Express app for Vercel serverless
module.exports = app;
