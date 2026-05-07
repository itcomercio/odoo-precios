# Odoo POS Product Configurator

Aplicacion desktop para preparar productos de Odoo POS y exportarlos a CSV.

## Objetivo

La interfaz permite:
- Crear categorias POS (nombre, color y rutas Odoo)
- Crear productos (codigo, nombre, precio, barcode, imagen)
- Visualizar botones de producto con imagen, estilo panel Odoo POS
- Exportar carpeta `import/` con:
  - `import/products.csv`
  - `import/images/*` (descarga automatica de imagenes cuando la URL es `http/https`)
- CSV compatible con:
  - `pos_product_loader/demo/import/products.csv`
  - Estructura: `default_code,name,list_price,category,pos_category,image_file,barcode`

## Requisitos

- Node.js 18+
- npm

## Scripts

- `npm run dev`: inicia Vite + backend TS + Electron (modo desarrollo)
- `npm run build`: compila `main`, `backend` y `renderer`
- `npm run start`: build completo y arranque de Electron

## Ejecutar

```bash
npm install
npm run dev
```

## Estructura clave

- `src/renderer/App.tsx`: editor de categorias/productos + panel visual POS
- `src/renderer/App.css`: estilo tipo botonera Odoo POS
- `src/renderer/domain/pos.ts`: modelos tipados y cabeceras CSV
- `src/renderer/utils/csv.ts`: construccion y serializacion del CSV
- `src/main/preload.ts`: API segura expuesta al renderer
- `src/main/main.ts`: guardado del CSV via `ipcMain` + dialogo nativo

