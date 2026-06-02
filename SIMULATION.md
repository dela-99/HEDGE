# Financial Simulation Command

## Overview

The financial simulation command generates 1000 realistic transactions and runs them through the complete payment processing pipeline to generate a comprehensive simulation report.

## Prerequisites

The simulation requires the following environment setup:

1. **Node.js**: Version 20 or higher
2. **Database**: A configured PostgreSQL or SQLite database with the payment-service schema initialized
3. **Environment Variables**: Set the `DATABASE_URL` environment variable pointing to your database

### Example Database Setup

```bash
# Set environment variables
export DATABASE_URL="******localhost:5432/payment_db"

# Or for SQLite (for testing):
export DATABASE_URL="file:./payment_db.sqlite"
```

## Running the Simulation

### Using npm script (recommended)

```bash
npm run simulate
```

This command will:
1. Build the payment-service application
2. Compile the simulation script
3. Execute the simulation
4. Generate `simulation-report.json` in the repository root

### Manual execution

```bash
# Build first
npm run build

# Then run the compiled script
node dist/scripts/run-financial-simulation.js
```

## Output

The simulation produces two outputs:

### 1. Console Output

A formatted simulation report with the following sections:

- **Event Processing**: Total events, success/failure counts and rates
- **Fraud & Anomalies**: Fraud detections, signals, and fraud rate
- **Duplicate & Reversal Detection**: Duplicate detection counts and reconciliation mismatches
- **Reconciliation**: Match counts and reconciliation accuracy percentage
- **Performance**: Average processing time, total processing time, and error counts

### 2. simulation-report.json

A JSON file in the repository root containing:

```json
{
  "totalEvents": 1000,
  "successfulEvents": 700,
  "failedEvents": 300,
  "successRate": 70.00,
  "failureRate": 30.00,
  "duplicateDetections": 50,
  "fraudDetections": 45,
  "fraudSignalCount": 62,
  "fraudRate": 4.50,
  "reconciliationMatches": 600,
  "reconciliationMismatches": 50,
  "reconciliationPending": 50,
  "reconciliationAccuracy": 92.31,
  "averageProcessingTime": 125.50,
  "totalProcessingTime": 125500,
  "errorCount": 0,
  "executedAt": "2026-06-02T02:17:40.550Z"
}
```

## Transaction Distribution

The simulation generates transactions with the following distribution:

- **70%** - Successful payments
- **10%** - Failed payments
- **5%** - Duplicate transactions
- **5%** - Reversed transactions
- **5%** - Pending settlements
- **5%** - Suspicious/fraud events

## Pipeline Processing

Each transaction flows through the following stages:

1. **Verification** - Simulates successful webhook verification
2. **Raw Event Storage** - Persists events using RawEventsService
3. **Ingestion** - Extracts transaction candidates
4. **Normalization** - Normalizes to standard format
5. **Fraud Checks** - Analyzes for fraud signals
6. **Reconciliation** - Classifies reconciliation status
7. **Analytics** - Aggregates metrics

## Metrics Tracked

The simulation report includes the following key metrics:

- **Total Events**: Number of transactions processed
- **Success Rate**: Percentage of successful transactions
- **Failure Rate**: Percentage of failed transactions
- **Fraud Signals**: Total number of fraud signals detected
- **Duplicate Detections**: Number of duplicate transactions identified
- **Reconciliation Accuracy**: Match rate for reconciliation
- **Average Processing Time**: Mean time to process one transaction

## Troubleshooting

### Missing DATABASE_URL
If you see an error about missing DATABASE_URL:
```
Error: Missing required environment variable: DATABASE_URL
```

Set the environment variable:
```bash
export DATABASE_URL="your_database_url"
npm run simulate
```

### Database Connection Failed
Ensure your database is running and the connection string is valid:
```bash
# Test the connection
psql $DATABASE_URL -c "SELECT 1"
```

### Build Failures
Ensure all dependencies are installed:
```bash
npm install
npm run build
```

## Development

To modify the simulation:

1. **Transaction Generation**: Edit `apps/payment-service/src/simulations/generators/transaction-generator.service.ts`
2. **Pipeline Processing**: Edit `apps/payment-service/src/simulations/simulation-runner.service.ts`
3. **Metrics Collection**: Edit `apps/payment-service/src/simulations/simulation-metrics.service.ts`
4. **Simulation Script**: Edit `scripts/run-financial-simulation.ts`

## Integration with Services

The simulation leverages the following services:

- **TransactionGeneratorService**: Generates realistic transaction fixtures
- **SimulationRunnerService**: Orchestrates event replay through the pipeline
- **SimulationMetricsService**: Collects and reports metrics
- **RawEventsService**: Stores raw financial events
- **IngestionService**: Extracts transaction candidates
- **NormalizationService**: Normalizes transactions
- **FraudService**: Detects fraud signals
- **ReconciliationService**: Classifies reconciliation status
- **AnalyticsService**: Aggregates analytics metrics

## Performance Considerations

- Generating and processing 1000 transactions typically takes 2-5 seconds
- Database performance significantly impacts simulation speed
- Fraud detection and reconciliation add processing overhead
- Each stage is logged for debugging purposes
