/**
 * Shipping Settings Component
 * Allows artisans to configure shipping methods and pricing
 */

import { useState, useEffect } from 'react';
import { Truck, Package, Store, DollarSign, MapPin, Save, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Oromia',
  'Amhara',
  'Tigray',
  'SNNPR',
  'Somali',
  'Afar',
  'Benishangul-Gumuz',
  'Gambela',
  'Harari',
  'Dire Dawa',
  'Sidama'
];

const ShippingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    methods: [],
    regionalPricing: [],
    freeShippingThreshold: 0,
    weightBasedPricing: {
      enabled: false,
      pricePerKg: 0
    }
  });

  useEffect(() => {
    fetchShippingSettings();
  }, []);

  const fetchShippingSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/artisan/shipping-settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
      toast.error('Failed to load shipping settings');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (index, field, value) => {
    const newMethods = [...settings.methods];
    newMethods[index] = { ...newMethods[index], [field]: value };
    setSettings({ ...settings, methods: newMethods });
  };

  const handleRegionalPricingChange = (region, value) => {
    const existing = settings.regionalPricing.find(r => r.region === region);
    let newRegionalPricing;

    if (existing) {
      newRegionalPricing = settings.regionalPricing.map(r =>
        r.region === region ? { ...r, additionalCost: parseFloat(value) || 0 } : r
      );
    } else {
      newRegionalPricing = [...settings.regionalPricing, { region, additionalCost: parseFloat(value) || 0 }];
    }

    setSettings({ ...settings, regionalPricing: newRegionalPricing });
  };

  const getRegionalPrice = (region) => {
    const pricing = settings.regionalPricing.find(r => r.region === region);
    return pricing ? pricing.additionalCost : 0;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch('/artisan/shipping-settings', settings);
      toast.success('Shipping settings saved successfully');
    } catch (error) {
      console.error('Error saving shipping settings:', error);
      const errorMsg = error.response?.data?.error || 'Failed to save shipping settings';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Shipping & Delivery Settings</h3>
        <p className="text-xs text-gray-500">Configure your shipping methods, pricing, and delivery options</p>
      </div>

      {/* Shipping Methods */}
      <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-ethiopian-gold" />
          Shipping Methods
        </h4>

        <div className="space-y-3">
          {settings.methods.map((method, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {method.name === 'Standard Delivery' && <Package className="w-4 h-4 text-blue-600" />}
                  {method.name === 'Express Delivery' && <Truck className="w-4 h-4 text-red-600" />}
                  {method.name === 'Store Pickup' && <Store className="w-4 h-4 text-green-600" />}
                  <span className="text-xs font-bold text-gray-900">{method.name}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(e) => handleMethodChange(index, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ethiopian-gold"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Base Price (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={method.basePrice}
                    onChange={(e) => handleMethodChange(index, 'basePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
                    disabled={!method.enabled}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Estimated Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={method.estimatedDays}
                    onChange={(e) => handleMethodChange(index, 'estimatedDays', parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
                    disabled={!method.enabled}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={method.description || ''}
                    onChange={(e) => handleMethodChange(index, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
                    placeholder="Brief description"
                    disabled={!method.enabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Pricing */}
      <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-ethiopian-gold" />
          Regional Pricing
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Add extra shipping costs for specific regions (added to base price)
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {ETHIOPIAN_REGIONS.map((region) => (
            <div key={region}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1 truncate">
                {region}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={getRegionalPrice(region)}
                  onChange={(e) => handleRegionalPricingChange(region, e.target.value)}
                  className="w-full px-2.5 py-1.5 pl-6 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
                  placeholder="0"
                />
                <DollarSign className="w-3 h-3 text-gray-400 absolute left-2 top-2.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="bg-white border border-gray-100 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <h4 className="text-xs sm:text-sm font-bold text-gray-900 mb-3">Additional Settings</h4>

        <div className="space-y-3">
          {/* Free Shipping Threshold */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
              Free Shipping Threshold (ETB)
            </label>
            <input
              type="number"
              min="0"
              value={settings.freeShippingThreshold}
              onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
              className="w-full sm:w-64 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
              placeholder="e.g., 1000"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Orders above this amount get free shipping (set to 0 to disable)
            </p>
          </div>

          {/* Weight-Based Pricing */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Weight-Based Pricing
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weightBasedPricing.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    weightBasedPricing: { ...settings.weightBasedPricing, enabled: e.target.checked }
                  })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ethiopian-gold"></div>
              </label>
            </div>

            {settings.weightBasedPricing.enabled && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                  Price per Kilogram (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.weightBasedPricing.pricePerKg}
                  onChange={(e) => setSettings({
                    ...settings,
                    weightBasedPricing: { ...settings.weightBasedPricing, pricePerKg: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full sm:w-64 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-ethiopian-gold focus:border-ethiopian-gold bg-white"
                  placeholder="e.g., 20"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900">
            <p className="font-bold mb-1">Shipping Tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-800">
              <li>Enable at least one shipping method for customers to place orders</li>
              <li>Regional pricing is added on top of the base shipping price</li>
              <li>Free shipping threshold encourages larger orders</li>
              <li>Weight-based pricing is useful for heavy items</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-ethiopian-gold text-white text-xs font-bold rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default ShippingSettings;
