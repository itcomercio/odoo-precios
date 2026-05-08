import { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';
import { PosCategory, PosProduct } from './domain/pos';
import { initialCategories, initialProducts } from './sample-data';
import { buildExportRows, toCsvString } from './utils/csv';

type ExportStatus = 'idle' | 'ok' | 'error';
type SavedState = {
  categories: PosCategory[];
  products: PosProduct[];
  activeCategoryId: string;
};
type EditingDraft = {
  productId: string;
  name: string;
  price: string;
  error: string;
};
type PosIconAsset = {
  style: string;
  fileName: string;
  relativePath: string;
  previewDataUrl: string;
};
type ElectronApi = {
  listPosIconStyles?: () => Promise<string[]>;
  listPosIconsByStyle?: (style: string) => Promise<PosIconAsset[]>;
  exportImportStructure?: (payload: {
    csvContent: string;
    images: Array<{ fileName: string; sourceRelativePath: string }>;
  }) => Promise<
    | { saved: true; path: string; warnings: string[] }
    | { saved: false; reason?: string }
  >;
};

const STORAGE_KEY = 'odoo-pos-config-v1';

const createId = () => `id-${Math.random().toString(36).slice(2, 10)}`;

function normalizeCategory(category: Partial<PosCategory>, index: number): PosCategory {
  return {
    id: typeof category.id === 'string' && category.id ? category.id : createId(),
    name: typeof category.name === 'string' ? category.name : '',
    posPath: typeof category.posPath === 'string' ? category.posPath : '',
    productPath: typeof category.productPath === 'string' ? category.productPath : '',
    color: typeof category.color === 'string' && category.color ? category.color : '#c8b6dd',
    sequence: typeof category.sequence === 'number' ? category.sequence : index + 1,
  };
}

function normalizeProduct(product: Partial<PosProduct> & { imageUrl?: string }, index: number): PosProduct {
  return {
    id: typeof product.id === 'string' && product.id ? product.id : createId(),
    categoryId: typeof product.categoryId === 'string' ? product.categoryId : '',
    defaultCode: typeof product.defaultCode === 'string' ? product.defaultCode : '',
    name: typeof product.name === 'string' ? product.name : '',
    listPrice: typeof product.listPrice === 'number' ? product.listPrice : 0,
    barcode: typeof product.barcode === 'string' ? product.barcode : '',
    imageFile: typeof product.imageFile === 'string' ? product.imageFile : '',
    imageSourcePath: typeof product.imageSourcePath === 'string' ? product.imageSourcePath : '',
    imagePreviewUrl:
      typeof product.imagePreviewUrl === 'string'
        ? product.imagePreviewUrl
        : typeof product.imageUrl === 'string'
          ? product.imageUrl
          : '',
    imageStyle: typeof product.imageStyle === 'string' ? product.imageStyle : '',
    sequence: typeof product.sequence === 'number' ? product.sequence : index + 1,
  };
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      categories?: Array<Partial<PosCategory>>;
      products?: Array<Partial<PosProduct> & { imageUrl?: string }>;
      activeCategoryId?: string;
    };

    return {
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.map((category, index) => normalizeCategory(category, index))
        : initialCategories,
      products: Array.isArray(parsed.products)
        ? parsed.products.map((product, index) => normalizeProduct(product, index))
        : initialProducts,
      activeCategoryId: typeof parsed.activeCategoryId === 'string' ? parsed.activeCategoryId : '',
    };
  } catch {
    return null;
  }
}

