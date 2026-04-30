import React from 'react';
import { getBestProductImage } from '../../utils/imageUtils';

const PromotionPreview = ({ promotion, products, onClose }) => {
  const getAffectedProducts = () => {
    // Ensure products is an array
    if (!Array.isArray(products)) {
      return [];
    }
    
    if (promotion.targetType === 'all') {
      return products;
    }
    return products.filter(p => promotion.selectedProducts?.includes(p._id));
  };

  const calculateDiscountedPrice = (originalPrice) => {
    if (promotion.discountType === 'percentage') {
      return originalPrice - (originalPrice * promotion.discountValue / 100);
    } else if (promotion.discountType === 'fixed') {
      return Math.max(0, originalPrice - promotion.discountValue);
    }
    return originalPrice;
  };

  const affectedProducts = getAffectedProducts();

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-content" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>👁️ Promotion Preview</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="preview-body">
          <div className="preview-info">
            <h3>{promotion.name}</h3>
            <p className="preview-description">
              This is how your products will appear to customers during the promotion period.
            </p>
          </div>

          {affectedProducts.length === 0 ? (
            <div className="no-products">
              <p>No products available for this promotion.</p>
              {promotion.targetType === 'specific' && (
                <p>Please select products to apply this promotion to.</p>
              )}
            </div>
          ) : (
            <>
              <div className="products-preview">
                {affectedProducts.map((product, index) => {
                  const discountedPrice = calculateDiscountedPrice(product.price);
                  const savings = product.price - discountedPrice;
                  const savingsPercent = Math.round((savings / product.price) * 100);
                  const productImage = getBestProductImage(product);

                  return (
                    <div key={product._id} className="preview-product-card">
                  {promotion.urgencyBadge && (
                    <div className="urgency-badge">
                      🔥 {promotion.badgeText || 'Limited Time!'}
                    </div>
                  )}
                  
                  <div className="product-image">
                    <img 
                      src={productImage}
                      alt={product.name}
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/400x400/F59E0B/FFFFFF?text=Ethiopian+Craft';
                      }}
                    />
                    <div className="discount-badge">
                      {promotion.discountType === 'percentage' 
                        ? `${promotion.discountValue}% OFF`
                        : `${promotion.discountValue} ETB OFF`
                      }
                    </div>
                  </div>

                  <div className="product-info">
                    <h4>{product.name}</h4>
                    <div className="price-section">
                      <div className="price-row">
                        <span className="original-price">{product.price} ETB</span>
                        <span className="discount-price">{discountedPrice.toFixed(2)} ETB</span>
                      </div>
                      <div className="savings-text">
                        You save {savings.toFixed(2)} ETB ({savingsPercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            </>
          )}

          {promotion.discountType === 'coupon' && (
            <div className="coupon-preview">
              <h4>Coupon Code</h4>
              <div className="coupon-code-display">
                <code>{promotion.couponCode}</code>
                <span className="coupon-hint">Customers will enter this at checkout</span>
              </div>
            </div>
          )}
        </div>

        <div className="preview-footer">
          <button className="btn-close" onClick={onClose}>Close Preview</button>
        </div>

        <style>{`
          .preview-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1001;
            padding: 1rem;
          }

          .preview-content {
            background: white;
            border-radius: 16px;
            max-width: 900px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
          }

          .preview-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 16px 16px 0 0;
          }

          .preview-header h2 {
            margin: 0;
            font-size: 1.5rem;
          }

          .close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            font-size: 2rem;
            color: white;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            transition: background 0.2s;
          }

          .close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .preview-body {
            padding: 2rem;
          }

          .preview-info {
            text-align: center;
            margin-bottom: 2rem;
          }

          .preview-info h3 {
            font-size: 1.75rem;
            color: #1a1a1a;
            margin-bottom: 0.5rem;
          }

          .preview-description {
            color: #666;
            font-size: 0.95rem;
          }

          .products-preview {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 1.5rem;
            max-height: 500px;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .preview-product-card {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
          }

          .preview-product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          }

          .urgency-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            z-index: 2;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
          }

          .product-image {
            position: relative;
            width: 100%;
            height: 180px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .discount-badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ef4444;
            color: white;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
          }

          .product-info {
            padding: 1rem;
          }

          .product-info h4 {
            font-size: 1rem;
            color: #1a1a1a;
            margin: 0 0 0.75rem 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .price-section {
            background: #f9fafb;
            padding: 0.75rem;
            border-radius: 8px;
          }

          .price-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
          }

          .original-price {
            color: #9ca3af;
            text-decoration: line-through;
            font-size: 0.9rem;
          }

          .discount-price {
            color: #ef4444;
            font-size: 1.25rem;
            font-weight: 700;
          }

          .savings-text {
            color: #10b981;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .more-products {
            text-align: center;
            padding: 1rem;
            background: #f3f4f6;
            border-radius: 8px;
            color: #666;
            font-weight: 600;
          }

          .no-products {
            text-align: center;
            padding: 3rem 2rem;
            background: #f9fafb;
            border-radius: 12px;
            color: #666;
          }

          .no-products p {
            margin: 0.5rem 0;
            font-size: 1rem;
          }

          .no-products p:first-child {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1a1a1a;
          }

          .coupon-preview {
            margin-top: 2rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            color: white;
          }

          .coupon-preview h4 {
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
          }

          .coupon-code-display {
            background: rgba(255, 255, 255, 0.2);
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
          }

          .coupon-code-display code {
            display: block;
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 3px;
            margin-bottom: 0.5rem;
            font-family: monospace;
          }

          .coupon-hint {
            font-size: 0.85rem;
            opacity: 0.9;
          }

          .preview-footer {
            padding: 1.5rem;
            border-top: 1px solid #e5e7eb;
            text-align: center;
          }

          .btn-close {
            background: #2563eb;
            color: white;
            border: none;
            padding: 0.875rem 2rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
          }

          .btn-close:hover {
            background: #1d4ed8;
          }

          @media (max-width: 768px) {
            .products-preview {
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PromotionPreview;
