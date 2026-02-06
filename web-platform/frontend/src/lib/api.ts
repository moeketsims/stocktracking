import type { AxiosInstance, AxiosError } from 'axios';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

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
  getDashboard: (viewLocationId?: string) =>
    api.get('/api/dashboard', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getTodayStats: (viewLocationId?: string) =>
    api.get('/api/dashboard/today-stats', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
};

// Stock API
export const stockApi = {
  getOverview: (viewLocationId?: string) =>
    api.get('/api/stock', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getByLocation: () => api.get('/api/stock/by-location'),
  getBalance: (viewLocationId?: string) =>
    api.get('/api/stock/balance', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  receive: (data: any) => api.post('/api/stock/receive', data),
  issue: (data: any) => api.post('/api/stock/issue', data),
  returnStock: (data: any) => api.post('/api/stock/return', data),
  transfer: (data: any) => api.post('/api/stock/transfer', data),
  waste: (data: any) => api.post('/api/stock/waste', data),
};

// Transactions API
export const transactionsApi = {
  getAll: (params?: { type_filter?: string; limit?: number; offset?: number; view_location_id?: string; days?: number }) =>
    api.get('/api/transactions', { params }),
  getById: (id: string) => api.get(`/api/transactions/${id}`),
};

// Alerts API
export const alertsApi = {
  getAll: (viewLocationId?: string) =>
    api.get('/api/alerts', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getSummary: (viewLocationId?: string) =>
    api.get('/api/alerts/summary', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  acknowledge: (data: any) => api.post('/api/alerts/acknowledge', data),
};

// Batches API
export const batchesApi = {
  getAll: (params?: { filter_type?: string; item_id?: string; limit?: number; view_location_id?: string }) =>
    api.get('/api/batches', { params }),
  getById: (id: string) => api.get(`/api/batches/${id}`),
  getOldest: (itemId: string, viewLocationId?: string) =>
    api.get(`/api/batches/oldest/${itemId}`, { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
};

// Analytics API
export const analyticsApi = {
  get: (periodDays: number = 30, viewLocationId?: string) =>
    api.get('/api/analytics', { params: { period_days: periodDays, view_location_id: viewLocationId } }),
  getStockLevels: (viewLocationId?: string) =>
    api.get('/api/analytics/stock-levels', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getShopEfficiency: (periodDays: number = 30) =>
    api.get('/api/analytics/shop-efficiency', { params: { period_days: periodDays } }),
  getHourlyComparison: (viewLocationId?: string) =>
    api.get('/api/analytics/usage-comparison/hourly', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getWeeklyComparison: (viewLocationId?: string) =>
    api.get('/api/analytics/usage-comparison/weekly', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  getMonthlyComparison: (viewLocationId?: string) =>
    api.get('/api/analytics/usage-comparison/monthly', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
};

// Reports API
export const reportsApi = {
  getDailySummary: (periodDays: number = 7, viewLocationId?: string) =>
    api.get('/api/reports/daily-summary', { params: { period_days: periodDays, view_location_id: viewLocationId } }),
  getSupplierQuality: (viewLocationId?: string) =>
    api.get('/api/reports/supplier-quality', { params: viewLocationId ? { view_location_id: viewLocationId } : undefined }),
  exportDailySummary: (periodDays: number = 7, viewLocationId?: string) =>
    api.get('/api/reports/export/daily-summary', {
      params: { period_days: periodDays, view_location_id: viewLocationId },
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
  // Location management (admin only)
  createLocation: (data: { name: string; zone_id: string; type: 'shop' | 'warehouse'; address?: string }) =>
    api.post('/api/reference/locations', data),
  updateLocation: (id: string, data: { name?: string; address?: string }) =>
    api.patch(`/api/reference/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/api/reference/locations/${id}`),
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
  list: (activeOnly: boolean = true, includeTripStatus: boolean = false) =>
    api.get('/api/vehicles', { params: { active_only: activeOnly, include_trip_status: includeTripStatus } }),
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
  resendInvitation: (id: string) => api.post(`/api/drivers/${id}/resend-invitation`),
};

// Trips API
export const tripsApi = {
  list: (params?: { status?: string; vehicle_id?: string; from_date?: string; to_date?: string; limit?: number }) =>
    api.get('/api/trips', { params }),
  get: (id: string) => api.get(`/api/trips/${id}`),
  getMyDeliveries: (locationId: string, limit?: number) =>
    api.get(`/api/trips/my-deliveries/${locationId}`, { params: { limit } }),
  create: (data: any) => api.post('/api/trips', data),
  update: (id: string, data: any) => api.patch(`/api/trips/${id}`, data),
  start: (id: string, estimatedArrivalTime?: string) =>
    api.post(`/api/trips/${id}/start`, estimatedArrivalTime ? { estimated_arrival_time: estimatedArrivalTime } : {}),
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
  // Driver km submission
  getDriverAwaitingKm: () => api.get('/api/trips/driver/awaiting-km'),
  submitKm: (tripId: string, closingKm: number) =>
    api.post(`/api/trips/${tripId}/submit-km`, null, { params: { closing_km: closingKm } }),
  // Driver loan trips
  getDriverLoanTrips: () => api.get('/api/trips/driver/loan-trips'),
  getDriverLoanTripsCount: () => api.get('/api/trips/driver/loan-trips/count'),
};

// Demo Data API (for seeding test data)
export const demoApi = {
  seed: () => api.post('/api/demo/seed'),
  clear: () => api.delete('/api/demo/clear'),
  status: () => api.get('/api/demo/status'),
  createTestUser: () => api.post('/api/demo/create-test-user'),
};

// Users API (admin/zone manager)
export const usersApi = {
  list: (params?: { role?: string; zone_id?: string; is_active?: boolean; search?: string }) =>
    api.get('/api/users', { params }),
  get: (id: string) => api.get(`/api/users/${id}`),
  update: (id: string, data: any) => api.patch(`/api/users/${id}`, data),
  deactivate: (id: string) => api.post(`/api/users/${id}/deactivate`),
  activate: (id: string) => api.post(`/api/users/${id}/activate`),
  resetPassword: (id: string) => api.post(`/api/users/${id}/reset-password`),
};

// Invitations API
export const invitationsApi = {
  list: (status?: string) => api.get('/api/invitations', { params: { status } }),
  create: (data: any) => api.post('/api/invitations', data),
  cancel: (id: string) => api.delete(`/api/invitations/${id}`),
  resend: (id: string) => api.post(`/api/invitations/${id}/resend`),
};

// Auth Extensions
export const authExtApi = {
  validateInvite: (token: string) => api.get(`/api/auth/validate-invite/${token}`),
  acceptInvite: (data: { token: string; password: string }) =>
    api.post('/api/auth/accept-invite', data),
  forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) =>
    api.post('/api/auth/reset-password', data),
};

// Stock Requests API (Replenishment Workflow)
export const stockRequestsApi = {
  list: (params?: { status?: string; location_id?: string; urgency?: string; limit?: number }) =>
    api.get('/api/stock-requests', { params }),
  getAvailable: (limit?: number) =>
    api.get('/api/stock-requests/available', { params: { limit } }),
  get: (id: string) => api.get(`/api/stock-requests/${id}`),
  create: (data: any) => api.post('/api/stock-requests', data),
  update: (id: string, data: { quantity_bags?: number; urgency?: string; notes?: string }) =>
    api.patch(`/api/stock-requests/${id}`, data),
  accept: (id: string) => api.post(`/api/stock-requests/${id}/accept`),
  createTrip: (id: string, data: any) => api.post(`/api/stock-requests/${id}/create-trip`, data),
  createMultiTrip: (data: { request_ids: string[]; vehicle_id: string; driver_id?: string; supplier_id: string; notes?: string }) =>
    api.post('/api/stock-requests/create-multi-trip', data),
  cancel: (id: string, reason: string) => api.post(`/api/stock-requests/${id}/cancel`, { reason }),
  fulfillRemaining: (id: string, data: { vehicle_id: string; driver_id?: string; supplier_id: string; notes?: string }) =>
    api.post(`/api/stock-requests/${id}/fulfill-remaining`, data),
  getMyRequests: (status?: string, limit?: number) =>
    api.get('/api/stock-requests/my/requests', { params: { status, limit } }),
  reRequest: (id: string) => api.post(`/api/stock-requests/${id}/re-request`),
  // Counter-proposal flow (Phase 3)
  proposeTime: (id: string, data: { proposed_delivery_time: string; reason: string; notes?: string }) =>
    api.post(`/api/stock-requests/${id}/propose-time`, data),
  acceptProposal: (id: string) =>
    api.post(`/api/stock-requests/${id}/accept-proposal`),
  declineProposal: (id: string, data?: { notes?: string }) =>
    api.post(`/api/stock-requests/${id}/decline-proposal`, data || {}),
};

// Pending Deliveries API
export const pendingDeliveriesApi = {
  list: (params?: { status?: string; location_id?: string; limit?: number }) =>
    api.get('/api/pending-deliveries', { params }),
  getPending: (locationId?: string, limit?: number) =>
    api.get('/api/pending-deliveries/pending', { params: { location_id: locationId, limit } }),
  get: (id: string) => api.get(`/api/pending-deliveries/${id}`),
  confirm: (id: string, data: { confirmed_qty_kg: number; notes?: string }) =>
    api.post(`/api/pending-deliveries/${id}/confirm`, data),
  reject: (id: string, data: { reason: string }) =>
    api.post(`/api/pending-deliveries/${id}/reject`, data),
  // Feature 2: Resend KM submission email
  resendKmEmail: (id: string) =>
    api.post(`/api/pending-deliveries/${id}/resend-km-email`),
  // Feature 4: Correct closing km
  correctKm: (tripId: string, data: { new_closing_km: number; reason: string }) =>
    api.post(`/api/pending-deliveries/trips/${tripId}/correct-km`, data),
};

// Locations API
export const locationsApi = {
  list: (type?: string) => api.get('/api/locations', { params: type ? { type } : undefined }),
  get: (id: string) => api.get(`/api/locations/${id}`),
  getThresholds: (id: string) => api.get(`/api/locations/${id}/thresholds`),
  updateThresholds: (id: string, data: { critical_stock_threshold: number; low_stock_threshold: number }) =>
    api.patch(`/api/locations/${id}/thresholds`, data),
};

// Loans API (Inter-shop Stock Borrowing)
export const loansApi = {
  list: (params?: { status?: string; as_borrower?: boolean; as_lender?: boolean; limit?: number }) =>
    api.get('/api/loans', { params }),
  get: (id: string) => api.get(`/api/loans/${id}`),
  getPendingCount: () => api.get('/api/loans/pending-count'),
  getOtherLocations: () => api.get('/api/loans/locations'),
  create: (data: { lender_location_id: string; quantity_requested: number; estimated_return_date: string; notes?: string }) =>
    api.post('/api/loans', data),
  accept: (id: string, data: { quantity_approved: number; notes?: string }) =>
    api.post(`/api/loans/${id}/accept`, data),
  reject: (id: string, data: { reason: string }) =>
    api.post(`/api/loans/${id}/reject`, data),
  confirm: (id: string) => api.post(`/api/loans/${id}/confirm`),
  assignPickup: (id: string, data: { driver_id: string; vehicle_id?: string; notes?: string }) =>
    api.post(`/api/loans/${id}/assign-pickup`, data),
  acceptPickup: (id: string, data: { odometer_start: number; vehicle_id: string }) =>
    api.post(`/api/loans/${id}/accept-pickup`, data),
  // Lender confirms driver collected stock (deducts from lender)
  confirmCollection: (id: string, data?: { actual_quantity_bags?: number }) =>
    api.post(`/api/loans/${id}/confirm-collection`, data || {}),
  // Borrower confirms stock arrived (adds to borrower)
  confirmReceipt: (id: string, data?: { notes?: string }) =>
    api.post(`/api/loans/${id}/confirm-receipt`, data || {}),
  // Legacy endpoint - kept for backwards compatibility
  confirmPickup: (id: string, data?: { notes?: string }) =>
    api.post(`/api/loans/${id}/confirm-pickup`, data || {}),
  initiateReturn: (id: string, data: { notes?: string }) =>
    api.post(`/api/loans/${id}/initiate-return`, data),
  assignReturn: (id: string, data: { driver_id?: string; vehicle_id: string; notes?: string }) =>
    api.post(`/api/loans/${id}/assign-return`, data),
  // Driver accepts return assignment (deducts from borrower)
  acceptReturnAssignment: (id: string, data: { odometer_start: number }) =>
    api.post(`/api/loans/${id}/accept-return-assignment`, data),
  confirmReturn: (id: string, data?: { notes?: string }) =>
    api.post(`/api/loans/${id}/confirm-return`, data || {}),
};

// Stock Takes API
export const stockTakesApi = {
  list: (params?: { status?: string; limit?: number; view_location_id?: string }) =>
    api.get('/api/stock-takes', { params }),
  get: (id: string) => api.get(`/api/stock-takes/${id}`),
  create: (data: { location_id?: string; notes?: string }) =>
    api.post('/api/stock-takes', data),
  updateLine: (stockTakeId: string, lineId: string, data: { counted_qty: number; notes?: string }) =>
    api.patch(`/api/stock-takes/${stockTakeId}/lines/${lineId}`, data),
  complete: (id: string, data?: { notes?: string }) =>
    api.post(`/api/stock-takes/${id}/complete`, data || {}),
  cancel: (id: string) =>
    api.post(`/api/stock-takes/${id}/cancel`),
};

// Exports API (Excel/PDF downloads)
export const exportsApi = {
  stockExcel: (viewLocationId?: string) =>
    api.get('/api/exports/stock/excel', {
      params: viewLocationId ? { view_location_id: viewLocationId } : undefined,
      responseType: 'blob',
    }),
  transactionsExcel: (days: number = 30, typeFilter?: string, viewLocationId?: string) =>
    api.get('/api/exports/transactions/excel', {
      params: { days, type_filter: typeFilter, view_location_id: viewLocationId },
      responseType: 'blob',
    }),
  batchesExcel: (viewLocationId?: string) =>
    api.get('/api/exports/batches/excel', {
      params: viewLocationId ? { view_location_id: viewLocationId } : undefined,
      responseType: 'blob',
    }),
  stockTakeExcel: (stockTakeId: string) =>
    api.get(`/api/exports/stock-take/${stockTakeId}/excel`, { responseType: 'blob' }),
  stockTakePdf: (stockTakeId: string) =>
    api.get(`/api/exports/stock-take/${stockTakeId}/pdf`, { responseType: 'blob' }),
  dailyReportPdf: (periodDays: number = 7, viewLocationId?: string) =>
    api.get('/api/exports/daily-report/pdf', {
      params: { period_days: periodDays, view_location_id: viewLocationId },
      responseType: 'blob',
    }),
};

// Helper for downloading blob responses
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
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
