import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuantityToTransactions1700000000002 implements MigrationInterface {
  name = 'AddQuantityToTransactions1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Añade la columna quantity — por defecto 1 para retrocompatibilidad con filas existentes
    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD COLUMN IF NOT EXISTS "quantity" INT NOT NULL DEFAULT 1
    `);

    // La cantidad siempre debe ser al menos 1 — IF NOT EXISTS evita error si ya existe
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_transactions_quantity_positive'
        ) THEN
          ALTER TABLE "transactions"
            ADD CONSTRAINT "chk_transactions_quantity_positive"
              CHECK ("quantity" >= 1);
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "chk_transactions_quantity_positive"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "quantity"`);
  }
}
