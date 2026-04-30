import React from 'react';

const PromotionCard = ({ promotion, onToggleStatus, onDelete, onPreview }) => {
  const getStatus = () => {
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);

    if (promotion.status === 'inactive') return 'inactive';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';
    return 'active';
  };

  const status = getStatus();

  const getStatusBadge = () => {
    const badges = {
      active: { text: 'Active', color: '#10b981', bg: '#d1fae5' },
      scheduled: { text: 'Scheduled', color: '#3b82f6', bg: '#dbeafe' },
      expired: { text: 'Expired', color: '#9ca3af', bg: '#f3f4f6' },
      inactive: { text: 'Inactive', color: '#ef4444', bg: '#fee2e2' }
    };
    return badges[status];
  };

  const badge = getStatusBadge();

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDiscountDisplay = () => {
    if (promotion.discountType === 'percentage') {
      return `${promotion.discountValue}% OFF`;
    } else if (promotion.discountType === 'fixed') {
      return `${promotion.discountValue} ETB OFF`;
    } else {
      return `Code: ${promotion.couponCode}`;
    }
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const end = new Date(promotion.endDate);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="promotion-card">
      <div className="card-header">
        <div className="promotion-title">
          <h3>{promotion.name}</h3>
          <span className="status-badge" style={{ 
            color: badge.color, 
            background: badge.bg 
          }}>
            {badge.text}
          </span>
        </div>
        {promotion.urgencyBadge && status === 'active' && (
          <div className="urgency-badge">
            🔥 {promotion.badgeText || 'Limited Time!'}
          </div>
        )}
      </div>

      <div className="discount-display">
        <div className="discount-value">{getDiscountDisplay()}</div>
        {promotion.discountType === 'coupon' && (
          <div className="coupon-code">{promotion.couponCode}</div>
        )}
      </div>

      <div className="promotion-details">
        <div className="detail-row">
          <span className="label">Type:</span>
          <span className="value">{promotion.targetType === 'all' ? 'All Products' : 'Specific Products'}</span>
        </div>
        <div className="detail-row">
          <span className="label">Duration:</span>
          <span className="value">{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span>
        </div>
        {status === 'active' && (
          <div className="detail-row highlight">
            <span className="label">⏰ Time Left:</span>
            <span className="value">{getDaysRemaining()} days</span>
          </div>
        )}
      </div>

      {promotion.analytics && (
        <div className="analytics-section">
          <div className="analytics-title">📊 Performance (Real-Time)</div>
          <div className="analytics-grid">
            <div className="analytics-item">
              <div className="analytics-value">{promotion.analytics.totalSales || 0}</div>
              <div className="analytics-label">Sales</div>
            </div>
            <div className="analytics-item">
              <div className="analytics-value">{promotion.analytics.revenue || 0} ETB</div>
              <div className="analytics-label">Revenue</div>
            </div>
            <div className="analytics-item">
              <div className="analytics-value">{promotion.analytics.uses || 0}</div>
              <div className="analytics-label">Uses</div>
            </div>
          </div>
        </div>
      )}

      <div className="card-actions">
        <button className="btn-preview" onClick={() => onPreview(promotion)}>
          👁️ Preview
        </button>
        {status === 'active' && (
          <button 
            className="btn-toggle" 
            onClick={() => onToggleStatus(promotion._id, 'inactive')}
          >
            Pause
          </button>
        )}
        {(status === 'inactive' || status === 'scheduled') && (
          <button 
            className="btn-toggle active" 
            onClick={() => onToggleStatus(promotion._id, 'active')}
          >
            Activate
          </button>
        )}
        <button 
          className="btn-delete" 
          onClick={() => onDelete(promotion._id)}
        >
          🗑️
        </button>
      </div>

      <style>{`
        .promotion-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .promotion-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }

        .card-header {
          margin-bottom: 1rem;
        }

        .promotion-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .promotion-title h3 {
          font-size: 1.25rem;
          color: #1a1a1a;
          margin: 0;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .urgency-badge {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .discount-display {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 1rem;
        }

        .discount-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .coupon-code {
          background: rgba(255,255,255,0.2);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-family: monospace;
          font-size: 1.1rem;
          letter-spacing: 2px;
        }

        .promotion-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-row.highlight {
          background: #fef3c7;
          padding: 0.5rem;
          border-radius: 6px;
          border: none;
          margin-top: 0.5rem;
        }

        .label {
          color: #666;
          font-size: 0.9rem;
        }

        .value {
          color: #1a1a1a;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .analytics-section {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .analytics-title {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.75rem;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .analytics-item {
          text-align: center;
        }

        .analytics-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2563eb;
        }

        .analytics-label {
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-preview, .btn-toggle, .btn-delete {
          flex: 1;
          padding: 0.625rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .btn-preview {
          background: #f3f4f6;
          color: #1a1a1a;
        }

        .btn-preview:hover {
          background: #e5e7eb;
        }

        .btn-toggle {
          background: #fbbf24;
          color: white;
        }

        .btn-toggle.active {
          background: #10b981;
        }

        .btn-toggle:hover {
          opacity: 0.9;
        }

        .btn-delete {
          background: #fee2e2;
          color: #ef4444;
          flex: 0 0 auto;
          padding: 0.625rem 1rem;
        }

        .btn-delete:hover {
          background: #fecaca;
        }
      `}</style>
    </div>
  );
};

export default PromotionCard;
