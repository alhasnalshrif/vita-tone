const database = require('./config/database');
const User = require('./models/User');

async function testConnection() {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test connection
    await database.connect();
    console.log('✅ Database connection successful');
    
    // Test query
    console.log('🔍 Testing user query...');
    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users in database`);
    
    // Test database ping
    const pingResult = await database.ping();
    console.log(`🏓 Database ping: ${pingResult ? 'SUCCESS' : 'FAILED'}`);
    
    // Get database stats
    if (database.isConnected()) {
      const stats = await database.getStats();
      console.log('📈 Database stats:', stats);
    }
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await database.disconnect();
    process.exit(0);
  }
}

// Run the test
testConnection();
