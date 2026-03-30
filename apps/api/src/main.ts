import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  // bodyParser must be disabled for Better Auth to handle raw request bodies
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // Serve ElevenLabs crisis audio files statically at /audio
  const audioDir = path.join(process.cwd(), 'public', 'audio');
  app.useStaticAssets(audioDir, { prefix: '/audio' });

  // Aggressive CORS for Demo (Must be before other middleware)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  // Enforce DTO validation constraints globally for security
  app.useGlobalPipes(new ValidationPipe());

  // Set global prefix
  app.setGlobalPrefix('api', { exclude: ['health', 'reference', 'audio'] });

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
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📖 Scalar Docs at http://localhost:${port}/reference`);
}

bootstrap();
