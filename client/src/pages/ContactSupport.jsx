/**
 * Contact Support Page for EthioCraft Global
 * 
 * Submit support requests with form validation
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Mail, 
  User, 
  FileText,
  Send,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supportAPI } from '../utils/api';

const ContactSupport = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { user } = useAuth();
  const [userMessages, setUserMessages] = useState([]);

  const supportCategories = [
    'Order Issue',
    'Payment Problem',
    'Shipping Inquiry',
    'Account Help',
    'Product Question',
    'Technical Issue',
    'Other'
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        subject: formData.subject,
        message: formData.message
      };

      const response = await supportAPI.sendMessage(payload);

      console.log('📧 Support request submitted:', response.data);
      setIsSubmitted(true);
      toast.success('Support request submitted successfully!');

      // Refresh user's messages
      fetchUserMessages();

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting support request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchUserMessages = async () => {
    try {
      const res = await supportAPI.getMessages();
      const msgs = res.data.messages || [];
      setUserMessages(msgs);

      // mark replied messages as read (do in parallel and handle errors)
      await Promise.all(msgs.map(async (m) => {
        if (m.status === 'Replied' && !m.read) {
          try {
            await supportAPI.markRead(m._id);
          } catch (err) {
            console.error('Failed to mark message read for user', m._id, err.response?.status || err.message);
          }
        }
      }));
    } catch (err) {
      console.error('Failed to load user messages', err);
    }
  };

  useEffect(() => {
    if (user) fetchUserMessages();
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center">
            <MessageCircle className="w-10 h-10 mr-3 text-blue-600" />
            Contact Support
          </h1>
          <p className="text-gray-600">We're here to help! Send us a message and we'll respond as soon as possible.</p>
        </div>

        {isSubmitted ? (
          // Success State
          <div className="bg-white rounded-xl shadow-lg p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Request Submitted!</h2>
            <p className="text-gray-600 text-lg mb-2">
              Thank you for contacting us. We've received your message.
            </p>
            <p className="text-gray-500 mb-8">
              Our support team will get back to you within 24-48 hours.
            </p>
            <button
              onClick={() => navigate('/help-center')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Back to Help Center
            </button>
          </div>
        ) : (
          // Contact Form
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Subject Field */}
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Subject
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.subject ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  {supportCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
                )}
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="6"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                    errors.message ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Please describe your issue or question in detail..."
                ></textarea>
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  {formData.message.length} characters (minimum 10)
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center space-x-2 ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* User's Previous Requests */}
        {userMessages && userMessages.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Your Previous Requests</h3>
            <div className="space-y-4">
              {userMessages.map((m) => (
                <div key={m._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{m.subject}</div>
                    <div className="text-sm text-gray-500">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-gray-700 mb-2 whitespace-pre-wrap">{m.message}</div>
                  {m.status === 'New' ? (
                    <div className="text-xs inline-block bg-amber-100 text-amber-800 px-2 py-1 rounded">New</div>
                  ) : (
                    <div className="mt-3 bg-green-50 border-l-4 border-green-400 p-3 rounded">
                      <div className="text-sm font-semibold text-green-800">Response from Support</div>
                      <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{m.adminResponse}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Quick Response</h3>
            <p className="text-gray-600 mb-4">
              Most support requests are answered within 24 hours during business days.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-amber-500">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Need Immediate Help?</h3>
            <p className="text-gray-600 mb-4">
              Check our <button onClick={() => navigate('/help-center')} className="text-blue-600 hover:underline font-semibold">Help Center</button> for instant answers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
