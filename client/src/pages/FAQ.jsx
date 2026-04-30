/**
 * FAQ Page for EthioCraft Global
 * 
 * Frequently Asked Questions with accordion-style display
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Search,
  Package,
  CreditCard,
  Truck,
  User,
  Shield,
  MessageCircle
} from 'lucide-react';

const FAQ = () => {
  const navigate = useNavigate();
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle, color: 'text-gray-600' },
    { id: 'orders', name: 'Orders', icon: Package, color: 'text-blue-600' },
    { id: 'payments', name: 'Payments', icon: CreditCard, color: 'text-green-600' },
    { id: 'shipping', name: 'Shipping', icon: Truck, color: 'text-amber-600' },
    { id: 'account', name: 'Account', icon: User, color: 'text-purple-600' },
    { id: 'security', name: 'Security', icon: Shield, color: 'text-red-600' }
  ];

  const faqs = [
    {
      id: 1,
      category: 'orders',
      question: 'How do I place an order?',
      answer: 'Browse our products, add items to your cart, and proceed to checkout. You\'ll need to create an account or log in to complete your purchase. Follow the checkout steps to enter your shipping information and payment details.'
    },
    {
      id: 2,
      category: 'orders',
      question: 'Can I cancel or modify my order?',
      answer: 'You can cancel or modify your order within 24 hours of placing it by contacting our support team. Once the order has been processed and shipped, cancellation is no longer possible, but you can return the item after delivery.'
    },
    {
      id: 3,
      category: 'orders',
      question: 'How do I track my order?',
      answer: 'Go to "My Orders" in your account menu and click on the "Track Order" button next to your order. You\'ll see real-time updates on your order status and estimated delivery date.'
    },
    {
      id: 4,
      category: 'payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept major credit cards (Visa, Mastercard, American Express), debit cards, and mobile money payments. All transactions are encrypted and secure.'
    },
    {
      id: 5,
      category: 'payments',
      question: 'Is my payment information secure?',
      answer: 'Yes! We use industry-standard SSL encryption to protect your payment information. We never store your full credit card details on our servers. All payments are processed through secure payment gateways.'
    },
    {
      id: 6,
      category: 'payments',
      question: 'How do refunds work?',
      answer: 'Refunds are processed within 7-10 business days after we receive your returned item. The refund will be credited to your original payment method. Contact support to initiate a return and refund request.'
    },
    {
      id: 7,
      category: 'shipping',
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 5-7 business days within Ethiopia. International shipping takes 10-15 business days depending on the destination. Express shipping options are available at checkout.'
    },
    {
      id: 8,
      category: 'shipping',
      question: 'Do you ship internationally?',
      answer: 'Yes! We ship to select countries worldwide. Shipping costs and delivery times vary by destination. Check availability and rates at checkout by entering your shipping address.'
    },
    {
      id: 9,
      category: 'shipping',
      question: 'What if my package is lost or damaged?',
      answer: 'If your package is lost or arrives damaged, please contact our support team within 48 hours of the expected delivery date. We\'ll investigate and arrange for a replacement or full refund.'
    },
    {
      id: 10,
      category: 'account',
      question: 'How do I create an account?',
      answer: 'Click the "Join EthioCraft" or "Register" button in the navigation menu. Fill in your details including name, email, and password. You\'ll receive a confirmation email to verify your account.'
    },
    {
      id: 11,
      category: 'account',
      question: 'I forgot my password. What should I do?',
      answer: 'Click "Forgot Password" on the login page. Enter your email address and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.'
    },
    {
      id: 12,
      category: 'account',
      question: 'How do I update my profile information?',
      answer: 'Log in to your account and go to "Account Settings" or "Edit Profile" from the user menu. You can update your name, phone number, and other preferences. Email changes may require verification.'
    },
    {
      id: 13,
      category: 'security',
      question: 'How do I change my password?',
      answer: 'Go to "Security" in your account menu. Enter your current password, then your new password twice to confirm. Your password must be at least 8 characters long for security.'
    },
    {
      id: 14,
      category: 'security',
      question: 'Is my personal information safe?',
      answer: 'Yes! We take data privacy seriously. Your personal information is encrypted and stored securely. We never share your data with third parties without your consent. Read our Privacy Policy for more details.'
    },
    {
      id: 15,
      category: 'security',
      question: 'How do I delete my account?',
      answer: 'To delete your account, please contact our support team. Account deletion is permanent and cannot be undone. All your data will be removed from our systems within 30 days.'
    }
  ];

  const toggleQuestion = (id) => {
    setOpenQuestion(openQuestion === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
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
            <HelpCircle className="w-10 h-10 mr-3 text-purple-600" />
            Frequently Asked Questions
          </h1>
          <p className="text-gray-600">Find quick answers to common questions</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filter by Category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${selectedCategory === category.id ? 'text-white' : category.color}`} />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md"
                >
                  <button
                    onClick={() => toggleQuestion(faq.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-800 text-lg pr-4">
                      {faq.question}
                    </span>
                    {openQuestion === faq.id ? (
                      <ChevronUp className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openQuestion === faq.id && (
                    <div className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-200 animate-fade-in">
                      <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No FAQs found matching your search.</p>
              <p className="text-gray-500 text-sm mt-2">Try different keywords or browse all categories</p>
            </div>
          )}
        </div>

        {/* ZemaAI CTA */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl shadow-lg p-8 mt-8 text-center text-white">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🤖</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">Try Zema AI Assistant</h3>
          <p className="mb-6 opacity-90">Get instant answers powered by AI! Zema can help you with product recommendations, order questions, and more.</p>
          <button
            onClick={() => navigate('/zema-ai')}
            className="px-8 py-3 bg-white text-orange-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg"
          >
            Chat with Zema AI
          </button>
        </div>

        {/* Contact Support CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-8 mt-6 text-center text-white">
          <MessageCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Still have questions?</h3>
          <p className="mb-6 opacity-90">Can't find what you're looking for? We're here to help!</p>
          <button
            onClick={() => navigate('/contact-support')}
            className="px-8 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
