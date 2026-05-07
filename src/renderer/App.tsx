import { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import { PosCategory, PosProduct } from './domain/pos';
import { initialCategories, initialProducts } from './sample-data';
import { buildExportRows, toCsvString } from './utils/csv';

type ExportStatus = 'idle' | 'ok' | 'error';
const STORAGE_KEY = 'odoo-pos-config-v1';

const createId = () => `id-${Math.random().toString(36).slice(2, 10)}`;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      categories: PosCategory[];
      products: PosProduct[];
      activeCategoryId: string;
    };
    return parsed;
  } catch {
    return null;
  }
}

const App = () => {
  const savedState = useMemo(() => loadState(), []);
  const [categories, setCategories] = useState<PosCategory[]>(savedState?.categories ?? initialCategories);
  const [products, setProducts] = useState<PosProduct[]>(savedState?.products ?? initialProducts);
  const [activeCategoryId, setActiveCategoryId] = useState(savedState?.activeCategoryId ?? initialCategories[0]?.id ?? '');

  const [categoryName, setCategoryName] = useState('');
  const [categoryPosPath, setCategoryPosPath] = useState('');
  const [categoryProductPath, setCategoryProductPath] = useState('');
  const [categoryColor, setCategoryColor] = useState('#c8b6dd');

  const [productDefaultCode, setProductDefaultCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [productImageFile, setProductImageFile] = useState('');
  const [productImageUrl, setProductImageUrl] = useState('');

  const [errors, setErrors] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportMessage, setExportMessage] = useState('');

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  );

  const activeProducts = useMemo(
    () => products
      .filter((product) => product.categoryId === activeCategoryId)
      .sort((a, b) => a.sequence - b.sequence),
    [products, activeCategoryId],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, products, activeCategoryId }));
  }, [categories, products, activeCategoryId]);

  const validateCategory = (): string[] => {
    const foundErrors: string[] = [];
    if (!categoryName.trim()) foundErrors.push('El nombre de la categoria es obligatorio.');
    if (!categoryPosPath.trim()) foundErrors.push('La ruta POS (ej: Barra/Bebidas) es obligatoria.');
    if (!categoryProductPath.trim()) foundErrors.push('La ruta de categoria de producto es obligatoria.');
    return foundErrors;
  };

  const validateProduct = (): string[] => {
    const foundErrors: string[] = [];
    const parsedPrice = Number(productPrice);

    if (!activeCategoryId) foundErrors.push('Selecciona primero una categoria POS.');
    if (!productDefaultCode.trim()) foundErrors.push('default_code es obligatorio.');
    if (!productName.trim()) foundErrors.push('El nombre del producto es obligatorio.');
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      foundErrors.push('El precio debe ser un numero valido mayor o igual a 0.');
    }
    if (!productImageFile.trim()) foundErrors.push('image_file es obligatorio para el CSV.');
    return foundErrors;
  };

  const onCreateCategory = (event: FormEvent) => {
    event.preventDefault();
    const foundErrors = validateCategory();
    if (foundErrors.length > 0) {
      setErrors(foundErrors);
      return;
    }

    const sequence = categories.length + 1;
    const newCategory: PosCategory = {
      id: createId(),
      name: categoryName.trim(),
      posPath: categoryPosPath.trim(),
      productPath: categoryProductPath.trim(),
      color: categoryColor,
      sequence,
    };

    setCategories((previous) => [...previous, newCategory]);
    setActiveCategoryId(newCategory.id);
    setCategoryName('');
    setCategoryPosPath('');
    setCategoryProductPath('');
    setErrors([]);
  };

  const onCreateProduct = (event: FormEvent) => {
    event.preventDefault();
    const foundErrors = validateProduct();
    if (foundErrors.length > 0) {
      setErrors(foundErrors);
      return;
    }

    const sequence = products.filter((product) => product.categoryId === activeCategoryId).length + 1;
    const newProduct: PosProduct = {
      id: createId(),
      categoryId: activeCategoryId,
      defaultCode: productDefaultCode.trim(),
      name: productName.trim(),
      listPrice: Number(productPrice),
      barcode: productBarcode.trim(),
      imageFile: productImageFile.trim(),
      imageUrl: productImageUrl.trim(),
      sequence,
    };

    setProducts((previous) => [...previous, newProduct]);
    setProductDefaultCode('');
    setProductName('');
    setProductPrice('');
    setProductBarcode('');
    setProductImageFile('');
    setProductImageUrl('');
    setErrors([]);
  };

  const deleteProduct = (productId: string) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId));
  };

  const exportCsv = async () => {
    try {
      const csv = toCsvString(buildExportRows(categories, products));
      const imageCandidates = products.map((product) => ({
        fileName: product.imageFile,
        imageUrl: product.imageUrl,
      }));
      const result = await window.electronAPI?.exportImportStructure?.({
        csvContent: csv,
        images: imageCandidates,
      });

      if (result?.saved === false) {
        setExportStatus('error');
        setExportMessage(result.reason ?? 'No se pudo guardar el archivo CSV.');
        return;
      }

      if (result?.saved) {
        setExportStatus('ok');
        const warningText = result.warnings.length > 0
          ? ` (${result.warnings.length} imagen(es) sin descargar)`
          : '';
        setExportMessage(`Estructura exportada en ${result.path}${warningText}`);
        return;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'products.csv';
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus('ok');
      setExportMessage('CSV generado (descarga local).');
    } catch (error) {
      setExportStatus('error');
      setExportMessage(error instanceof Error ? error.message : 'Error inesperado al exportar.');
    }
  };

  return (
    <div className="app">
      <aside className="config-panel">
        <h1>Configurador Odoo POS</h1>
        <p>Define categorias y productos, y exporta `products.csv` compatible con `pos_product_loader`.</p>

        <form className="editor-card" onSubmit={onCreateCategory}>
          <h2>Nueva categoria</h2>
          <label>
            Nombre
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Bebidas" />
          </label>
          <label>
            Ruta POS
            <input
              value={categoryPosPath}
              onChange={(event) => setCategoryPosPath(event.target.value)}
              placeholder="Barra/Bebidas"
            />
          </label>
          <label>
            Ruta categoria producto
            <input
              value={categoryProductPath}
              onChange={(event) => setCategoryProductPath(event.target.value)}
              placeholder="Bebidas/Refrescos"
            />
          </label>
          <label>
            Color del boton
            <input type="color" value={categoryColor} onChange={(event) => setCategoryColor(event.target.value)} />
          </label>
          <button type="submit">Agregar categoria</button>
        </form>

        <form className="editor-card" onSubmit={onCreateProduct}>
          <h2>Nuevo producto</h2>
          <label>
            Categoria activa
            <select value={activeCategoryId} onChange={(event) => setActiveCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            default_code
            <input
              value={productDefaultCode}
              onChange={(event) => setProductDefaultCode(event.target.value)}
              placeholder="POS-REF-001"
            />
          </label>
          <label>
            Nombre
            <input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Coca-Cola" />
          </label>
          <label>
            list_price
            <input value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="2.30" />
          </label>
          <label>
            barcode
            <input value={productBarcode} onChange={(event) => setProductBarcode(event.target.value)} placeholder="841000000001" />
          </label>
          <label>
            image_file
            <input
              value={productImageFile}
              onChange={(event) => setProductImageFile(event.target.value)}
              placeholder="coca-cola.png"
            />
          </label>
          <label>
            URL imagen (preview)
            <input
              value={productImageUrl}
              onChange={(event) => setProductImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <button type="submit">Agregar producto</button>
        </form>

        {errors.length > 0 && (
          <div className="error-box">
            {errors.map((error) => <p key={error}>- {error}</p>)}
          </div>
        )}

        <button className="export-button" onClick={exportCsv}>Exportar carpeta import/</button>
        {exportStatus !== 'idle' && (
          <p className={exportStatus === 'ok' ? 'status-ok' : 'status-error'}>{exportMessage}</p>
        )}
      </aside>

      <main className="pos-panel">
        <div className="pos-toolbar">
          {categories
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .map((category) => (
              <button
                key={category.id}
                className={`category-button ${category.id === activeCategoryId ? 'active' : ''}`}
                style={{ backgroundColor: category.color }}
                onClick={() => setActiveCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
        </div>

        <section className="products-grid">
          {activeProducts.map((product) => (
            <article key={product.id} className="product-card" style={{ borderBottomColor: activeCategory?.color ?? '#ccc' }}>
              <button type="button" className="delete-product" onClick={() => deleteProduct(product.id)}>x</button>
              <div className="product-image-wrap">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">sin imagen</div>
                )}
              </div>
              <div className="product-name">{product.name}</div>
              <div className="product-meta">{product.listPrice.toFixed(2)} EUR</div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default App;

