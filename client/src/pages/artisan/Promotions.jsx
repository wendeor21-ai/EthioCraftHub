import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import PromotionCard from '../../components/promotions/PromotionCard';
import CreatePromotionModal from '../../components/promotions/CreatePromotionModal';
import PromotionPreview from '../../components/promotions/PromotionPreview';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const Promotions = () => {
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="promotions-page">
      <button className="back-button" onClick={() => navigate('/artisan/dashboard')}>
        ← Back to Dashboard
      </button>

      <div className="promotions-header">
        <div>
          <h1>Promotions & Discounts</h1>
          <p className="subtitle">Boost your sales with strategic promotions</p>
        </div>
        <div className="header-actions">
          <button className="btn-flash-sale" onClick={handleFlashSale}>
            ⚡ Quick Flash Sale
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Promotion
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="stats-grid">
        <div className="stat-card active">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <h3>{stats.active}</h3>
            <p>Active Promotions</p>
          </div>
        </div>
        <div className="stat-card scheduled">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>{stats.scheduled}</h3>
            <p>Scheduled</p>
          </div>
        </div>
        <div className="stat-card expired">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>{stats.expired}</h3>
            <p>Expired</p>
          </div>
        </div>
      </div>

      <div className="promotions-grid">
        {promotions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎁</div>
            <h3>No Promotions Yet</h3>
            <p>Create your first promotion to boost sales</p>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Promotion
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

      <style>{`
        .promotions-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          border: 2px solid #e5e7eb;
          color: #1a1a1a;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
        }

        .back-button:hover {
          background: #f9fafb;
          border-color: #2563eb;
          color: #2563eb;
          transform: translateX(-4px);
        }

        .promotions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .promotions-header h1 {
          font-size: 2rem;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #666;
          font-size: 0.95rem;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-flash-sale {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .btn-flash-sale:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
        }

        .btn-primary {
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid;
        }

        .stat-card.active {
          border-left-color: #10b981;
        }

        .stat-card.scheduled {
          border-left-color: #3b82f6;
        }

        .stat-card.expired {
          border-left-color: #9ca3af;
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 12px;
        }

        .stat-content h3 {
          font-size: 2rem;
          margin: 0;
          color: #1a1a1a;
        }

        .stat-content p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .promotions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #666;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .promotions-page {
            padding: 1rem;
          }

          .promotions-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-actions {
            width: 100%;
            flex-direction: column;
            gap: 0.5rem;
          }

          .btn-flash-sale, .btn-primary {
            width: 100%;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
          }

          .stat-card {
            padding: 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
            border-left: 3px solid;
            border-radius: 12px;
          }

          .stat-card.expired {
            grid-column: 1 / -1;
            flex-direction: row;
            align-items: center;
          }

          .stat-icon {
            width: 36px;
            height: 36px;
            font-size: 1.1rem;
            border-radius: 8px;
          }

          .stat-content h3 {
            font-size: 1.25rem;
          }

          .stat-content p {
            font-size: 0.75rem;
          }

          .promotions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Promotions;
