const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/EthioCraft').then(async () => {
  const OrderSchema = new mongoose.Schema({ payment: Object, status: String, commissionStatus: String }, { strict: false });
  const Order = mongoose.model('Order', OrderSchema, 'orders');
  const all = await Order.find({ 'payment.method': { $exists: true } }).select('payment.method status commissionStatus shipping.deliveryStatus').lean();
  console.log(JSON.stringify(all, null, 2));
  process.exit();
});
