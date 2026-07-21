import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import type { Environment } from '../config/environment';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService<Environment, true>);
  const allowedOrigins = configService.get('CORS_ALLOWED_ORIGINS', {
    infer: true,
  });
  const cookieName = configService.get('AUTH_COOKIE_NAME', { infer: true });

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    origin: [...allowedOrigins],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CloseFlow API')
    .setDescription('Contrato REST inicial da plataforma CloseFlow.')
    .setVersion('1.0')
    .addCookieAuth(
      cookieName,
      { type: 'apiKey', in: 'cookie' },
      'sessionCookie',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/openapi.json',
  });
}
