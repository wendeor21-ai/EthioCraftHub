/**
 * Help Center Page for EthioCraft Global
 * 
 * Search and browse help articles by category
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ArrowLeft, 
  HelpCircle,
  Package,
  CreditCard,
  Truck,
  User,
  FileText,
  ChevronRight
} from 'lucide-react';

const HelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    {
      id: 'orders',
      title: 'Orders',
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      articles: [
        { id: 1, title: 'How to place an order', content: 'Browse products, add to cart, and proceed to checkout...' },
        { id: 2, title: 'How to track my order', content: 'Go to My Orders and click Track Order button...' },
        { id: 3, title: 'How to cancel an order', content: 'Contact support within 24 hours of placing order...' },
        { id: 4, title: 'Order status meanings', content: 'Pending, Processing, Shipped, Delivered explained...' }
      ]
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: CreditCard,
      color: 'from-green-500 to-green-600',
      articles: [
        { id: 5, title: 'Payment methods accepted', content: 'We accept credit cards, debit cards, and mobile money...' },
        { id: 6, title: 'How to request a refund', content: 'Contact support with order number within 7 days...' },
        { id: 7, title: 'Payment security', content: 'All payments are encrypted and secure...' },
        { id: 8, title: 'Failed payment troubleshooting', content: 'Check card details, balance, and try again...' }
      ]
    },
    {
      id: 'shipping',
      title: 'Shipping',
      icon: Truck,
      color: 'from-amber-500 to-amber-600',
      articles: [
        { id: 9, title: 'Shipping costs and delivery time', content: 'Standard shipping takes 5-7 business days...' },
        { id: 10, title: 'How to change shipping address', content: 'Contact support before order is shipped...' },
        { id: 11, title: 'International shipping', content: 'We ship to select countries, check availability...' },
        { id: 12, title: 'Lost or damaged packages', content: 'Report within 48 hours of delivery...' }
      ]
    },
    {
      id: 'account',
      title: 'Account',
      icon: User,
      color: 'from-purple-500 to-purple-600',
      articles: [
        { id: 13, title: 'How to create an account', content: 'Click Register and fill in your details...' },
        { id: 14, title: 'How to reset password', content: 'Click Forgot Password on login page...' },
        { id: 15, title: 'How to update profile', content: 'Go to Account Settings and edit your information...' },
        { id: 16, title: 'How to delete account', content: 'Contact support to request account deletion...' }
      ]
    }
  ];

  const allArticles = categories.flatMap(cat => 
    cat.articles.map(article => ({ ...article, category: cat.title, categoryId: cat.id }))
  );

  const filteredArticles = searchQuery
    ? allArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center">
            <HelpCircle className="w-10 h-10 mr-3 text-blue-600" />
            Help Center
          </h1>
          <p className="text-gray-600">Find answers to your questions</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Search Results ({filteredArticles.length})
            </h2>
            {filteredArticles.length > 0 ? (
              <div className="space-y-3">
                {filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{article.content}</p>
                        <span className="text-xs text-blue-600 font-medium">
                          {article.category}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No help articles found.</p>
                <p className="text-gray-500 text-sm mt-2">Try different keywords or browse categories below</p>
              </div>
            )}
          </div>
        )}

        {/* Categories or Articles */}
        {!selectedCategory ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className={`h-2 bg-gradient-to-r ${category.color}`}></div>
                  <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800">{category.title}</h3>
                        <p className="text-gray-600 text-sm">{category.articles.length} articles</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                    <div className="space-y-2">
                      {category.articles.slice(0, 3).map((article) => (
                        <div key={article.id} className="text-sm text-gray-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          {article.title}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-4 mb-6">
              {(() => {
                const Icon = selectedCategory.icon;
                return (
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                );
              })()}
              <div>
                <h2 className="text-3xl font-bold text-gray-800">{selectedCategory.title}</h2>
                <p className="text-gray-600">{selectedCategory.articles.length} articles</p>
              </div>
            </div>
            <div className="space-y-4">
              {selectedCategory.articles.map((article) => (
                <div
                  key={article.id}
                  className="p-6 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-3">{article.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{article.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Support CTA */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-8 mt-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
          <p className="mb-6 opacity-90">Our support team is here to assist you</p>
          <button
            onClick={() => navigate('/contact-support')}
            className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold shadow-lg"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;
