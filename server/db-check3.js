const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ethiocraft_global').then(async () => {
  const OrderSchema = new mongoose.Schema({}, { strict: false });
  const Order = mongoose.model('Order', OrderSchema, 'orders');
  const all = await Order.find({ 'payment.method': { $in: ["Manual", "MANUAL", "COD", "cash_on_delivery", "CASH_ON_DELIVERY", "cod"] } }).select('payment.method status commissionStatus shipping.deliveryStatus').lean();
  console.log("MATCHING ORDERS:", JSON.stringify(all, null, 2));
  process.exit();
});
