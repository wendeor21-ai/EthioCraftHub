/**
 * Admin Management Script for EthioCraft Global
 * 
 * Comprehensive admin account management
 * Run with: node scripts/adminManager.js [action]
 * 
 * Actions:
 * - unlock: Unlock admin account
 * - reset: Reset admin password
 * - status: Check admin account status
 * - create: Create new admin account
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@ethiocraft.com';
const ADMIN_PASSWORD = 'Admin123!';

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft-global';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

async function getAdminUser() {
  const adminUser = await User.findByEmail(ADMIN_EMAIL);
  if (!adminUser) {
    throw new Error('Admin user not found');
  }
  return adminUser;
}

async function checkAdminStatus() {
  try {
    const adminUser = await getAdminUser();
    
    console.log('📋 ADMIN ACCOUNT STATUS');
    console.log('========================');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Role:', adminUser.role);
    console.log('🔢 Login Attempts:', adminUser.loginAttempts || 0);
    console.log('🔒 Is Locked:', adminUser.isLocked ? 'YES' : 'NO');
    console.log('⏰ Lock Until:', adminUser.lockUntil || 'Not locked');
    console.log('✅ Is Active:', adminUser.isActive ? 'YES' : 'NO');
    console.log('📅 Created:', adminUser.createdAt);
    console.log('🕐 Last Login:', adminUser.lastLogin || 'Never');
    console.log('');
    
    if (adminUser.isLocked) {
      console.log('⚠️  ACCOUNT IS LOCKED!');
      console.log('🔧 Run: node scripts/adminManager.js unlock');
    } else {
      console.log('✅ Account is ready to use!');
      console.log('🔑 Password: Admin123!');
    }
    
  } catch (error) {
    console.log('❌ Admin user not found');
    console.log('🔧 Run: node scripts/adminManager.js create');
  }
}

async function unlockAdmin() {
  try {
    const adminUser = await getAdminUser();
    
    console.log('🔓 Unlocking admin account...');
    
    // Reset login attempts and unlock
    await adminUser.resetLoginAttempts();
    adminUser.isActive = true;
    await adminUser.save();
    
    console.log('✅ Admin account unlocked successfully!');
    console.log('📧 Email: admin@ethiocraft.com');
    console.log('🔑 Password: Admin123!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function resetAdminPassword() {
  try {
    const adminUser = await getAdminUser();
    
    console.log('🔑 Resetting admin password...');
    
    adminUser.password = ADMIN_PASSWORD;
    await adminUser.resetLoginAttempts(); // Also unlock if locked
    adminUser.isActive = true;
    await adminUser.save();
    
    console.log('✅ Admin password reset successfully!');
    console.log('📧 Email: admin@ethiocraft.com');
    console.log('🔑 New Password: Admin123!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findByEmail(ADMIN_EMAIL);
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log('🔧 Use: node scripts/adminManager.js status');
      return;
    }

    const adminData = {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      profile: {
        firstName: 'EthioCraft',
        lastName: 'Administrator',
        phone: '+251911234567',
        bio: 'Platform administrator for EthioCraft Global marketplace'
      }
    };

    const admin = new User(adminData);
    await admin.save();

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email: admin@ethiocraft.com');
    console.log('🔑 Password: Admin123!');
    
  } catch (error) {
    console.log('❌ Error creating admin:', error.message);
  }
}

async function deleteAdmin() {
  try {
    const result = await User.deleteOne({ email: ADMIN_EMAIL });
    
    if (result.deletedCount > 0) {
      console.log('🗑️  Admin user deleted successfully!');
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.log('❌ Error deleting admin:', error.message);
  }
}

function showHelp() {
  console.log('🛠️  EthioCraft Global - Admin Manager');
  console.log('=====================================');
  console.log('');
  console.log('Usage: node scripts/adminManager.js [action]');
  console.log('');
  console.log('Actions:');
  console.log('  status   - Check admin account status');
  console.log('  unlock   - Unlock admin account');
  console.log('  reset    - Reset admin password');
  console.log('  create   - Create new admin account');
  console.log('  delete   - Delete admin account');
  console.log('  help     - Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/adminManager.js status');
  console.log('  node scripts/adminManager.js unlock');
  console.log('  node scripts/adminManager.js reset');
}

async function main() {
  const action = process.argv[2] || 'status';
  
  try {
    await connectDB();
    
    switch (action.toLowerCase()) {
      case 'status':
        await checkAdminStatus();
        break;
      case 'unlock':
        await unlockAdmin();
        break;
      case 'reset':
        await resetAdminPassword();
        break;
      case 'create':
        await createAdmin();
        break;
      case 'delete':
        await deleteAdmin();
        break;
      case 'help':
        showHelp();
        break;
      default:
        console.log('❌ Unknown action:', action);
        showHelp();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

main();