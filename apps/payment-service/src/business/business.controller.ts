import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  async createBusiness(@Body() createBusinessDto: CreateBusinessDto) {
    return this.businessService.createBusiness(createBusinessDto);
  }

  @Get()
  async listBusinesses(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive = false,
  ) {
    return this.businessService.listBusinesses(includeInactive);
  }

  @Get(':id')
  async getBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessService.getBusiness(id);
  }

  @Patch(':id')
  async updateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessService.updateBusiness(id, updateBusinessDto);
  }

  @Delete(':id')
  async deactivateBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.businessService.deactivateBusiness(id);
  }
}
