import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  LinkedAccountStatus,
  PaymentProvider,
} from '../../../generated/prisma-client-payment';
import { CreateLinkedAccountDto } from './dto/create-linked-account.dto';
import { UpdateLinkedAccountDto } from './dto/update-linked-account.dto';
import { LinkedAccountsService } from './linked-accounts.service';

@Controller('linked-accounts')
export class LinkedAccountsController {
  constructor(private readonly linkedAccountsService: LinkedAccountsService) {}

  @Post()
  async createLinkedAccount(@Body() createLinkedAccountDto: CreateLinkedAccountDto) {
    return this.linkedAccountsService.createLinkedAccount(createLinkedAccountDto);
  }

  @Get()
  async listLinkedAccounts(
    @Query('merchantId') merchantId?: string,
    @Query('businessId') businessId?: string,
    @Query('provider', new ParseEnumPipe(PaymentProvider, { optional: true }))
    provider?: PaymentProvider,
    @Query('status', new ParseEnumPipe(LinkedAccountStatus, { optional: true }))
    status?: LinkedAccountStatus,
  ) {
    return this.linkedAccountsService.listLinkedAccounts({
      merchantId,
      businessId,
      provider,
      status,
    });
  }

  @Get(':id')
  async getLinkedAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.linkedAccountsService.getLinkedAccount(id);
  }

  @Patch(':id')
  async updateLinkedAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLinkedAccountDto: UpdateLinkedAccountDto,
  ) {
    return this.linkedAccountsService.updateLinkedAccount(
      id,
      updateLinkedAccountDto,
    );
  }

  @Delete(':id')
  async deleteLinkedAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.linkedAccountsService.deleteLinkedAccount(id);
  }
}
