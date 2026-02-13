import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  if (!process.env.GROQ_API_KEY?.trim()) {
    console.warn(
      'GROQ_API_KEY is not set. Lead creation will succeed but AI analysis and email generation will be skipped.',
    );
  }

  const app = await NestFactory.create(AppModule);

  app.use((_req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );

  const corsEnabled = process.env.CORS_ENABLED !== 'false';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? ['http://localhost:3000'];
  app.enableCors({
    origin: corsEnabled ? allowedOrigins : false,
    methods: ['GET', 'POST'],
    credentials: true,
  });

  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Lead Automation API')
    .setDescription(
      'AI-powered lead qualification and email generation. Currently no authentication is required.',
    )
    .setVersion('1.0.0')
    .addTag('leads', 'Lead submission and listing')
    .addTag('health', 'Health check')
    .addServer('http://localhost:3000', 'Development')
    .addServer('https://api.example.com', 'Production')
    .setContact('API Support', '', 'support@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { tryItOutEnabled: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Application failed to start:', err);
  process.exit(1);
});
