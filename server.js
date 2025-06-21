const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import database connection
const database = require('./config/database');

const geminiRoutes = require('./routes/gemini');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { validateApiKey } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
async function initializeDatabase() {
  try {
    await database.connect();
    console.log('🚀 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Logging middleware
app.use(morgan('combined'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 AI requests per 5 minutes
  message: {
    error: 'Too many AI requests',
    message: 'Please wait before making more AI requests.',
    retryAfter: '5 minutes'
  }
});

// CORS configuration - Allow file:// origins and common dev servers
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    
    // Allow requests with no origin (like mobile apps, curl, Postman, file://)
    if (!origin) return callback(null, true);

    // Allow file:// protocol for local HTML files
    if (origin && origin.startsWith('file://')) return callback(null, true);

    // Allow common development origins
    const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
      'http://localhost:3000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      'http://localhost:8080',
      'http://localhost:8000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:3000',
      'null' // Allow null origin for file:// protocol
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // For development, allow all localhost and 127.0.0.1 origins
    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
      // In development mode, be very permissive
      return callback(null, true);
    }

    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the parent directory (where HTML files are)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/gemini', aiLimiter, geminiRoutes);
app.use('/api/health', healthRoutes);

// Root route - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'Vita Tone API Server',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(), endpoints: {
      auth: '/api/auth/*',
      user: '/api/user/*',
      gemini: '/api/gemini/*',
      health: '/api/health/*',
      status: '/api/status'
    }
  });
});

// Health check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Vita Tone API Documentation',
    version: '1.0.0', endpoints: {
      'POST /api/auth/signup': 'User registration',
      'POST /api/auth/signin': 'User login',
      'GET /api/auth/profile': 'Get user profile (requires token)',
      'POST /api/auth/logout': 'User logout',
      'GET /api/user/profile': 'Get user detailed profile',
      'POST /api/user/profile': 'Save/update user profile',
      'GET /api/user/daily': 'Get daily tracking data',
      'POST /api/user/daily': 'Save daily tracking entry',
      'GET /api/user/stats': 'Get user statistics and progress',
      'POST /api/gemini/generate-plan': 'Generate personalized health plan',
      'POST /api/gemini/nutrition-advice': 'Get nutrition advice',
      'POST /api/gemini/workout-routine': 'Generate workout routines',
      'POST /api/gemini/chat': 'General AI chat',
      'POST /api/health/calculate-bmi': 'Calculate BMI',
      'POST /api/health/calculate-calories': 'Calculate daily calorie needs',
      'POST /api/health/save-profile': 'Save user profile',
      'GET /api/health/tips/:category': 'Get health tips by category',
      'GET /api/status': 'Check API server status'
    }, examples: {
      signup: {
        method: 'POST',
        url: '/api/auth/signup',
        body: { name: 'John Doe', email: 'john@example.com', password: 'password123' }
      },
      signin: {
        method: 'POST',
        url: '/api/auth/signin',
        body: { email: 'john@example.com', password: 'password123' }
      },
      chat: {
        method: 'POST',
        url: '/api/gemini/chat',
        body: { message: 'Explain how AI works in a few words' }
      },
      bmi: {
        method: 'POST',
        url: '/api/health/calculate-bmi',
        body: { weight: 70, height: 175 }
      }
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log('🚀 Vita Tone API Server started successfully!');
  console.log(`📱 Server running on: http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💓 Health Check: http://localhost:${PORT}/api/status`);
  console.log('🤖 Gemini AI integration ready!');
  
  // Initialize database connection
  await initializeDatabase();
});
