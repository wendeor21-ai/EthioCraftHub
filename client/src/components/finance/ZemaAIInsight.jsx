/**
 * ZemaAI Financial Insight Component
 * Displays AI-generated financial insights and recommendations
 */

import { useState, useEffect } from 'react';
import { SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import api from '../../utils/api';
import LoadingSpinner from '../common/LoadingSpinner';

const ZemaAIInsight = ({ insights, earningsByCategory }) => {
  const [aiInsight, setAiInsight] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await api.get('/earnings/insights');
      setAiInsight(response.data.data.insight);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setAiInsight('Unable to load financial insights at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900">ZemaAI Financial Insight</h3>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
              AI-Powered
            </span>
          </div>
          
          {loading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="small" />
              <span className="text-sm text-gray-600">Analyzing your earnings...</span>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{aiInsight}</p>
          )}

          {/* Category Breakdown */}
          {earningsByCategory && earningsByCategory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-900">Earnings by Category</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {earningsByCategory.slice(0, 3).map((category, index) => {
                  const total = earningsByCategory.reduce((sum, cat) => sum + cat.totalEarnings, 0);
                  const percentage = ((category.totalEarnings / total) * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="bg-white rounded-lg p-3 border border-purple-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{category._id}</span>
                        <span className="text-xs text-purple-600 font-semibold">{percentage}%</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {category.totalEarnings.toFixed(2)} ETB
                      </p>
                      <p className="text-xs text-gray-500">{category.totalSales} sales</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZemaAIInsight;
