import type { AxiosInstance, AxiosError } from 'axios';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),
};

// Dashboard API
export const dashboardApi = {
  getDashboard: () => api.get('/api/dashboard'),
  getTodayStats: () => api.get('/api/dashboard/today-stats'),
};

// Stock API
export const stockApi = {
  getOverview: () => api.get('/api/stock'),
  getBalance: () => api.get('/api/stock/balance'),
  receive: (data: any) => api.post('/api/stock/receive', data),
  issue: (data: any) => api.post('/api/stock/issue', data),
  transfer: (data: any) => api.post('/api/stock/transfer', data),
  waste: (data: any) => api.post('/api/stock/waste', data),
};

// Transactions API
export const transactionsApi = {
  getAll: (params?: { type_filter?: string; limit?: number; offset?: number }) =>
    api.get('/api/transactions', { params }),
  getById: (id: string) => api.get(`/api/transactions/${id}`),
};

// Alerts API
export const alertsApi = {
  getAll: () => api.get('/api/alerts'),
  getSummary: () => api.get('/api/alerts/summary'),
  acknowledge: (data: any) => api.post('/api/alerts/acknowledge', data),
};

// Batches API
export const batchesApi = {
  getAll: (params?: { filter_type?: string; item_id?: string; limit?: number }) =>
    api.get('/api/batches', { params }),
  getById: (id: string) => api.get(`/api/batches/${id}`),
  getOldest: (itemId: string) => api.get(`/api/batches/oldest/${itemId}`),
};

// Analytics API
export const analyticsApi = {
  get: (periodDays: number = 30) => api.get('/api/analytics', { params: { period_days: periodDays } }),
  getStockLevels: () => api.get('/api/analytics/stock-levels'),
  getShopEfficiency: (periodDays: number = 30) =>
    api.get('/api/analytics/shop-efficiency', { params: { period_days: periodDays } }),
  getHourlyComparison: (locationId?: string) =>
    api.get('/api/analytics/usage-comparison/hourly', { params: { location_id: locationId } }),
  getWeeklyComparison: (locationId?: string) =>
    api.get('/api/analytics/usage-comparison/weekly', { params: { location_id: locationId } }),
  getMonthlyComparison: (locationId?: string) =>
    api.get('/api/analytics/usage-comparison/monthly', { params: { location_id: locationId } }),
};

// Reports API
export const reportsApi = {
  getDailySummary: (periodDays: number = 7) =>
    api.get('/api/reports/daily-summary', { params: { period_days: periodDays } }),
  getSupplierQuality: () => api.get('/api/reports/supplier-quality'),
  exportDailySummary: (periodDays: number = 7) =>
    api.get('/api/reports/export/daily-summary', {
      params: { period_days: periodDays },
      responseType: 'blob',
    }),
};

// Zone API
export const zoneApi = {
  getOverview: () => api.get('/api/zone/overview'),
  getLocations: () => api.get('/api/zone/locations'),
};

// Owner Dashboard API (admin only)
export const ownerDashboardApi = {
  get: () => api.get('/api/owner-dashboard'),
};

// Notifications API
export const notificationsApi = {
  getAll: () => api.get('/api/notifications'),
  getUnreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/api/settings'),
  updateProfile: (data: { full_name?: string }) =>
    api.patch('/api/settings/profile', data),
  getSyncStatus: () => api.get('/api/settings/sync-status'),
};

// Reference Data API
export const referenceApi = {
  getItems: () => api.get('/api/reference/items'),
  getSuppliers: () => api.get('/api/reference/suppliers'),
  getLocations: () => api.get('/api/reference/locations'),
  getZones: () => api.get('/api/reference/zones'),
  getLocationsByZone: (zoneId: string) =>
    api.get(`/api/reference/locations-by-zone/${zoneId}`),
  getWasteReasons: () => api.get('/api/reference/waste-reasons'),
  getQualityScores: () => api.get('/api/reference/quality-scores'),
};

// Adjustments API (managers only)
export const adjustmentsApi = {
  create: (data: any) => api.post('/api/adjustments', data),
  getReasons: () => api.get('/api/adjustments/reasons'),
};

