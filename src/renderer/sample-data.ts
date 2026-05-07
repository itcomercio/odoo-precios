import { PosCategory, PosProduct } from './domain/pos';

const vinoTinto = new URL('../../pos-icons/style-1/vino-tinto-copa.jpg', import.meta.url).href;
const vinoBlanco = new URL('../../pos-icons/style-1/vino-blanco-copa.jpg', import.meta.url).href;
const vinoRosado = new URL('../../pos-icons/style-1/vino-rosado-copa.jpg', import.meta.url).href;

export const initialCategories: PosCategory[] = [
  {
    id: 'cat-bebidas',
    name: 'Bebidas',
    posPath: 'Barra/Bebidas',
    productPath: 'Bebidas/Refrescos',
    color: '#bc8fbb',
    sequence: 1,
  },
  {
    id: 'cat-vinos',
    name: 'Vinos',
    posPath: 'Barra/Vinos',
    productPath: 'Bebidas/Vinos',
    color: '#8190df',
    sequence: 2,
  },
  {
    id: 'cat-infusion',
    name: 'Infusiones',
    posPath: 'Barra/Infusiones',
    productPath: 'Bebidas/Infusiones',
    color: '#5bbeb3',
    sequence: 3,
  },
];

export const initialProducts: PosProduct[] = [
  {
    id: 'prod-coca-cola',
    categoryId: 'cat-bebidas',
    defaultCode: 'POS-REF-001',
    name: 'Coca-Cola',
    listPrice: 2.3,
    barcode: '841000000011',
    imageFile: 'coca-cola.png',
    imageUrl: 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?q=80&w=600&auto=format&fit=crop',
    sequence: 1,
  },
  {
    id: 'prod-agua',
    categoryId: 'cat-bebidas',
    defaultCode: 'POS-REF-002',
    name: 'Agua',
    listPrice: 1.5,
    barcode: '841000000012',
    imageFile: 'water.png',
    imageUrl: 'https://images.unsplash.com/photo-1616118132534-381148898bb4?q=80&w=600&auto=format&fit=crop',
    sequence: 2,
  },
  {
    id: 'prod-vino-tinto',
    categoryId: 'cat-vinos',
    defaultCode: 'POS-VIN-001',
    name: 'Vino Tinto',
    listPrice: 3.9,
    barcode: '841000000013',
    imageFile: 'vino-tinto-copa.jpg',
    imageUrl: vinoTinto,
    sequence: 1,
  },
  {
    id: 'prod-vino-blanco',
    categoryId: 'cat-vinos',
    defaultCode: 'POS-VIN-002',
    name: 'Vino Blanco',
    listPrice: 3.9,
    barcode: '841000000014',
    imageFile: 'vino-blanco-copa.jpg',
    imageUrl: vinoBlanco,
    sequence: 2,
  },
  {
    id: 'prod-vino-rosado',
    categoryId: 'cat-vinos',
    defaultCode: 'POS-VIN-003',
    name: 'Vino Rosado',
    listPrice: 3.9,
    barcode: '841000000015',
    imageFile: 'vino-rosado-copa.jpg',
    imageUrl: vinoRosado,
    sequence: 3,
  },
  {
    id: 'prod-te-verde',
    categoryId: 'cat-infusion',
    defaultCode: 'POS-INF-001',
    name: 'Te Verde',
    listPrice: 2.1,
    barcode: '841000000016',
    imageFile: 'te-verde.png',
    imageUrl: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?q=80&w=600&auto=format&fit=crop',
    sequence: 1,
  },
];

