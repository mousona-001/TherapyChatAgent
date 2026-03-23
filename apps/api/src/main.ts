import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-mongodb';

async function bootstrap() {
  // bodyParser must be disabled for Better Auth to handle raw request bodies
  const app = await NestFactory.create(AppModule, { 
    bodyParser: false,
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ms }) => {
              return `[Nest] ${timestamp} ${level} [${context || 'App'}] ${message} ${ms}`;
            }),
          ),
        }),
        new winston.transports.MongoDB({
          db: process.env.MONGODB_URI || 'mongodb://localhost:27017/therapychat_logs',
          options: { useUnifiedTopology: true },
          collection: 'logs',
          level: process.env.LOG_LEVEL || 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });
  
  // Enable CORS
  app.enableCors();
  
  // Enforce DTO validation constraints globally for security
  app.useGlobalPipes(new ValidationPipe());

  // Configure Swagger & Scalar API Docs
  const config = new DocumentBuilder()
    .setTitle('Therapy Chat Agent API')
    .setDescription('AI-powered therapeutic support with human clinician escalation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  app.use(
    '/reference',
    apiReference({
      spec: {
        content: document,
      },
    }),
  )
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📖 Scalar Docs at http://localhost:${port}/reference`);
}

bootstrap();

