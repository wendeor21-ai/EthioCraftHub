import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard,
    AlertOctagon,
    Layout,
    Settings,
    Bell,
    FileText,
    ArrowLeft,
    Activity
} from 'lucide-react';
import SystemHealthModal from '../../components/admin/SystemHealthModal';

const coreModules = [
    {
        title: 'System Health & Diagnostics',
        description: 'Live real-time monitoring of database, API server, and storage health.',
        icon: Activity,
        path: '#health',
        isHealthAction: true,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100'
    },
    {
        title: 'Payments Management',
        description: 'Manage platform payments, gateways, and transactions.',
        icon: CreditCard,
        path: '/admin/core/payments',
        color: 'text-blue-600',
        bg: 'bg-blue-100'
    },
    {
        title: 'Disputes',
        description: 'Handle customer and artisan payment or order disputes.',
        icon: AlertOctagon,
        path: '/admin/core/disputes',
        color: 'text-red-600',
        bg: 'bg-red-100'
    },
    {
        title: 'CMS Settings',
        description: 'Manage content, banners, and static pages.',
        icon: Layout,
        path: '/admin/core/cms',
        color: 'text-purple-600',
        bg: 'bg-purple-100'
    },
    {
        title: 'Platform Settings',
        description: 'Adjust global currency, region, and platform config.',
        icon: Settings,
        path: '/admin/core/platform-settings',
        color: 'text-gray-600',
        bg: 'bg-gray-100'
    },
    {
        title: 'Notifications Center',
        description: 'Configure automated email and system alerts.',
        icon: Bell,
        path: '/admin/core/notifications',
        color: 'text-amber-600',
        bg: 'bg-amber-100'
    },
    {
        title: 'Audit Logs',
        description: 'View system activity and security audit trails.',
        icon: FileText,
        path: '/admin/core/audit-logs',
        color: 'text-emerald-600',
        bg: 'bg-emerald-100'
    }
];

const CoreUtilities = ({ insideDashboard, onSelectTab }) => {
    const navigate = useNavigate();
    const [showHealthModal, setShowHealthModal] = useState(false);

    return (
        <div className={insideDashboard ? "bg-transparent py-2 w-full font-['Times_New_Roman',serif]" : "min-h-screen bg-gray-50 py-8 font-['Times_New_Roman',serif]"}>
            <div className={insideDashboard ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
                {/* Header */}
                <div className="mb-6">
                    {!insideDashboard && (
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center text-amber-600 hover:text-amber-700 transition-colors mb-3 text-xs font-semibold"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Back to Dashboard
                        </button>
                    )}

                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Core Utilities</h1>
                        <p className="mt-1 text-xs text-gray-500 max-w-2xl">
                            Access advanced system settings, logs, and platform management tools.
                        </p>
                    </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {coreModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <div
                                key={module.title}
                                onClick={() => {
                                    if (module.isHealthAction) {
                                        setShowHealthModal(true);
                                    } else {
                                        navigate(module.path);
                                    }
                                }}
                                className="bg-white rounded-xl shadow-xs border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-ethiopian-gold/30 transition-all duration-200 group"
                            >
                                <div className="flex items-start">
                                    <div className={`p-3 rounded-lg ${module.bg || 'bg-gray-100'} ${module.color || 'text-gray-600'} flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-ethiopian-gold transition-colors">
                                            {module.title}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                            {module.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* System Health Diagnostics Modal */}
            <SystemHealthModal
                isOpen={showHealthModal}
                onClose={() => setShowHealthModal(false)}
            />
        </div>
    );
};

export default CoreUtilities;
