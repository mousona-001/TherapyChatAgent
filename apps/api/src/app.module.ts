import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule, AuthGuard } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth';
import { DatabaseModule } from './database/database.module';
import { ChatModule } from './chat/chat.module';
import { ProfileModule } from './profile/profile.module';
import { CrisisModule } from './crisis/crisis.module';
import { ConnectionModule } from './connection/connection.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { HealthController } from './app.controller';

@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/therapychat'),
    AuthModule.forRoot({ auth }),
    ChatModule,
    ProfileModule,
    CrisisModule,
    ConnectionModule,
    RecommendationModule,
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


