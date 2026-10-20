import CryptoJS from 'crypto-js';

/**
 * Calcule le hash SHA256 d'une chaîne
 */
export function sha256(text) {
  if (!text) return '';
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}
