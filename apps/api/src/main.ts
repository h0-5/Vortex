import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ApiEnvironment } from '@vortex/shared';
import type { DatabasePool } from '@vortex/database';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { RequestLoggingInterceptor } from './common/http/request-logging.interceptor.js';
import { requestContextMiddleware } from './common/http/request-context.middleware.js';
import { ProblemDetailsFilter } from './common/http/problem-details.filter.js';
import { API_ENVIRONMENT, DATABASE_POOL } from './config/tokens.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const environment = app.get<ApiEnvironment>(API_ENVIRONMENT);
  const pool = app.get<DatabasePool>(DATABASE_POOL);
  const expressApp = app.getHttpAdapter().getInstance() as unknown as Express;

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  if (environment.NODE_ENV === 'production') {
    expressApp.set('trust proxy', 1);
  }
  expressApp.use(helmet());
  expressApp.use(requestContextMiddleware);
  expressApp.use(
    cookieParser(environment.COOKIE_SECRET ?? environment.SESSION_SECRET, {
      decode: (value) => decodeURIComponent(value),
    }),
  );
  expressApp.use(createSessionMiddleware(environment, pool));
  app.enableCors({
    origin: environment.DASHBOARD_URL,
    credentials: true,
    methods: ['GET', 'POST'],
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vortex API')
    .setDescription('Vortex core and metadata-only plugin registry API')
    .setVersion('2.0.0')
    .addCookieAuth('vortex.sid')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(environment.API_PORT);
}

function createSessionMiddleware(environment: ApiEnvironment, pool: DatabasePool) {
  const PostgreSqlSessionStore = connectPgSimple(session);

  return session({
    name: 'vortex.sid',
    secret: environment.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: environment.NODE_ENV === 'production',
    store: new PostgreSqlSessionStore({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: false,
    }),
    cookie: {
      httpOnly: true,
      secure: environment.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1_000,
      path: '/',
    },
  });
}

void bootstrap();