const App = () => {
  const electronAPI = (window as Window & { electronAPI?: ElectronApi }).electronAPI;
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

  const [errors, setErrors] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportMessage, setExportMessage] = useState('');

  const [imagePickerProductId, setImagePickerProductId] = useState<string | null>(null);
  const [iconStyles, setIconStyles] = useState<string[]>([]);
  const [selectedIconStyle, setSelectedIconStyle] = useState('');
  const [iconAssets, setIconAssets] = useState<PosIconAsset[]>([]);
  const [selectedIconPath, setSelectedIconPath] = useState('');
  const [imagePickerLoading, setImagePickerLoading] = useState(false);
  const [imagePickerError, setImagePickerError] = useState('');
  const [editingDraft, setEditingDraft] = useState<EditingDraft | null>(null);

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

  const imagePickerProduct = useMemo(
    () => products.find((product) => product.id === imagePickerProductId) ?? null,
    [products, imagePickerProductId],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, products, activeCategoryId }));
  }, [categories, products, activeCategoryId]);

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categories[0].id);
    }
  }, [activeCategoryId, categories]);

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
      imageFile: '',
      imageSourcePath: '',
      imagePreviewUrl: '',
      imageStyle: '',
      sequence,
    };

    setProducts((previous) => [...previous, newProduct]);
    setProductDefaultCode('');
    setProductName('');
    setProductPrice('');
    setProductBarcode('');
    setErrors([]);
  };

  const deleteProduct = (productId: string) => {
    setProducts((previous) => previous.filter((product) => product.id !== productId));
    if (imagePickerProductId === productId) {
      setImagePickerProductId(null);
      setSelectedIconPath('');
      setImagePickerError('');
    }
    if (editingDraft?.productId === productId) {
      setEditingDraft(null);
    }
  };

  const startEditingProduct = (product: PosProduct) => {
    setEditingDraft({
      productId: product.id,
      name: product.name,
      price: product.listPrice.toFixed(2),
      error: '',
    });
  };

  const updateEditingDraft = (field: 'name' | 'price', value: string) => {
    setEditingDraft((previous) => (previous ? { ...previous, [field]: value, error: '' } : previous));
  };

  const cancelEditingProduct = () => {
    setEditingDraft(null);
  };

  const saveEditingProduct = () => {
    if (!editingDraft) return;

    const normalizedName = editingDraft.name.trim();
    const normalizedPriceText = editingDraft.price.replace(',', '.').trim();
    const parsedPrice = Number(normalizedPriceText);

    if (!normalizedName) {
      setEditingDraft((previous) => (previous ? { ...previous, error: 'El nombre es obligatorio.' } : previous));
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setEditingDraft((previous) => (previous ? { ...previous, error: 'Precio no valido.' } : previous));
      return;
    }

    setProducts((previous) => previous.map((product) => (
      product.id === editingDraft.productId
        ? {
            ...product,
            name: normalizedName,
            listPrice: Number(parsedPrice.toFixed(2)),
          }
        : product
    )));
    setEditingDraft(null);
  };

  const loadAssetsForStyle = async (style: string, preferredPath = '') => {
    setSelectedIconStyle(style);
    setImagePickerLoading(true);
    setImagePickerError('');

    try {
      const assets = await electronAPI?.listPosIconsByStyle?.(style);
      if (!assets) {
        throw new Error('No se pudo abrir el selector de imagenes desde Electron.');
      }

      setIconAssets(assets);
      setSelectedIconPath(assets.some((asset) => asset.relativePath === preferredPath) ? preferredPath : '');
      if (assets.length === 0) {
        setImagePickerError(`No hay imagenes disponibles en ${style}.`);
      }
    } catch (error) {
      setIconAssets([]);
      setSelectedIconPath('');
      setImagePickerError(error instanceof Error ? error.message : 'No se pudieron cargar las imagenes.');
    } finally {
      setImagePickerLoading(false);
    }
  };

  const openImagePicker = async (productId: string) => {
    const product = products.find((candidate) => candidate.id === productId) ?? null;
    setImagePickerProductId(productId);
    setImagePickerError('');
    setSelectedIconPath('');

    try {
      const styles = await electronAPI?.listPosIconStyles?.();
      if (!styles) {
        throw new Error('El selector de imagenes solo esta disponible en la aplicacion desktop.');
      }
      if (styles.length === 0) {
        setIconStyles([]);
        setSelectedIconStyle('');
        setIconAssets([]);
        setImagePickerError('No se encontraron directorios dentro de pos-icons/.');
        return;
      }

      setIconStyles(styles);
      const defaultStyle = styles.includes('style-1') ? 'style-1' : styles[0];
      const nextStyle = product?.imageStyle && styles.includes(product.imageStyle)
        ? product.imageStyle
        : defaultStyle;

      await loadAssetsForStyle(nextStyle, product?.imageSourcePath ?? '');
    } catch (error) {
      setIconStyles([]);
      setSelectedIconStyle('');
      setIconAssets([]);
      setImagePickerError(error instanceof Error ? error.message : 'No se pudo abrir el selector de imagenes.');
    }
  };

  const closeImagePicker = () => {
    setImagePickerProductId(null);
    setSelectedIconPath('');
    setImagePickerError('');
  };

  const applySelectedImage = () => {
    if (!imagePickerProductId || !selectedIconPath) return;

    const selectedAsset = iconAssets.find((asset) => asset.relativePath === selectedIconPath);
    if (!selectedAsset) return;

    setProducts((previous) => previous.map((product) => (
      product.id === imagePickerProductId
        ? {
            ...product,
            imageFile: selectedAsset.fileName,
            imageSourcePath: selectedAsset.relativePath,
            imagePreviewUrl: selectedAsset.previewDataUrl,
            imageStyle: selectedAsset.style,
          }
        : product
    )));

    closeImagePicker();
  };

  const exportCsv = async () => {
    try {
      const csv = toCsvString(buildExportRows(categories, products));
      const imageCandidates = products.map((product) => ({
        fileName: product.imageFile,
        sourceRelativePath: product.imageSourcePath,
      }));

      const result = await electronAPI?.exportImportStructure?.({
        csvContent: csv,
        images: imageCandidates,
      });

      if (result?.saved === false) {
        setExportStatus('error');
        setExportMessage(result.reason ?? 'No se pudo exportar la carpeta import/.');
        return;
      }

      if (result?.saved) {
        setExportStatus('ok');
        const warningCount = result.warnings?.length ?? 0;
        const warningText = warningCount > 0 ? ` (${warningCount} aviso(s) de imagen)` : '';
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
    <>
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
            <p className="form-hint">La imagen se asigna despues desde la tarjeta del producto en el panel derecho.</p>
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
                <button type="button" className="product-image-button" onClick={() => openImagePicker(product.id)}>
                  <div className="product-image-wrap">
                    {product.imagePreviewUrl ? (
                      <img src={product.imagePreviewUrl} alt={product.name} className="product-image" />
                    ) : (
                      <div className="product-image-placeholder">
                        <strong>cargar imagen</strong>
                        <span>Click para seleccionar</span>
                      </div>
                    )}
                  </div>
                </button>

                {editingDraft?.productId === product.id ? (
                  <div className="product-editor-inline">
                    <input
                      className="product-inline-input product-inline-name"
                      value={editingDraft.name}
                      onChange={(event) => updateEditingDraft('name', event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          saveEditingProduct();
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelEditingProduct();
                        }
                      }}
                      placeholder="Nombre del producto"
                      autoFocus
                    />
                    <div className="product-inline-price-row">
                      <input
                        className="product-inline-input product-inline-price"
                        value={editingDraft.price}
                        onChange={(event) => updateEditingDraft('price', event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveEditingProduct();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelEditingProduct();
                          }
                        }}
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                      <span className="product-inline-currency">EUR</span>
                    </div>
                    <div className="product-inline-actions">
                      <button type="button" className="product-inline-action secondary" onClick={cancelEditingProduct}>
                        Cancelar
                      </button>
                      <button type="button" className="product-inline-action primary" onClick={saveEditingProduct}>
                        Guardar
                      </button>
                    </div>
                    {editingDraft.error && <div className="product-inline-error">{editingDraft.error}</div>}
                  </div>
                ) : (
                  <button type="button" className="product-inline-display" onClick={() => startEditingProduct(product)}>
                    <div className="product-name">{product.name}</div>
                    <div className="product-meta">{product.listPrice.toFixed(2)} EUR</div>
                  </button>
                )}
              </article>
            ))}
          </section>
        </main>
      </div>

      {imagePickerProductId && (
        <div className="modal-backdrop" onClick={closeImagePicker}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-picker-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="image-picker-title">Seleccionar imagen</h2>
                <p>{imagePickerProduct?.name ?? 'Producto'}</p>
              </div>
              <button type="button" className="modal-close" onClick={closeImagePicker}>×</button>
            </div>

            <label className="modal-field">
              Estilo
              <select
                value={selectedIconStyle}
                onChange={(event) => void loadAssetsForStyle(event.target.value, '')}
                disabled={imagePickerLoading || iconStyles.length === 0}
              >
                {iconStyles.map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>

            {imagePickerLoading ? (
              <div className="picker-empty">Cargando imagenes...</div>
            ) : iconAssets.length > 0 ? (
              <div className="icon-picker-grid">
                {iconAssets.map((asset) => (
                  <button
                    key={asset.relativePath}
                    type="button"
                    className={`icon-option ${selectedIconPath === asset.relativePath ? 'selected' : ''}`}
                    onClick={() => setSelectedIconPath(asset.relativePath)}
                  >
                    <div className="icon-option-preview">
                      <img src={asset.previewDataUrl} alt={asset.fileName} />
                    </div>
                    <span>{asset.fileName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="picker-empty">No hay imagenes disponibles en este estilo.</div>
            )}

            {imagePickerError && <p className="picker-error">{imagePickerError}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeImagePicker}>Cancelar</button>
              <button type="button" onClick={applySelectedImage} disabled={!selectedIconPath || imagePickerLoading}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;

