import React, { useState } from 'react';

const CreatePromotionModal = ({ products, onClose, onCreate, artisanId }) => {
  const [formData, setFormData] = useState({
    name: '',
    discountType: 'percentage',
    discountValue: '',
    couponCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetType: 'all',
    selectedProducts: [],
    urgencyBadge: false,
    badgeText: 'Limited Time Offer',
    minOrderValue: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleProductSelection = (productId) => {
    setFormData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter(id => id !== productId)
        : [...prev.selectedProducts, productId]
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Promotion name is required';
    if (!formData.discountValue || formData.discountValue <= 0) {
      newErrors.discountValue = 'Discount value must be greater than 0';
    }
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      newErrors.discountValue = 'Percentage cannot exceed 100%';
    }
    if (formData.discountType === 'coupon' && !formData.couponCode.trim()) {
      newErrors.couponCode = 'Coupon code is required';
    }
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    if (formData.targetType === 'specific' && formData.selectedProducts.length === 0) {
      newErrors.selectedProducts = 'Select at least one product';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onCreate({ ...formData, artisanId });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Promotion</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="promotion-form">
          <div className="form-section">
            <label className="form-label">
              Promotion Name *
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Summer Sale 2026"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">Discount Type *</label>
            <div className="discount-type-grid">
              <label className={`discount-option ${formData.discountType === 'percentage' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="discountType"
                  value="percentage"
                  checked={formData.discountType === 'percentage'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">%</span>
                  <span>Percentage</span>
                </div>
              </label>
              <label className={`discount-option ${formData.discountType === 'fixed' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="discountType"
                  value="fixed"
                  checked={formData.discountType === 'fixed'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">ETB</span>
                  <span>Fixed Amount</span>
                </div>
              </label>
              <label className={`discount-option ${formData.discountType === 'coupon' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="discountType"
                  value="coupon"
                  checked={formData.discountType === 'coupon'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">🎟️</span>
                  <span>Coupon Code</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">
              Discount Value *
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                placeholder={formData.discountType === 'percentage' ? '20' : '200'}
                className={errors.discountValue ? 'error' : ''}
              />
              {errors.discountValue && <span className="error-text">{errors.discountValue}</span>}
            </label>

            {formData.discountType === 'coupon' && (
              <label className="form-label">
                Coupon Code *
                <input
                  type="text"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleChange}
                  placeholder="GADA2026"
                  className={errors.couponCode ? 'error' : ''}
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.couponCode && <span className="error-text">{errors.couponCode}</span>}
              </label>
            )}
          </div>

          <div className="form-row">
            <label className="form-label">
              Start Date *
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </label>
            <label className="form-label">
              End Date *
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                min={formData.startDate}
                className={errors.endDate ? 'error' : ''}
              />
              {errors.endDate && <span className="error-text">{errors.endDate}</span>}
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">Apply To *</label>
            <div className="target-type-grid">
              <label className={`target-option ${formData.targetType === 'all' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="targetType"
                  value="all"
                  checked={formData.targetType === 'all'}
                  onChange={handleChange}
                />
                <span>All Products</span>
              </label>
              <label className={`target-option ${formData.targetType === 'specific' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="targetType"
                  value="specific"
                  checked={formData.targetType === 'specific'}
                  onChange={handleChange}
                />
                <span>Specific Products</span>
              </label>
            </div>
          </div>

          {formData.targetType === 'specific' && (
            <div className="form-section">
              <label className="form-label">Select Products</label>
              <div className="products-list">
                {Array.isArray(products) && products.length > 0 ? (
                  products.map(product => (
                    <label key={product._id} className="product-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.selectedProducts.includes(product._id)}
                        onChange={() => handleProductSelection(product._id)}
                      />
                      <span>{product.name} - {product.price} ETB</span>
                    </label>
                  ))
                ) : (
                  <div className="no-products-message">
                    No products available. Please add products first.
                  </div>
                )}
              </div>
              {errors.selectedProducts && <span className="error-text">{errors.selectedProducts}</span>}
            </div>
          )}

          <div className="form-section">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="urgencyBadge"
                checked={formData.urgencyBadge}
                onChange={handleChange}
              />
              <span>Add Urgency Badge</span>
            </label>
            {formData.urgencyBadge && (
              <input
                type="text"
                name="badgeText"
                value={formData.badgeText}
                onChange={handleChange}
                placeholder="Limited Time Offer"
                className="badge-text-input"
              />
            )}
          </div>

          <div className="form-section">
            <label className="form-label">
              Minimum Order Value (Optional)
              <input
                type="number"
                name="minOrderValue"
                value={formData.minOrderValue}
                onChange={handleChange}
                placeholder="e.g., 2000 ETB"
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Promotion'}
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }

          .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 700px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #1a1a1a;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 2rem;
            color: #666;
            cursor: pointer;
            line-height: 1;
            padding: 0;
            width: 32px;
            height: 32px;
          }

          .close-btn:hover {
            color: #1a1a1a;
          }

          .promotion-form {
            padding: 1.5rem;
          }

          .form-section {
            margin-bottom: 1.5rem;
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .form-label {
            display: block;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 0.5rem;
          }

          .form-label input[type="text"],
          .form-label input[type="number"],
          .form-label input[type="date"] {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 1rem;
            margin-top: 0.5rem;
            transition: border-color 0.2s;
          }

          .form-label input:focus {
            outline: none;
            border-color: #2563eb;
          }

          .form-label input.error {
            border-color: #ef4444;
          }

          .error-text {
            color: #ef4444;
            font-size: 0.875rem;
            display: block;
            margin-top: 0.25rem;
            font-weight: 400;
          }

          .discount-type-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          }

          .discount-option {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
          }

          .discount-option input {
            display: none;
          }

          .discount-option.selected {
            border-color: #2563eb;
            background: #eff6ff;
          }

          .option-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .option-icon {
            font-size: 1.5rem;
            font-weight: 700;
          }

          .target-type-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }

          .target-option {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
          }

          .target-option input {
            display: none;
          }

          .target-option.selected {
            border-color: #2563eb;
            background: #eff6ff;
          }

          .products-list {
            max-height: 200px;
            overflow-y: auto;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
          }

          .no-products-message {
            text-align: center;
            padding: 2rem;
            color: #9ca3af;
            font-size: 0.9rem;
          }

          .product-checkbox {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            cursor: pointer;
          }

          .product-checkbox:hover {
            background: #f9fafb;
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            font-weight: 600;
          }

          .badge-text-input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            margin-top: 0.5rem;
          }

          .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
          }

          .btn-cancel, .btn-submit {
            flex: 1;
            padding: 0.875rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-cancel {
            background: #f3f4f6;
            color: #1a1a1a;
          }

          .btn-cancel:hover {
            background: #e5e7eb;
          }

          .btn-submit {
            background: #2563eb;
            color: white;
          }

          .btn-submit:hover:not(:disabled) {
            background: #1d4ed8;
          }

          .btn-submit:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreatePromotionModal;
