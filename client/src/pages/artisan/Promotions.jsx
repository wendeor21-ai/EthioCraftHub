import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PromotionCard from '../../components/promotions/PromotionCard';
import CreatePromotionModal from '../../components/promotions/CreatePromotionModal';
import PromotionPreview from '../../components/promotions/PromotionPreview';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const Promotions = ({ insideDashboard = false, onSelectTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [stats, setStats] = useState({ active: 0, scheduled: 0, expired: 0 });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/promotions/artisan/${user._id}`);
      console.log('📊 Fetched promotions:', response.data);
      setPromotions(response.data);
      calculateStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load promotions');
      console.error('❌ Error fetching promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/products/artisan/${user._id}?includeAll=true`);
      // API returns { products: [...], pagination: {...} }
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setProducts([]);
    }
  };

  const calculateStats = (promos) => {
    const now = new Date();
    let active = 0;
    let scheduled = 0;
    let expired = 0;

    console.log('📊 Calculating stats for', promos.length, 'promotions at', now.toISOString());

    promos.forEach(p => {
      const startDate = new Date(p.startDate);
      const endDate = new Date(p.endDate);

      console.log(`Promotion "${p.name}": start=${startDate.toISOString()}, end=${endDate.toISOString()}`);

      // Simple logic: check dates only
      if (endDate < now) {
        expired++;
        console.log(`  → Expired (end date ${endDate.toISOString()} < now ${now.toISOString()})`);
      } else if (startDate > now) {
        scheduled++;
        console.log(`  → Scheduled (start date ${startDate.toISOString()} > now ${now.toISOString()})`);
      } else {
        active++;
        console.log(`  → Active (between start and end)`);
      }
    });

    console.log('📊 Final stats:', { active, scheduled, expired });
    setStats({ active, scheduled, expired });
  };

  const handleCreatePromotion = async (promotionData) => {
    try {
      console.log('Creating promotion with data:', promotionData);
      const response = await api.post('/promotions', promotionData);
      console.log('Promotion created successfully:', response.data);

      setPromotions([response.data, ...promotions]);
      calculateStats([response.data, ...promotions]);
      setShowCreateModal(false);

      // Show success message
      alert(`✅ Promotion "${response.data.name}" created successfully!\n\n` +
        `${response.data.targetType === 'all' ? 'All products' : 'Selected products'} have been updated with the discount.\n\n` +
        `Analytics will update automatically as customers make purchases.\n\n` +
        `Refresh the Products page to see the discounts.`);
    } catch (err) {
      console.error('❌ Error creating promotion:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create promotion';
      alert(`❌ Error: ${errorMessage}\n\nPlease check the console for details.`);
      // Don't throw - just show error and keep modal open
    }
  };

  const handleToggleStatus = async (promotionId, newStatus) => {
    try {
      const response = await api.patch(`/promotions/${promotionId}/status`, { status: newStatus });
      setPromotions(promotions.map(p => p._id === promotionId ? response.data : p));
      calculateStats(promotions.map(p => p._id === promotionId ? response.data : p));
    } catch (err) {
      alert('Failed to update promotion status');
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;

    try {
      await api.delete(`/promotions/${promotionId}`);
      const updated = promotions.filter(p => p._id !== promotionId);
      setPromotions(updated);
      calculateStats(updated);
    } catch (err) {
      alert('Failed to delete promotion');
    }
  };

  const handleFlashSale = () => {
    const flashSaleData = {
      name: '24-Hour Flash Sale',
      discountType: 'percentage',
      discountValue: 30,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      targetType: 'all',
      urgencyBadge: true,
      badgeText: 'Flash Sale - 24 Hours Only!',
      artisanId: user._id,
      status: 'active'
    };
    handleCreatePromotion(flashSaleData);
  };

  if (loading) return <LoadingSpinner size="medium" />;

  return (
    <div className={insideDashboard ? "pb-6" : "min-h-screen bg-gray-50 py-6"}>
      <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"}>
        {!insideDashboard && (
          <button
            onClick={() => navigate('/artisan/dashboard')}
            className="text-ethiopian-gold hover:text-ethiopian-earth mb-2 text-xs font-medium"
          >
            ← Back to Dashboard
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2.5 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Promotions & Discounts</h1>
            <p className="text-xs text-gray-500 mt-0.5">Boost your sales with strategic promotions</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleFlashSale}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <span>⚡</span> Quick Flash Sale
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <span>+</span> Create Promotion
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Active Promotions</p>
                <p className="text-base sm:text-lg font-black text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                ✓
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Scheduled</p>
                <p className="text-base sm:text-lg font-black text-blue-600 mt-1">{stats.scheduled}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs sm:text-sm shrink-0">
                📅
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 hover:shadow transition-shadow border-l-4 border-l-gray-400 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 truncate">Expired</p>
                <p className="text-base sm:text-lg font-black text-gray-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center text-xs sm:text-sm shrink-0">
                ⏰
              </div>
            </div>
          </div>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
          {promotions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center col-span-full">
              <div className="text-3xl mb-2">🎁</div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">No Promotions Yet</h3>
              <p className="text-xs text-gray-500 mb-3">Create your first promotion to boost sales</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                + Create Promotion
              </button>
            </div>
          ) : (
            promotions.map(promotion => (
              <PromotionCard
                key={promotion._id}
                promotion={promotion}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDeletePromotion}
                onPreview={setSelectedPromotion}
              />
            ))
          )}
        </div>

        {showCreateModal && (
          <CreatePromotionModal
            products={products}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreatePromotion}
            artisanId={user._id}
          />
        )}

        {selectedPromotion && (
          <PromotionPreview
            promotion={selectedPromotion}
            products={products}
            onClose={() => setSelectedPromotion(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Promotions;
