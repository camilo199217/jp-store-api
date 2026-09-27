# jp-store-api

Backend de la tienda jp-store. NestJS con arquitectura hexagonal, TypeORM y PostgreSQL.

## Stack

- **NestJS** (TypeScript, ESM)
- **TypeORM** — ORM + migraciones
- **PostgreSQL** — base de datos
- **Wompi** — pasarela de pagos (sandbox)
- **Swagger** — documentación de API (`/api/docs`)
- **Vitest** — tests unitarios

## Arquitectura

Arquitectura hexagonal (ports & adapters) por módulo:

```
src/
├── products/
│   ├── domain/           # Entidades, excepciones, puerto de repositorio
│   ├── application/      # Use cases: GetProducts, GetProductById
│   └── infrastructure/   # Controller HTTP, TypeORM repository
├── customers/
│   ├── domain/
│   ├── application/      # Use case: CreateCustomer
│   └── infrastructure/
├── transactions/
│   ├── domain/
│   ├── application/      # Use case: ProcessPayment
│   └── infrastructure/   # Controller, gateway adapter (Wompi)
├── deliveries/
│   ├── domain/
│   ├── application/      # Delivery creado automáticamente desde ProcessPaymentUseCase
│   └── infrastructure/
├── database/
│   ├── migrations/       # 001_create_tables, 002_add_constraints, 003_add_quantity
│   └── seeds/            # Datos iniciales (productos)
└── shared/
    ├── filters/          # GlobalExceptionFilter — mapea errores a ErrorCode
    └── result/           # Result<T, E> pattern + ErrorCode enum
```

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/products` | Listado paginado de productos |
| GET | `/api/v1/products/:id` | Detalle de un producto |
| POST | `/api/v1/customers` | Crear cliente |
| POST | `/api/v1/transactions` | Procesar pago (crea cliente + tokeniza + cobra) |
| GET | `/api/v1/transactions/:id` | Estado de una transacción |
| GET | `/api/v1/deliveries/transaction/:transactionId` | Entrega asociada a una transacción |

Documentación interactiva: `GET /api/docs`

## Instalación local

```bash
pnpm install
```

Crea un archivo `.env` con:

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=checkout_db

FRONTEND_URL=http://localhost:5173

BASE_FEE=1500000
DELIVERY_FEE=890000

PAYMENT_PUBLIC_KEY=pub_stagtest_...
PAYMENT_PRIVATE_KEY=prv_stagtest_...
PAYMENT_EVENTS_KEY=stagtest_events_...
PAYMENT_INTEGRITY_KEY=stagtest_integrity_...
PAYMENT_API_URL=https://api-sandbox.co.uat.wompi.dev/v1
```

Ver `.env.example` para la lista completa.

## Comandos

```bash
# Servidor de desarrollo con hot reload
pnpm start:dev

# Build + servidor de producción
pnpm build && pnpm start:prod

# Ejecutar migraciones
pnpm migration:run

# Ejecutar seeds
pnpm seed:run

# Tests unitarios
pnpm test

# Tests con cobertura
pnpm test:cov
```

## Docker (desarrollo local con BD)

```bash
# Levanta backend + PostgreSQL
docker compose up -d

# Ver logs
docker compose logs -f api
```

## Deploy a producción (ECS)

```bash
# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  798472031499.dkr.ecr.us-east-1.amazonaws.com

# Build y push
docker build -t jp-store-backend .
docker tag jp-store-backend:latest \
  798472031499.dkr.ecr.us-east-1.amazonaws.com/jp-store-backend:latest
docker push \
  798472031499.dkr.ecr.us-east-1.amazonaws.com/jp-store-backend:latest

# Forzar nuevo deploy
aws ecs update-service \
  --cluster jp-store-prod \
  --service jp-store-backend \
  --force-new-deployment \
  --region us-east-1
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: 3000) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME` | Conexión PostgreSQL |
| `FRONTEND_URL` | URL del frontend (CORS) |
| `BASE_FEE` | Tarifa base en centavos COP |
| `DELIVERY_FEE` | Tarifa de envío en centavos COP |
| `PAYMENT_PUBLIC_KEY` | Llave pública Wompi |
| `PAYMENT_PRIVATE_KEY` | Llave privada Wompi |
| `PAYMENT_EVENTS_KEY` | Llave de eventos Wompi |
| `PAYMENT_INTEGRITY_KEY` | Llave de integridad Wompi |
| `PAYMENT_API_URL` | URL de la API Wompi |

