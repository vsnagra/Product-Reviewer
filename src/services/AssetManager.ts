import { get, set } from 'idb-keyval';

class AssetManagerService {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private urlToFilenameMap: Record<string, string> = {};

  async init() {
    try {
      const handle = await get('assetDirectoryHandle');
      if (handle) {
        // We only restore the handle. Permission will be requested when needed.
        this.dirHandle = handle as FileSystemDirectoryHandle;
      }
    } catch (e) {
      console.warn('Failed to initialize AssetManager from IndexedDB', e);
    }
  }

  get isConfigured() {
    return this.dirHandle !== null;
  }
  
  get folderName() {
    return this.dirHandle?.name;
  }

  async requestAssetFolder(): Promise<boolean> {
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      this.dirHandle = handle;
      this.urlToFilenameMap = {}; // Clear map when directory changes to force re-saves
      await set('assetDirectoryHandle', handle);
      return true;
    } catch (e) {
      console.warn('User cancelled or failed to select directory', e);
      return false;
    }
  }
  
  async ensurePermission(): Promise<boolean> {
      if (!this.dirHandle) return false;
      try {
          const perm = await (this.dirHandle as any).queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') return true;
          const newPerm = await (this.dirHandle as any).requestPermission({ mode: 'readwrite' });
          return newPerm === 'granted';
      } catch(e) {
          return false;
      }
  }

  private async getArrayBufferFromDataUri(dataUri: string): Promise<{ buffer: ArrayBuffer, mime: string }> {
      let fetchUrl = dataUri;
      if (dataUri.startsWith('http://') || dataUri.startsWith('https://')) {
          if (!dataUri.startsWith('http://localhost:3012/')) {
              fetchUrl = `http://localhost:3012/api/proxy?url=${encodeURIComponent(dataUri)}`;
          }
      }
      const res = await fetch(fetchUrl);
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      return { buffer, mime: blob.type };
  }
  
  private async getHash(buffer: ArrayBuffer): Promise<string> {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
  }

  async saveMedia(dataUriOrFile: string | File, forceExtension?: string): Promise<string> {
    if (!this.dirHandle) {
        // If not configured, just return the dataUri (fallback)
        return typeof dataUriOrFile === 'string' ? dataUriOrFile : URL.createObjectURL(dataUriOrFile);
    }
    
    const hasPerm = await this.ensurePermission();
    if (!hasPerm) {
        return typeof dataUriOrFile === 'string' ? dataUriOrFile : URL.createObjectURL(dataUriOrFile);
    }

    let buffer: ArrayBuffer;
    let mime: string;
    let ext = forceExtension || 'bin';

    if (typeof dataUriOrFile === 'string') {
        const isBlobOrData = dataUriOrFile.startsWith('data:') || dataUriOrFile.startsWith('blob:');
        const isHttpOrPath = dataUriOrFile.startsWith('http://') || dataUriOrFile.startsWith('https://') || dataUriOrFile.startsWith('/');

        if (!isBlobOrData && !isHttpOrPath) {
            return dataUriOrFile; // Not a URL we manage
        }
        
        // Skip saving blob urls that are already known in the map
        if (this.urlToFilenameMap[dataUriOrFile]) {
            return this.urlToFilenameMap[dataUriOrFile].startsWith('asset://')
                ? this.urlToFilenameMap[dataUriOrFile]
                : dataUriOrFile;
        }

        try {
            const parsed = await this.getArrayBufferFromDataUri(dataUriOrFile);
            buffer = parsed.buffer;
            mime = parsed.mime;
            if (!forceExtension) {
                if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
                else if (mime.includes('png')) ext = 'png';
                else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3';
                else if (mime.includes('wav')) ext = 'wav';
                else if (mime.includes('mp4')) ext = 'mp4';
                else {
                    // Try to guess from url string if mime type is generic
                    const match = dataUriOrFile.split('?')[0].match(/\.(png|jpg|jpeg|wav|mp3|mp4|webm|gif)$/i);
                    if (match) ext = match[1].toLowerCase();
                }
            }
        } catch (e) {
            console.error("Failed to parse or fetch media URI", e);
            return dataUriOrFile;
        }
    } else {
        buffer = await dataUriOrFile.arrayBuffer();
        mime = dataUriOrFile.type;
        const parts = dataUriOrFile.name.split('.');
        if (parts.length > 1 && !forceExtension) {
            ext = parts.pop()!;
        }
    }

    const hash = await this.getHash(buffer);
    const filename = `asset_${hash}.${ext}`;

    try {
        const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(buffer);
        await writable.close();
        
        const file = await fileHandle.getFile();
        const objectUrl = URL.createObjectURL(file);
        
        this.urlToFilenameMap[objectUrl] = filename;
        if (typeof dataUriOrFile === 'string') {
            this.urlToFilenameMap[dataUriOrFile] = filename;
        }
        return objectUrl;
    } catch (e) {
        console.error("Failed to save media to asset folder", e);
        // Fallback
        if (typeof dataUriOrFile === 'string') return dataUriOrFile;
        return URL.createObjectURL(dataUriOrFile);
    }
  }

  async resolveFilenameToUrl(filename: string): Promise<string> {
      if (!this.dirHandle) return filename; // fallback
      
      const cleanFilename = filename.startsWith('asset://') ? filename.replace('asset://', '') : filename;
      
      // If it's a regular url or data url, return it directly
      if (cleanFilename.startsWith('http') || cleanFilename.startsWith('data:') || cleanFilename.startsWith('blob:')) {
          return cleanFilename;
      }
      
      try {
          const hasPerm = await this.ensurePermission();
          if (!hasPerm) return filename;

          const fileHandle = await this.dirHandle.getFileHandle(cleanFilename);
          const file = await fileHandle.getFile();
          const objectUrl = URL.createObjectURL(file);
          this.urlToFilenameMap[objectUrl] = cleanFilename;
          return objectUrl;
      } catch (e) {
          console.warn(`Could not load media file from Asset Folder: ${cleanFilename}`, e);
          return filename; // return original as fallback
      }
  }
  
  getFilenameFromUrl(url: string): string | null {
      return this.urlToFilenameMap[url] || null;
  }
}

export const AssetManager = new AssetManagerService();
