const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/ethiocraft_global').then(async () => {
  const OrderSchema = new mongoose.Schema({ payment: Object, status: String, commissionStatus: String }, { strict: false });
  const Order = mongoose.model('Order', OrderSchema, 'orders');
  const all = await Order.find({ 'payment.method': { $in: ["Manual", "MANUAL", "COD", "cash_on_delivery", "CASH_ON_DELIVERY"] } }).select('payment.method status commissionStatus shipping.deliveryStatus totals').lean();
  console.log(JSON.stringify(all, null, 2));
  process.exit();
});
