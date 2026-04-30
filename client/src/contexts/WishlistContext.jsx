/**
 * Wishlist Context for EthioCraft Global
 * 
 * Features:
 * - Global wishlist state management
 * - Persistence with backend API for authenticated users
 * - LocalStorage fallback/sync for guest users
 * - Synchronization on login
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const WishlistContext = createContext();

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

export const WishlistProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load wishlist from localStorage for guests
    const loadGuestWishlist = useCallback(() => {
        const savedWishlist = localStorage.getItem('guest_wishlist');
        return savedWishlist ? JSON.parse(savedWishlist) : [];
    }, []);

    // Fetch wishlist from API for authenticated users
    const fetchWishlist = useCallback(async () => {
        if (!isAuthenticated) {
            setWishlistItems(loadGuestWishlist());
            return;
        }

        try {
            setLoading(true);
            const response = await api.get('/wishlist');
            if (response.data.success) {
                setWishlistItems(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
            // Fallback to local if API fails
            setWishlistItems(loadGuestWishlist());
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, loadGuestWishlist]);

    // Initial load
    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    // Sync guest wishlist on login
    useEffect(() => {
        const syncWishlist = async () => {
            const guestItems = loadGuestWishlist();
            if (isAuthenticated && guestItems.length > 0) {
                try {
                    // Sync each item to backend
                    for (const item of guestItems) {
                        const id = typeof item === 'object' ? item._id : item;
                        await api.post('/wishlist/toggle', { productId: id });
                    }
                    // Clear guest wishlist after sync
                    localStorage.removeItem('guest_wishlist');
                    fetchWishlist(); // Refresh from server
                    toast.success('Your guest wishlist has been synced!');
                } catch (error) {
                    console.error('Failed to sync wishlist:', error);
                }
            }
        };

        syncWishlist();
    }, [isAuthenticated, fetchWishlist, loadGuestWishlist]);

    // Toggle wishlist item
    const toggleWishlist = async (product) => {
        const productId = typeof product === 'object' ? product._id : product;
        const productName = typeof product === 'object' && product.name ? product.name : 'Item';

        if (!isAuthenticated) {
            // Guest logic
            const currentGuestItems = loadGuestWishlist();
            const existingIndex = currentGuestItems.findIndex(item =>
                (typeof item === 'object' ? item._id : item) === productId
            );

            let newWishlist;
            if (existingIndex === -1) {
                // Add item (store full object for immediate UI update)
                newWishlist = [...currentGuestItems, typeof product === 'object' ? product : { _id: productId }];
                toast.success(`Success! ${productName} added to your wishlist.`);
            } else {
                // Remove item
                newWishlist = currentGuestItems.filter(item =>
                    (typeof item === 'object' ? item._id : item) !== productId
                );
                toast.success('Removed from wishlist');
            }

            setWishlistItems(newWishlist);
            localStorage.setItem('guest_wishlist', JSON.stringify(newWishlist));
            return;
        }

        // Authenticated logic
        try {
            const response = await api.post('/wishlist/toggle', { productId });
            if (response.data.success) {
                if (response.data.isAdded) {
                    toast.success(`Success! ${productName} added to your wishlist.`);
                    // Update local state by adding the full product object if provided
                    if (typeof product === 'object') {
                        setWishlistItems(prev => [...prev, product]);
                    } else {
                        fetchWishlist(); // Re-fetch to get details
                    }
                } else {
                    toast.success('Removed from wishlist');
                    setWishlistItems(prev => prev.filter(item =>
                        (typeof item === 'object' ? item._id : item) !== productId
                    ));
                }
            }
        } catch (error) {
            console.error('Toggle wishlist error:', error);
            toast.error('Failed to update wishlist');
        }
    };

    const isInWishlist = (productId) => {
        return wishlistItems.some(item =>
            (typeof item === 'object' ? item._id : item) === productId
        );
    };

    const value = {
        wishlistItems,
        toggleWishlist,
        isInWishlist,
        loading,
        refreshWishlist: fetchWishlist
    };

    return (
        <WishlistContext.Provider value={value}>
            {children}
        </WishlistContext.Provider>
    );
};
