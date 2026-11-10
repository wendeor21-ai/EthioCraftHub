/**
 * API Configuration for EthioCraft Global
 *
 * Centralized axios configuration with:
 * - Base URL configuration
 * - Request/response interceptors
 * - Error handling
 * - Authentication token management
 */

import axios from "axios";

// Create axios instance
// Default API port is 5001 (server.js defaults to 5001). Allow overriding with REACT_APP_API_URL.
export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only clear session and redirect on 401 with specific auth failure codes.
    // Do NOT redirect on 401s caused by missing resources or verification checks —
    // those would log the user out mid-session.
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      const authFailureCodes = ['NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'USER_NOT_FOUND', 'ACCOUNT_SUSPENDED'];
      if (authFailureCodes.includes(code)) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// API methods
export const authAPI = {
  // Login user
  login: (credentials) => {
    return api.post("/auth/login", credentials);
  },

  // Register user
  register: (userData) => {
    return api.post("/auth/register", userData);
  },

  // Logout user
  logout: () => api.post("/auth/logout"),

  // Get current user
  getMe: () => api.get("/auth/me"),

  // Refresh token
  refreshToken: () => api.post("/auth/refresh"),

  // Forgot password - sends reset link to the provided email. Backend support may be pending.
  forgotPassword: ({ email }) => api.post("/auth/forgot-password", { email }),

  // Reset password - sets new password using token from email
  resetPassword: ({ token, password }) => api.post("/auth/reset-password", { token, password }),
};

export const productAPI = {
  // Get all products with filters
  getProducts: (params = {}) => api.get("/products", { params }),

  // Get single product
  getProduct: (id) => api.get(`/products/${id}`),

  // Get featured products
  getFeatured: (limit = 10) =>
    api.get("/products/featured", { params: { limit } }),

  // Get product categories
  getCategories: () => api.get("/products/categories"),

  // Get recommendations
  getRecommendations: (userId, params = {}) =>
    api.get(`/products/recommendations/${userId || ""}`, { params }),

  // Create product (artisan only)
  createProduct: (productData) => api.post("/products", productData),

  // Update product (artisan only)
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),

  // Permanently delete a product (artisan only)
  // server now removes the document and any uploaded files
  deleteProduct: (id) => api.delete(`/products/${id}`),

  // Like/unlike product
  likeProduct: (id) => api.post(`/products/${id}/like`),

  // Get products by artisan
  getByArtisan: (artisanId, params = {}) =>
    api.get(`/products/artisan/${artisanId}`, { params }),
};

// AI-related helper methods
export const aiAPI = {
  generateDescription: (title, tags = [], materials = "", story = "") =>
    api.post("/zema-ai/generate-description", {
      title,
      tags,
      materials,
      story,
    }),
};

export const userAPI = {
  // Get user profile
  getProfile: (id) => api.get(`/users/${id}`),

  // Update profile
  updateProfile: (id, profileData) => api.put(`/users/${id}`, profileData),

  // Submit artisan verification
  submitVerification: (verificationData) =>
    api.post("/users/verification", verificationData),

  // Upload files endpoint (multipart/form-data)
  uploadFiles: (formData) =>
    api.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000 // 60 seconds for larger image uploads
    }),

  // Get user interactions (for recommendations)
  getInteractions: (userId) => api.get(`/users/${userId}/interactions`),
};

export const orderAPI = {
  // Create order
  createOrder: (orderData) => api.post("/orders", orderData),

  // Get user orders (automatically filtered by role on backend)
  getOrders: () => api.get("/orders"),

  // Get single order
  getOrder: (id) => api.get(`/orders/${id}`),

  // Update order status (artisan/admin)
  updateOrderStatus: (id, status) =>
    api.put(`/orders/${id}/status`, { status }),
};

