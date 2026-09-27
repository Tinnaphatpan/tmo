import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // BFF (Next.js) and, for SSE only, the browser directly (SPEC §2.3) both
  // call this API — credentials must be allowed for the SSE case since it
  // connects straight from the browser, not proxied.
  // FRONTEND_URL (comma-separated) pins the allowed origins in deployment;
  // unset keeps the permissive local-dev behaviour.
  const frontendOrigins = process.env.FRONTEND_URL?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: frontendOrigins?.length ? frontendOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });
  await app.listen(port);
}
bootstrap();
