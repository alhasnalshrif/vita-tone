// API Configuration
module.exports = {  // Database configuration
  database: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://alhasnalshrif:MhhWs0xQsYQ50gST@cluster0.fy1zshv.mongodb.net/vitatone',
      options: {
        maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 30000, // 30 seconds
        connectTimeoutMS: 10000, // 10 seconds
        maxIdleTimeMS: 30000, // Close connections after 30s inactivity
        heartbeatFrequencyMS: 30000, // 30 seconds
      }
    }
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development'
  },

  // API configuration
  api: {
    version: '1.0.0',
    prefix: '/api',
    timeout: 30000, // 30 seconds
    maxRequestSize: '10mb'
  },

  // CORS configuration
  cors: {
    origins: [
      "*",
      'https://vita-app.online',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:8080',
      'http://localhost:8000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:3000',
      'null' // Allow null origin for file:// protocol
    ],
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Rate limiting configuration
  rateLimit: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: 'Too many requests from this IP, please try again later.'
    },
    ai: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20, // AI requests per window
      message: 'Too many AI requests, please wait before making more requests.'
    }
  },

  // Gemini AI configuration
  gemini: {
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    apiKey: process.env.GEMINI_API_KEY,
    maxTokens: 4000,
    temperature: 0.7
  },

  // Health calculation defaults
  health: {
    bmr: {
      maleConstant: 5,
      femaleConstant: -161,
      weightMultiplier: 10,
      heightMultiplier: 6.25,
      ageMultiplier: 5
    },
    activityMultipliers: {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    },
    macroRatios: {
      carbs: 0.45, // 45% of calories
      protein: 0.25, // 25% of calories
      fat: 0.30 // 30% of calories
    }
  },

  // Security configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      }
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'combined' : 'dev'
  }
};
