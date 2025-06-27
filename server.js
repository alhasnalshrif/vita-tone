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

async function initializeDatabase() {
  try {

    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      console.log('🚀 Database configured for serverless environment');
      return;
    }
    
    await database.connect();
    console.log('🚀 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    if (!(process.env.NODE_ENV === 'production' && process.env.VERCEL)) {
      process.exit(1);
    }
  }
}

app.use(morgan('combined'));

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



const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 20, 
  message: {
    error: 'Too many AI requests',
    message: 'Please wait before making more AI requests.',
    retryAfter: '5 minutes'
  }
});

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    
    if (!origin) return callback(null, true);

    if (origin && origin.startsWith('file://')) return callback(null, true);

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
      'null'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '..')));

app.use('/project/api/auth', ensureConnection, authRoutes);
app.use('/project/api/user', ensureConnection, userRoutes);
app.use('/project/api/gemini', aiLimiter, geminiRoutes);
app.use('/project/api/health', ensureConnection, healthRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});




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
