/**
 * Verify ZemaAI Logs Status
 * Checks if new logs are being created today
 * 
 * Usage: node verify-logs-status.js
 */
const mongoose = require('mongoose');
const User = require('./models/User');
const AIChatLog = require('./models/AIChatLog');

async function verifyLogsStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiocraft_global');
    console.log('✅ MongoDB Connected\n');
    
    // Get recent logs
    const recentLogs = await AIChatLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    console.log('📊 10 Most Recent Logs:\n');
    recentLogs.forEach((log, i) => {
      const date = new Date(log.createdAt);
      const isToday = date.toDateString() === new Date().toDateString();
      const timeAgo = Math.floor((Date.now() - date.getTime()) / 1000 / 60); // minutes ago
      
      console.log(`${i+1}. ${log.userEmail} (${log.userRole})`);
      console.log(`   ${isToday ? '🆕 TODAY' : '📅 ' + date.toLocaleDateString()} - ${timeAgo} minutes ago`);
      console.log(`   Query: ${log.userQuery?.substring(0, 60)}...`);
      console.log('');
    });
    
    // Count by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await AIChatLog.countDocuments({ createdAt: { $gte: today } });
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCount = await AIChatLog.countDocuments({ 
      createdAt: { $gte: yesterday, $lt: today } 
    });
    
    console.log('📈 Statistics:');
    console.log(`   Total logs: ${await AIChatLog.countDocuments()}`);
    console.log(`   Logs today: ${todayCount}`);
    console.log(`   Logs yesterday: ${yesterdayCount}`);
    console.log('');
    
    // Count by role
    const customerCount = await AIChatLog.countDocuments({ userRole: 'customer' });
    const artisanCount = await AIChatLog.countDocuments({ userRole: 'artisan' });
    const adminCount = await AIChatLog.countDocuments({ userRole: 'admin' });
    
    console.log('👥 By Role:');
    console.log(`   Customer: ${customerCount}`);
    console.log(`   Artisan: ${artisanCount}`);
    console.log(`   Admin: ${adminCount}`);
    console.log('');
    
    if (todayCount === 0) {
      console.log('⚠️  WARNING: No logs created today!');
      console.log('   This suggests new queries are NOT being saved.');
      console.log('');
      console.log('🔍 Troubleshooting Steps:');
      console.log('   1. Restart backend server: cd server && npm start');
      console.log('   2. Login as customer and send a test message');
      console.log('   3. Watch backend console for logs starting with 🔵');
      console.log('   4. Run this script again to verify');
    } else {
      console.log('✅ System is working! New logs are being created.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyLogsStatus();
