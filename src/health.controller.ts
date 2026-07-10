import { Controller, Get } from '@nestjs/common';
import { RawResponse } from './common/decorators';

@Controller()
export class HealthController {
  @Get('health')
  @RawResponse()
  health() {
    return { status: 'ok' };
  }
}
