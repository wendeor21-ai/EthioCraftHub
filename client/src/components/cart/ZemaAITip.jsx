/**
 * ZemaAITip Component
 * 
 * Display AI-powered product recommendations based on cart contents
 * Features:
 * - Gradient background (amber-50 to orange-50)
 * - Sparkles icon in Ethiopian gold color
 * - Personalized recommendation messages
 * - 2px gold border with rounded corners
 */

import { SparklesIcon } from '@heroicons/react/24/outline';
import { useCustomTranslation } from '../../hooks/useCustomTranslation';

const ZemaAITip = ({ cartItems }) => {
  const { t } = useCustomTranslation();
  // Analyze cart items to generate recommendations
  const generateRecommendation = () => {
    if (!cartItems || cartItems.length === 0) {
      return null;
    }

    // Count categories in cart
    const categoryCount = {};
    cartItems.forEach(item => {
      const category = item.product.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Find dominant category
    const dominantCategory = Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b
    );

    // Map categories to complementary products using translation keys
    const recommendations = {
      'Textiles': t('ai_recommendations.textiles', 'Zema AI recommends adding a traditional scarf to complete your look!'),
      'Basketry': t('ai_recommendations.basketry', 'Zema AI suggests a handwoven basket to complement your collection!'),
      'Pottery': t('ai_recommendations.pottery', 'Zema AI thinks a coffee ceremony set would pair beautifully with your pottery!'),
      'Jewelry': t('ai_recommendations.jewelry', 'Zema AI recommends matching accessories to enhance your jewelry collection!'),
      'Leather Goods': t('ai_recommendations.leather_goods', 'Zema AI suggests a handcrafted wallet to complement your leather items!'),
      'Home Decor': t('ai_recommendations.home_decor', 'Zema AI recommends decorative wall art to complete your home collection!'),
    };

    return recommendations[dominantCategory] || t('ai_recommendations.default', 'Zema AI suggests exploring more authentic Ethiopian crafts!');
  };

  const recommendation = generateRecommendation();

  if (!recommendation) {
    return null;
  }

  return (
    <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-ethiopian-gold/20 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <SparklesIcon className="w-5 h-5 text-ethiopian-gold flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-gray-700 font-medium">
            {recommendation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ZemaAITip;
