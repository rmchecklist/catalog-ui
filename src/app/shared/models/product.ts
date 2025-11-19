export interface ProductOption {
  label: string;
  weight?: string;
  minQty?: number;
  available?: boolean;
  sku?: string;
}

export interface Product {
  name: string;
  brand: string;
  vendor?: string;
  category: string;
  description: string;
  options: ProductOption[];
  slug: string;
  imageUrl?: string;
}
