/**
 * Pure calculation utilities for the RouteReality module.
 * All functions are stateless and accept/return plain numbers.
 */

/** Result of running the full delivery profitability calculation. */
export interface DeliveryCalculationResult {
  calculatedVehicleCost: number;
  estimatedContribution: number;
  estimatedContributionPerHour: number;
}

/** Validate the values used by the deterministic estimate. */
export function validateDeliveryInputs(
  offeredPayment: number,
  distanceKm: number,
  durationMinutes: number,
  vehicleCostPerKm: number,
  additionalExpenses: number = 0
): string | null {
  if (!Number.isFinite(offeredPayment) || offeredPayment < 0) return "Payment must be a nonnegative number.";
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return "Distance must be greater than zero.";
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return "Duration must be greater than zero.";
  if (!Number.isFinite(vehicleCostPerKm) || vehicleCostPerKm < 0) return "Vehicle cost per kilometre must be nonnegative.";
  if (!Number.isFinite(additionalExpenses) || additionalExpenses < 0) return "Additional expenses must be nonnegative.";
  return null;
}

/**
 * Calculate the profitability metrics for a delivery offer.
 *
 * @param offeredPayment       - Platform payment for the delivery.
 * @param distanceKm           - Estimated trip distance in kilometres.
 * @param durationMinutes      - Estimated trip duration in minutes.
 * @param vehicleCostPerKm     - Worker's vehicle running cost per kilometre.
 * @param additionalExpenses   - Any extra costs (tolls, parking, etc.). Defaults to 0.
 * @returns                    Calculated cost, contribution, and hourly rate.
 */
export function calculateDeliveryProfitability(
  offeredPayment: number,
  distanceKm: number,
  durationMinutes: number,
  vehicleCostPerKm: number,
  additionalExpenses: number = 0
): DeliveryCalculationResult {
  const validationError = validateDeliveryInputs(
    offeredPayment,
    distanceKm,
    durationMinutes,
    vehicleCostPerKm,
    additionalExpenses
  );
  if (validationError) throw new RangeError(validationError);

  const calculatedVehicleCost = distanceKm * vehicleCostPerKm;
  const estimatedContribution =
    offeredPayment - calculatedVehicleCost - additionalExpenses;
  const estimatedContributionPerHour = (estimatedContribution / durationMinutes) * 60;

  return {
    calculatedVehicleCost: round2(calculatedVehicleCost),
    estimatedContribution: round2(estimatedContribution),
    estimatedContributionPerHour: round2(estimatedContributionPerHour),
  };
}

/**
 * Recalculate profitability using actual outcome values where available,
 * falling back to the estimated values.
 */
export function calculateActualProfitability(
  actualPayment: number,
  actualDistanceKm: number,
  actualDurationMinutes: number,
  vehicleCostPerKm: number,
  additionalExpenses: number = 0
): DeliveryCalculationResult {
  return calculateDeliveryProfitability(
    actualPayment,
    actualDistanceKm,
    actualDurationMinutes,
    vehicleCostPerKm,
    additionalExpenses
  );
}

/**
 * Determine a simple profitability verdict based on the hourly contribution.
 * Thresholds can be updated as the product evolves.
 */
export function getProfitabilityVerdict(
  contributionPerHour: number
): "good" | "marginal" | "poor" {
  if (contributionPerHour >= 15) return "good";
  if (contributionPerHour >= 8) return "marginal";
  return "poor";
}

/** Round a number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Format a number as a currency string.
 * Uses the browser locale; falls back to a simple string in SSR contexts.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "INR"
): string {
  if (typeof Intl !== "undefined") {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${amount.toFixed(2)}`;
}

/** Format a duration in minutes as "Xh Ym" or "Ym". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
