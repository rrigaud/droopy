/**
 * Gestion du stockage local des préférences de l'application
 */

const PREF_SOURCE_FOLDER = 'droopy_source_folder';
const PREF_THEME = 'droopy_theme';
const PREF_PORTAL_URL = 'droopy_portal_url';
const PREF_DROPBOX_APP_KEY = 'droopy_dropbox_app_key';
const PREF_DROPBOX_REFRESH_TOKEN = 'droopy_dropbox_refresh_token';
const PREF_DROPBOX_EMAIL = 'droopy_dropbox_email';
const PREF_DROPBOX_NAME = 'droopy_dropbox_name';
const PREF_PORTAL_TITLE = 'droopy_portal_title';
const PREF_PORTAL_SUBTITLE = 'droopy_portal_subtitle';
const PREF_PORTAL_THEME = 'droopy_portal_theme';
const PREF_PORTAL_AVATAR = 'droopy_portal_avatar';
const PREF_PORTAL_DOCUMENTS_URL = 'droopy_portal_documents_url';

export const storage = {
  getSourceFolder() {
    return localStorage.getItem(PREF_SOURCE_FOLDER) || '';
  },

  setSourceFolder(path) {
    if (path) {
      localStorage.setItem(PREF_SOURCE_FOLDER, path.trim());
    } else {
      localStorage.removeItem(PREF_SOURCE_FOLDER);
    }
  },

  getPortalUrl() {
    return localStorage.getItem(PREF_PORTAL_URL) || '';
  },

  setPortalUrl(url) {
    if (url) {
      localStorage.setItem(PREF_PORTAL_URL, url.trim());
    } else {
      localStorage.removeItem(PREF_PORTAL_URL);
    }
  },

  getDropboxAppKey() {
    return localStorage.getItem(PREF_DROPBOX_APP_KEY) || '';
  },

  setDropboxAppKey(key) {
    if (key) {
      localStorage.setItem(PREF_DROPBOX_APP_KEY, key.trim());
    } else {
      localStorage.removeItem(PREF_DROPBOX_APP_KEY);
    }
  },

  getDropboxRefreshToken() {
    return localStorage.getItem(PREF_DROPBOX_REFRESH_TOKEN) || '';
  },

  setDropboxRefreshToken(token) {
    if (token) {
      localStorage.setItem(PREF_DROPBOX_REFRESH_TOKEN, token.trim());
    } else {
      localStorage.removeItem(PREF_DROPBOX_REFRESH_TOKEN);
    }
  },

  getDropboxAccountEmail() {
    return localStorage.getItem(PREF_DROPBOX_EMAIL) || '';
  },

  setDropboxAccountEmail(email) {
    if (email) {
      localStorage.setItem(PREF_DROPBOX_EMAIL, email.trim());
    } else {
      localStorage.removeItem(PREF_DROPBOX_EMAIL);
    }
  },

  getDropboxAccountName() {
    return localStorage.getItem(PREF_DROPBOX_NAME) || '';
  },

  setDropboxAccountName(name) {
    if (name) {
      localStorage.setItem(PREF_DROPBOX_NAME, name.trim());
    } else {
      localStorage.removeItem(PREF_DROPBOX_NAME);
    }
  },

  isDropboxConnected() {
    return !!(this.getDropboxAppKey() && this.getDropboxRefreshToken());
  },

  clearDropboxAuth() {
    localStorage.removeItem(PREF_DROPBOX_REFRESH_TOKEN);
    localStorage.removeItem(PREF_DROPBOX_EMAIL);
    localStorage.removeItem(PREF_DROPBOX_NAME);
  },

  getTheme() {
    return localStorage.getItem(PREF_THEME) || 'light';
  },

  setTheme(theme) {
    const val = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem(PREF_THEME, val);
    applyThemeToDOM(val);
  },

  getPortalTitle() {
    return localStorage.getItem(PREF_PORTAL_TITLE) || 'Espace-Eleves.fr';
  },

  setPortalTitle(title) {
    if (title) {
      localStorage.setItem(PREF_PORTAL_TITLE, title.trim());
    } else {
      localStorage.removeItem(PREF_PORTAL_TITLE);
    }
  },

  getPortalSubtitle() {
    return localStorage.getItem(PREF_PORTAL_SUBTITLE) || 'Évaluations & Documents de la classe';
  },

  setPortalSubtitle(subtitle) {
    if (subtitle) {
      localStorage.setItem(PREF_PORTAL_SUBTITLE, subtitle.trim());
    } else {
      localStorage.removeItem(PREF_PORTAL_SUBTITLE);
    }
  },

  getPortalTheme() {
    return localStorage.getItem(PREF_PORTAL_THEME) || 'emeraude';
  },

  setPortalTheme(theme) {
    const allowed = ['emeraude', 'sombre', 'clair'];
    const val = allowed.includes(theme) ? theme : 'emeraude';
    localStorage.setItem(PREF_PORTAL_THEME, val);
  },

  getPortalAvatar() {
    return localStorage.getItem(PREF_PORTAL_AVATAR) || '';
  },

  setPortalAvatar(avatarBase64) {
    if (avatarBase64) {
      localStorage.setItem(PREF_PORTAL_AVATAR, avatarBase64);
    } else {
      localStorage.removeItem(PREF_PORTAL_AVATAR);
    }
  },

  getPortalDocumentsUrl() {
    return localStorage.getItem(PREF_PORTAL_DOCUMENTS_URL) || '';
  },

  setPortalDocumentsUrl(url) {
    if (url) {
      localStorage.setItem(PREF_PORTAL_DOCUMENTS_URL, url.trim());
    } else {
      localStorage.removeItem(PREF_PORTAL_DOCUMENTS_URL);
    }
  },
};

export function applyThemeToDOM(theme) {
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('p-dark', 'dark');
  } else {
    document.documentElement.classList.remove('p-dark', 'dark');
  }
}
