import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import React from 'react';
import { useSound } from '../contexts/SoundContext';
import { playNotificationSound } from '../utils/soundUtils';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

/**
 * Hook to handle dynamic inventory alerts, pending order counts, and real-time socket events.
 * Polls the server every 30 seconds and listens to Socket.io for immediate updates without refresh.
 */
const useInventoryAlerts = () => {
    const { user, token, isAuthenticated } = useAuth();
    const { playOrderSound, playAlertSound } = useSound();
    const [inventoryCount, setInventoryCount] = useState(0);
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const [recentOrders, setRecentOrders] = useState([]);
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
            const pendingCount = stats.pendingOrdersCount ?? stats.newOrders ?? stats.orders?.newOrders ?? stats.pendingOrders ?? 0;
            setPendingOrdersCount(pendingCount);

            // 1. Process New Orders for Real-time Notifications
            const ordersList = stats.recentOrders || [];
            if (ordersList.length > 0) {
                setRecentOrders(ordersList);
                ordersList.forEach(order => {
                    const orderId = order.orderNumber || order.id || order._id;
                    if (!seenOrders.current.has(orderId)) {
                        seenOrders.current.add(orderId);
                        
                        // Don't toast existing orders on the very first initial load
                        if (!isFirstRun.current) {
                            playNotificationSound();
                            try { playOrderSound(); } catch (e) {}
                            toast.success(
                                (t) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#1C1C1C]">🛍️ New Order Received!</span>
                                        <span className="text-xs text-gray-600">Order #{orderId} — {order.total} ETB</span>
                                        <button 
                                            onClick={() => {
                                                toast.dismiss(t.id);
                                                window.location.href = `/artisan/orders`;
                                            }}
                                            className="mt-2 text-[10px] font-bold text-[#CFA66E] hover:underline text-left uppercase tracking-tight"
                                        >
                                            View in Manage Orders
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
    }, [token, isAuthenticated, playAlertSound, playOrderSound]);

    // Periodic polling to stay in sync
    useEffect(() => {
        if (isAuthenticated) {
            fetchAlerts();
            const interval = setInterval(fetchAlerts, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, fetchAlerts]);

    // Socket.io for immediate real-time updates when an order is placed
    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId || !isAuthenticated) return;

        const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
        const socket = io(socketUrl, {
            withCredentials: true,
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            socket.emit('join', userId);
            socket.emit('join', `artisan_${userId}`);
            socket.emit('join', `user_${userId}`);
        });

        socket.on('newOrder', (data) => {
            // 1. Play sound immediately
            playNotificationSound();
            try { playOrderSound(); } catch (e) {}

            // 2. Increment badge immediately without waiting for HTTP
            setPendingOrdersCount(prev => prev + 1);

            // 3. Mark as seen to avoid duplicate toast
            const orderNum = data?.orderNumber || data?.orderId || 'New';
            if (data?.orderId) seenOrders.current.add(data.orderId);
            if (data?.orderNumber) seenOrders.current.add(data.orderNumber);

            // 4. Show toast notification
            toast.success(
                (t) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-[#1C1C1C]">🛍️ New Order Received!</span>
                        <span className="text-xs text-gray-600">Order #{orderNum}</span>
                        <button 
                            onClick={() => {
                                toast.dismiss(t.id);
                                window.location.href = `/artisan/orders`;
                            }}
                            className="mt-2 text-[10px] font-bold text-[#CFA66E] hover:underline text-left uppercase tracking-tight"
                        >
                            View in Manage Orders
                        </button>
                    </div>
                ),
                {
                    duration: 10000,
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

            // 5. Browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('New Order on EthioCraft Global', {
                    body: `A new order has been received! Order #${orderNum}`,
                });
            }

            // 6. Broadcast event so Navbar and other components update immediately
            window.dispatchEvent(new CustomEvent('artisanNewOrder', { detail: data }));

            // 7. Re-sync full stats
            fetchAlerts();
        });

        return () => {
            socket.off('newOrder');
            socket.disconnect();
        };
    }, [user?._id, user?.id, isAuthenticated, fetchAlerts, playOrderSound]);

    return {
        inventoryCount,
        pendingOrdersCount,
        recentOrders,
        loading,
        refresh: fetchAlerts
    };
};

export default useInventoryAlerts;
