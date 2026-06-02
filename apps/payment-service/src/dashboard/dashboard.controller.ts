import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  DashboardFraudSignalsDto,
  DashboardRecentTransactionsDto,
  DashboardReconciliationDto,
  DashboardRevenueDto,
  DashboardSummaryDto,
} from './dto/dashboard-response.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  @ApiOkResponse({ type: DashboardSummaryDto })
  getSummary(): DashboardSummaryDto {
    return this.dashboardService.getSummary();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get dashboard revenue metrics' })
  @ApiOkResponse({ type: DashboardRevenueDto })
  getRevenue(): DashboardRevenueDto {
    return this.dashboardService.getRevenue();
  }

  @Get('reconciliation')
  @ApiOperation({ summary: 'Get dashboard reconciliation metrics' })
  @ApiOkResponse({ type: DashboardReconciliationDto })
  getReconciliation(): DashboardReconciliationDto {
    return this.dashboardService.getReconciliation();
  }

  @Get('fraud-signals')
  @ApiOperation({ summary: 'Get dashboard fraud signal metrics' })
  @ApiOkResponse({ type: DashboardFraudSignalsDto })
  getFraudSignals(): DashboardFraudSignalsDto {
    return this.dashboardService.getFraudSignals();
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Get dashboard recent transactions' })
  @ApiOkResponse({ type: DashboardRecentTransactionsDto })
  getRecentTransactions(): DashboardRecentTransactionsDto {
    return this.dashboardService.getRecentTransactions();
  }
}
