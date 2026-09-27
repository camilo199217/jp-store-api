import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1700000000000 implements MigrationInterface {
  name = 'CreateTables1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"          VARCHAR(255) NOT NULL,
        "description"   TEXT NOT NULL,
        "price_in_cents" BIGINT NOT NULL,
        "stock"         INT NOT NULL DEFAULT 0,
        "image_url"     VARCHAR(500) NOT NULL,
        "is_available"  BOOLEAN NOT NULL DEFAULT true,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name"        VARCHAR(255) NOT NULL,
        "email"       VARCHAR(255) NOT NULL,
        "phone"       VARCHAR(20) NOT NULL,
        "address"     VARCHAR(500) NOT NULL,
        "city"        VARCHAR(100) NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM (
        'CREATED', 'PENDING', 'APPROVED', 'DECLINED', 'ERROR'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "customer_id"           UUID NOT NULL,
        "product_id"            UUID NOT NULL,
        "status"                "transaction_status_enum" NOT NULL DEFAULT 'CREATED',
        "amount_in_cents"       BIGINT NOT NULL,
        "base_fee_in_cents"     BIGINT NOT NULL,
        "delivery_fee_in_cents" BIGINT NOT NULL,
        "total_amount_in_cents" BIGINT NOT NULL,
        "gateway_transaction_id" VARCHAR(255) UNIQUE,
        "gateway_reference"      VARCHAR(255) NOT NULL UNIQUE,
        "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_transaction_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id"),
        CONSTRAINT "fk_transaction_product"  FOREIGN KEY ("product_id")  REFERENCES "products"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "delivery_status_enum" AS ENUM ('PENDING', 'ASSIGNED', 'DELIVERED')
    `);

    await queryRunner.query(`
      CREATE TABLE "deliveries" (
        "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "transaction_id" UUID NOT NULL UNIQUE,
        "customer_id"    UUID NOT NULL,
        "product_id"     UUID NOT NULL,
        "address"        VARCHAR(500) NOT NULL,
        "city"           VARCHAR(100) NOT NULL,
        "status"         "delivery_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_delivery_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id"),
        CONSTRAINT "fk_delivery_customer"    FOREIGN KEY ("customer_id")    REFERENCES "customers"("id"),
        CONSTRAINT "fk_delivery_product"     FOREIGN KEY ("product_id")     REFERENCES "products"("id")
      )
    `);

    // Índices para queries frecuentes
    await queryRunner.query(`CREATE INDEX "idx_transactions_customer_id" ON "transactions"("customer_id")`);
    await queryRunner.query(`CREATE INDEX "idx_transactions_status" ON "transactions"("status")`);
    await queryRunner.query(`CREATE INDEX "idx_deliveries_transaction_id" ON "deliveries"("transaction_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "deliveries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transaction_status_enum"`);
  }
}
