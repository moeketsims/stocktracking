import type { HealthStatus, VehicleHealth, TyreHealth, BrakePadHealth } from '../types';

// Service thresholds (in km)
export const SERVICE_THRESHOLDS = {
  SOON: 10000,  // Due Soon after 10,000 km
  DUE: 15000,   // Overdue after 15,000 km
};

// Tyre thresholds (in km) - typical tyre lifespan
export const TYRE_THRESHOLDS = {
  SOON: 40000,  // Due Soon after 40,000 km
  DUE: 50000,   // Overdue after 50,000 km
};

// Brake pad thresholds (in km)
export const BRAKE_THRESHOLDS = {
  SOON: 40000,  // Due Soon after 40,000 km
  DUE: 50000,   // Overdue after 50,000 km
};

/**
 * Calculate service status based on kilometers traveled since last service
 */
export function calculateServiceStatus(
  currentKm: number | null,
  lastServiceKm: number | null
): HealthStatus {
  if (currentKm === null || lastServiceKm === null) {
    return 'ok'; // Can't calculate without data
  }

  const kmSinceService = currentKm - lastServiceKm;

  if (kmSinceService >= SERVICE_THRESHOLDS.DUE) {
    return 'due';
  }
  if (kmSinceService >= SERVICE_THRESHOLDS.SOON) {
    return 'soon';
  }
  return 'ok';
}

/**
 * Calculate tyre status based on kilometers traveled since last replacement
 */
export function calculateTyreStatus(
  currentKm: number | null,
  lastReplacedKm: number | null
): HealthStatus {
  if (currentKm === null || lastReplacedKm === null) {
    return 'ok'; // Can't calculate without data
  }

  const kmSinceReplacement = currentKm - lastReplacedKm;

  if (kmSinceReplacement >= TYRE_THRESHOLDS.DUE) {
    return 'due';
  }
  if (kmSinceReplacement >= TYRE_THRESHOLDS.SOON) {
    return 'soon';
  }
  return 'ok';
}

/**
 * Calculate brake pad status based on kilometers traveled since last replacement
 */
export function calculateBrakeStatus(
  currentKm: number | null,
  lastReplacedKm: number | null
): HealthStatus {
  if (currentKm === null || lastReplacedKm === null) {
    return 'ok'; // Can't calculate without data
  }

  const kmSinceReplacement = currentKm - lastReplacedKm;

  if (kmSinceReplacement >= BRAKE_THRESHOLDS.DUE) {
    return 'due';
  }
  if (kmSinceReplacement >= BRAKE_THRESHOLDS.SOON) {
    return 'soon';
  }
  return 'ok';
}

/**
 * Get the worst status from an array of statuses
 * Priority: due > soon > ok
 */
export function getWorstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('due')) return 'due';
  if (statuses.includes('soon')) return 'soon';
  return 'ok';
}

/**
 * Calculate all tyre statuses and return the worst one
 */
export function calculateOverallTyreStatus(
  currentKm: number | null,
  tyres: TyreHealth[]
): HealthStatus {
  if (tyres.length === 0) return 'ok';

  const statuses = tyres.map((tyre) =>
    calculateTyreStatus(currentKm, tyre.last_replaced_km)
  );

  return getWorstStatus(statuses);
}

/**
 * Calculate all brake pad statuses and return the worst one
 */
export function calculateOverallBrakeStatus(
  currentKm: number | null,
  brakePads: BrakePadHealth[]
): HealthStatus {
  if (brakePads.length === 0) return 'ok';

  const statuses = brakePads.map((pad) =>
    calculateBrakeStatus(currentKm, pad.last_replaced_km)
  );

  return getWorstStatus(statuses);
}

/**
 * Calculate all health statuses for a vehicle
 */
export function calculateVehicleHealth(
  currentKm: number | null,
  health: VehicleHealth | undefined
): {
  serviceStatus: HealthStatus;
  tyresStatus: HealthStatus;
  brakesStatus: HealthStatus;
} {
  if (!health) {
    return {
      serviceStatus: 'ok',
      tyresStatus: 'ok',
      brakesStatus: 'ok',
    };
  }

  return {
    serviceStatus: calculateServiceStatus(currentKm, health.last_service_km),
    tyresStatus: calculateOverallTyreStatus(currentKm, health.tyres || []),
    brakesStatus: calculateOverallBrakeStatus(currentKm, health.brake_pads || []),
  };
}

/**
 * Get kilometers until next service is due
 */
export function getKmUntilService(
  currentKm: number | null,
  lastServiceKm: number | null
): number | null {
  if (currentKm === null || lastServiceKm === null) return null;

  const nextServiceKm = lastServiceKm + SERVICE_THRESHOLDS.SOON;
  return Math.max(0, nextServiceKm - currentKm);
}

/**
 * Format km remaining message
 */
export function formatKmRemaining(kmRemaining: number | null): string {
  if (kmRemaining === null) return 'Unknown';
  if (kmRemaining <= 0) return 'Overdue';
  return `${kmRemaining.toLocaleString()} km remaining`;
}
