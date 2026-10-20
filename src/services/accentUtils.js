/**
 * Utilitaires pour le traitement des chaînes de caractères,
 * suppression des accents et sécurisation des noms de fichiers/dossiers.
 */

export function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae');
}

/**
 * Nettoie un nom pour qu'il ne contienne que des caractères alphanumériques
 * autorisés dans un nom de dossier/fichier, sans accents ni caractères spéciaux.
 */
export function sanitizeFolderName(str) {
  if (!str) return '';
  return removeAccents(str)
    .replace(/[<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise un nom d'élève: NOM Prénom sans accents
 */
export function normalizeStudentName(name) {
  if (!name) return '';
  return sanitizeFolderName(name);
}

/**
 * Normalise le genre en 'M' ou 'F'
 */
export function normalizeGender(val) {
  if (!val) return 'M';
  const clean = val.toString().trim().toUpperCase();
  if (clean === 'F' || clean === 'FILLE' || clean === 'FEMME') return 'F';
  return 'M'; // 'M', 'G', 'GARCON', 'HOMME' -> 'M'
}
