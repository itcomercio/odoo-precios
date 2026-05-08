import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  electronVersion: process.versions.electron,
  saveCsvFile: (csvContent: string) => ipcRenderer.invoke('save-csv-file', csvContent),
  listPosIconStyles: () => ipcRenderer.invoke('list-pos-icon-styles'),
  listPosIconsByStyle: (style: string) => ipcRenderer.invoke('list-pos-icons-by-style', style),
  exportImportStructure: (payload: { csvContent: string; images: Array<{ fileName: string; sourceRelativePath: string }> }) =>
    ipcRenderer.invoke('export-import-structure', payload),
});

