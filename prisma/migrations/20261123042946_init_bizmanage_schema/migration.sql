/*
  Warnings:

  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PENGELOLA');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TUNAI', 'TEMPO');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('Draf', 'Dikonfirmasi', 'Diterima_sebagian', 'Diterima_seluruhnya', 'Dibatalkan');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Belum_dibayar', 'Sebagian', 'Lunas');

-- CreateEnum
CREATE TYPE "SupplierReturnResolution" AS ENUM ('PENGEMBALIAN_UANG', 'BARANG_PENGGANTI', 'POTONGAN_TAGIHAN');

-- CreateEnum
CREATE TYPE "BatchSourceType" AS ENUM ('PURCHASE_RECEIPT', 'ADJUSTMENT', 'RETUR_TANPA_REFERENSI', 'SUPPLIER_REPLACEMENT');

-- CreateEnum
CREATE TYPE "StockPool" AS ENUM ('SELLABLE', 'DAMAGED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PENERIMAAN_PEMBELIAN', 'PENJUALAN', 'PEMBATALAN_PENJUALAN', 'RETUR_LAYAK_JUAL', 'RETUR_RUSAK', 'RETUR_SUPPLIER', 'PENGGANTI_RETUR_SUPPLIER', 'PENYESUAIAN_STOK', 'PENGHAPUSAN_STOK');

-- CreateEnum
CREATE TYPE "SaleOrderStatus" AS ENUM ('Baru', 'Diproses', 'Selesai', 'Dibatalkan');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('Belum_dibayar', 'Dibayar', 'Dikembalikan');

-- CreateEnum
CREATE TYPE "SaleSettlementStatus" AS ENUM ('Belum_cair', 'Sebagian_cair', 'Sudah_cair', 'Tidak_dicairkan');

-- CreateEnum
CREATE TYPE "SaleStatusGroup" AS ENUM ('ORDER', 'PAYMENT', 'SETTLEMENT');

-- CreateEnum
CREATE TYPE "ReversalType" AS ENUM ('CANCELLATION', 'CUSTOMER_RETURN');

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM ('Layak_jual', 'Rusak');

-- CreateEnum
CREATE TYPE "ReturnClaimStatus" AS ENUM ('Belum_diajukan', 'Dalam_proses', 'Disetujui', 'Ditolak');

-- CreateEnum
CREATE TYPE "ReturnFundStatus" AS ENUM ('Belum_diproses', 'Menunggu_pengembalian_dana', 'Dana_dikembalikan', 'Dana_tetap_hak_penjual', 'Belum_dapat_dipastikan');

-- CreateEnum
CREATE TYPE "ReturnStatusGroup" AS ENUM ('CLAIM', 'FUND');

-- CreateEnum
CREATE TYPE "WriteOffSourceType" AS ENUM ('FROM_RETURN_DAMAGED', 'FROM_ACTIVE_STOCK');

-- CreateEnum
CREATE TYPE "PackagingMovementType" AS ENUM ('PEMBELIAN', 'PEMAKAIAN_PENJUALAN', 'PEMBATALAN_PENJUALAN', 'PENYESUAIAN_STOK');

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PENGELOLA',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "default_admin_fee_rate" DECIMAL(5,2) NOT NULL DEFAULT 22.00,
    "session_timeout_minutes" INTEGER NOT NULL DEFAULT 60,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLogs" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Products" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Units" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "allow_decimal" BOOLEAN NOT NULL DEFAULT false,
    "decimal_places" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "default_selling_price" BIGINT NOT NULL,
    "stock_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "damaged_stock_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(12,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesChannels" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_marketplace" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SalesChannels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantChannelPrices" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "sales_channel_id" UUID NOT NULL,
    "selling_price" BIGINT NOT NULL,

    CONSTRAINT "VariantChannelPrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suppliers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantSuppliers" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "purchase_price" BIGINT NOT NULL,

    CONSTRAINT "VariantSuppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchases" (
    "id" UUID NOT NULL,
    "purchase_number" TEXT NOT NULL,
    "supplier_id" UUID NOT NULL,
    "purchase_date" TIMESTAMPTZ NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "due_date" TIMESTAMPTZ,
    "total_amount" BIGINT NOT NULL,
    "paid_amount" BIGINT NOT NULL DEFAULT 0,
    "remaining_amount" BIGINT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'Draf',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'Belum_dibayar',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItems" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "ordered_qty" DECIMAL(12,4) NOT NULL,
    "received_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unit_price" BIGINT NOT NULL,

    CONSTRAINT "PurchaseItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceipts" (
    "id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "purchase_id" UUID NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceiptItems" (
    "id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "purchase_item_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "received_qty" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "GoodsReceiptItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayments" (
    "id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "amount" BIGINT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "is_void" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReturns" (
    "id" UUID NOT NULL,
    "return_number" TEXT NOT NULL,
    "purchase_id" UUID NOT NULL,
    "return_date" TIMESTAMPTZ NOT NULL,
    "resolution_type" "SupplierReturnResolution" NOT NULL,
    "calculated_return_amount" BIGINT NOT NULL,
    "return_amount" BIGINT NOT NULL,
    "settlement_date" TIMESTAMPTZ,
    "reason" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierReturns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierReturnItems" (
    "id" UUID NOT NULL,
    "supplier_return_id" UUID NOT NULL,
    "goods_receipt_item_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "subtotal" BIGINT NOT NULL,

    CONSTRAINT "SupplierReturnItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatches" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "source_type" "BatchSourceType" NOT NULL,
    "goods_receipt_item_id" UUID,
    "supplier_return_id" UUID,
    "received_at" TIMESTAMPTZ NOT NULL,
    "initial_qty" DECIMAL(12,4) NOT NULL,
    "remaining_qty" DECIMAL(12,4) NOT NULL,
    "unit_cost" BIGINT NOT NULL,

    CONSTRAINT "StockBatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovements" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "batch_id" UUID,
    "stock_pool" "StockPool" NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "qty_change" DECIMAL(12,4) NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sales" (
    "id" UUID NOT NULL,
    "transaction_number" TEXT NOT NULL,
    "sales_channel_id" UUID NOT NULL,
    "package_size_id" UUID,
    "external_order_number" TEXT,
    "transaction_date" TIMESTAMPTZ NOT NULL,
    "subtotal_amount" BIGINT NOT NULL,
    "discount_amount" BIGINT NOT NULL DEFAULT 0,
    "additional_fee_amount" BIGINT NOT NULL DEFAULT 0,
    "total_amount" BIGINT NOT NULL,
    "admin_fee_estimate_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "admin_fee_estimate_amount" BIGINT NOT NULL DEFAULT 0,
    "admin_fee_actual_amount" BIGINT,
    "order_status" "SaleOrderStatus" NOT NULL DEFAULT 'Baru',
    "payment_status" "SalePaymentStatus" NOT NULL DEFAULT 'Belum_dibayar',
    "settlement_status" "SaleSettlementStatus" NOT NULL DEFAULT 'Belum_cair',
    "is_stock_deducted" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItems" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "unit_selling_price" BIGINT NOT NULL,
    "discount_amount" BIGINT NOT NULL DEFAULT 0,
    "subtotal_amount" BIGINT NOT NULL,
    "total_hpp_fifo" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "SaleItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemBatchAllocations" (
    "id" UUID NOT NULL,
    "sale_item_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "allocated_qty" DECIMAL(12,4) NOT NULL,
    "reversed_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "batch_unit_cost" BIGINT NOT NULL,

    CONSTRAINT "SaleItemBatchAllocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItemBatchAllocationReversals" (
    "id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "reversal_type" "ReversalType" NOT NULL,
    "sale_status_history_id" UUID,
    "customer_return_item_id" UUID,
    "reversed_qty" DECIMAL(12,4) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItemBatchAllocationReversals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleStatusHistories" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "status_group" "SaleStatusGroup" NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleStatusHistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePayments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "payment_date" TIMESTAMPTZ NOT NULL,
    "amount" BIGINT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "is_void" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSettlements" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "settlement_date" TIMESTAMPTZ NOT NULL,
    "amount" BIGINT NOT NULL,
    "notes" TEXT,
    "is_void" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceSettlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReturns" (
    "id" UUID NOT NULL,
    "return_number" TEXT NOT NULL,
    "original_sale_id" UUID,
    "return_date" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "claim_status" "ReturnClaimStatus" NOT NULL DEFAULT 'Belum_diajukan',
    "fund_status" "ReturnFundStatus" NOT NULL DEFAULT 'Belum_diproses',
    "refund_amount" BIGINT NOT NULL DEFAULT 0,
    "refund_paid_date" TIMESTAMPTZ,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReturns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReturnItems" (
    "id" UUID NOT NULL,
    "customer_return_id" UUID NOT NULL,
    "sale_item_id" UUID,
    "variant_id" UUID NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "condition" "ReturnCondition" NOT NULL,
    "restored_hpp_amount" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerReturnItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReturnStatusHistories" (
    "id" UUID NOT NULL,
    "customer_return_id" UUID NOT NULL,
    "status_group" "ReturnStatusGroup" NOT NULL,
    "old_status" TEXT,
    "new_status" TEXT NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReturnStatusHistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockWriteOffs" (
    "id" UUID NOT NULL,
    "writeoff_number" TEXT NOT NULL,
    "variant_id" UUID NOT NULL,
    "source_type" "WriteOffSourceType" NOT NULL,
    "qty" DECIMAL(12,4) NOT NULL,
    "loss_value" BIGINT NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockWriteOffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockWriteOffBatchAllocations" (
    "id" UUID NOT NULL,
    "stock_writeoff_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "deducted_qty" DECIMAL(12,4) NOT NULL,
    "batch_unit_cost" BIGINT NOT NULL,

    CONSTRAINT "StockWriteOffBatchAllocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExpenseCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expenses" (
    "id" UUID NOT NULL,
    "expense_category_id" UUID NOT NULL,
    "expense_date" TIMESTAMPTZ NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "is_void" BOOLEAN NOT NULL DEFAULT false,
    "void_reason" TEXT,
    "voided_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingMaterials" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "purchase_unit_id" UUID NOT NULL,
    "usage_unit_id" UUID NOT NULL,
    "conversion_factor" DECIMAL(12,4) NOT NULL,
    "stock_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(12,4),
    "average_unit_cost" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PackagingMaterials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageSizes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dimension_label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PackageSizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageSizeItems" (
    "id" UUID NOT NULL,
    "package_size_id" UUID NOT NULL,
    "packaging_material_id" UUID NOT NULL,
    "default_usage_qty" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "PackageSizeItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingPurchases" (
    "id" UUID NOT NULL,
    "purchase_number" TEXT NOT NULL,
    "purchase_date" TIMESTAMPTZ NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingPurchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingPurchaseItems" (
    "id" UUID NOT NULL,
    "packaging_purchase_id" UUID NOT NULL,
    "packaging_material_id" UUID NOT NULL,
    "purchase_qty" DECIMAL(12,4) NOT NULL,
    "converted_usage_qty" DECIMAL(12,4) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "subtotal" BIGINT NOT NULL,

    CONSTRAINT "PackagingPurchaseItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingMovements" (
    "id" UUID NOT NULL,
    "packaging_material_id" UUID NOT NULL,
    "movement_type" "PackagingMovementType" NOT NULL,
    "qty_change" DECIMAL(12,4) NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingMovements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalePackagingUsages" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "packaging_material_id" UUID NOT NULL,
    "standard_usage_qty" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "actual_usage_qty" DECIMAL(12,4) NOT NULL,
    "unit_cost_snapshot" DECIMAL(12,4) NOT NULL,
    "calculated_hpp" BIGINT NOT NULL,
    "adjusted_hpp" BIGINT,
    "is_stock_deducted" BOOLEAN NOT NULL DEFAULT false,
    "is_stock_restored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalePackagingUsages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_token_hash_key" ON "Sessions"("token_hash");

-- CreateIndex
CREATE INDEX "Sessions_user_id_idx" ON "Sessions"("user_id");

-- CreateIndex
CREATE INDEX "ActivityLogs_created_by_id_idx" ON "ActivityLogs"("created_by_id");

-- CreateIndex
CREATE INDEX "ActivityLogs_entity_type_entity_id_idx" ON "ActivityLogs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategories_name_key" ON "ProductCategories"("name");

-- CreateIndex
CREATE INDEX "Products_category_id_idx" ON "Products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "Units_name_key" ON "Units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariants_barcode_key" ON "ProductVariants"("barcode");

-- CreateIndex
CREATE INDEX "ProductVariants_product_id_idx" ON "ProductVariants"("product_id");

-- CreateIndex
CREATE INDEX "ProductVariants_unit_id_idx" ON "ProductVariants"("unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesChannels_name_key" ON "SalesChannels"("name");

-- CreateIndex
CREATE INDEX "VariantChannelPrices_sales_channel_id_idx" ON "VariantChannelPrices"("sales_channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "VariantChannelPrices_variant_id_sales_channel_id_key" ON "VariantChannelPrices"("variant_id", "sales_channel_id");

-- CreateIndex
CREATE INDEX "VariantSuppliers_supplier_id_idx" ON "VariantSuppliers"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "VariantSuppliers_variant_id_supplier_id_key" ON "VariantSuppliers"("variant_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "Purchases_purchase_number_key" ON "Purchases"("purchase_number");

-- CreateIndex
CREATE INDEX "Purchases_supplier_id_idx" ON "Purchases"("supplier_id");

-- CreateIndex
CREATE INDEX "Purchases_created_by_id_idx" ON "Purchases"("created_by_id");

-- CreateIndex
CREATE INDEX "PurchaseItems_purchase_id_idx" ON "PurchaseItems"("purchase_id");

-- CreateIndex
CREATE INDEX "PurchaseItems_variant_id_idx" ON "PurchaseItems"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "GoodsReceipts_receipt_number_key" ON "GoodsReceipts"("receipt_number");

-- CreateIndex
CREATE INDEX "GoodsReceipts_purchase_id_idx" ON "GoodsReceipts"("purchase_id");

-- CreateIndex
CREATE INDEX "GoodsReceipts_created_by_id_idx" ON "GoodsReceipts"("created_by_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItems_goods_receipt_id_idx" ON "GoodsReceiptItems"("goods_receipt_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItems_purchase_item_id_idx" ON "GoodsReceiptItems"("purchase_item_id");

-- CreateIndex
CREATE INDEX "GoodsReceiptItems_variant_id_idx" ON "GoodsReceiptItems"("variant_id");

-- CreateIndex
CREATE INDEX "SupplierPayments_purchase_id_idx" ON "SupplierPayments"("purchase_id");

-- CreateIndex
CREATE INDEX "SupplierPayments_voided_by_id_idx" ON "SupplierPayments"("voided_by_id");

-- CreateIndex
CREATE INDEX "SupplierPayments_created_by_id_idx" ON "SupplierPayments"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierReturns_return_number_key" ON "SupplierReturns"("return_number");

-- CreateIndex
CREATE INDEX "SupplierReturns_purchase_id_idx" ON "SupplierReturns"("purchase_id");

-- CreateIndex
CREATE INDEX "SupplierReturns_created_by_id_idx" ON "SupplierReturns"("created_by_id");

-- CreateIndex
CREATE INDEX "SupplierReturnItems_supplier_return_id_idx" ON "SupplierReturnItems"("supplier_return_id");

-- CreateIndex
CREATE INDEX "SupplierReturnItems_goods_receipt_item_id_idx" ON "SupplierReturnItems"("goods_receipt_item_id");

-- CreateIndex
CREATE INDEX "SupplierReturnItems_batch_id_idx" ON "SupplierReturnItems"("batch_id");

-- CreateIndex
CREATE INDEX "SupplierReturnItems_variant_id_idx" ON "SupplierReturnItems"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatches_goods_receipt_item_id_key" ON "StockBatches"("goods_receipt_item_id");

-- CreateIndex
CREATE INDEX "StockBatches_variant_id_received_at_id_idx" ON "StockBatches"("variant_id", "received_at", "id");

-- CreateIndex
CREATE INDEX "StockBatches_supplier_return_id_idx" ON "StockBatches"("supplier_return_id");

-- CreateIndex
CREATE INDEX "StockMovements_variant_id_idx" ON "StockMovements"("variant_id");

-- CreateIndex
CREATE INDEX "StockMovements_batch_id_idx" ON "StockMovements"("batch_id");

-- CreateIndex
CREATE INDEX "StockMovements_created_by_id_idx" ON "StockMovements"("created_by_id");

-- CreateIndex
CREATE INDEX "StockMovements_reference_type_reference_id_idx" ON "StockMovements"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sales_transaction_number_key" ON "Sales"("transaction_number");

-- CreateIndex
CREATE INDEX "Sales_sales_channel_id_idx" ON "Sales"("sales_channel_id");

-- CreateIndex
CREATE INDEX "Sales_package_size_id_idx" ON "Sales"("package_size_id");

-- CreateIndex
CREATE INDEX "Sales_created_by_id_idx" ON "Sales"("created_by_id");

-- CreateIndex
CREATE INDEX "SaleItems_sale_id_idx" ON "SaleItems"("sale_id");

-- CreateIndex
CREATE INDEX "SaleItems_variant_id_idx" ON "SaleItems"("variant_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocations_sale_item_id_idx" ON "SaleItemBatchAllocations"("sale_item_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocations_batch_id_idx" ON "SaleItemBatchAllocations"("batch_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocationReversals_allocation_id_idx" ON "SaleItemBatchAllocationReversals"("allocation_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocationReversals_sale_status_history_id_idx" ON "SaleItemBatchAllocationReversals"("sale_status_history_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocationReversals_customer_return_item_id_idx" ON "SaleItemBatchAllocationReversals"("customer_return_item_id");

-- CreateIndex
CREATE INDEX "SaleItemBatchAllocationReversals_created_by_id_idx" ON "SaleItemBatchAllocationReversals"("created_by_id");

-- CreateIndex
CREATE INDEX "SaleStatusHistories_sale_id_idx" ON "SaleStatusHistories"("sale_id");

-- CreateIndex
CREATE INDEX "SaleStatusHistories_created_by_id_idx" ON "SaleStatusHistories"("created_by_id");

-- CreateIndex
CREATE INDEX "SalePayments_sale_id_idx" ON "SalePayments"("sale_id");

-- CreateIndex
CREATE INDEX "SalePayments_voided_by_id_idx" ON "SalePayments"("voided_by_id");

-- CreateIndex
CREATE INDEX "SalePayments_created_by_id_idx" ON "SalePayments"("created_by_id");

-- CreateIndex
CREATE INDEX "MarketplaceSettlements_sale_id_idx" ON "MarketplaceSettlements"("sale_id");

-- CreateIndex
CREATE INDEX "MarketplaceSettlements_voided_by_id_idx" ON "MarketplaceSettlements"("voided_by_id");

-- CreateIndex
CREATE INDEX "MarketplaceSettlements_created_by_id_idx" ON "MarketplaceSettlements"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerReturns_return_number_key" ON "CustomerReturns"("return_number");

-- CreateIndex
CREATE INDEX "CustomerReturns_original_sale_id_idx" ON "CustomerReturns"("original_sale_id");

-- CreateIndex
CREATE INDEX "CustomerReturns_created_by_id_idx" ON "CustomerReturns"("created_by_id");

-- CreateIndex
CREATE INDEX "CustomerReturnItems_customer_return_id_idx" ON "CustomerReturnItems"("customer_return_id");

-- CreateIndex
CREATE INDEX "CustomerReturnItems_sale_item_id_idx" ON "CustomerReturnItems"("sale_item_id");

-- CreateIndex
CREATE INDEX "CustomerReturnItems_variant_id_idx" ON "CustomerReturnItems"("variant_id");

-- CreateIndex
CREATE INDEX "CustomerReturnStatusHistories_customer_return_id_idx" ON "CustomerReturnStatusHistories"("customer_return_id");

-- CreateIndex
CREATE INDEX "CustomerReturnStatusHistories_created_by_id_idx" ON "CustomerReturnStatusHistories"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "StockWriteOffs_writeoff_number_key" ON "StockWriteOffs"("writeoff_number");

-- CreateIndex
CREATE INDEX "StockWriteOffs_variant_id_idx" ON "StockWriteOffs"("variant_id");

-- CreateIndex
CREATE INDEX "StockWriteOffs_created_by_id_idx" ON "StockWriteOffs"("created_by_id");

-- CreateIndex
CREATE INDEX "StockWriteOffBatchAllocations_stock_writeoff_id_idx" ON "StockWriteOffBatchAllocations"("stock_writeoff_id");

-- CreateIndex
CREATE INDEX "StockWriteOffBatchAllocations_batch_id_idx" ON "StockWriteOffBatchAllocations"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategories_name_key" ON "ExpenseCategories"("name");

-- CreateIndex
CREATE INDEX "Expenses_expense_category_id_idx" ON "Expenses"("expense_category_id");

-- CreateIndex
CREATE INDEX "Expenses_voided_by_id_idx" ON "Expenses"("voided_by_id");

-- CreateIndex
CREATE INDEX "Expenses_created_by_id_idx" ON "Expenses"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingMaterials_name_key" ON "PackagingMaterials"("name");

-- CreateIndex
CREATE INDEX "PackagingMaterials_purchase_unit_id_idx" ON "PackagingMaterials"("purchase_unit_id");

-- CreateIndex
CREATE INDEX "PackagingMaterials_usage_unit_id_idx" ON "PackagingMaterials"("usage_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackageSizes_name_key" ON "PackageSizes"("name");

-- CreateIndex
CREATE INDEX "PackageSizeItems_packaging_material_id_idx" ON "PackageSizeItems"("packaging_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackageSizeItems_package_size_id_packaging_material_id_key" ON "PackageSizeItems"("package_size_id", "packaging_material_id");

-- CreateIndex
CREATE UNIQUE INDEX "PackagingPurchases_purchase_number_key" ON "PackagingPurchases"("purchase_number");

-- CreateIndex
CREATE INDEX "PackagingPurchases_created_by_id_idx" ON "PackagingPurchases"("created_by_id");

-- CreateIndex
CREATE INDEX "PackagingPurchaseItems_packaging_purchase_id_idx" ON "PackagingPurchaseItems"("packaging_purchase_id");

-- CreateIndex
CREATE INDEX "PackagingPurchaseItems_packaging_material_id_idx" ON "PackagingPurchaseItems"("packaging_material_id");

-- CreateIndex
CREATE INDEX "PackagingMovements_packaging_material_id_idx" ON "PackagingMovements"("packaging_material_id");

-- CreateIndex
CREATE INDEX "PackagingMovements_created_by_id_idx" ON "PackagingMovements"("created_by_id");

-- CreateIndex
CREATE INDEX "PackagingMovements_reference_type_reference_id_idx" ON "PackagingMovements"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "SalePackagingUsages_sale_id_idx" ON "SalePackagingUsages"("sale_id");

-- CreateIndex
CREATE INDEX "SalePackagingUsages_packaging_material_id_idx" ON "SalePackagingUsages"("packaging_material_id");

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ActivityLogs" ADD CONSTRAINT "ActivityLogs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ProductCategories"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductVariants" ADD CONSTRAINT "ProductVariants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductVariants" ADD CONSTRAINT "ProductVariants_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Units"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VariantChannelPrices" ADD CONSTRAINT "VariantChannelPrices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VariantChannelPrices" ADD CONSTRAINT "VariantChannelPrices_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "SalesChannels"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VariantSuppliers" ADD CONSTRAINT "VariantSuppliers_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VariantSuppliers" ADD CONSTRAINT "VariantSuppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PurchaseItems" ADD CONSTRAINT "PurchaseItems_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PurchaseItems" ADD CONSTRAINT "PurchaseItems_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GoodsReceipts" ADD CONSTRAINT "GoodsReceipts_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GoodsReceipts" ADD CONSTRAINT "GoodsReceipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItems" ADD CONSTRAINT "GoodsReceiptItems_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "GoodsReceipts"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItems" ADD CONSTRAINT "GoodsReceiptItems_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "PurchaseItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GoodsReceiptItems" ADD CONSTRAINT "GoodsReceiptItems_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPayments" ADD CONSTRAINT "SupplierPayments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPayments" ADD CONSTRAINT "SupplierPayments_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierPayments" ADD CONSTRAINT "SupplierPayments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturns" ADD CONSTRAINT "SupplierReturns_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturns" ADD CONSTRAINT "SupplierReturns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturnItems" ADD CONSTRAINT "SupplierReturnItems_supplier_return_id_fkey" FOREIGN KEY ("supplier_return_id") REFERENCES "SupplierReturns"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturnItems" ADD CONSTRAINT "SupplierReturnItems_goods_receipt_item_id_fkey" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "GoodsReceiptItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturnItems" ADD CONSTRAINT "SupplierReturnItems_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StockBatches"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SupplierReturnItems" ADD CONSTRAINT "SupplierReturnItems_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockBatches" ADD CONSTRAINT "StockBatches_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockBatches" ADD CONSTRAINT "StockBatches_goods_receipt_item_id_fkey" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "GoodsReceiptItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockBatches" ADD CONSTRAINT "StockBatches_supplier_return_id_fkey" FOREIGN KEY ("supplier_return_id") REFERENCES "SupplierReturns"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockMovements" ADD CONSTRAINT "StockMovements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockMovements" ADD CONSTRAINT "StockMovements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StockBatches"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockMovements" ADD CONSTRAINT "StockMovements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "SalesChannels"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_package_size_id_fkey" FOREIGN KEY ("package_size_id") REFERENCES "PackageSizes"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItems" ADD CONSTRAINT "SaleItems_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItems" ADD CONSTRAINT "SaleItems_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocations" ADD CONSTRAINT "SaleItemBatchAllocations_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "SaleItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocations" ADD CONSTRAINT "SaleItemBatchAllocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StockBatches"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocationReversals" ADD CONSTRAINT "SaleItemBatchAllocationReversals_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "SaleItemBatchAllocations"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocationReversals" ADD CONSTRAINT "SaleItemBatchAllocationReversals_sale_status_history_id_fkey" FOREIGN KEY ("sale_status_history_id") REFERENCES "SaleStatusHistories"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocationReversals" ADD CONSTRAINT "SaleItemBatchAllocationReversals_customer_return_item_id_fkey" FOREIGN KEY ("customer_return_item_id") REFERENCES "CustomerReturnItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleItemBatchAllocationReversals" ADD CONSTRAINT "SaleItemBatchAllocationReversals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleStatusHistories" ADD CONSTRAINT "SaleStatusHistories_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SaleStatusHistories" ADD CONSTRAINT "SaleStatusHistories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SalePayments" ADD CONSTRAINT "SalePayments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SalePayments" ADD CONSTRAINT "SalePayments_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SalePayments" ADD CONSTRAINT "SalePayments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MarketplaceSettlements" ADD CONSTRAINT "MarketplaceSettlements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MarketplaceSettlements" ADD CONSTRAINT "MarketplaceSettlements_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MarketplaceSettlements" ADD CONSTRAINT "MarketplaceSettlements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturns" ADD CONSTRAINT "CustomerReturns_original_sale_id_fkey" FOREIGN KEY ("original_sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturns" ADD CONSTRAINT "CustomerReturns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturnItems" ADD CONSTRAINT "CustomerReturnItems_customer_return_id_fkey" FOREIGN KEY ("customer_return_id") REFERENCES "CustomerReturns"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturnItems" ADD CONSTRAINT "CustomerReturnItems_sale_item_id_fkey" FOREIGN KEY ("sale_item_id") REFERENCES "SaleItems"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturnItems" ADD CONSTRAINT "CustomerReturnItems_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturnStatusHistories" ADD CONSTRAINT "CustomerReturnStatusHistories_customer_return_id_fkey" FOREIGN KEY ("customer_return_id") REFERENCES "CustomerReturns"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerReturnStatusHistories" ADD CONSTRAINT "CustomerReturnStatusHistories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockWriteOffs" ADD CONSTRAINT "StockWriteOffs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ProductVariants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockWriteOffs" ADD CONSTRAINT "StockWriteOffs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockWriteOffBatchAllocations" ADD CONSTRAINT "StockWriteOffBatchAllocations_stock_writeoff_id_fkey" FOREIGN KEY ("stock_writeoff_id") REFERENCES "StockWriteOffs"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StockWriteOffBatchAllocations" ADD CONSTRAINT "StockWriteOffBatchAllocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "StockBatches"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "ExpenseCategories"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingMaterials" ADD CONSTRAINT "PackagingMaterials_purchase_unit_id_fkey" FOREIGN KEY ("purchase_unit_id") REFERENCES "Units"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingMaterials" ADD CONSTRAINT "PackagingMaterials_usage_unit_id_fkey" FOREIGN KEY ("usage_unit_id") REFERENCES "Units"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackageSizeItems" ADD CONSTRAINT "PackageSizeItems_package_size_id_fkey" FOREIGN KEY ("package_size_id") REFERENCES "PackageSizes"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackageSizeItems" ADD CONSTRAINT "PackageSizeItems_packaging_material_id_fkey" FOREIGN KEY ("packaging_material_id") REFERENCES "PackagingMaterials"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingPurchases" ADD CONSTRAINT "PackagingPurchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingPurchaseItems" ADD CONSTRAINT "PackagingPurchaseItems_packaging_purchase_id_fkey" FOREIGN KEY ("packaging_purchase_id") REFERENCES "PackagingPurchases"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingPurchaseItems" ADD CONSTRAINT "PackagingPurchaseItems_packaging_material_id_fkey" FOREIGN KEY ("packaging_material_id") REFERENCES "PackagingMaterials"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingMovements" ADD CONSTRAINT "PackagingMovements_packaging_material_id_fkey" FOREIGN KEY ("packaging_material_id") REFERENCES "PackagingMaterials"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PackagingMovements" ADD CONSTRAINT "PackagingMovements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SalePackagingUsages" ADD CONSTRAINT "SalePackagingUsages_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SalePackagingUsages" ADD CONSTRAINT "SalePackagingUsages_packaging_material_id_fkey" FOREIGN KEY ("packaging_material_id") REFERENCES "PackagingMaterials"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ============================================================================
-- CUSTOM SEQUENCES (VR-001: Penomoran Dokumen Atomik)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS seq_sale_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_purchase_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_receipt_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_customer_return_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_supplier_return_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_packaging_purchase_number START 1;
CREATE SEQUENCE IF NOT EXISTS seq_writeoff_number START 1;

-- ============================================================================
-- CUSTOM CHECK CONSTRAINTS (VR-008, VR-014, VR-015)
-- ============================================================================
ALTER TABLE "BusinessSettings"
  ADD CONSTRAINT chk_admin_fee_rate CHECK (default_admin_fee_rate >= 0 AND default_admin_fee_rate <= 100);

ALTER TABLE "StockBatches"
  ADD CONSTRAINT chk_stock_batch_qty CHECK (remaining_qty >= 0 AND remaining_qty <= initial_qty),
  ADD CONSTRAINT chk_stock_batch_cost CHECK (unit_cost >= 0);

ALTER TABLE "SaleItemBatchAllocations"
  ADD CONSTRAINT chk_allocation_reversed_qty CHECK (reversed_qty >= 0 AND reversed_qty <= allocated_qty);