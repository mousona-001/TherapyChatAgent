import { Module } from '@nestjs/common';
import { ConnectionController } from './presentation/connection.controller';
import { ConnectionService } from './application/connection.service';

@Module({
  controllers: [ConnectionController],
  providers: [ConnectionService],
  exports: [ConnectionService],
})
export class ConnectionModule {}
