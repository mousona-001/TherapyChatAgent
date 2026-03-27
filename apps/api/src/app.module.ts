import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule, AuthGuard } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { ProfileModule } from './profile/profile.module';
import { CrisisModule } from './crisis/crisis.module';
import { HealthController } from './app.controller';

@Module({
  imports: [
    DatabaseModule,
    AuthModule.forRoot({ auth }),
    ChatModule,
    ProfileModule,
    CrisisModule,
  ],
  controllers: [HealthController],
  providers: [

    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}


