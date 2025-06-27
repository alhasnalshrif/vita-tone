const mongoose = require('mongoose');
const config = require('./config');

// Global connection state for serverless optimization
let isConnected = false;

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

    try {
      // Disconnect any existing connections first
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      // Set mongoose-specific options for newer versions
      mongoose.set('bufferCommands', false);

      // Enhanced connection options for serverless
      const connectionOptions = {
        ...config.database.mongodb.options,
        // Serverless-optimized settings
        maxPoolSize: 5, // Reduced pool size for serverless
        serverSelectionTimeoutMS: 10000, // Increased timeout
        socketTimeoutMS: 30000, // Reduced socket timeout
        connectTimeoutMS: 10000, // Connection timeout
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        heartbeatFrequencyMS: 30000, // Heartbeat frequency
      };

      // Connect to MongoDB
      const connection = await mongoose.connect(
        config.database.mongodb.uri,
        connectionOptions
      );

      this.connection = connection;
      isConnected = true;
      
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${connection.connection.name}`);
      console.log(`🌍 Host: ${connection.connection.host}:${connection.connection.port}`);

      // Handle connection events
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

      return connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection || mongoose.connection.readyState !== 0) {
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
      console.log('🔄 Reconnecting to database...');
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