// Batch Management API (managers only)
export const batchManagementApi = {
  getBatch: (batchId: string) => api.get(`/api/batch-management/${batchId}`),
  editBatch: (batchId: string, data: any) => api.patch(`/api/batch-management/${batchId}`, data),
  getHistory: (batchId: string) => api.get(`/api/batch-management/${batchId}/history`),
  getStatuses: () => api.get('/api/batch-management/statuses/list'),
};

// Returns API
export const returnsApi = {
  create: (data: any) => api.post('/api/returns', data),
  getRecent: (limit: number = 10) => api.get('/api/returns/recent', { params: { limit } }),
};

// Vehicles API
export const vehiclesApi = {
  list: (activeOnly: boolean = true) =>
    api.get('/api/vehicles', { params: { active_only: activeOnly } }),
  get: (id: string) => api.get(`/api/vehicles/${id}`),
  create: (data: any) => api.post('/api/vehicles', data),
  update: (id: string, data: any) => api.patch(`/api/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/api/vehicles/${id}`),
};

// Drivers API
export const driversApi = {
  list: (activeOnly: boolean = true) =>
    api.get('/api/drivers', { params: { active_only: activeOnly } }),
  get: (id: string) => api.get(`/api/drivers/${id}`),
  create: (data: any) => api.post('/api/drivers', data),
  update: (id: string, data: any) => api.patch(`/api/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/api/drivers/${id}`),
};

// Trips API
export const tripsApi = {
  list: (params?: { status?: string; vehicle_id?: string; from_date?: string; to_date?: string; limit?: number }) =>
    api.get('/api/trips', { params }),
  get: (id: string) => api.get(`/api/trips/${id}`),
  create: (data: any) => api.post('/api/trips', data),
  update: (id: string, data: any) => api.patch(`/api/trips/${id}`, data),
  start: (id: string) => api.post(`/api/trips/${id}/start`),
  complete: (id: string, data: any) => api.post(`/api/trips/${id}/complete`, data),
  cancel: (id: string) => api.post(`/api/trips/${id}/cancel`),
  getSummary: (params?: { from_date?: string; to_date?: string; vehicle_id?: string }) =>
    api.get('/api/trips/summary', { params }),
  getCargo: (id: string) => api.get(`/api/trips/${id}/cargo`),
  // Multi-stop trips
  createMultiStop: (data: any) => api.post('/api/trips/multi-stop', data),
  getStops: (tripId: string) => api.get(`/api/trips/${tripId}/stops`),
  addStop: (tripId: string, stop: any) => api.post(`/api/trips/${tripId}/stops`, stop),
  arriveAtStop: (stopId: string) => api.post(`/api/trips/stops/${stopId}/arrive`),
  completeStop: (stopId: string, data?: any) => api.post(`/api/trips/stops/${stopId}/complete`, data || {}),
};

// Barcode Scanning API
export const barcodeApi = {
  // Barcode lookup
  lookup: (barcode: string, supplierId?: string) =>
    api.post('/api/barcode/lookup', { barcode, supplier_id: supplierId }),

  // Scan sessions
  createSession: (data: any) => api.post('/api/barcode/sessions', data),
  getSession: (sessionId: string) => api.get(`/api/barcode/sessions/${sessionId}`),
  recordScan: (sessionId: string, data: any) =>
    api.post(`/api/barcode/sessions/${sessionId}/scan`, data),
  updateScanStatus: (sessionId: string, scanId: string, status: string, reason?: string) =>
    api.patch(`/api/barcode/sessions/${sessionId}/scans/${scanId}`, { status, rejection_reason: reason }),
  bulkReceive: (sessionId: string, data: any) =>
    api.post(`/api/barcode/sessions/${sessionId}/receive`, data),
  cancelSession: (sessionId: string) =>
    api.post(`/api/barcode/sessions/${sessionId}/cancel`),

  // Barcode mappings
  getMappings: (supplierId?: string, activeOnly: boolean = true) =>
    api.get('/api/barcode/mappings', { params: { supplier_id: supplierId, active_only: activeOnly } }),
  createMapping: (data: any) => api.post('/api/barcode/mappings', data),
  updateMapping: (mappingId: string, data: any) =>
    api.patch(`/api/barcode/mappings/${mappingId}`, data),
  deleteMapping: (mappingId: string) =>
    api.delete(`/api/barcode/mappings/${mappingId}`),
};
