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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping & Delivery Settings</h3>
        <p className="text-sm text-gray-600">Configure your shipping methods, pricing, and delivery options</p>
      </div>

      {/* Shipping Methods */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-ethiopian-gold" />
          Shipping Methods
        </h4>

        <div className="space-y-4">
          {settings.methods.map((method, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {method.name === 'Standard Delivery' && <Package className="w-5 h-5 text-blue-600" />}
                  {method.name === 'Express Delivery' && <Truck className="w-5 h-5 text-red-600" />}
                  {method.name === 'Store Pickup' && <Store className="w-5 h-5 text-green-600" />}
                  <span className="font-medium text-gray-900">{method.name}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(e) => handleMethodChange(index, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={method.basePrice}
                    onChange={(e) => handleMethodChange(index, 'basePrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    disabled={!method.enabled}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={method.estimatedDays}
                    onChange={(e) => handleMethodChange(index, 'estimatedDays', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                    disabled={!method.enabled}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={method.description || ''}
                    onChange={(e) => handleMethodChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
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
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-ethiopian-gold" />
          Regional Pricing
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Add extra shipping costs for specific regions (added to base price)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ETHIOPIAN_REGIONS.map((region) => (
            <div key={region}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {region}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={getRegionalPrice(region)}
                  onChange={(e) => handleRegionalPricingChange(region, e.target.value)}
                  className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="0"
                />
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-2.5 top-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Additional Settings</h4>

        <div className="space-y-4">
          {/* Free Shipping Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Free Shipping Threshold (ETB)
            </label>
            <input
              type="number"
              min="0"
              value={settings.freeShippingThreshold}
              onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) || 0 })}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
              placeholder="e.g., 1000"
            />
            <p className="text-xs text-gray-500 mt-1">
              Orders above this amount get free shipping (set to 0 to disable)
            </p>
          </div>

          {/* Weight-Based Pricing */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ethiopian-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ethiopian-gold"></div>
              </label>
            </div>

            {settings.weightBasedPricing.enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ethiopian-gold focus:border-transparent"
                  placeholder="e.g., 20"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Shipping Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enable at least one shipping method for customers to place orders</li>
              <li>Regional pricing is added on top of the base shipping price</li>
              <li>Free shipping threshold encourages larger orders</li>
              <li>Weight-based pricing is useful for heavy items</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-ethiopian-gold text-white rounded-lg hover:bg-ethiopian-earth transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Shipping Settings'}
        </button>
      </div>
    </div>
  );
};

export default ShippingSettings;
