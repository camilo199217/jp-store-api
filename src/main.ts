import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Security headers (OWASP) ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Swagger UI requiere unsafe-inline y unsafe-eval para su renderer
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  // En desarrollo permito Swagger (mismo origen) y el frontend de Vite.
  // En producción solo se permite FRONTEND_URL.
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL ?? '']
      : [
          process.env.FRONTEND_URL ?? 'http://localhost:5173',
          'http://localhost:3000', // Swagger UI
          'http://127.0.0.1:3000',
        ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  // ── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe (class-validator) ────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global response envelope ─────────────────────────────────────────────
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Global exception filter ───────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Payment Checkout API')
    .setDescription(`
## Flujo completo del checkout

\`\`\`
1. GET  /api/v1/products              → elegir producto (obtener productId)
2. POST /api/v1/customers             → registrar cliente (obtener customerId)
3. [Frontend] GET Wompi /merchants    → obtener acceptanceToken
4. [Frontend] POST Wompi /tokens/cards → tokenizar tarjeta (obtener cardToken)
5. POST /api/v1/transactions          → procesar pago
6. GET  /api/v1/transactions/:id      → consultar resultado
7. GET  /api/v1/deliveries/transaction/:id → ver entrega creada
\`\`\`

## Tarjetas de sandbox Wompi

| Marca | Número | CVV | Resultado |
|---|---|---|---|
| Visa | 4242 4242 4242 4242 | cualquier 3 dígitos | APPROVED |
| Visa | 4111 1111 1111 1111 | cualquier 3 dígitos | DECLINED |
| Mastercard | 5254 1336 7443 8670 | cualquier 3 dígitos | APPROVED |
| Mastercard | 5399 2420 7311 1197 | cualquier 3 dígitos | DECLINED |
| Amex | 3782 822463 10005 | cualquier 4 dígitos | APPROVED |

Vencimiento: cualquier fecha futura (ej. 12/30)

## Entorno

- Wompi Sandbox URL: \`https://api-sandbox.co.uat.wompi.dev/v1\`
- Public key: \`pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7\`
    `)
    .setVersion('1.0')
    .addTag('products', 'Catálogo de productos y stock')
    .addTag('customers', 'Registro de clientes')
    .addTag('transactions', 'Procesamiento de pagos con Wompi')
    .addTag('deliveries', 'Entregas generadas tras pago aprobado')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

await bootstrap();
