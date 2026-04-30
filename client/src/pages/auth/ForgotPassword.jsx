import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authAPI } from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/**
 * Simple forgot password page.  Currently the backend does not
 * implement the endpoint, therefore the form will show a friendly
 * message if the request fails.  When the server is ready the
 * component will work out of the box.
 */
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('If an account exists we have sent a reset link to your email');
      setSent(true);
    } catch (err) {
      toast.error('Unable to send reset link. The feature may not be available yet.');
      // still mark sent so user doesn't retry indefinitely
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the email associated with your account and we'll send you a reset link.
          </p>
        </div>

        {!sent ? (
          <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-ethiopian-red to-ethiopian-orange hover:from-ethiopian-red hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? <LoadingSpinner size="small" color="white" /> : 'Send Reset Link'}
              </button>
            </div>
            <div className="text-center">
              <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-8 bg-white p-8 rounded-lg shadow-lg text-center">
            <p className="text-gray-700">
              If an account with that email exists, you will receive a password reset link shortly.
            </p>
            <div className="mt-4">
              <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
                Return to login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
