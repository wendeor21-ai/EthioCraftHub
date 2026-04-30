/**
 * Database Configuration for EthioCraft Global
 * 
 * Handles MongoDB connection setup with:
 * - Environment-specific connection strings
 * - Connection retry logic
 * - Performance optimization
 * - Error handling and logging
 */

const mongoose = require('mongoose');

// MongoDB connection options for optimal performance
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0 // Disable mongoose buffering
};

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection URI
 * @returns {Promise} - MongoDB connection promise
 */
const connectDB = async (uri = process.env.MONGODB_URI) => {
  try {
    // Set mongoose options for better performance
    mongoose.set('strictQuery', false);
    
    const conn = await mongoose.connect(uri, mongooseOptions);
    
    console.log(`✅ MongoDB Connected Successfully`);
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB Disconnected');
  } catch (error) {
    console.error('❌ MongoDB Disconnection Error:', error.message);
    throw error;
  }
};

/**
 * Get database connection status
 * @returns {string} - Connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[mongoose.connection.readyState] || 'unknown';
};

/**
 * Setup database event listeners for monitoring
 */
const setupDatabaseListeners = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
  });

  // Connection error
  mongoose.connection.on('error', (error) => {
    console.error('❌ Mongoose connection error:', error);
  });

  // Connection disconnected
  mongoose.connection.on('disconnected', () => {
    console.log('📴 Mongoose disconnected from MongoDB');
  });

  // Application termination
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Mongoose connection closed due to application termination');
    process.exit(0);
  });
};

/**
 * Create database indexes for optimal query performance
 */
const createIndexes = async () => {
  try {
    // User collection indexes
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
    await mongoose.connection.db.collection('users').createIndex({ role: 1 });
    await mongoose.connection.db.collection('users').createIndex({ 'verification.status': 1 });
    
    // Product collection indexes
    await mongoose.connection.db.collection('products').createIndex({ category: 1, status: 1 });
    await mongoose.connection.db.collection('products').createIndex({ artisan: 1 });
    await mongoose.connection.db.collection('products').createIndex({ createdAt: -1 });
    await mongoose.connection.db.collection('products').createIndex({ 
      name: 'text', 
      description: 'text', 
      aiTags: 'text' 
    });
    
    // Order collection indexes
    await mongoose.connection.db.collection('orders').createIndex({ customer: 1, createdAt: -1 });
    await mongoose.connection.db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await mongoose.connection.db.collection('orders').createIndex({ 'items.artisan': 1 });
    await mongoose.connection.db.collection('orders').createIndex({ status: 1 });
    
    // UserInteraction collection indexes with TTL
    await mongoose.connection.db.collection('userinteractions').createIndex({ user: 1, timestamp: -1 });
    await mongoose.connection.db.collection('userinteractions').createIndex({ product: 1 });
    await mongoose.connection.db.collection('userinteractions').createIndex(
      { timestamp: 1 }, 
      { expireAfterSeconds: 7776000 } // 90 days TTL
    );
    
    console.log('📊 Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating database indexes:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  setupDatabaseListeners,
  createIndexes,
  mongooseOptions
};