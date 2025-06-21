const mongoose = require('mongoose');
const config = require('./config');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      // Connect to MongoDB
      const connection = await mongoose.connect(
        config.database.mongodb.uri,
        config.database.mongodb.options
      );

      this.connection = connection;
      console.log('✅ Connected to MongoDB successfully');
      console.log(`📊 Database: ${connection.connection.name}`);
      console.log(`🌍 Host: ${connection.connection.host}:${connection.connection.port}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', this.gracefulShutdown.bind(this));
      process.on('SIGTERM', this.gracefulShutdown.bind(this));

      return connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('✅ Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
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
    return mongoose.connection.readyState === 1;
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
