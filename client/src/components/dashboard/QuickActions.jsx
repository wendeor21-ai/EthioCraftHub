/**
 * Quick Actions Component for Artisan Dashboard
 * 
 * Provides quick access to common actions:
 * - Ask Zema for Sales Advice
 * - Check New Orders
 * - Update Product Prices
 */

import { useNavigate } from 'react-router-dom';
import { 
  SparklesIcon, 
  ShoppingBagIcon, 
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const QuickActions = ({ orderCount = 0, productCount = 0 }) => {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'zema-advice',
      title: 'Ask Zema for Sales Advice',
      description: 'Get AI-powered insights on your products',
      icon: SparklesIcon,
      color: 'from-purple-500 to-pink-500',
      badge: 'AI',
      onClick: () => navigate('/zema-ai', { 
        state: { 
          initialMessage: 'Give me sales advice for my products. What should I focus on?' 
        } 
      })
    },
    {
      id: 'check-orders',
      title: 'Check New Orders',
      description: 'View and manage your recent orders',
      icon: ShoppingBagIcon,
      color: 'from-blue-500 to-cyan-500',
      badge: orderCount > 0 ? orderCount : null,
      onClick: () => navigate('/dashboard/orders')
    },
    {
      id: 'update-prices',
      title: 'Update Product Prices',
      description: 'Adjust pricing for your products',
      icon: CurrencyDollarIcon,
      color: 'from-green-500 to-emerald-500',
      badge: productCount > 0 ? productCount : null,
      onClick: () => navigate('/dashboard/products')
    },
    {
      id: 'view-analytics',
      title: 'View Analytics',
      description: 'See your sales performance and trends',
      icon: ChartBarIcon,
      color: 'from-orange-500 to-red-500',
      badge: null,
      onClick: () => navigate('/dashboard/analytics')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="text-sm text-gray-500">
          {productCount} products • {orderCount} orders
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-ethiopian-gold transition-all duration-300 p-4 text-left hover:shadow-lg"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${action.color} text-white`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  {action.badge && (
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-ethiopian-red rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>
                
                <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-ethiopian-gold transition-colors">
                  {action.title}
                </h3>
                
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </div>
              
              {/* Hover Arrow */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <svg className="w-5 h-5 text-ethiopian-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-ethiopian-gold">{productCount}</div>
            <div className="text-xs text-gray-600">Active Products</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{orderCount}</div>
            <div className="text-xs text-gray-600">Pending Orders</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {productCount > 0 ? Math.round((orderCount / productCount) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-600">Order Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
