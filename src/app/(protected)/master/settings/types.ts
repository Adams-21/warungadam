export type BusinessSettingsView = {
  id: string;
  business_name: string;
  address: string;
  phone: string;
  default_admin_fee_rate: number;
  session_timeout_minutes: number;
};

export type ChannelView = {
  id: string;
  name: string;
  is_marketplace: boolean;
  is_active: boolean;
};

export type ExpenseCategoryView = {
  id: string;
  name: string;
  is_active: boolean;
};
