/**
 * Seed Script for Earnings Data
 * Creates sample earnings for testing the Artisan Earnings Module
 */

const mongoose = require('mongoose');
const Earning = require('./models/Earning');
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');
require('dotenv').config();

const PLATFORM_FEE_PERCENTAGE = 15;

async function seedEarnings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find an artisan user
    const artisan = await User.findOne({ role: 'artisan' });
    if (!artisan) {
      console.log('❌ No artisan found. Please create an artisan user first.');
      process.exit(1);
    }

    console.log(`📊 Creating earnings for artisan: ${artisan.email}\n`);

    // Get artisan's products
    const products = await Product.find({ artisan: artisan._id }).limit(5);
    if (products.length === 0) {
      console.log('⚠️  No products found for this artisan. Creating sample products...');
      // You can add product creation here if needed
    }

    // Clear existing earnings for this artisan
    await Earning.deleteMany({ artisan: artisan._id });
    console.log('🗑️  Cleared existing earnings\n');

    // Create sample sales over the last 6 months
    const earnings = [];
    const today = new Date();
    
    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const month = new Date(today);
      month.setMonth(month.getMonth() - monthsAgo);
      
      // Create 3-8 sales per month
      const salesCount = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < salesCount; i++) {
        const saleDate = new Date(month);
        saleDate.setDate(Math.floor(Math.random() * 28) + 1);
        
        // Random sale amount between 500 and 5000 ETB
        const amount = Math.floor(Math.random() * 4500) + 500;
        const platformFee = (amount * PLATFORM_FEE_PERCENTAGE) / 100;
        const netAmount = amount - platformFee;
        
        const earning = {
          artisan: artisan._id,
          transactionType: 'sale',
          amount,
          platformFee,
          netAmount,
          productId: products.length > 0 ? products[Math.floor(Math.random() * products.length)]._id : null,
          status: 'completed',
          description: 'Product sale commission',
          createdAt: saleDate,
          updatedAt: saleDate,
        };
        
        earnings.push(earning);
      }
    }

    // Insert all earnings
    const created = await Earning.insertMany(earnings);
    console.log(`✅ Created ${created.length} sale earnings\n`);

    // Create a few completed withdrawals
    const withdrawals = [];
    const withdrawalDates = [
      new Date(today.getFullYear(), today.getMonth() - 4, 15),
      new Date(today.getFullYear(), today.getMonth() - 2, 20),
      new Date(today.getFullYear(), today.getMonth() - 1, 10),
    ];

    for (const date of withdrawalDates) {
      const withdrawalAmount = Math.floor(Math.random() * 3000) + 1000;
      
      withdrawals.push({
        artisan: artisan._id,
        transactionType: 'withdrawal',
        amount: -withdrawalAmount,
        platformFee: 0,
        netAmount: -withdrawalAmount,
        withdrawalMethod: ['telebirr', 'cbe_birr', 'bank_transfer'][Math.floor(Math.random() * 3)],
        withdrawalStatus: 'completed',
        withdrawalAccountDetails: {
          phoneNumber: '0912345678',
        },
        status: 'completed',
        description: 'Withdrawal to mobile money',
        createdAt: date,
        updatedAt: date,
        processedAt: new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days later
      });
    }

    const createdWithdrawals = await Earning.insertMany(withdrawals);
    console.log(`✅ Created ${createdWithdrawals.length} completed withdrawals\n`);

    // Create a pending withdrawal
    const pendingWithdrawal = await Earning.create({
      artisan: artisan._id,
      transactionType: 'withdrawal',
      amount: -800,
      platformFee: 0,
      netAmount: -800,
      withdrawalMethod: 'telebirr',
      withdrawalStatus: 'pending',
      withdrawalAccountDetails: {
        phoneNumber: '0912345678',
      },
      status: 'pending',
      description: 'Pending withdrawal request',
    });

    console.log(`✅ Created 1 pending withdrawal\n`);

    // Calculate and display balance
    const balance = await Earning.getArtisanBalance(artisan._id);
    const monthlyEarnings = await Earning.getMonthlyEarnings(artisan._id, 6);
    const earningsByCategory = await Earning.getEarningsByCategory(artisan._id);

    console.log('📊 Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Total Earnings:      ${balance.totalEarnings.toFixed(2)} ETB`);
    console.log(`Total Withdrawals:   ${balance.totalWithdrawals.toFixed(2)} ETB`);
    console.log(`Available Balance:   ${balance.availableBalance.toFixed(2)} ETB`);
    console.log('─────────────────────────────────────');
    console.log(`\nMonthly Earnings (last 6 months):`);
    monthlyEarnings.forEach(month => {
      console.log(`  ${month._id.year}-${String(month._id.month).padStart(2, '0')}: ${month.totalEarnings.toFixed(2)} ETB (${month.totalSales} sales)`);
    });
    
    if (earningsByCategory.length > 0) {
      console.log(`\nTop Categories:`);
      earningsByCategory.slice(0, 3).forEach((cat, i) => {
        console.log(`  ${i + 1}. ${cat._id}: ${cat.totalEarnings.toFixed(2)} ETB (${cat.totalSales} sales)`);
      });
    }

    console.log('\n✅ Seed completed successfully!');
    console.log(`\n🎯 Test the dashboard:`);
    console.log(`   1. Login as: ${artisan.email}`);
    console.log(`   2. Navigate to: http://localhost:3000/artisan/payments`);
    console.log(`   3. View your earnings dashboard with real data!\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding earnings:', error);
    process.exit(1);
  }
}

seedEarnings();
