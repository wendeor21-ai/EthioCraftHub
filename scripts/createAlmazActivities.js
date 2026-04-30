/**
 * Create activity logs for Almaz (the logged-in artisan)
 */

const { logActivity } = require('../server/utils/activityLogger');

async function createActivities() {
  console.log('Creating activity logs for Almaz...\n');

  const almazId = '6983ef193321e3cbca373ddc';

  // Product creation activities
  await logActivity({
    userId: almazId,
    action: 'product_created',
    details: {
      productId: '6984d07e3fde5570a4137059',
      productName: 'Traditional Ethiopian Gold Plated Jewelry Set',
      category: 'Jewelry',
      price: 1500
    },
    message: 'Created product: Traditional Ethiopian Gold Plated Jewelry Set'
  });

  await logActivity({
    userId: almazId,
    action: 'product_created',
    details: {
      productId: '6985eeb3b48db5a166875537',
      productName: 'Habesha Filigree Gold Set',
      category: 'Jewelry',
      price: 4500
    },
    message: 'Created product: Habesha Filigree Gold Set'
  });

  // Product update activity
  await logActivity({
    userId: almazId,
    action: 'product_updated',
    details: {
      productId: '6985ef7ab48db5a16687553c',
      productName: 'Silver Lalibela Cross Pendant',
      changedFields: ['price', 'description']
    },
    message: 'Updated product: Silver Lalibela Cross Pendant'
  });

  // Order received activity
  await logActivity({
    userId: almazId,
    action: 'order_received',
    details: {
      orderId: '6985f000b48db5a166875540',
      orderNumber: 'ORD-1001',
      productId: '6985eeb3b48db5a166875537',
      productName: 'Habesha Filigree Gold Set',
      quantity: 1,
      totalAmount: 4500
    },
    message: 'New order received for Habesha Filigree Gold Set'
  });

  // Order status change activity
  await logActivity({
    userId: almazId,
    action: 'order_status_changed',
    details: {
      orderId: '6985f000b48db5a166875540',
      orderNumber: 'ORD-1001',
      oldStatus: 'pending',
      newStatus: 'confirmed'
    },
    message: 'Order ORD-1001 status changed to confirmed'
  });

  console.log('✅ Activity logs created successfully for Almaz!');
  console.log('Almaz should now see 5 activities on the dashboard.');
}

createActivities().catch(err => {
  console.error('❌ Failed to create activities:', err);
  process.exit(1);
});
