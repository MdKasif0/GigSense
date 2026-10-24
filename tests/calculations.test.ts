import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeliveryProfitability, validateDeliveryInputs } from "../src/lib/calculations";

test("calculates the documented ₹50, 7 km, 35 minute example deterministically", () => {
  assert.deepEqual(calculateDeliveryProfitability(50, 7, 35, 2.5), {
    calculatedVehicleCost: 17.5,
    estimatedContribution: 32.5,
    estimatedContributionPerHour: 55.71,
  });
});

test("deducts entered additional expenses before deriving hourly contribution", () => {
  assert.deepEqual(calculateDeliveryProfitability(100, 10, 30, 3, 10), {
    calculatedVehicleCost: 30,
    estimatedContribution: 60,
    estimatedContributionPerHour: 120,
  });
});

test("rejects missing, non-finite, negative and zero divisor inputs", () => {
  assert.match(validateDeliveryInputs(Number.NaN, 1, 1, 0) ?? "", /Payment/);
  assert.match(validateDeliveryInputs(1, 0, 1, 0) ?? "", /Distance/);
  assert.match(validateDeliveryInputs(1, 1, 0, 0) ?? "", /Duration/);
  assert.match(validateDeliveryInputs(1, 1, 1, -0.1) ?? "", /Vehicle/);
  assert.match(validateDeliveryInputs(1, 1, 1, 0, -1) ?? "", /Additional/);
  assert.throws(() => calculateDeliveryProfitability(1, 1, 0, 0), RangeError);
});
