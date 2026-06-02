import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Controller('merchants')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  /**
   * Create a new merchant.
   * POST /merchants
   */
  @Post()
  async createMerchant(@Body() createMerchantDto: CreateMerchantDto) {
    return this.merchantService.createMerchant(createMerchantDto);
  }

  /**
   * Get all merchants.
   * GET /merchants
   */
  @Get()
  async getAllMerchants() {
    return this.merchantService.getAllMerchants();
  }

  /**
   * Get a specific merchant by ID.
   * GET /merchants/:id
   */
  @Get(':id')
  async getMerchant(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchantService.getMerchant(id);
  }

  /**
   * Update merchant information.
   * PUT /merchants/:id
   */
  @Put(':id')
  async updateMerchant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMerchantDto: UpdateMerchantDto,
  ) {
    return this.merchantService.updateMerchant(id, updateMerchantDto);
  }

  /**
   * Deactivate a merchant.
   * DELETE /merchants/:id
   */
  @Delete(':id')
  async deactivateMerchant(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchantService.deactivateMerchant(id);
  }
}
