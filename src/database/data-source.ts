// DataSource para TypeORM CLI — lo usa el comando migration:run y migration:generate.
// Separado del módulo de NestJS para poder correr migraciones fuera del framework.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isProd = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'checkout_db',
  synchronize: false,
  logging: true,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  entities: isProd ? ['dist/**/*.typeorm-entity.js'] : ['src/**/*.typeorm-entity.ts'],
  migrations: isProd ? ['dist/database/migrations/*.js'] : ['src/database/migrations/*.ts'],
});
