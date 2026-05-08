export interface PosCategory {
  id: string;
  name: string;
  posPath: string;
  productPath: string;
  color: string;
  sequence: number;
}

export interface PosProduct {
  id: string;
  categoryId: string;
  defaultCode: string;
  name: string;
  listPrice: number;
  barcode: string;
  imageFile: string;
  imageSourcePath: string;
  imagePreviewUrl: string;
  imageStyle: string;
  sequence: number;
}

export type ExportRow = {
  default_code: string;
  name: string;
  list_price: string;
  category: string;
  pos_category: string;
  image_file: string;
  barcode: string;
};

export const CSV_HEADERS: Array<keyof ExportRow> = [
  'default_code',
  'name',
  'list_price',
  'category',
  'pos_category',
  'image_file',
  'barcode',
];

