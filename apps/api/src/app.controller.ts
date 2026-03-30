import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@ApiTags('System')
@Controller('health')
export class HealthController {
  
  @Get()
  @AllowAnonymous() // This route will be public
  @ApiOperation({ summary: 'Public health check endpoint' })
  check() {
    return { status: 'ok', public: true };
  }

  @Get('secure')
  @ApiOperation({ summary: 'Protected health check endpoint' })
  secureCheck() {
    return { status: 'ok', public: false, message: 'You are authenticated' };
  }
}
