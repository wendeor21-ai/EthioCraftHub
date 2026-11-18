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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 sm:p-4 hover:shadow transition-shadow flex flex-col justify-between">
      <div>
        <div className="mb-2">
          <div className="flex justify-between items-center gap-2 mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{promotion.name}</h3>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.text}
            </span>
          </div>
          {promotion.urgencyBadge && status === 'active' && (
            <div className="text-[10px] font-bold text-white px-2 py-0.5 rounded bg-gradient-to-r from-red-500 to-rose-600 animate-pulse text-center inline-block mt-0.5">
              🔥 {promotion.badgeText || 'Limited Time!'}
            </div>
          )}
        </div>

        {/* Discount Display */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-2.5 sm:p-3 text-center my-2.5 shadow-2xs">
          <div className="text-base sm:text-lg font-black tracking-tight">{getDiscountDisplay()}</div>
          {promotion.discountType === 'coupon' && (
            <div className="text-[11px] font-mono tracking-widest bg-white/20 px-2 py-0.5 rounded mt-1 inline-block">
              {promotion.couponCode}
            </div>
          )}
        </div>

        {/* Promotion Details */}
        <div className="space-y-1.5 text-xs my-2.5">
          <div className="flex justify-between items-center border-b border-gray-50 pb-1">
            <span className="text-[11px] text-gray-500">Target:</span>
            <span className="text-[11px] font-semibold text-gray-800">
              {promotion.targetType === 'all' ? 'All Products' : 'Specific Products'}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-50 pb-1">
            <span className="text-[11px] text-gray-500">Duration:</span>
            <span className="text-[11px] font-semibold text-gray-800">
              {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
            </span>
          </div>
          {status === 'active' && (
            <div className="flex justify-between items-center bg-amber-50/70 p-1.5 rounded-md border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-800">⏰ Time Left:</span>
              <span className="text-[11px] font-bold text-amber-900">{getDaysRemaining()} days</span>
            </div>
          )}
        </div>

        {/* Analytics Section */}
        {promotion.analytics && (
          <div className="bg-gray-50/80 rounded-lg p-2.5 my-2 border border-gray-100">
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              📊 Real-Time Analytics
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-white p-1.5 rounded border border-gray-100">
                <div className="text-xs sm:text-sm font-black text-blue-600">{promotion.analytics.totalSales || 0}</div>
                <div className="text-[9px] text-gray-400 font-medium">Sales</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-gray-100">
                <div className="text-xs sm:text-sm font-black text-emerald-600 truncate">{promotion.analytics.revenue || 0} ETB</div>
                <div className="text-[9px] text-gray-400 font-medium">Revenue</div>
              </div>
              <div className="bg-white p-1.5 rounded border border-gray-100">
                <div className="text-xs sm:text-sm font-black text-purple-600">{promotion.analytics.uses || 0}</div>
                <div className="text-[9px] text-gray-400 font-medium">Uses</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 mt-2">
        <button
          onClick={() => onPreview(promotion)}
          className="flex-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
        >
          👁️ Preview
        </button>
        {status === 'active' && (
          <button
            onClick={() => onToggleStatus(promotion._id, 'inactive')}
            className="flex-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Pause
          </button>
        )}
        {(status === 'inactive' || status === 'scheduled') && (
          <button
            onClick={() => onToggleStatus(promotion._id, 'active')}
            className="flex-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Activate
          </button>
        )}
        <button
          onClick={() => onDelete(promotion._id)}
          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
          title="Delete Promotion"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default PromotionCard;
