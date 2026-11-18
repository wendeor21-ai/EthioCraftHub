/**
 * API Configuration for EthioCraft Global
 * Centralized API base URL configuration
 */

// API Base URL - In production or live domains, use empty string for same-origin requests
const resolveApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '';
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "");
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveApiBase();

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    ME: `${API_BASE_URL}/api/auth/me`,
  },
  
  // Products
  PRODUCTS: {
    BASE: `${API_BASE_URL}/api/products`,
    BY_ARTISAN: (artisanId) => `${API_BASE_URL}/api/products/artisan/${artisanId}`,
    BY_ID: (productId) => `${API_BASE_URL}/api/products/${productId}`,
  },
  
  // Orders
  ORDERS: {
    BASE: `${API_BASE_URL}/api/orders`,
    BY_ARTISAN: (artisanId) => `${API_BASE_URL}/api/orders/artisan/${artisanId}`,
    UPDATE_STATUS: (orderId) => `${API_BASE_URL}/api/orders/${orderId}/status`,
  },
  
  // Analytics
  ANALYTICS: {
    BY_ARTISAN: (artisanId, timeRange) => `${API_BASE_URL}/api/analytics/artisan/${artisanId}?timeRange=${timeRange}`,
  },
  
  // Messages
  MESSAGES: {
    BY_ARTISAN: (artisanId) => `${API_BASE_URL}/api/messages/artisan/${artisanId}`,
    REPLY: (messageId) => `${API_BASE_URL}/api/messages/${messageId}/reply`,
    MARK_READ: (messageId) => `${API_BASE_URL}/api/messages/${messageId}/read`,
  },
  
  // Users
  USERS: {
    PROFILE: `${API_BASE_URL}/api/users/profile`,
    DASHBOARD_STATS: `${API_BASE_URL}/api/users/artisan/dashboard-stats`,
  },
  
  // Admin
  ADMIN: {
    USERS: `${API_BASE_URL}/api/admin/users`,
    PRODUCTS: `${API_BASE_URL}/api/admin/products`,
  }
};

export default API_BASE_URL;
