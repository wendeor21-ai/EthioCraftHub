/**
 * Payment Success Page for EthioCraft Global
 * 
 * Displays order confirmation after successful payment
 * Features:
 * - Order confirmation message
 * - Order details display
 * - Next steps guidance
 * - Links to order tracking and shopping
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircleIcon, 
  ShoppingBagIcon,
  TruckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('tx_ref');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (txRef) {
      verifyPayment();
    } else {
      setError('Invalid payment reference');
      setLoading(false);
    }
  }, [txRef]);

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('authToken'); // Fixed: Use 'authToken' key

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const origin = apiUrl.replace(/\/api\/?$/, "");
      const response = await fetch(`${origin}/api/payment/verify/${txRef}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setOrder(data.data.order);
      } else {
        setError(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Failed to verify payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/cart')}
              className="w-full btn-ethiopian"
            >
              Return to Cart
            </button>
            <button
              onClick={() => navigate('/support')}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Success Icon and Message */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            Thank you for your order. Your payment has been processed successfully.
          </p>

          {order && (
            <div className="bg-ethiopian-cream rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-ethiopian-gold">
                {order.orderNumber}
              </p>
            </div>
          )}

          {/* Zema AI Message */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-ethiopian-gold/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <SparklesIcon className="w-5 h-5 text-ethiopian-gold" />
              <h3 className="font-semibold text-gray-900">Zema AI</h3>
            </div>
            <p className="text-sm text-gray-700">
              Your order has been verified and confirmed. Thank you for supporting Ethiopian artisans 
              and preserving our rich cultural heritage!
            </p>
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Items</span>
                <span className="font-medium">{order.itemCount} items</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Order Date</span>
                <span className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Status</span>
                <span className="font-medium text-green-600 capitalize">{order.status}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Total Amount</span>
                <span className="text-xl font-bold text-ethiopian-gold">
                  {order.total} ETB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Next?</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Order Confirmation</h3>
                <p className="text-sm text-gray-600">
                  You'll receive an email confirmation with your order details shortly.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Artisan Preparation</h3>
                <p className="text-sm text-gray-600">
                  Our artisans will carefully prepare your items for shipment.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-ethiopian-gold text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delivery</h3>
                <p className="text-sm text-gray-600">
                  Your order will be delivered to your specified address within 5-7 business days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="btn-ethiopian flex items-center justify-center space-x-2"
          >
            <TruckIcon className="w-5 h-5" />
            <span>Track Order</span>
          </button>
          
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 border-2 border-ethiopian-gold text-ethiopian-gold rounded-lg hover:bg-ethiopian-gold hover:text-white transition-colors flex items-center justify-center space-x-2"
          >
            <ShoppingBagIcon className="w-5 h-5" />
            <span>Continue Shopping</span>
          </button>
        </div>

        {/* Support Link */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm">
            Need help?{' '}
            <button
              onClick={() => navigate('/support')}
              className="text-ethiopian-gold hover:text-ethiopian-earth font-medium"
            >
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
