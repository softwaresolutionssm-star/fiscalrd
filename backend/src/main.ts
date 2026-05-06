import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { BranchFilterInterceptor } from './common/interceptors/branch-filter.interceptor';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Serve uploaded files (payment proofs, etc.)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const config = app.get(ConfigService);

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtros e interceptores globales
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new BranchFilterInterceptor(), new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('FiscalRD API')
    .setDescription('Sistema de facturación electrónica - Ley 32-23 RD')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // CORS
  app.enableCors({
    origin: config.get<string[]>('frontend.corsOrigins'),
    credentials: true,
  });

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  console.log(`🚀 FiscalRD Backend corriendo en: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs en:              http://localhost:${port}/docs`);
}

bootstrap();