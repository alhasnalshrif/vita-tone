const database = require('../config/database');

// Middleware to ensure database connection before each request
const ensureConnection = async (req, res, next) => {
  try {
    // Ensure we have a valid database connection
    await database.ensureConnection();
    next();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = { ensureConnection };
