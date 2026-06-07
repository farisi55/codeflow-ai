import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('system')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Check API health' })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
