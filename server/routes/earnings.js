/**
 * Earnings Routes for EthioCraft Global
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const earningsController = require('../controllers/earningsController');

const router = express.Router();
const path = require('path');
const multer = require('multer');

// Configure multer for commission receipts
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `commission-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Artisan routes
router.get('/dashboard', authenticate, authorize('artisan'), earningsController.getDashboard);
router.get('/transactions', authenticate, authorize('artisan'), earningsController.getTransactions);
router.get('/withdrawals', authenticate, authorize('artisan'), earningsController.getWithdrawals);
router.post('/withdraw', authenticate, authorize('artisan'), earningsController.createWithdrawal);
router.get('/insights', authenticate, authorize('artisan'), earningsController.getInsights);

// New Commission Payment routes for Artisans
router.get('/commission-debt', authenticate, authorize('artisan'), earningsController.getCommissionDebt);
router.get('/commission-history', authenticate, authorize('artisan'), earningsController.getCommissionHistory);
router.post('/commission-payment', authenticate, authorize('artisan'), upload.single('receiptImage'), earningsController.submitCommissionPayment);

// System/Admin routes
router.post('/sale', authenticate, authorize('admin'), earningsController.recordSale);

module.exports = router;
