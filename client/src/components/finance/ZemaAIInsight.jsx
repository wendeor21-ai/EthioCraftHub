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
    <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/80 border border-purple-100 rounded-xl p-3.5 sm:p-4 mb-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">ZemaAI Financial Insight</h3>
            <span className="px-2 py-0.5 bg-purple-100/80 text-purple-700 text-[10px] rounded-full font-bold uppercase tracking-wider shrink-0">
              AI-Powered
            </span>
          </div>
          
          {loading ? (
            <div className="flex items-center gap-2 py-0.5">
              <LoadingSpinner size="small" />
              <span className="text-xs text-gray-500">Analyzing your earnings...</span>
            </div>
          ) : (
            <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed">{aiInsight}</p>
          )}

          {/* Category Breakdown */}
          {earningsByCategory && earningsByCategory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-100">
              <div className="flex items-center gap-1.5 mb-2">
                <ChartBarIcon className="w-4 h-4 text-purple-600 shrink-0" />
                <h4 className="text-xs font-bold text-gray-800">Earnings by Category</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {earningsByCategory.slice(0, 3).map((category, index) => {
                  const total = earningsByCategory.reduce((sum, cat) => sum + cat.totalEarnings, 0);
                  const percentage = ((category.totalEarnings / total) * 100).toFixed(1);
                  
                  return (
                    <div key={index} className="bg-white rounded-lg p-2.5 border border-purple-100 shadow-2xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-gray-700 truncate">{category._id}</span>
                        <span className="text-[10px] text-purple-600 font-bold ml-1">{percentage}%</span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-gray-900">
                        {category.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-gray-500 font-medium">ETB</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{category.totalSales} sales</p>
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
