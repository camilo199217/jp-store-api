// Script de seeding de productos — se ejecuta una sola vez después de las migraciones.
// Uso ON CONFLICT DO NOTHING para que sea idempotente: se puede correr múltiples veces sin duplicar.
// Los precios están en centavos de COP (multiplicar por 100 el valor en pesos).
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'checkout_db',
  synchronize: false,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// 15 productos variados de electrónica y accesorios tech
const products = [
  // ── Audífonos ────────────────────────────────────────────────────────────
  {
    name: 'Audífonos Bluetooth Pro',
    description: 'Audífonos inalámbricos con cancelación activa de ruido, 30h de batería y sonido Hi-Fi. Perfectos para trabajo remoto y música.',
    price_in_cents: 18990000,
    stock: 10,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
  },
  {
    name: 'Audífonos In-Ear Sport',
    description: 'Audífonos deportivos resistentes al agua (IPX5), conexión Bluetooth 5.3 y 8h de batería continua. Ideales para el gym.',
    price_in_cents: 8490000,
    stock: 15,
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
  },
  {
    name: 'Audífonos Over-Ear Estudio',
    description: 'Audífonos profesionales para producción musical con respuesta de frecuencia plana, drivers de 50mm y cable desmontable.',
    price_in_cents: 24990000,
    stock: 6,
    image_url: 'https://images.unsplash.com/photo-1548921441-89c8bd86ffb4?w=400',
  },

  // ── Relojes inteligentes ─────────────────────────────────────────────────
  {
    name: 'Smartwatch Serie X',
    description: 'Reloj inteligente con monitor cardíaco, GPS integrado, resistente al agua 5ATM y pantalla AMOLED siempre activa.',
    price_in_cents: 34990000,
    stock: 5,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
  },
  {
    name: 'Smartwatch Básico Fit',
    description: 'Pulsera inteligente con seguimiento de pasos, sueño y frecuencia cardíaca. 7 días de batería y pantalla OLED.',
    price_in_cents: 12990000,
    stock: 20,
    image_url: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400',
  },

  // ── Cargadores ───────────────────────────────────────────────────────────
  {
    name: 'Cargador Inalámbrico 20W',
    description: 'Cargador rápido inalámbrico compatible con Qi, carga tu dispositivo en menos de 1 hora. Compatible con iPhone y Android.',
    price_in_cents: 8990000,
    stock: 25,
    image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400',
  },
  {
    name: 'Cargador USB-C 65W GaN',
    description: 'Cargador compacto de nitruro de galio con 3 puertos (2 USB-C + 1 USB-A), carga rápida para laptop, tablet y celular.',
    price_in_cents: 14990000,
    stock: 18,
    image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400',
  },
  {
    name: 'Power Bank 20,000 mAh',
    description: 'Batería portátil de alta capacidad con carga rápida 22.5W, pantalla LED de porcentaje y 3 puertos de salida.',
    price_in_cents: 11990000,
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1609592424816-9f2a60f36d2d?w=400',
  },

  // ── Teclados y periféricos ───────────────────────────────────────────────
  {
    name: 'Teclado Mecánico Compacto',
    description: 'Teclado mecánico TKL con switches red, retroiluminación RGB por tecla y conexión USB-C desmontable. Layout español.',
    price_in_cents: 29990000,
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400',
  },
  {
    name: 'Mouse Inalámbrico Ergonómico',
    description: 'Mouse vertical ergonómico con sensor óptico de 4000 DPI, 6 botones programables y autonomía de 90 días.',
    price_in_cents: 9990000,
    stock: 14,
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
  },
  {
    name: 'Webcam Full HD 1080p',
    description: 'Cámara web con resolución 1080p/30fps, micrófono con cancelación de ruido, autofoco y clip universal para monitor.',
    price_in_cents: 16990000,
    stock: 9,
    image_url: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400',
  },

  // ── Almacenamiento ───────────────────────────────────────────────────────
  {
    name: 'SSD Externo 1TB',
    description: 'Disco sólido externo con velocidades de lectura hasta 1050 MB/s, conector USB-C 3.2 y carcasa resistente a golpes.',
    price_in_cents: 22990000,
    stock: 7,
    image_url: 'https://images.unsplash.com/photo-1597838816882-4435b1977fbe?w=400',
  },
  {
    name: 'Memoria USB 128GB',
    description: 'Memoria USB 3.2 de alta velocidad (400 MB/s lectura), diseño metálico compacto con tapa protectora.',
    price_in_cents: 4990000,
    stock: 30,
    image_url: 'https://images.unsplash.com/photo-1618477460930-d8bfd191c0c0?w=400',
  },

  // ── Iluminación y escritorio ─────────────────────────────────────────────
  {
    name: 'Lámpara LED de Escritorio',
    description: 'Lámpara de escritorio con 5 niveles de brillo, 3 temperaturas de color, cargador USB integrado y brazo articulado.',
    price_in_cents: 7490000,
    stock: 16,
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
  },
  {
    name: 'Hub USB-C 7 en 1',
    description: 'Concentrador USB-C con HDMI 4K, 3x USB-A 3.0, SD/MicroSD, carga pass-through 100W. Ideal para MacBook y laptops delgadas.',
    price_in_cents: 13490000,
    stock: 11,
    image_url: 'https://images.unsplash.com/photo-1625948515291-6cfc55093ab7?w=400',
  },
];

async function seed() {
  await dataSource.initialize();
  console.log('🌱 Iniciando seed de productos...');

  // ON CONFLICT (name) DO NOTHING garantiza idempotencia — puedo correr esto múltiples veces
  let inserted = 0;

  for (const product of products) {
    const result = await dataSource.query(
      `INSERT INTO products (name, description, price_in_cents, stock, image_url, is_available)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [product.name, product.description, product.price_in_cents, product.stock, product.image_url],
    );
    if (result.length > 0) {
      console.log(`  ✅ Insertado: ${product.name}`);
      inserted++;
    }
  }

  const skipped = products.length - inserted;
  await dataSource.destroy();
  console.log(`\n✅ Seed completo — ${inserted} insertados, ${skipped} ya existían`);
}

seed().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
