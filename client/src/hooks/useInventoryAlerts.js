import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import React from 'react';
import { useSound } from '../contexts/SoundContext';

/**
 * Hook to handle dynamic inventory alerts and pending order counts.
 * Polls the server every 60 seconds to keep badges updated.
 */
const useInventoryAlerts = () => {
    const { token, isAuthenticated } = useAuth();
    const { playOrderSound, playAlertSound } = useSound();
    const [inventoryCount, setInventoryCount] = useState(0);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Track seen alerts and orders to avoid repeating toasts in the same session
    const seenAlerts = useRef(new Set());
    const seenOrders = useRef(new Set());
    const isFirstRun = useRef(true);

    const fetchAlerts = useCallback(async () => {
        if (!token || !isAuthenticated) return;

        try {
            setLoading(true);
            const response = await fetch('/api/users/artisan/dashboard-stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch dashboard stats');

            const body = await response.json();
            const stats = body.data || body.stats || {};

            // Extract new pending orders for the notification badge
            const pendingOrdersCount = stats.newOrders ?? stats.orders?.newOrders ?? 0;
            setPendingOrdersCount(pendingOrdersCount);

            // 1. Process New Orders for Real-time Notifications
            const recentOrders = stats.recentOrders || [];
            if (recentOrders.length > 0) {
                recentOrders.forEach(order => {
                    const orderId = order.orderNumber || order.id || order._id;
                    if (!seenOrders.current.has(orderId)) {
                        seenOrders.current.add(orderId);
                        
                        // Don't toast existing orders on the very first initial load
                        if (!isFirstRun.current) {
                            playOrderSound();
                            toast.success(
                                (t) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#1C1C1C]">New Order Received!</span>
                                        <span className="text-xs text-gray-600">Order #{orderId} — {order.total} ETB</span>
                                        <button 
                                            onClick={() => {
                                                toast.dismiss(t.id);
                                                window.location.href = `/artisan/orders/${order.id || order._id || orderId}`;
                                            }}
                                            className="mt-2 text-[10px] font-bold text-[#CFA66E] hover:underline text-left uppercase tracking-tight"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                ),
                                {
                                    duration: 8000,
                                    position: 'top-right',
                                    style: {
                                        background: '#FFF9F0',
                                        border: '1px solid #CFA66E',
                                        padding: '12px',
                                        color: '#1C1C1C',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)'
                                    }
                                }
                            );
                        }
                    }
                });
            }

            // 2. Process Low Stock Alerts
            const alerts = stats.lowStockAlerts || [];
            setInventoryCount(alerts.length);

            alerts.forEach(item => {
                const productId = item.id || item._id;
                if (!seenAlerts.current.has(productId)) {
                    seenAlerts.current.add(productId);
                    playAlertSound();
                    toast.error(
                        (t) => (
                            <div className="flex flex-col">
                                <span className="font-bold text-[#1C1C1C]">Critical: {item.name} is low on stock.</span>
                                <span className="text-[10px] text-gray-500 mb-1">Stock left: {item.quantity} (Threshold: {item.threshold})</span>
                                <button 
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        window.location.href = `/artisan/inventory-alerts`;
                                    }}
                                    className="mt-1 text-xs font-bold text-[#CFA66E] hover:underline text-left"
                                >
                                    Restock Now
                                </button>
                            </div>
                        ),
                        {
                            duration: 12000,
                            position: 'top-right',
                            style: {
                                background: '#FFFFFF',
                                border: '1px solid #1C1C1C',
                                padding: '12px',
                                color: '#1C1C1C',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }
                        }
                    );
                }
            });

            isFirstRun.current = false;

        } catch (error) {
            console.error('Error in useInventoryAlerts:', error);
        } finally {
            setLoading(false);
        }
    }, [token, isAuthenticated]);


    useEffect(() => {
        if (isAuthenticated) {
            fetchAlerts();
            const interval = setInterval(fetchAlerts, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchAlerts]);

    return {
        inventoryCount,
        pendingOrdersCount,
        loading,
        refresh: fetchAlerts
    };
};

export default useInventoryAlerts;
