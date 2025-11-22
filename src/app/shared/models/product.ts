export interface ProductOption {
  label: string;
  weight?: string;
  minQty?: number;
  available?: boolean;
  sku?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  marketPrice?: number;
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
