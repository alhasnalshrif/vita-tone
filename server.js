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
const { ensureConnection } = require('./middleware/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Connect to database
async function initializeDatabase() {
  try {
    // In serverless environments, we don't maintain persistent connections
    // Instead, we'll connect on-demand per request
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.log('🚀 Database configured for serverless environment');
      return;
    }
    
    // For local development, establish connection
    await database.connect();
    console.log('🚀 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't exit in serverless environments
    if (!(process.env.NODE_ENV === 'production' && process.env.VERCEL)) {
      process.exit(1);
    }
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
    const allowedOrigins =  [
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

// API Routes with database connection middleware
app.use('/api/auth', ensureConnection, authRoutes);
app.use('/api/user', ensureConnection, userRoutes);
app.use('/api/gemini', aiLimiter, geminiRoutes);
app.use('/api/health', ensureConnection, healthRoutes);

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
      status: '/api/status',
      dbStatus: '/api/db-status'
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

// Database health check endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    await database.ensureConnection();
    const isConnected = database.isConnected();
    
    res.json({
      status: isConnected ? 'OK' : 'DISCONNECTED',
      database: {
        connected: isConnected,
        readyState: require('mongoose').connection.readyState,
        host: require('mongoose').connection.host,
        name: require('mongoose').connection.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
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
