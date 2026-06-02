# Edge-Case Simulation Suite

## Overview

The Edge-Case Simulation Suite is a comprehensive testing framework that simulates critical edge-cases and failure scenarios in the payment processing pipeline. It verifies that the system correctly handles and reports on various anomalous situations.

## Architecture

The suite consists of:

1. **8 Edge-Case Fixtures** - JSON payloads representing different failure/anomaly scenarios
2. **EdgeCaseScenarioRunner** - Service that executes scenarios and verifies outcomes
3. **CLI Script** - Command-line interface to run the suite and generate reports
4. **Report Generator** - Produces `scenario-results.json` with detailed results

## Scenarios

### 1. Duplicate Webhook Replay
**File:** `edge-case-duplicate-replay.json`
- **Description:** Same webhook received twice
- **Expected Outcome:** Should detect duplicate and flag appropriately
- **Verification:** System recognizes duplicate transaction ID

### 2. Delayed Settlement
**File:** `edge-case-delayed-settlement.json`
- **Description:** Payment in pending state, settlement delayed
- **Expected Outcome:** Transaction ingested as pending, not failed
- **Verification:** Status tracked as PENDING, settlement expected date captured

### 3. Payment Reversal
**File:** `edge-case-payment-reversal.json`
- **Description:** Original payment is reversed by provider
- **Expected Outcome:** Reversal processed and tracked
- **Verification:** Original transaction ID linked, reversal reason captured

### 4. Partial Settlement
**File:** `edge-case-partial-settlement.json`
- **Description:** Only part of transaction amount settled
- **Expected Outcome:** Transaction processed with partial settlement tracked
- **Verification:** Settled vs unsettled amounts recorded correctly

### 5. Missing Fields
**File:** `edge-case-missing-fields.json`
- **Description:** Payload missing required fields (e.g., externalId, currency)
- **Expected Outcome:** Validation fails, transaction rejected
- **Verification:** Error message indicates missing required fields

### 6. Invalid Signature
**File:** `edge-case-invalid-signature.json`
- **Description:** Webhook with tampered/invalid signature
- **Expected Outcome:** In simulation, marked as verified regardless (bypasses verification)
- **Verification:** Pipeline processes but fraud detection flags as suspicious

### 7. Replay Attack Attempt
**File:** `edge-case-replay-attack.json`
- **Description:** Same webhook replayed multiple times
- **Expected Outcome:** Detected and flagged as potential replay attack
- **Verification:** Duplicate detection triggers fraud signal

### 8. Fraud Burst Attack
**File:** `edge-case-fraud-burst.json`
- **Description:** Unusually high-value transaction
- **Expected Outcome:** Flagged as potential fraud
- **Verification:** Fraud detection service generates UNUSUAL_AMOUNT signal

## Report Format

### scenario-results.json

```json
{
  "timestamp": "2026-06-01T12:00:00Z",
  "totalScenarios": 8,
  "passedScenarios": 7,
  "failedScenarios": 1,
  "passRate": 87.5,
  "scenarios": [
    {
      "scenario": {
        "id": "scenario-01",
        "name": "Duplicate Webhook Replay",
        "fixtureId": "edge-case-duplicate-replay",
        "description": "...",
        "expectedOutcome": {
          "status": "success",
          "shouldDetectFraud": true
        }
      },
      "passed": true,
      "expectedOutcome": "{...}",
      "actualOutcome": "{...}",
      "details": {
        "executedAt": "2026-06-01T12:00:00Z",
        "rawEventId": "raw-event-id",
        "fraudSignals": ["DUPLICATE_TRANSACTION"],
        "errors": []
      },
      "message": "Scenario 01 passed as expected"
    }
  ]
}
```

## Usage

### Run the Edge-Case Suite

```bash
cd apps/payment-service
npm run edge-case-suite
```

This command:
1. Compiles the edge-case suite script
2. Initializes the NestJS application context
3. Executes all 8 scenarios sequentially
4. Generates a detailed test report
5. Saves report to `/tmp/workspace/dela-99/HEDGE/apps/payment-service/../../reports/scenario-results.json`
6. Exits with status code 0 if all pass, 1 if any fail

### Generate Report Programmatically

```typescript
import { Test } from '@nestjs/testing';
import { EdgeCaseScenarioRunner } from './edge-case-scenario-runner';
import { SimulationModule } from './simulation.module';

const module = await Test.createTestingModule({
  imports: [SimulationModule],
}).compile();

const runner = module.get(EdgeCaseScenarioRunner);
const report = await runner.runAllScenarios();
await runner.saveReportToFile(report);
```

## Verification Logic

Each scenario verifies:
1. **Status Match** - Does actual status match expected status?
2. **Fraud Detection** - Are fraud signals triggered as expected?
3. **Validation** - Are missing fields caught by validation?
4. **Error Messages** - Do error messages align with expectations?

## Test Coverage

- All 8 scenarios execute through the full pipeline:
  1. ✓ Raw Event Storage
  2. ✓ Ingestion
  3. ✓ Normalization
  4. ✓ Fraud Analysis
  5. ✓ Reconciliation
  6. ✓ Analytics

## Integration Points

The suite integrates with existing services:

- **RawEventsService** - Stores webhook payloads
- **IngestionService** - Extracts transaction candidates
- **NormalizationService** - Normalizes to standard format
- **FraudService** - Detects fraud signals
- **ReconciliationService** - Matches transactions

## Build Requirements

- All scenarios must pass for build to succeed
- Report must be generated as JSON
- Exit code must be 0 on full success
- Exit code must be 1 on any scenario failure

## Files

- Fixtures: `apps/payment-service/src/simulations/fixtures/edge-case-*.json` (8 files)
- Runner: `apps/payment-service/src/simulations/edge-case-scenario-runner.ts`
- Tests: `apps/payment-service/src/simulations/__tests__/edge-case-scenario-runner.spec.ts`
- CLI: `apps/payment-service/scripts/edge-case-suite.ts`
- Report: `apps/payment-service/../../reports/scenario-results.json`

## Notes

- Simulation framework bypasses webhook signature verification (marks all as verified)
- Fraud detection happens downstream in pipeline
- All scenarios process through identical pipeline as real webhooks
- Report generation happens after all scenarios complete
- Suite is fully integration-tested via Jest test suite
