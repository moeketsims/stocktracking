/**
 * Unit conversion utilities for stock tracking.
 * All quantities are normalized to the base unit (kg) for accurate balance calculations.
 */

export interface ItemUnitInfo {
  unit: string;
  conversion_factor: number;
}

/**
 * Normalizes a quantity to the base unit (kg).
 *
 * @param qty - The quantity entered by the user
 * @param selectedUnit - The unit selected by the user ('kg' or 'bag')
 * @param item - The item's unit configuration (base unit and conversion factor)
 * @returns The normalized quantity in base unit (kg)
 *
 * @example
 * // If item has unit='kg', conversion_factor=10 (meaning 1 bag = 10kg)
 * normalizeToBaseUnit(5, 'bag', { unit: 'kg', conversion_factor: 10 })
 * // Returns: 50 (5 bags * 10 = 50kg)
 *
 * normalizeToBaseUnit(30, 'kg', { unit: 'kg', conversion_factor: 10 })
 * // Returns: 30 (already in base unit)
 */
export function normalizeToBaseUnit(
  qty: number,
  selectedUnit: string,
  item: ItemUnitInfo
): number {
  // If user entered in base unit (kg), no conversion needed
  if (selectedUnit === item.unit) {
    return qty;
  }

  // Convert from alternative unit (bag) to base unit (kg)
  // e.g., 5 bags * 10 = 50 kg
  return qty * item.conversion_factor;
}

/**
 * Converts a quantity from base unit to display unit.
 *
 * @param qtyInBaseUnit - The quantity in base unit (kg)
 * @param displayUnit - The unit to display ('kg' or 'bag')
 * @param item - The item's unit configuration
 * @returns The quantity in display unit
 *
 * @example
 * convertFromBaseUnit(50, 'bag', { unit: 'kg', conversion_factor: 10 })
 * // Returns: 5 (50kg / 10 = 5 bags)
 */
export function convertFromBaseUnit(
  qtyInBaseUnit: number,
  displayUnit: string,
  item: ItemUnitInfo
): number {
  // If displaying in base unit, no conversion needed
  if (displayUnit === item.unit) {
    return qtyInBaseUnit;
  }

  // Convert from base unit to alternative unit
  // e.g., 50 kg / 10 = 5 bags
  return qtyInBaseUnit / item.conversion_factor;
}

/**
 * Formats a quantity with its unit for display.
 *
 * @param qty - The quantity to format
 * @param unit - The unit to display
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "50.0 kg" or "5.0 bags"
 */
export function formatQuantity(qty: number, unit: string, decimals = 1): string {
  const formatted = qty.toFixed(decimals);
  const unitLabel = unit === 'bag' && qty !== 1 ? 'bags' : unit;
  return `${formatted} ${unitLabel}`;
}
