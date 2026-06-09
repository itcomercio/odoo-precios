# Instrucciones para Agentes de IA - Odoo Precios

Este documento proporciona contexto y directrices para agentes de IA que trabajen en este repositorio.

## Descripción del Proyecto
`odoo-precios` es una aplicación de escritorio (Electron) diseñada para configurar productos y categorías para el Punto de Venta (POS) de Odoo. Permite asignar imágenes de forma visual, previsualizar la botonera estilo Odoo y exportar los datos a un formato CSV compatible con herramientas de importación de Odoo.

## Stack Tecnológico
- **Frontend:** React + TypeScript + Vite.
- **Backend (API interna):** Express + Node.js (TypeScript).
- **Desktop:** Electron.
- **Estilos:** CSS puro (Material Design / Odoo style).

## Estructura del Proyecto
- `src/main/`: Proceso principal de Electron (ventanas, diálogos nativos, sistema de archivos).
- `src/backend/`: Servidor Express que gestiona la lógica de datos y comunicación local.
- `src/renderer/`: Código del frontend (React).
- `src/renderer/domain/`: Modelos de datos y tipos.
- `pos-icons/`: Repositorio de imágenes organizadas por estilos para los productos.

## Directrices para Agentes

### 1. No adivinar rutas ni dependencias
Antes de proponer un cambio, verifica la existencia de archivos con `glob` o `list_directory`. Consulta `package.json` para confirmar qué librerías están disponibles.

### 2. Seguir patrones existentes
- **Tipado:** Usa TypeScript de forma estricta. Define interfaces en `src/renderer/domain/` si son modelos compartidos.
- **Comunicación:** La comunicación entre procesos debe seguir el patrón de `preload.ts` y `contextBridge`. No uses `remote` (obsoleto).
- **Estilos:** Mantén la estética de Odoo POS. Consulta `src/renderer/App.css` para referencias.

### 3. Operaciones de Archivos
- Las operaciones de exportación (CSV e imágenes) se coordinan desde el proceso principal (`src/main/main.ts`) o el backend, invocadas a través de la API expuesta en `preload.ts`.
- La carpeta de exportación final es `import/` en la raíz del proyecto.

### 4. Flujo de Desarrollo
- Si añades una nueva funcionalidad que requiera persistencia, asegúrate de actualizar tanto el backend como el frontend.
- Los iconos de productos se seleccionan desde `pos-icons/` y se copian a `import/images/` durante la exportación.

### 5. Verificación
- Después de modificar código, intenta ejecutar `npm run build` para verificar errores de compilación de TypeScript.
- Si es posible, sugiere pruebas unitarias para lógica compleja (especialmente en `csv.ts` o lógica de dominio).

## Comandos Principales
- `npm run dev`: Arranca todo el entorno de desarrollo (Vite + Backend + Electron).
- `npm run build`: Compila todas las partes del proyecto.
- `npm run start`: Ejecuta la versión compilada.

## Notas sobre el CSV
La estructura del CSV es crítica para la compatibilidad con Odoo:
`default_code,name,list_price,category,pos_category,image_file,barcode`
Cualquier cambio en `src/renderer/utils/csv.ts` debe respetar este orden.
