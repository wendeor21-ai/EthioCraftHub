/**
 * Migration Script: Convert Delivered Orders to Completed
 * 
 * This script finds all orders with status "delivered" and:
 * 1. Updates them to "completed" status
 * 2. Records earnings for each order
 * 
 * Run this once to fix existing orders in the database.
 * 
 * Usage: node server/migrateDeliveredOrders.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Earning = require('./models/Earning');

const PLATFORM_FEE_PERCENTAGE = 15;

async function migrateDeliveredOrders() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft');
    console.log('✅ Connected to MongoDB');

    // Find all delivered orders
    const deliveredOrders = await Order.find({ status: 'delivered' })
      .populate('items.product items.artisan');

    console.log(`\n📦 Found ${deliveredOrders.length} delivered orders to migrate`);

    if (deliveredOrders.length === 0) {
      console.log('✅ No orders to migrate. All done!');
      process.exit(0);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const order of deliveredOrders) {
      try {
        console.log(`\n🔄 Processing order ${order.orderNumber}...`);

        // Update status to completed
        await order.updateStatus('completed', 'Auto-completed during migration');

        // Record earnings for each artisan
        for (const item of order.items) {
          // Check if earnings already exist for this order item
          const existingEarning = await Earning.findOne({
            orderId: order._id,
            productId: item.product._id,
          });

          if (existingEarning) {
            console.log(`  ⚠️  Earnings already exist for ${item.product.name}, skipping...`);
            continue;
          }

          const saleAmount = item.price * item.quantity;
          const platformFee = (saleAmount * PLATFORM_FEE_PERCENTAGE) / 100;
          const netAmount = saleAmount - platformFee;

          await Earning.create({
            artisan: item.artisan._id,
            transactionType: 'sale',
            amount: saleAmount,
            platformFee,
            netAmount,
            orderId: order._id,
            productId: item.product._id,
            status: 'completed',
            description: `Sale: ${item.product.name} (migrated)`,
          });

          console.log(`  ✅ Recorded earnings for ${item.product.name}: ${netAmount.toFixed(2)} ETB`);
        }

        successCount++;
        console.log(`✅ Order ${order.orderNumber} migrated successfully`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating order ${order.orderNumber}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${successCount} orders`);
    console.log(`❌ Failed: ${errorCount} orders`);
    console.log(`📦 Total processed: ${deliveredOrders.length} orders`);
    console.log('='.repeat(60));

    // Verify results
    const remainingDelivered = await Order.countDocuments({ status: 'delivered' });
    const completedCount = await Order.countDocuments({ status: 'completed' });

    console.log('\n📈 Database Status:');
    console.log(`   Delivered orders remaining: ${remainingDelivered}`);
    console.log(`   Completed orders: ${completedCount}`);

    if (remainingDelivered === 0) {
      console.log('\n🎉 Migration completed successfully! All delivered orders are now completed.');
    } else {
      console.log('\n⚠️  Some delivered orders remain. Please check the errors above.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('🚀 Starting migration: Delivered → Completed');
console.log('='.repeat(60));
migrateDeliveredOrders();
