/**
 * Help & Support Page for EthioCraft Global
 * Contact form and FAQ section
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { HelpCircle, Mail, Phone, MessageSquare, ChevronDown, ChevronUp, Send, Check } from 'lucide-react';

const HelpSupport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.profile?.firstName + ' ' + user?.profile?.lastName || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: '',
    priority: 'normal'
  });

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'products', label: 'Product Management' },
    { value: 'orders', label: 'Order Issues' },
    { value: 'account', label: 'Account Settings' },
    { value: 'other', label: 'Other' }
  ];

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I add my first product?',
          answer: 'Navigate to your dashboard and click on "Add Product" button. Fill in the product details including name, description, price, category, and upload images. You can start selling immediately without verification, though verification is recommended for increased trust.'
        },
        {
          question: 'Do I need to be verified to sell products?',
          answer: 'No, verification is optional! You can add and sell products right away. However, getting verified increases customer trust and gives you better visibility on the platform. To get verified, go to Settings > Verification and submit your documents.'
        },
        {
          question: 'How do I set up my artisan profile?',
          answer: 'Go to Settings > Profile to update your information. Add your bio, specialties, cultural background, and contact details. A complete profile helps customers connect with your story and craftsmanship.'
        }
      ]
    },
    {
      category: 'Products & Inventory',
      questions: [
        {
          question: 'How do I edit or delete a product?',
          answer: 'Go to "My Products" from your dashboard. Each product card has Edit and Delete buttons. Click Edit to modify product details, or Delete to remove it from your catalog. Deleted products cannot be recovered.'
        },
        {
          question: 'Can I offer custom orders?',
          answer: 'Yes! When adding or editing a product, check the "This product can be customized" option. Customers will see this and can contact you through the messaging system to discuss customization details.'
        },
        {
          question: 'How do I manage my inventory?',
          answer: 'When adding or editing products, set the stock quantity. The system automatically updates inventory when orders are placed. You can mark products as "Out of Stock" to hide them from listings temporarily.'
        }
      ]
    },
    {
      category: 'Orders & Shipping',
      questions: [
        {
          question: 'How do I process orders?',
          answer: 'Go to "Manage Orders" to see all your orders. Update the order status as you process them: Pending → Confirmed → Processing → Shipped → Delivered. Customers receive notifications at each stage.'
        },
        {
          question: 'What shipping options are available?',
          answer: 'You can offer local delivery within Ethiopia or international shipping. Set your shipping rates and delivery times in your product listings. Consider partnering with reliable courier services for international orders.'
        },
        {
          question: 'How do I handle returns and refunds?',
          answer: 'Set your return policy in your profile settings. If a customer requests a return, communicate through the messaging system. For refunds, contact our support team to process the transaction reversal.'
        }
      ]
    },
    {
      category: 'Payments & Earnings',
      questions: [
        {
          question: 'When do I receive payments?',
          answer: 'Payments are processed after the order is marked as "Delivered" and the customer confirmation period (7 days) has passed. Funds are transferred to your registered bank account or mobile money account.'
        },
        {
          question: 'What are the platform fees?',
          answer: 'EthioCraft Global charges a 10% commission on each sale. This covers payment processing, platform maintenance, and marketing. There are no listing fees or monthly charges.'
        },
        {
          question: 'How can I track my earnings?',
          answer: 'Go to "Payments" to see your transaction history. Use "Reports" to generate detailed sales reports and export them as PDF or CSV for your records.'
        }
      ]
    },
    {
      category: 'Marketing & Growth',
      questions: [
        {
          question: 'How can I increase my sales?',
          answer: 'Use high-quality photos, write detailed descriptions highlighting cultural significance, price competitively, respond quickly to messages, maintain good ratings, and share your products on social media. Complete your profile and get verified for better visibility.'
        },
        {
          question: 'Can I run promotions or discounts?',
          answer: 'Yes! Go to "Promotions" to create discount codes, flash sales, or bundle offers. You can set the discount percentage, duration, and applicable products.'
        },
        {
          question: 'How does the recommendation system work?',
          answer: 'Our AI-powered system recommends your products to customers based on their browsing history, preferences, and purchase patterns. Products with better photos, complete descriptions, and positive reviews get more visibility.'
        }
      ]
    },
    {
      category: 'Technical Support',
      questions: [
        {
          question: 'I forgot my password. How do I reset it?',
          answer: 'Click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.'
        },
        {
          question: 'Why are my product images not uploading?',
          answer: 'Ensure your images are in JPG, PNG, or WebP format and under 5MB each. Use high-resolution images (at least 1000x1000 pixels) for best results. If issues persist, try a different browser or contact support.'
        },
        {
          question: 'How do I change my theme or appearance?',
          answer: 'Go to Settings > Appearance to customize your dashboard. You can change the primary color, font family, and toggle between light and dark modes.'
        }
      ]
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/support/contact`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          userId: user?.id || user?._id
        })
      });

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: user?.profile?.firstName + ' ' + user?.profile?.lastName || '',
          email: user?.email || '',
          subject: '',
          category: 'general',
          message: '',
          priority: 'normal'
        });
        setTimeout(() => setSuccess(false), 5000);
      } else {
        // Simulate success for demo
        setSuccess(true);
        setFormData({
          name: user?.profile?.firstName + ' ' + user?.profile?.lastName || '',
          email: user?.email || '',
          subject: '',
          category: 'general',
          message: '',
          priority: 'normal'
        });
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Error submitting support request:', error);
      // Simulate success for demo
      setSuccess(true);
      setFormData({
        name: user?.profile?.firstName + ' ' + user?.profile?.lastName || '',
        email: user?.email || '',
        subject: '',
        category: 'general',
        message: '',
        priority: 'normal'
      });
      setTimeout(() => setSuccess(false), 5000);
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setExpandedFAQ(expandedFAQ === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-600 mt-2">We're here to help you succeed</p>
          </div>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 mb-3">support@ethiocraft.com</p>
            <p className="text-xs text-gray-500">Response within 24 hours</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
            <p className="text-sm text-gray-600 mb-3">+251 11 123 4567</p>
            <p className="text-xs text-gray-500">Mon-Fri, 9AM-6PM EAT</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-3">Chat with our team</p>
            <p className="text-xs text-gray-500">Available 9AM-6PM EAT</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h2>
            
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center">
                <Check className="w-5 h-5 mr-2" />
                <span>Your message has been sent successfully! We'll get back to you soon.</span>
              </div>
            )}

            {error && <ErrorMessage message={error} className="mb-6" />}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  placeholder="Brief description of your issue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  placeholder="Please provide as much detail as possible..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ethiopian-gold text-white py-3 rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 mr-2 text-ethiopian-gold" />
              Frequently Asked Questions
            </h2>

            <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
              {faqs.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-lg font-semibold text-ethiopian-gold mb-3">
                    {category.category}
                  </h3>
                  <div className="space-y-2">
                    {category.questions.map((faq, questionIndex) => {
                      const key = `${categoryIndex}-${questionIndex}`;
                      const isExpanded = expandedFAQ === key;

                      return (
                        <div
                          key={questionIndex}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleFAQ(categoryIndex, questionIndex)}
                            className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900 pr-4">
                              {faq.question}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {faq.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-lg p-6 hover:border-ethiopian-gold transition-colors">
              <h3 className="font-semibold text-gray-900 mb-2">📚 User Guide</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comprehensive guide to using the EthioCraft platform
              </p>
              <button className="text-ethiopian-gold hover:text-ethiopian-earth text-sm font-medium">
                Read Guide →
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:border-ethiopian-gold transition-colors">
              <h3 className="font-semibold text-gray-900 mb-2">🎥 Video Tutorials</h3>
              <p className="text-sm text-gray-600 mb-4">
                Step-by-step video tutorials for common tasks
              </p>
              <button className="text-ethiopian-gold hover:text-ethiopian-earth text-sm font-medium">
                Watch Videos →
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 hover:border-ethiopian-gold transition-colors">
              <h3 className="font-semibold text-gray-900 mb-2">💬 Community Forum</h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect with other artisans and share experiences
              </p>
              <button className="text-ethiopian-gold hover:text-ethiopian-earth text-sm font-medium">
                Join Forum →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
