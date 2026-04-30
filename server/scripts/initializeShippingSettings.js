/**
 * Initialize Shipping Settings for Existing Artisans
 * Run this script to add default shipping settings to all artisan accounts
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const DEFAULT_SHIPPING_SETTINGS = {
  methods: [
    {
      name: 'Standard Delivery',
      enabled: true,
      basePrice: 50,
      estimatedDays: 5,
      description: 'Standard delivery within 3-5 business days'
    },
    {
      name: 'Express Delivery',
      enabled: false,
      basePrice: 150,
      estimatedDays: 2,
      description: 'Fast delivery within 1-2 business days'
    },
    {
      name: 'Store Pickup',
      enabled: true,
      basePrice: 0,
      estimatedDays: 1,
      description: 'Pick up from store location'
    }
  ],
  regionalPricing: [],
  freeShippingThreshold: 1000,
  weightBasedPricing: {
    enabled: false,
    pricePerKg: 20
  }
};

async function initializeShippingSettings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiocraft_global', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all artisans
    const artisans = await User.find({ role: 'artisan' });
    console.log(`📊 Found ${artisans.length} artisan accounts\n`);

    let updated = 0;
    let skipped = 0;

    for (const artisan of artisans) {
      // Check if artisan already has shipping settings
      if (artisan.shippingSettings && artisan.shippingSettings.methods && artisan.shippingSettings.methods.length > 0) {
        console.log(`⏭️  Skipping ${artisan.email} - already has shipping settings`);
        skipped++;
        continue;
      }

      // Initialize shipping settings
      artisan.shippingSettings = DEFAULT_SHIPPING_SETTINGS;
      await artisan.save();
      
      console.log(`✅ Initialized shipping settings for ${artisan.email}`);
      updated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total artisans: ${artisans.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('='.repeat(60));
    console.log('\n✅ Shipping settings initialization complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
initializeShippingSettings();
