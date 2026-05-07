import { CSV_HEADERS, ExportRow, PosCategory, PosProduct } from '../domain/pos';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildExportRows(categories: PosCategory[], products: PosProduct[]): ExportRow[] {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return products
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((product) => {
      const category = categoriesById.get(product.categoryId);
      return {
        default_code: product.defaultCode,
        name: product.name,
        list_price: product.listPrice.toFixed(2),
        category: category?.productPath ?? '',
        pos_category: category?.posPath ?? '',
        image_file: product.imageFile,
        barcode: product.barcode,
      };
    });
}

export function toCsvString(rows: ExportRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const line = CSV_HEADERS.map((header) => escapeCsv(row[header])).join(',');
    lines.push(line);
  }
  return `${lines.join('\n')}\n`;
}

