import { nativeFs } from './fs.js';
import { storage } from './storage.js';
import { DEFAULT_PORTAL_ICON_B64 } from '../assets/portal-icons/defaultIconBase64.js';

export const DEFAULT_SETTINGS = {
  portalUrl: '',
  portalTitle: 'Portail Élèves',
  portalSubtitle: 'Évaluations & Documents de la classe',
  portalTheme: 'emeraude',
  portalIcon: 'Icon-portail.png',
  portalLastGeneratedAt: null,
  studentsLastSyncedAt: null,
  studentsLastModifiedAt: null,
};

export const settingsService = {
  getSettingsFilePath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/settings.json`;
  },

  getPortalIconPath(sourceFolder, filename = 'Icon-portail.png') {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/${filename}`;
  },

  /**
   * Assure la présence de settings.json et Icon-portail.png dans le dossier Source
   */
  async ensureSettings(sourceFolder) {
    if (!sourceFolder) return DEFAULT_SETTINGS;
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const settingsPath = this.getSettingsFilePath(cleanRoot);
    const iconPath = this.getPortalIconPath(cleanRoot);

    // 1. Vérification et création de Icon-portail.png
    try {
      const iconExists = await nativeFs.checkExists(iconPath);
      if (!iconExists) {
        await nativeFs.writeFileBase64(iconPath, DEFAULT_PORTAL_ICON_B64);
      }
    } catch (e) {
      console.warn('Impossible d\'initialiser Icon-portail.png:', e);
    }

    // 2. Vérification et création de settings.json
    try {
      const settingsExists = await nativeFs.checkExists(settingsPath);
      if (!settingsExists) {
        const initial = {
          ...DEFAULT_SETTINGS,
          portalUrl: storage.getPortalUrl() || DEFAULT_SETTINGS.portalUrl,
        };
        await nativeFs.writeTextFile(settingsPath, JSON.stringify(initial, null, 2));
        return initial;
      }
    } catch (e) {
      console.warn('Impossible d\'initialiser settings.json:', e);
    }

    return null;
  },

  /**
   * Charge settings.json depuis le dossier Source, avec fallback et synchronisation dans storage
   */
  async loadSettings(sourceFolder) {
    if (!sourceFolder) return { ...DEFAULT_SETTINGS, iconDataUrl: '' };
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const settingsPath = this.getSettingsFilePath(cleanRoot);

    await this.ensureSettings(cleanRoot);

    let parsed = { ...DEFAULT_SETTINGS };
    try {
      const raw = await nativeFs.readTextFile(settingsPath);
      parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('Erreur lecture settings.json, utilisation des valeurs par défaut:', e);
    }

    // Lecture de l'icône locale Icon-portail.png pour la prévisualisation dans l'interface
    let iconDataUrl = '';
    const iconPath = this.getPortalIconPath(cleanRoot, parsed.portalIcon || 'Icon-portail.png');
    try {
      const exists = await nativeFs.checkExists(iconPath);
      if (exists) {
        const b64 = await nativeFs.readFileBase64(iconPath);
        iconDataUrl = `data:image/png;base64,${b64}`;
      } else {
        iconDataUrl = `data:image/png;base64,${DEFAULT_PORTAL_ICON_B64}`;
      }
    } catch (_) {
      iconDataUrl = `data:image/png;base64,${DEFAULT_PORTAL_ICON_B64}`;
    }

    // Synchronisation dans le cache storage local
    storage.setPortalUrl(parsed.portalUrl || '');
    storage.setPortalTitle(parsed.portalTitle || DEFAULT_SETTINGS.portalTitle);
    storage.setPortalSubtitle(parsed.portalSubtitle || DEFAULT_SETTINGS.portalSubtitle);
    storage.setPortalTheme(parsed.portalTheme || DEFAULT_SETTINGS.portalTheme);
    storage.setPortalAvatar(iconDataUrl);

    return {
      ...parsed,
      iconDataUrl,
    };
  },

  /**
   * Enregistre settings.json dans le dossier Source et met à jour storage
   */
  async saveSettings(sourceFolder, newSettings) {
    if (!sourceFolder) return;
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const settingsPath = this.getSettingsFilePath(cleanRoot);

    let current = { ...DEFAULT_SETTINGS };
    try {
      const raw = await nativeFs.readTextFile(settingsPath);
      current = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (_) {}

    const merged = {
      ...current,
      ...newSettings,
      portalUrl: newSettings.portalUrl !== undefined ? newSettings.portalUrl.trim() : (current.portalUrl || DEFAULT_SETTINGS.portalUrl),
      portalTitle: newSettings.portalTitle !== undefined ? newSettings.portalTitle.trim() : (current.portalTitle || DEFAULT_SETTINGS.portalTitle),
      portalSubtitle: newSettings.portalSubtitle !== undefined ? newSettings.portalSubtitle.trim() : (current.portalSubtitle || DEFAULT_SETTINGS.portalSubtitle),
      portalTheme: newSettings.portalTheme || current.portalTheme || DEFAULT_SETTINGS.portalTheme,
      portalIcon: newSettings.portalIcon || current.portalIcon || DEFAULT_SETTINGS.portalIcon,
      portalLastGeneratedAt: newSettings.portalLastGeneratedAt !== undefined ? newSettings.portalLastGeneratedAt : current.portalLastGeneratedAt,
      studentsLastSyncedAt: newSettings.studentsLastSyncedAt !== undefined ? newSettings.studentsLastSyncedAt : current.studentsLastSyncedAt,
      studentsLastModifiedAt: newSettings.studentsLastModifiedAt !== undefined ? newSettings.studentsLastModifiedAt : current.studentsLastModifiedAt,
    };

    await nativeFs.writeTextFile(settingsPath, JSON.stringify(merged, null, 2));

    // Mise à jour du cache storage
    storage.setPortalUrl(merged.portalUrl);
    storage.setPortalTitle(merged.portalTitle);
    storage.setPortalSubtitle(merged.portalSubtitle);
    storage.setPortalTheme(merged.portalTheme);

    return merged;
  },

  async recordStudentsModified(sourceFolder) {
    return await this.saveSettings(sourceFolder, {
      studentsLastModifiedAt: new Date().toISOString(),
    });
  },

  async recordStudentsSynced(sourceFolder) {
    const now = new Date().toISOString();
    return await this.saveSettings(sourceFolder, {
      studentsLastSyncedAt: now,
      studentsLastModifiedAt: now,
    });
  },

  async recordPortalGenerated(sourceFolder) {
    return await this.saveSettings(sourceFolder, {
      portalLastGeneratedAt: new Date().toISOString(),
    });
  },

  /**
   * Enregistre une nouvelle icône personnalisée dans ${sourceFolder}/Icon-portail.png
   * @param {string} sourceFolder
   * @param {string} dataUrl - chaîne base64 (avec ou sans préfixe data:image/...)
   */
  async savePortalIcon(sourceFolder, dataUrl) {
    if (!sourceFolder || !dataUrl) return;
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const iconPath = this.getPortalIconPath(cleanRoot, 'Icon-portail.png');

    const cleanB64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    await nativeFs.writeFileBase64(iconPath, cleanB64);

    // Met à jour settings.json si nécessaire
    const current = await this.loadSettings(cleanRoot);
    current.portalIcon = 'Icon-portail.png';
    await this.saveSettings(cleanRoot, current);

    const fullDataUrl = `data:image/png;base64,${cleanB64}`;
    storage.setPortalAvatar(fullDataUrl);
    return fullDataUrl;
  },

  /**
   * Rétablit l'icône manga par défaut dans ${sourceFolder}/Icon-portail.png
   */
  async resetPortalIcon(sourceFolder) {
    if (!sourceFolder) return;
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const iconPath = this.getPortalIconPath(cleanRoot, 'Icon-portail.png');

    await nativeFs.writeFileBase64(iconPath, DEFAULT_PORTAL_ICON_B64);

    const current = await this.loadSettings(cleanRoot);
    current.portalIcon = 'Icon-portail.png';
    await this.saveSettings(cleanRoot, current);

    const fullDataUrl = `data:image/png;base64,${DEFAULT_PORTAL_ICON_B64}`;
    storage.setPortalAvatar(fullDataUrl);
    return fullDataUrl;
  },
};
