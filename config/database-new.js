const mongoose = require('mongoose');
const config = require('./config');

// Global connection state for serverless optimization
let isConnected = false;
let connectionPromise = null;

// Set global mongoose options
mongoose.set('bufferCommands', false);
mongoose.set('strictQuery', false);

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    // If already connected, return the existing connection
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log('🔄 Using existing MongoDB connection');
      return mongoose.connection;
    }

    // If connection is in progress, wait for it
    if (connectionPromise) {
      console.log('⏳ Waiting for existing connection attempt...');
      return await connectionPromise;
    }

    // Create new connection promise
    connectionPromise = this._performConnection();

    try {
      const result = await connectionPromise;
      connectionPromise = null;
      return result;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  }

  async _performConnection() {
    try {
      // Disconnect any stale connections
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      // Enhanced connection options for serverless
      const connectionOptions = {
        maxPoolSize: 1, // Single connection for serverless
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 15000, // 15 second socket timeout
        connectTimeoutMS: 5000, // 5 second connection timeout
        maxIdleTimeMS: 10000, // Close after 10s inactivity
        heartbeatFrequencyMS: 10000, // 10s heartbeat
      };

      console.log('🔗 Establishing MongoDB connection...');
      
      // Connect with timeout wrapper
      const connection = await Promise.race([
        mongoose.connect(config.database.mongodb.uri, connectionOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MongoDB connection timeout after 8 seconds')), 8000)
        )
      ]);

      this.connection = connection;
      isConnected = true;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${connection.connection.name}`);

      // Set up event handlers (only once)
      this._setupEventHandlers();

      return connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      isConnected = false;
      throw error;
    }
  }

  _setupEventHandlers() {
    // Remove existing listeners to prevent duplicates
    mongoose.connection.removeAllListeners('error');
    mongoose.connection.removeAllListeners('disconnected');
    mongoose.connection.removeAllListeners('reconnected');

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      isConnected = true;
    });
  }

  async disconnect() {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        isConnected = false;
        console.log('✅ Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      isConnected = false;
      throw error;
    }
  }

  async gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Closing MongoDB connection...`);
    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnected() {
    return isConnected && mongoose.connection.readyState === 1;
  }

  // Ensure connection before database operations
  async ensureConnection() {
    if (!this.isConnected()) {
      console.log('🔄 Establishing database connection...');
      await this.connect();
    }
    return this.connection;
  }

  async ping() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to database');
      }
      
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ Database ping failed:', error);
      return false;
    }
  }

  async getStats() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to database');
      }

      const stats = await mongoose.connection.db.stats();
      return {
        database: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
const database = new Database();
module.exports = database;
