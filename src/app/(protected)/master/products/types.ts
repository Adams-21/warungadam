export type CategoryView = {
  id: string;
  name: string;
  is_active: boolean;
  product_count: number;
};

export type UnitView = {
  id: string;
  name: string;
};

export type ChannelView = {
  id: string;
  name: string;
};

export type SupplierView = {
  id: string;
  name: string;
};

export type ChannelPriceView = {
  id: string;
  sales_channel_id: string;
  channel_name: string;
  selling_price: number;
};

export type SupplierPriceView = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_price: number;
};

export type VariantView = {
  id: string;
  product_id: string;
  name: string;
  barcode: string;
  unit_id: string;
  unit_name: string;
  default_selling_price: number;
  stock_qty: number;
  damaged_stock_qty: number;
  min_stock: number | null;
  is_active: boolean;
  channel_prices: ChannelPriceView[];
  supplier_prices: SupplierPriceView[];
};

export type ProductView = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  is_active: boolean;
  variants: VariantView[];
};
