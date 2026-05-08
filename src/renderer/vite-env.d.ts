/// <reference types="vite/client" />

export {};

interface PosIconAssetDescriptor {
  style: string;
  fileName: string;
  relativePath: string;
  previewDataUrl: string;
}

declare global {
  interface Window {
    electronAPI?: {
      platform?: string;
      electronVersion?: string;
      saveCsvFile?: (csvContent: string) => Promise<
        | { saved: true; path: string }
        | { saved: false; reason?: string }
      >;
      listPosIconStyles?: () => Promise<string[]>;
      listPosIconsByStyle?: (style: string) => Promise<PosIconAssetDescriptor[]>;
      exportImportStructure?: (payload: {
        csvContent: string;
        images: Array<{ fileName: string; sourceRelativePath: string }>;
      }) => Promise<
        | { saved: true; path: string; warnings: string[] }
        | { saved: false; reason?: string }
      >;
    };
  }
}


