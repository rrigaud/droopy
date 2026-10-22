import { invoke } from '@tauri-apps/api/core';

export function isTauri() {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export const nativeFs = {
  async selectFolder(defaultPath = '') {
    if (isTauri()) {
      return await invoke('select_folder', { defaultPath: defaultPath || null });
    }
    // Web fallback prompt
    return window.prompt('Dossier Source (chemin local absolu):', defaultPath || '/Users/raph/Documents/Source Droopy');
  },

  async selectFile(title = '', filterName = '', filterExts = [], defaultPath = '') {
    if (isTauri()) {
      return await invoke('select_file', {
        title: title || null,
        filterName: filterName || null,
        filterExts: filterExts.length ? filterExts : null,
        defaultPath: defaultPath || null,
      });
    }
    // Web file picker
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (filterExts.length) {
        input.accept = filterExts.map((e) => `.${e}`).join(',');
      }
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
          // store file in a global map for web fallback reading
          const fakePath = `/web-mock/${file.name}`;
          window.__droopy_mock_files = window.__droopy_mock_files || {};
          window.__droopy_mock_files[fakePath] = file;
          resolve(fakePath);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  },

  async readTextFile(path) {
    if (isTauri()) {
      return await invoke('read_text_file', { path });
    }
    if (window.__droopy_mock_files?.[path]) {
      return await window.__droopy_mock_files[path].text();
    }
    const stored = localStorage.getItem(`fs:${path}`);
    if (stored !== null) return stored;
    throw new Error(`Fichier introuvable: ${path}`);
  },

  async writeTextFile(path, content) {
    if (isTauri()) {
      return await invoke('write_text_file', { path, content });
    }
    localStorage.setItem(`fs:${path}`, content);
  },

  async readFileBase64(path) {
    if (isTauri()) {
      return await invoke('read_file_base64', { path });
    }
    if (window.__droopy_mock_files?.[path]) {
      const buffer = await window.__droopy_mock_files[path].arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    const stored = localStorage.getItem(`fs_b64:${path}`);
    if (stored) return stored;
    throw new Error(`Fichier binaire introuvable: ${path}`);
  },

  async writeFileBase64(path, dataBase64) {
    if (isTauri()) {
      return await invoke('write_file_base64', { path, dataBase64 });
    }
    localStorage.setItem(`fs_b64:${path}`, dataBase64);
  },

  async checkExists(path) {
    if (isTauri()) {
      return await invoke('check_exists', { path });
    }
    if (window.__droopy_mock_files?.[path]) return true;
    return localStorage.getItem(`fs:${path}`) !== null || localStorage.getItem(`dir:${path}`) !== null;
  },

  async createDir(path) {
    if (isTauri()) {
      return await invoke('create_dir', { path });
    }
    localStorage.setItem(`dir:${path}`, 'true');
  },

  async listSubdirs(path) {
    if (isTauri()) {
      return await invoke('list_subdirs', { path });
    }
    const prefix = `dir:${path}/`;
    const dirs = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(prefix)) {
        const sub = k.slice(prefix.length).split('/')[0];
        if (sub) dirs.add(sub);
      }
    }
    return Array.from(dirs).sort();
  },

  async listFiles(path) {
    if (isTauri()) {
      return await invoke('list_files', { path });
    }
    const prefix = `fs:${path}/`;
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(prefix)) {
        const sub = k.slice(prefix.length).split('/')[0];
        if (sub) files.push(sub);
      }
    }
    return files.sort();
  },

  async copyFile(src, dst) {
    if (isTauri()) {
      return await invoke('copy_file', { src, dst });
    }
    const content = await this.readTextFile(src).catch(() => null);
    if (content !== null) {
      await this.writeTextFile(dst, content);
      return;
    }
    const b64 = await this.readFileBase64(src);
    await this.writeFileBase64(dst, b64);
  },

  async moveFile(src, dst) {
    if (isTauri()) {
      return await invoke('move_file', { src, dst });
    }
    await this.copyFile(src, dst);
    await this.deleteFile(src);
  },

  async deleteFile(path) {
    if (isTauri()) {
      return await invoke('delete_file', { path });
    }
    localStorage.removeItem(`fs:${path}`);
    localStorage.removeItem(`fs_b64:${path}`);
  },

  async deleteDir(path) {
    if (isTauri()) {
      return await invoke('delete_dir', { path });
    }
    localStorage.removeItem(`dir:${path}`);
  },

  async copyToClipboard(text, html = null) {
    if (isTauri()) {
      try {
        await invoke('copy_to_clipboard', { text, html: html || null });
        return;
      } catch (e) {
        console.warn('Native clipboard failed, falling back to navigator.clipboard:', e);
      }
    }
    if (navigator?.clipboard?.write && html) {
      try {
        const textBlob = new Blob([text], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
        return;
      } catch (err) {
        console.warn('HTML clipboard write failed, fallback to writeText:', err);
      }
    }
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  },
};
