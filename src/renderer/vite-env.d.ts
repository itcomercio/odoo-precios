export {};

declare global {
  interface Window {
    electronAPI?: {
      platform?: string;
      electronVersion?: string;
      saveCsvFile?: (csvContent: string) => Promise<
        | { saved: true; path: string }
        | { saved: false; reason?: string }
      >;
      exportImportStructure?: (payload: {
        csvContent: string;
        images: Array<{ fileName: string; imageUrl: string }>;
      }) => Promise<
        | { saved: true; path: string; warnings: string[] }
        | { saved: false; reason?: string }
      >;
    };
  }
}


