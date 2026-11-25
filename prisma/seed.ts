import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Memulai seeding data awal BizManage...');

  // 1. Akun Pengelola (2 Akun sesuai SRS)
  const passwordHash = await bcrypt.hash('BizManage2026!', 12);

  await prisma.users.upsert({
    where: { username: 'anisa' },
    update: {},
    create: {
      username: 'anisa',
      password_hash: passwordHash,
      role: UserRole.PENGELOLA,
      is_active: true,
    },
  });

  await prisma.users.upsert({
    where: { username: 'pengelola2' },
    update: {},
    create: {
      username: 'pengelola2',
      password_hash: passwordHash,
      role: UserRole.PENGELOLA,
      is_active: true,
    },
  });

  // 2. Pengaturan Bisnis Default (Biaya Admin 22%)
  const existingSetting = await prisma.businessSettings.findFirst();
  if (!existingSetting) {
    await prisma.businessSettings.create({
      data: {
        business_name: 'BizManage Reseller',
        default_admin_fee_rate: 22.0,
        session_timeout_minutes: 60,
      },
    });
  }

  // 3. Master Satuan (Units)
  const unitsData = [
    { name: 'pcs', allow_decimal: false, decimal_places: 0 },
    { name: 'cm', allow_decimal: true, decimal_places: 2 },
    { name: 'roll', allow_decimal: false, decimal_places: 0 },
    { name: 'pak', allow_decimal: false, decimal_places: 0 },
    { name: 'kg', allow_decimal: true, decimal_places: 3 },
    { name: 'liter', allow_decimal: true, decimal_places: 2 },
  ];

  const units: Record<string, string> = {};
  for (const u of unitsData) {
    const unit = await prisma.units.upsert({
      where: { name: u.name },
      update: {},
      create: {
        name: u.name,
        allow_decimal: u.allow_decimal,
        decimal_places: u.decimal_places,
        is_active: true,
      },
    });
    units[u.name] = unit.id;
  }

  // 4. Kanal Penjualan (SalesChannels)
  const channelsData = [
    { name: 'Toko Offline', is_marketplace: false },
    { name: 'WhatsApp', is_marketplace: false },
    { name: 'Shopee', is_marketplace: true },
    { name: 'Tokopedia', is_marketplace: true },
    { name: 'TikTok Shop', is_marketplace: true },
  ];

  for (const ch of channelsData) {
    await prisma.salesChannels.upsert({
      where: { name: ch.name },
      update: { is_marketplace: ch.is_marketplace, is_active: true },
      create: {
        name: ch.name,
        is_marketplace: ch.is_marketplace,
        is_active: true,
      },
    });
  }

  await prisma.salesChannels.deleteMany({
    where: {
      name: { in: ['Lazada', 'Offline'] },
      sales: { none: {} },
      variant_channel_prices: { none: {} },
    },
  });

  // 5. Kategori Produk & Pengeluaran Awal
  const defaultProductCategories = ['Sembako & Minyak', 'Makanan & Minuman', 'Kebutuhan Rumah Tangga', 'Lainnya'];
  for (const name of defaultProductCategories) {
    await prisma.productCategories.upsert({
      where: { name },
      update: {},
      create: { name, is_active: true },
    });
  }

  const defaultExpenseCategories = ['Listrik & Air', 'Internet & Pulsa', 'Transportasi & Bensin', 'Gaji & Operasional', 'Lain-lain'];
  for (const name of defaultExpenseCategories) {
    await prisma.expenseCategories.upsert({
      where: { name },
      update: {},
      create: { name, is_active: true },
    });
  }

  // 6. Material Kemasan & Standar Ukuran Paket (XS - XXL)
  // Acuan biaya rata-rata unit pakai diturunkan dari rincian Standar Ukuran Paket Bu Anisa (20 Nov 2026)
  const materialsData = [
    {
      key: 'kardus_xs',
      name: 'Kardus 15x10x8 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 1500, // Rp 1.500 / pcs
    },
    {
      key: 'kardus_s',
      name: 'Kardus 20x15x10 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 2000, // Rp 2.000 / pcs
    },
    {
      key: 'kardus_m',
      name: 'Kardus 30x20x15 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 2500, // Rp 2.500 / pcs
    },
    {
      key: 'kardus_l',
      name: 'Kardus 40x30x20 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 3500, // Rp 3.500 / pcs
    },
    {
      key: 'kardus_xl',
      name: 'Kardus 50x40x30 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 5000, // Rp 5.000 / pcs
    },
    {
      key: 'kardus_xxl',
      name: 'Kardus 60x50x40 cm',
      purchase_unit_id: units['pcs'],
      usage_unit_id: units['pcs'],
      conversion_factor: 1,
      average_unit_cost: 7000, // Rp 7.000 / pcs
    },
    {
      key: 'plastik',
      name: 'Plastik Kemasan',
      purchase_unit_id: units['pak'],
      usage_unit_id: units['pcs'],
      conversion_factor: 100, // misal 1 pak = 100 pcs
      average_unit_cost: 250, // Rp 250 / pcs (XS: 1 pcs = 250)
    },
    {
      key: 'bubble',
      name: 'Bubble Wrap',
      purchase_unit_id: units['roll'],
      usage_unit_id: units['cm'],
      conversion_factor: 5000, // 1 roll = 50 meter (5000 cm)
      average_unit_cost: 25, // Rp 25 / cm (XS: 50 cm = 1.250; S: 75 cm = 1.875; M: 100 cm = 2.500)
    },
    {
      key: 'lakban',
      name: 'Lakban Bening/Coklat',
      purchase_unit_id: units['roll'],
      usage_unit_id: units['cm'],
      conversion_factor: 9000, // 1 roll = 90 meter (9000 cm)
      average_unit_cost: 3, // Rp 3 / cm (XS: 50 cm = 150; S: 70 cm = 210; M: 100 cm = 300)
    },
    {
      key: 'fragile',
      name: 'Stiker Fragile',
      purchase_unit_id: units['roll'],
      usage_unit_id: units['pcs'],
      conversion_factor: 500, // 1 roll = 500 pcs
      average_unit_cost: 24, // Rp 24 / pcs (XS: 3 pcs = 72; S: 5 pcs = 120; M: 7 pcs = 168)
    },
  ];

  const materials: Record<string, string> = {};
  for (const m of materialsData) {
    const mat = await prisma.packagingMaterials.upsert({
      where: { name: m.name },
      update: {},
      create: {
        name: m.name,
        purchase_unit_id: m.purchase_unit_id,
        usage_unit_id: m.usage_unit_id,
        conversion_factor: m.conversion_factor,
        average_unit_cost: m.average_unit_cost,
        is_active: true,
      },
    });
    materials[m.key] = mat.id;
  }

  // Master Standar Ukuran Paket (XS - XXL)
  const packageSizesData = [
    {
      name: 'XS',
      dimension_label: '15 x 10 x 8 cm',
      sort_order: 1,
      items: [
        { materialKey: 'kardus_xs', qty: 1 },    // 1 x 1.500 = 1.500
        { materialKey: 'plastik', qty: 1 },      // 1 x 250   = 250
        { materialKey: 'bubble', qty: 50 },      // 50 x 25   = 1.250
        { materialKey: 'lakban', qty: 50 },      // 50 x 3    = 150
        { materialKey: 'fragile', qty: 3 },      // 3 x 24    = 72 -> Total: 3.222
      ],
    },
    {
      name: 'S',
      dimension_label: '20 x 15 x 10 cm',
      sort_order: 2,
      items: [
        { materialKey: 'kardus_s', qty: 1 },     // 2.000
        { materialKey: 'plastik', qty: 1.2 },    // 300
        { materialKey: 'bubble', qty: 75 },      // 1.875
        { materialKey: 'lakban', qty: 70 },      // 210
        { materialKey: 'fragile', qty: 5 },      // 120 -> Total: 4.505
      ],
    },
    {
      name: 'M',
      dimension_label: '30 x 20 x 15 cm',
      sort_order: 3,
      items: [
        { materialKey: 'kardus_m', qty: 1 },     // 2.500
        { materialKey: 'plastik', qty: 1.4 },    // 350
        { materialKey: 'bubble', qty: 100 },     // 2.500
        { materialKey: 'lakban', qty: 100 },     // 300
        { materialKey: 'fragile', qty: 7 },      // 168 -> Total: 5.818
      ],
    },
    {
      name: 'L',
      dimension_label: '40 x 30 x 20 cm',
      sort_order: 4,
      items: [
        { materialKey: 'kardus_l', qty: 1 },     // 3.500
        { materialKey: 'plastik', qty: 1.6 },    // 400
        { materialKey: 'bubble', qty: 150 },     // 3.750
        { materialKey: 'lakban', qty: 130 },     // 390
        { materialKey: 'fragile', qty: 10 },     // 240 -> Total: 8.280
      ],
    },
    {
      name: 'XL',
      dimension_label: '50 x 40 x 30 cm',
      sort_order: 5,
      items: [
        { materialKey: 'kardus_xl', qty: 1 },    // 5.000
        { materialKey: 'plastik', qty: 1.8 },    // 450
        { materialKey: 'bubble', qty: 200 },     // 5.000
        { materialKey: 'lakban', qty: 170 },     // 510
        { materialKey: 'fragile', qty: 12 },     // 288 -> Total: 11.248
      ],
    },
    {
      name: 'XXL',
      dimension_label: '60 x 50 x 40 cm',
      sort_order: 6,
      items: [
        { materialKey: 'kardus_xxl', qty: 1 },   // 7.000
        { materialKey: 'plastik', qty: 2 },      // 500
        { materialKey: 'bubble', qty: 250 },     // 6.250
        { materialKey: 'lakban', qty: 220 },     // 660
        { materialKey: 'fragile', qty: 15 },     // 360 -> Total: 14.770
      ],
    },
  ];

  for (const pkg of packageSizesData) {
    const size = await prisma.packageSizes.upsert({
      where: { name: pkg.name },
      update: {},
      create: {
        name: pkg.name,
        dimension_label: pkg.dimension_label,
        sort_order: pkg.sort_order,
        is_active: true,
      },
    });

    for (const item of pkg.items) {
      await prisma.packageSizeItems.upsert({
        where: {
          package_size_id_packaging_material_id: {
            package_size_id: size.id,
            packaging_material_id: materials[item.materialKey],
          },
        },
        update: {},
        create: {
          package_size_id: size.id,
          packaging_material_id: materials[item.materialKey],
          default_usage_qty: item.qty,
        },
      });
    }
  }

  console.log('Seeding BizManage selesai! Akun login awal: anisa / BizManage2026!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });