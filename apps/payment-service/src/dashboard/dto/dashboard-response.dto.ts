import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  totalTransactions!: number;

  @ApiProperty()
  totalFailures!: number;

  @ApiProperty()
  overallMatchRate!: number;

  @ApiProperty()
  fraudSignalCount!: number;
}

export class RevenueMetricDto {
  @ApiProperty()
  date!: Date;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  transactionCount!: number;

  @ApiProperty()
  averageAmount!: number;
}

export class DashboardRevenueDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ type: [RevenueMetricDto] })
  dailyRevenue!: RevenueMetricDto[];

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  totalTransactions!: number;
}

export class ReconciliationMetricDto {
  @ApiProperty()
  date!: Date;

  @ApiProperty()
  matchedCount!: number;

  @ApiProperty()
  pendingCount!: number;

  @ApiProperty()
  mismatchedCount!: number;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  matchRate!: number;

  @ApiProperty()
  pendingRate!: number;

  @ApiProperty()
  mismatchRate!: number;

  @ApiProperty()
  duplicateRate!: number;
}

export class DashboardReconciliationDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ type: [ReconciliationMetricDto] })
  reconciliationRate!: ReconciliationMetricDto[];

  @ApiProperty()
  overallMatchRate!: number;

  @ApiProperty()
  overallPendingRate!: number;

  @ApiProperty()
  overallMismatchRate!: number;

  @ApiProperty()
  overallDuplicateRate!: number;

  @ApiProperty()
  totalReconciliationRecords!: number;
}

export class FraudSignalMetricDto {
  @ApiProperty()
  date!: Date;

  @ApiProperty()
  signalType!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty({ enum: ['low', 'medium', 'high'] })
  severity!: 'low' | 'medium' | 'high';

  @ApiProperty()
  averageSeverityScore!: number;
}

export class DashboardFraudSignalsDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ type: [FraudSignalMetricDto] })
  signals!: FraudSignalMetricDto[];

  @ApiProperty()
  totalSignals!: number;
}

export class RecentTransactionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  providerReference!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  transactionDate!: Date;
}

export class DashboardRecentTransactionsDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty({ type: [RecentTransactionDto] })
  transactions!: RecentTransactionDto[];
}
