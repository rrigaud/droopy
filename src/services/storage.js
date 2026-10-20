/**
 * Gestion du stockage local des préférences de l'application
 */

const PREF_SOURCE_FOLDER = 'droopy_source_folder';
const PREF_THEME = 'droopy_theme';

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

  getTheme() {
    return localStorage.getItem(PREF_THEME) || 'light';
  },

  setTheme(theme) {
    const val = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem(PREF_THEME, val);
    applyThemeToDOM(val);
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
