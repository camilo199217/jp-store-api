import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstraints1700000000001 implements MigrationInterface {
  name = 'AddConstraints1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── products ─────────────────────────────────────────────────────────────

    // Nombre único para evitar productos duplicados en el catálogo
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "uq_products_name" UNIQUE ("name")
    `);

    // El precio siempre debe ser positivo — no tiene sentido un producto gratis o negativo
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "chk_products_price_positive"
          CHECK ("price_in_cents" > 0)
    `);

    // El stock nunca puede ser negativo — el decrement con pessimistic lock lo previene
    // en código, pero el constraint es la última línea de defensa a nivel DB
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD CONSTRAINT "chk_products_stock_non_negative"
          CHECK ("stock" >= 0)
    `);

    // ── transactions ─────────────────────────────────────────────────────────

    // El monto base (precio del producto) siempre positivo
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "chk_transactions_amount_positive"
          CHECK ("amount_in_cents" > 0)
    `);

    // Las tarifas no pueden ser negativas (pueden ser 0 si hay promociones)
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "chk_transactions_base_fee_non_negative"
          CHECK ("base_fee_in_cents" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "chk_transactions_delivery_fee_non_negative"
          CHECK ("delivery_fee_in_cents" >= 0)
    `);

    // El total siempre positivo
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "chk_transactions_total_positive"
          CHECK ("total_amount_in_cents" > 0)
    `);

    // Integridad aritmética: total = monto + tarifa base + tarifa envío
    // Esto asegura que nunca se cobra un monto diferente al que se calculó
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "chk_transactions_total_matches_sum"
          CHECK (
            "total_amount_in_cents" =
              "amount_in_cents" + "base_fee_in_cents" + "delivery_fee_in_cents"
          )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_total_matches_sum"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_total_positive"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_delivery_fee_non_negative"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_base_fee_non_negative"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_amount_positive"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_products_stock_non_negative"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "chk_products_price_positive"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "uq_products_name"`);
  }
}
