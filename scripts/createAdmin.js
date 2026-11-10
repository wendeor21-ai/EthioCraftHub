/**
 * Admin User Creation Script for EthioCraft Global
 * Run with: node scripts/createAdmin.js
 */
const { connectDB, disconnectDB } = require('./dbConnect');
const User = require('../server/models/User');

const ADMIN_CREDENTIALS = {
  email: 'admin@ethiocraft.com',
  password: 'Admin123!',
  role: 'admin',
  profile: {
    firstName: 'EthioCraft',
    lastName: 'Administrator',
    phone: '+251911234567',
    bio: 'Platform administrator for EthioCraft Global marketplace',
  },
};

async function createAdminUser() {
  try {
    await connectDB();

    const existingAdmin = await User.findByEmail(ADMIN_CREDENTIALS.email);
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', ADMIN_CREDENTIALS.email);
      console.log('📧 Email:', ADMIN_CREDENTIALS.email);
      console.log('🔑 Password: Admin123!');
      return;
    }

    const adminUser = new User(ADMIN_CREDENTIALS);
    await adminUser.save();

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email:', ADMIN_CREDENTIALS.email);
    console.log('🔑 Password:', ADMIN_CREDENTIALS.password);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

async function createSampleUsers() {
  try {
    const customerData = {
      email: 'customer@test.com',
      password: 'Customer123!',
      role: 'customer',
      profile: {
        firstName: 'Test',
        lastName: 'Customer',
        phone: '+251911111111',
        bio: 'Sample customer for testing',
      },
    };

    if (!await User.findByEmail(customerData.email)) {
      const customer = new User(customerData);
      await customer.save();
      console.log('✅ Sample customer created:', customerData.email);
    }

    const artisanData = {
      email: 'artisan@test.com',
      password: 'Artisan123!',
      role: 'artisan',
      profile: {
        firstName: 'Test',
        lastName: 'Artisan',
        phone: '+251922222222',
        bio: 'Sample artisan for testing',
        culturalBackground: 'Traditional Ethiopian textile weaving from Addis Ababa region',
        specialties: ['Textiles', 'Traditional Weaving'],
      },
      verification: {
        status: 'approved',
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
    };

    if (!await User.findByEmail(artisanData.email)) {
      const artisan = new User(artisanData);
      await artisan.save();
      console.log('✅ Sample artisan created:', artisanData.email);
    }
  } catch (error) {
    console.error('❌ Error creating sample users:', error.message);
  }
}

async function main() {
  console.log('🚀 Creating admin user for EthioCraft Global...');
  await createAdminUser();
  await createSampleUsers();
  await disconnectDB();
  process.exit(0);
}

main();
