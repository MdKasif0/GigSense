/**
 * Delivery analysis types for the RouteReality module.
 * These represent the financial profitability evaluation of a single delivery offer.
 */

/** Distinguishes real user-entered records from demo/sample data. */
export type AnalysisMode = "real" | "sample";

/** A single delivery analysis record. */
export interface DeliveryAnalysis {
  /** UUID v4 – generated client-side on creation. */
  id: string;

  /** ISO 8601 timestamp when the record was created. */
  createdAt: string;

  /** Platform name (e.g. "Uber Eats", "DoorDash"). Optional. */
  platform?: string;

  /** Payment offered by the platform for this delivery, in the worker's currency. */
  offeredPayment: number;

  /** Estimated one-way distance in kilometres. */
  estimatedDistanceKm: number;

  /** Estimated total trip duration in minutes. */
  estimatedDurationMinutes: number;

  /** Vehicle running cost per kilometre (fuel + wear estimate). */
  vehicleCostPerKm: number;

  /**
   * Any additional expenses the worker anticipates (e.g. tolls, parking).
   * Optional – defaults to 0 if not provided.
   */
  additionalExpenses?: number;

  // ── Derived / calculated fields ──────────────────────────────────────────

  /** Total vehicle cost = estimatedDistanceKm × vehicleCostPerKm. */
  calculatedVehicleCost: number;

  /** Net contribution = offeredPayment − calculatedVehicleCost − additionalExpenses. */
  estimatedContribution: number;

  /** Annualised hourly rate = (estimatedContribution / estimatedDurationMinutes) × 60. */
  estimatedContributionPerHour: number;

  // ── Actual outcome (filled in after the delivery) ─────────────────────────

  /** Actual payment received, if the delivery has been completed. */
  actualPayment?: number;

  /** Actual distance travelled, in kilometres. */
  actualDistanceKm?: number;

  /** Actual duration of the delivery, in minutes. */
  actualDurationMinutes?: number;

  /** Any notes the worker wants to record after completion. */
  outcomeNotes?: string;

  /** Whether the actual outcome has been recorded. */
  isCompleted: boolean;

  /** Whether this is a real user record or sample/demo data. */
  analysisMode: AnalysisMode;
}

/** Fields required to create a new delivery analysis before calculations are run. */
export type CreateDeliveryInput = Pick<
  DeliveryAnalysis,
  | "platform"
  | "offeredPayment"
  | "estimatedDistanceKm"
  | "estimatedDurationMinutes"
  | "vehicleCostPerKm"
  | "additionalExpenses"
> & {
  analysisMode?: AnalysisMode;
};
