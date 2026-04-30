/**
 * Settings Tabs Component
 * Navigation tabs for different settings sections
 */

import { Store, CreditCard, Bell, Shield, Globe } from 'lucide-react';

const SettingsTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'bank', label: 'Bank & Payment', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'social', label: 'Social & More', icon: Globe }
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex -mb-px space-x-8 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-ethiopian-gold text-ethiopian-gold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsTabs;
