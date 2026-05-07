import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  electronVersion: process.versions.electron,
  saveCsvFile: (csvContent: string) => ipcRenderer.invoke('save-csv-file', csvContent),
  exportImportStructure: (payload: { csvContent: string; images: Array<{ fileName: string; imageUrl: string }> }) =>
    ipcRenderer.invoke('export-import-structure', payload),
});

