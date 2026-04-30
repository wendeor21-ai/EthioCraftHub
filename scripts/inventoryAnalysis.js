/**
 * Inventory Analysis Script for EthioCraft Global
 * 
 * Analyzes product inventory and provides insights on:
 * - Most popular products
 * - Low stock items needing restock
 * - Category performance
 * - Inventory value
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Product = require('../server/models/Product');
const Order = require('../server/models/Order');

async function analyzeInventory() {
  try {
    console.log('📊 EthioCraft Global - Inventory Analysis\n');
    console.log('='.repeat(60));
    
    // Get all active products
    const products = await Product.find({ status: 'active' })
      .populate('artisan', 'profile.firstName profile.lastName')
      .lean();
    
    if (products.length === 0) {
      console.log('\n⚠️  No products found in database');
      process.exit(0);
    }
    
    console.log(`\n✅ Found ${products.length} active products\n`);
    
    // 1. TOP 3 MOST POPULAR PRODUCTS
    console.log('🏆 TOP 3 MOST POPULAR PRODUCTS (by purchases)');
    console.log('-'.repeat(60));
    
    const topProducts = products
      .filter(p => p.metrics.purchases > 0)
      .sort((a, b) => b.metrics.purchases - a.metrics.purchases)
      .slice(0, 3);
    
    if (topProducts.length === 0) {
      console.log('   No products have been purchased yet');
    } else {
      topProducts.forEach((product, index) => {
        const conversionRate = product.metrics.views > 0 
          ? ((product.metrics.purchases / product.metrics.views) * 100).toFixed(1)
          : '0.0';
        
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Price: ${product.price.toFixed(2)} ETB`);
        console.log(`   Purchases: ${product.metrics.purchases}`);
        console.log(`   Views: ${product.metrics.views}`);
        console.log(`   Conversion Rate: ${conversionRate}%`);
        console.log(`   Current Stock: ${product.inventory.quantity} units`);
        console.log(`   Artisan: ${product.artisan?.profile?.firstName} ${product.artisan?.profile?.lastName}`);
      });
    }
    
    // 2. LOW STOCK ITEMS (< 5 units)
    console.log('\n\n⚠️  LOW STOCK ITEMS (Need Restock)');
    console.log('-'.repeat(60));
    
    const lowStockItems = products
      .filter(p => p.inventory.quantity < 5)
      .sort((a, b) => a.inventory.quantity - b.inventory.quantity);
    
    if (lowStockItems.length === 0) {
      console.log('   ✅ All products have adequate stock levels');
    } else {
      lowStockItems.forEach((product) => {
        const urgency = product.inventory.quantity === 0 ? '🔴 OUT OF STOCK' 
          : product.inventory.quantity < 2 ? '🟠 CRITICAL' 
          : '🟡 LOW';
        
        console.log(`\n${urgency} - ${product.name}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Current Stock: ${product.inventory.quantity} units`);
        console.log(`   Price: ${product.price.toFixed(2)} ETB`);
        console.log(`   Purchases: ${product.metrics.purchases}`);
        console.log(`   Artisan: ${product.artisan?.profile?.firstName} ${product.artisan?.profile?.lastName}`);
        
        if (product.metrics.purchases > 0) {
          console.log(`   📈 Popular item - Restock ASAP!`);
        }
      });
    }
    
    // 3. CATEGORY BREAKDOWN
    console.log('\n\n📦 INVENTORY BY CATEGORY');
    console.log('-'.repeat(60));
    
    const categoryStats = {};
    products.forEach(product => {
      if (!categoryStats[product.category]) {
        categoryStats[product.category] = {
          count: 0,
          totalStock: 0,
          totalValue: 0,
          avgPrice: 0,
          totalPurchases: 0
        };
      }
      
      categoryStats[product.category].count++;
      categoryStats[product.category].totalStock += product.inventory.quantity;
      categoryStats[product.category].totalValue += product.price * product.inventory.quantity;
      categoryStats[product.category].totalPurchases += product.metrics.purchases;
    });
    
    // Calculate averages
    Object.keys(categoryStats).forEach(cat => {
      categoryStats[cat].avgPrice = categoryStats[cat].totalValue / categoryStats[cat].totalStock;
    });
    
    Object.entries(categoryStats)
      .sort((a, b) => b[1].totalPurchases - a[1].totalPurchases)
      .forEach(([category, stats]) => {
        console.log(`\n${category.toUpperCase()}`);
        console.log(`   Products: ${stats.count}`);
        console.log(`   Total Stock: ${stats.totalStock} units`);
        console.log(`   Inventory Value: ${stats.totalValue.toFixed(2)} ETB`);
        console.log(`   Avg Price: ${stats.avgPrice.toFixed(2)} ETB`);
        console.log(`   Total Sales: ${stats.totalPurchases} purchases`);
      });
    
    // 4. OVERALL SUMMARY
    console.log('\n\n💰 OVERALL INVENTORY SUMMARY');
    console.log('-'.repeat(60));
    
    const totalStock = products.reduce((sum, p) => sum + p.inventory.quantity, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.inventory.quantity), 0);
    const totalPurchases = products.reduce((sum, p) => sum + p.metrics.purchases, 0);
    const totalViews = products.reduce((sum, p) => sum + p.metrics.views, 0);
    const avgPrice = totalValue / totalStock;
    
    console.log(`\nTotal Products: ${products.length}`);
    console.log(`Total Stock Units: ${totalStock}`);
    console.log(`Total Inventory Value: ${totalValue.toFixed(2)} ETB`);
    console.log(`Average Price per Unit: ${avgPrice.toFixed(2)} ETB`);
    console.log(`Total Purchases: ${totalPurchases}`);
    console.log(`Total Views: ${totalViews}`);
    console.log(`Overall Conversion Rate: ${totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(2) : '0.00'}%`);
    
    // 5. RECOMMENDATIONS
    console.log('\n\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(60));
    
    if (lowStockItems.length > 0) {
      console.log(`\n1. 🔄 Restock ${lowStockItems.length} low-stock items immediately`);
      console.log(`   Priority: ${lowStockItems.filter(p => p.inventory.quantity < 2).length} critical items`);
    }
    
    if (topProducts.length > 0) {
      console.log(`\n2. 📈 Focus marketing on top sellers:`);
      topProducts.forEach(p => console.log(`   - ${p.name}`));
    }
    
    const underperformers = products
      .filter(p => p.metrics.views > 50 && p.metrics.purchases === 0)
      .length;
    
    if (underperformers > 0) {
      console.log(`\n3. 🎯 ${underperformers} products have views but no sales`);
      console.log(`   Consider: Price adjustment, better descriptions, or promotions`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Analysis Complete!\n');
    
  } catch (error) {
    console.error('❌ Error analyzing inventory:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run the analysis
analyzeInventory();
