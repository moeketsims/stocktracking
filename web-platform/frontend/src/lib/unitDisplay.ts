import type { UnitPreference } from '../stores/settingsStore';

/**
 * Get the preferred value based on unit preference.
 * Backend provides both kg and bags values; this selects the appropriate one.
 */
export function getPreferredValue(
  kgValue: number | undefined,
  bagsValue: number | undefined,
  unit: UnitPreference
): number {
  if (unit === 'bag') {
    return bagsValue ?? (kgValue ? kgValue / 10 : 0);
  }
  return kgValue ?? (bagsValue ? bagsValue * 10 : 0);
}

/**
 * Get the unit label for display.
 */
export function getUnitLabel(unit: UnitPreference): string {
  return unit === 'bag' ? 'bags' : 'kg';
}

/**
 * Get the short unit label (for inline display).
 */
export function getUnitShort(unit: UnitPreference): string {
  return unit === 'bag' ? 'bags' : 'kg';
}

/**
 * Format a quantity with its unit.
 */
export function formatQuantity(
  kgValue: number | undefined,
  bagsValue: number | undefined,
  unit: UnitPreference,
  decimals: number = 1
): string {
  const value = getPreferredValue(kgValue, bagsValue, unit);
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${getUnitShort(unit)}`;
}

/**
 * Format a quantity without the unit label (just the number).
 */
export function formatQuantityValue(
  kgValue: number | undefined,
  bagsValue: number | undefined,
  unit: UnitPreference,
  decimals: number = 1
): string {
  const value = getPreferredValue(kgValue, bagsValue, unit);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
