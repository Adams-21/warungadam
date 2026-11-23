export type UnitOptionView = {
  id: string;
  name: string;
};

export type PackagingMaterialView = {
  id: string;
  name: string;
  purchase_unit_name: string;
  usage_unit_name: string;
  conversion_factor: number;
  stock_qty: number;
  min_stock: number | null;
  average_unit_cost: number;
  is_active: boolean;
};

export type PackageSizeItemView = {
  id: string;
  packaging_material_id: string;
  material_name: string;
  default_usage_qty: number;
  unit_cost: number;
  subtotal: number;
};

export type PackageSizeView = {
  id: string;
  name: string;
  dimension_label: string;
  sort_order: number;
  is_active: boolean;
  sales_count: number;
  estimated_hpp: number;
  items: PackageSizeItemView[];
};
