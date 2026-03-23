import { Module } from '@nestjs/common';
import { ProfileController } from './presentation/profile.controller';
import { ProfileService } from './application/profile.service';
import { PROFILE_PORT } from './domain/profile.port';
import { DrizzleProfileAdapter } from './infrastructure/drizzle-profile.adapter';

@Module({
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: PROFILE_PORT,
      useClass: DrizzleProfileAdapter,
    },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
