import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MtnWebhookDto } from './dto/mtn-webhook.dto';
import { MtnMomoService } from './mtn-momo.service';

@Controller('webhooks/mtn-momo')
export class MtnMomoController {
  constructor(private readonly mtnMomoService: MtnMomoService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  receiveWebhook(@Body() webhook: MtnWebhookDto) {
    return this.mtnMomoService.acceptWebhook(webhook);
  }
}
