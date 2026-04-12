import { API_BASE_URL } from '../constants/config';

/**
 * Export endpoints return Excel/PDF files — not JSON.
 * On mobile we open the URL in the browser so the OS handles the download.
 * We build authenticated URLs here; the actual opening happens in the hook/component.
 */

export function getStockExportUrl(token: string, locationId?: string): string {
  const params = new URLSearchParams();
  if (locationId) params.set('view_location_id', locationId);
  const qs = params.toString();
  return `${API_BASE_URL}/api/exports/stock/excel${qs ? `?${qs}` : ''}`;
}

export function getBatchesExportUrl(token: string, locationId?: string): string {
  const params = new URLSearchParams();
  if (locationId) params.set('view_location_id', locationId);
  const qs = params.toString();
  return `${API_BASE_URL}/api/exports/batches/excel${qs ? `?${qs}` : ''}`;
}

export function getTransactionsExportUrl(
  token: string,
  opts?: { days?: number; typeFilter?: string; locationId?: string },
): string {
  const params = new URLSearchParams();
  if (opts?.days) params.set('days', String(opts.days));
  if (opts?.typeFilter) params.set('type_filter', opts.typeFilter);
  if (opts?.locationId) params.set('view_location_id', opts.locationId);
  const qs = params.toString();
  return `${API_BASE_URL}/api/exports/transactions/excel${qs ? `?${qs}` : ''}`;
}