export const adminAPI = {
  // Get dashboard stats
  getDashboard: () => api.get("/admin/dashboard"),

  // Get all users
  getUsers: (params = {}) => api.get("/admin/users", { params }),
  // Get single user (admin view)
  getUser: (userId) => api.get(`/admin/users/${userId}`),
  // Update user status
  setUserStatus: (userId, isActive) =>
    api.put(`/admin/users/${userId}/status`, { isActive }),
  // Delete user
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  // Change user role
  changeUserRole: (userId, role) =>
    api.put(`/admin/users/${userId}/role`, { role }),
  // Reset user password (returns temp password)
  resetUserPassword: (userId) =>
    api.post(`/admin/users/${userId}/reset-password`),
  // Get user activity (interactions + auth events)
  getUserActivity: (userId) => api.get(`/admin/users/${userId}/activity`),
  // Flag a user for suspicious activity
  flagUser: (userId, payload) =>
    api.post(`/admin/users/${userId}/flag`, payload),

  // Verify artisan (uses server PUT /api/admin/verifications/:userId)
  verifyArtisan: (userId, status, feedback) =>
    api.put(`/admin/verifications/${userId}`, { status, feedback }),

  // Get verification requests (accepts optional params: status, page, limit)
  getVerificationRequests: (params = {}) =>
    api.get("/admin/verifications", { params }),

  // Moderate product - payload should be an object: { action, reason?, updates?, removeImages? }
  moderateProduct: (productId, payload) =>
    api.post(`/admin/moderate/${productId}`, payload),
  // Admin analytics
  getAnalytics: (params = {}) => api.get("/admin/analytics", { params }),
  // Get orders for analytics export
  getAnalyticsOrders: (params = {}) =>
    api.get("/admin/analytics/orders", { params }),
  // Zema AI Monitor
  getZemaAlerts: (params = {}) => api.get("/zema-ai/admin/alerts", { params }),
  getZemaPolicyViolations: (params = {}) =>
    api.get("/zema-ai/admin/policy-violations", { params }),
  getZemaDecisionLogs: (params = {}) =>
    api.get("/zema-ai/admin/decision-logs", { params }),
  getZemaSystemHealth: (params = {}) =>
    api.get("/zema-ai/admin/system-health", { params }),
  getZemaSettings: () => api.get("/zema-ai/admin/settings"),
  updateZemaSettings: (payload) => api.post("/zema-ai/admin/settings", payload),
  // Reports
  getSalesReport: (params = {}) => api.get("/admin/reports/sales", { params }),
  getArtisanReport: (params = {}) =>
    api.get("/admin/reports/artisans", { params }),
  getCustomerReport: (params = {}) =>
    api.get("/admin/reports/customers", { params }),
  getComplaintsReport: (params = {}) =>
    api.get("/admin/reports/complaints", { params }),
  scheduleReport: (payload) => api.post("/admin/reports/schedule", payload),
  // Core utilities
  getPayments: (params = {}) => api.get("/admin/payments", { params }),
  getPayment: (id) => api.get(`/admin/payments/${id}`),
  getDisputes: (params = {}) => api.get("/admin/disputes", { params }),
  updateDisputeStatus: (id, status) =>
    api.post(`/admin/disputes/${id}/status`, { status }),
  getCMS: () => api.get("/admin/cms"),
  toggleFeatured: (id) => api.post(`/admin/cms/featured/${id}/toggle`),
  deleteBanner: (id) => api.delete(`/admin/cms/banners/${id}`),
  getPlatformSettings: () => api.get("/admin/platform-settings"),
  setPlatformSettings: (payload) =>
    api.post("/admin/platform-settings", payload),
  recalculateRates: (payload) => api.post("/admin/recalculate-rates", payload),
  downloadBackup: () => api.get("/admin/backup/download", { responseType: "blob" }),
  broadcastNotification: (payload) =>
    api.post("/admin/notifications/broadcast", payload),
  deleteBroadcast: (id) => api.delete(`/admin/notifications/broadcasts/${id}`),
  getAuditLogs: (params = {}) => api.get("/admin/audit-logs", { params }),
  // Clear artisan commission debt
  clearArtisanDebt: (artisanId) => api.put(`/admin/artisans/${artisanId}/clear-debt`),
  // Mark order as delivered (Admin version)
  markOrderAsDelivered: (orderId) => api.put(`/orders/${orderId}/deliver`),
  // Get artisans with debt
  getArtisansWithDebt: () => api.get("/admin/artisans/debt"),
};

export const supportAPI = {
  // Send a support message (authenticated)
  sendMessage: (payload) => api.post("/support/messages", payload),

  // Get messages (admin => all, user => own)
  getMessages: () => api.get("/support/messages"),

  // Get single message
  getMessage: (id) => api.get(`/support/messages/${id}`),

  // Admin reply
  replyMessage: (id, adminResponse) =>
    api.put(`/support/messages/${id}/reply`, { adminResponse }),

  // Send an individual message from the admin to a specific user
  adminSendMessage: (recipientId, subject, message) =>
    api.post("/support/messages/admin-send", { recipientId, subject, message }),

  // Unread counts
  getUnreadCount: () => api.get("/support/messages/unread-count"),

  // Mark read (PUT will return the message and mark read in controller)
  markRead: (id) => api.put(`/support/messages/${id}/mark-read`),
};

export default api;