En producción las variables `PAYMENT_*` se leen desde AWS SSM Parameter Store.

## Modelo de datos

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│  products   │        │  customers   │        │  transactions   │
├─────────────┤        ├──────────────┤        ├─────────────────┤
│ id (uuid)   │◄───────│ id (uuid)    │◄───────│ id (uuid)       │
│ name        │        │ name         │        │ customer_id (fk)│
│ description │        │ email        │        │ product_id (fk) │
│ price_cents │        │ phone        │        │ quantity        │
│ stock       │        │ address      │        │ status          │
│ image_url   │        │ city         │        │ amount_cents    │
│ is_available│        │ created_at   │        │ base_fee_cents  │
│ created_at  │        └──────────────┘        │ delivery_cents  │
│ updated_at  │                                │ total_cents     │
└─────────────┘                                │ gateway_tx_id   │
       ▲                                        │ gateway_ref     │
       │                 ┌──────────────┐       │ created_at      │
       │                 │  deliveries  │       │ updated_at      │
       │                 ├──────────────┤       └─────────────────┘
       └─────────────────│ product_id   │               ▲
                         │ transaction_id (fk) ─────────┘
                         │ customer_id  │
                         │ address      │
                         │ city         │
                         │ status       │
                         │ created_at   │
                         └──────────────┘
```

| Tabla | Columnas clave | Relaciones |
|---|---|---|
| `products` | `id`, `name`, `price_in_cents`, `stock`, `is_available` | — |
| `customers` | `id`, `name`, `email`, `phone`, `address`, `city` | — |
| `transactions` | `id`, `customer_id`, `product_id`, `quantity`, `status`, `total_amount_in_cents`, `gateway_transaction_id`, `gateway_reference` | FK → customers, products |
| `deliveries` | `id`, `transaction_id`, `customer_id`, `product_id`, `address`, `city`, `status` | FK → transactions, customers, products |

**Estados de transacción**: `PENDING` → `APPROVED` / `DECLINED` / `ERROR`

**Constraint único**: `gateway_reference` en transactions (evita duplicados de cobro)

## Pruebas unitarias

Herramienta: **Vitest** (API 100% compatible con Jest)

```
Test Files  6 passed (6)
Tests       40 passed (40)
```

### Cobertura

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   100   |    75    |   100   |   100   |
 result.ts         |   100   |   100    |   100   |   100   |
 app.controller.ts |   100   |    50    |   100   |   100   |
 create-customer   |   100   |    50    |   100   |   100   |
 get-product-by-id |   100   |    75    |   100   |   100   |
 get-products      |   100   |    50    |   100   |   100   |
 process-payment   |   100   |   85.71  |   100   |   100   |
-------------------|---------|----------|---------|---------|

Statements : 100% (114/114)
Branches   :  75% (18/24)
Functions  : 100% (19/19)
Lines      : 100% (108/108)
```

> Las ramas no cubiertas al 100% corresponden a ramas de TypeScript en guardas de tipo opcionales que no tienen impacto en el comportamiento funcional.

## Migraciones

| Migración | Descripción |
|---|---|
| `001_create_tables` | Tablas base: products, customers, transactions, deliveries |
| `002_add_constraints` | Constraints de unicidad y check |
| `003_add_quantity_to_transactions` | Columna `quantity` en transactions |
