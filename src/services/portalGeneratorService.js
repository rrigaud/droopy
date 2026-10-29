import { nativeFs } from './fs.js';
import { storage } from './storage.js';
import { settingsService, DEFAULT_SETTINGS } from './settingsService.js';
import { dropboxService } from './dropboxService';
import { sha256 } from './cryptoService.js';
import { DEFAULT_PORTAL_ICON_B64 } from '../assets/portal-icons/defaultIconBase64.js';

/**
 * Chiffre les données d'un élève avec son mot de passe (AES-GCM 256 bits + PBKDF2)
 */
async function encryptStudentData(password, payload) {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    enc.encode(JSON.stringify(payload))
  );

  const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    s: toHex(salt),
    iv: toHex(iv),
    c: toHex(ciphertext),
  };
}

export const portalGeneratorService = {
  /**
   * Génère le dossier autonome Portail-Web dans le dossier Source
   */
  async generatePortal(sourceFolder, students = []) {
    if (!sourceFolder) {
      throw new Error('Dossier Source non spécifié.');
    }

    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const outDir = `${cleanRoot}/Portail-Web`;

    // 1. Charger les préférences de personnalisation depuis settings.json
    const settings = await settingsService.loadSettings(cleanRoot);
    const portalTitle = settings.portalTitle || DEFAULT_SETTINGS.portalTitle;
    const portalSubtitle = settings.portalSubtitle || DEFAULT_SETTINGS.portalSubtitle;
    const portalTheme = settings.portalTheme || DEFAULT_SETTINGS.portalTheme;

    // 2. Récupérer le lien de partage Dropbox pour le dossier Documents (si en ligne)
    let documentsUrl = storage.getPortalDocumentsUrl();
    try {
      const refreshedDocUrl = await dropboxService.ensureDocumentsSharedLink(cleanRoot);
      if (refreshedDocUrl) {
        documentsUrl = refreshedDocUrl;
      }
    } catch (e) {
      console.warn('Lien Documents non récupéré:', e);
    }

    // 3. Préparer les sous-dossiers dans Portail-Web
    await nativeFs.createDir(outDir);
    await nativeFs.createDir(`${outDir}/images`);
    await nativeFs.createDir(`${outDir}/images/icons`);
    await nativeFs.createDir(`${outDir}/scripts`);
    await nativeFs.createDir(`${outDir}/css`);

    // 4. Copier l'icône / avatar (Icon-portail.png ou défaut) vers images/icons/
    let iconB64 = DEFAULT_PORTAL_ICON_B64;
    try {
      const iconPath = settingsService.getPortalIconPath(cleanRoot, settings.portalIcon || 'Icon-portail.png');
      const iconExists = await nativeFs.checkExists(iconPath);
      if (iconExists) {
        iconB64 = await nativeFs.readFileBase64(iconPath);
      }
    } catch (e) {
      console.warn('Erreur lecture icône portail locale, utilisation du défaut:', e);
    }

    await nativeFs.writeFileBase64(`${outDir}/images/icons/icon-192x192.png`, iconB64);
    await nativeFs.writeFileBase64(`${outDir}/images/icons/icon-512x512.png`, iconB64);

    // 5. Chiffrer la base élèves pour data.js
    const encryptedStudents = [];
    for (const s of students) {
      if (!s.login) continue;
      const normLogin = s.login.trim().toLowerCase();
      const normPwd = (s.password || '').trim();
      const loginHash = sha256(normLogin);

      const payload = {
        name: s.name || '',
        classe: s.classe || '',
        gender: s.gender || 'M',
        dropbox: s.urlDropbox || '',
      };

      const encrypted = await encryptStudentData(normPwd, payload);
      encryptedStudents.push({
        h: loginHash,
        s: encrypted.s,
        iv: encrypted.iv,
        c: encrypted.c,
      });
    }

    // 6. Écriture de scripts/data.js
    const dataJsContent = `// Base élèves chiffrée de Droopy v5 - Chiffrement AES-GCM 256 bits
// Aucun nom ni lien Dropbox n'est visible en clair sans le mot de passe de l'élève.
const PortalData = {
  portalTitle: ${JSON.stringify(portalTitle)},
  portalSubtitle: ${JSON.stringify(portalSubtitle)},
  documentsUrl: ${JSON.stringify(documentsUrl || '')},
  students: ${JSON.stringify(encryptedStudents, null, 2)}
};
`;
    await nativeFs.writeTextFile(`${outDir}/scripts/data.js`, dataJsContent);

    // 7. Écriture de manifest.json
    const themeColors = {
      emeraude: { theme: '#50a3a2', bg: '#53e3a6' },
      sombre: { theme: '#1e1e38', bg: '#2d2b55' },
      clair: { theme: '#f8fafc', bg: '#ffffff' },
    };
    const colors = themeColors[portalTheme] || themeColors.emeraude;

    const manifestContent = JSON.stringify(
      {
        name: portalTitle,
        short_name: portalTitle,
        description: portalSubtitle,
        icons: [
          {
            src: 'images/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'images/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        start_url: './index.html',
        display: 'standalone',
        background_color: colors.bg,
        theme_color: colors.theme,
      },
      null,
      2
    );
    await nativeFs.writeTextFile(`${outDir}/manifest.json`, manifestContent);

    // 8. Écriture de sw.js (Service Worker PWA)
    const swContent = `// Service Worker minimal PWA
const CACHE_NAME = 'droopy-portal-v5';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
`;
    await nativeFs.writeTextFile(`${outDir}/sw.js`, swContent);

    // 9. Écriture de css/style.css
    const cssContent = this.generateCss(portalTheme);
    await nativeFs.writeTextFile(`${outDir}/css/style.css`, cssContent);

    // 10. Écriture de scripts/app.js
    const appJsContent = this.generateAppJs();
    await nativeFs.writeTextFile(`${outDir}/scripts/app.js`, appJsContent);

    // 11. Écriture de index.html
    const htmlContent = this.generateHtml(portalTitle, portalSubtitle, portalTheme, colors);
    await nativeFs.writeTextFile(`${outDir}/index.html`, htmlContent);

    // 12. README.txt d'instructions pour l'enseignant
    const readmeContent = `=======================================================
PORTAIL ÉLÈVES AUTONOME - DROOPY v5
=======================================================

Ce dossier contient votre portail web de connexion complet, sécurisé et prêt à l'emploi.
Il s'agit d'un site web statique qui peut être hébergé sur n'importe quel serveur ou service web :

OPTIONS D'HÉBERGEMENT POSSIBLES :

1. HÉBERGEURS STATIQUES GRATUITS (EN 1 GLISSER-DÉPOSER) :
   - Netlify Drop : Rendez-vous sur https://app.netlify.com/drop et glissez-déposez TOUT ce dossier "Portail-Web".
   - Vercel : Importez le dossier via le tableau de bord Vercel.
   - Cloudflare Pages : Glissez-déposez l'archive ou connectez votre dépôt.

2. VOTRE PROPRE NOM DE DOMAINE / SERVEUR WEB (OVH, Infomaniak, Hostinger...) :
   - Transférez simplement par FTP le contenu de ce dossier "Portail-Web" dans le répertoire public de votre serveur (ex: /public_html ou /www).
   - Vos élèves accèderont directement à votre domaine (ex: https://espace-eleves.fr).

SÉCURITÉ ET CONFIDENTIALITÉ :
- Les données des élèves (noms, classes, URLs Dropbox) sont stockées dans scripts/data.js de manière 100% chiffrée (AES-GCM 256 bits).
- Aucun élève ne peut voir ou deviner les liens de ses camarades en inspectant le code source.

APPLICATION SMARTPHONE (PWA) :
- Les élèves et parents peuvent installer ce portail directement sur leur écran d'accueil Android ou iPhone via le bouton dédié sur la page.
`;
    await nativeFs.writeTextFile(`${outDir}/README.txt`, readmeContent);

    return {
      success: true,
      path: outDir,
      studentCount: encryptedStudents.length,
      portalTitle,
      portalTheme,
    };
  },

  /**
   * Générateur de la feuille de style CSS
   */
  generateCss(theme) {
    let backgroundRule = '';
    let cardRule = '';
    let btnPrimaryRule = '';
    let isEmeraude = theme === 'emeraude';
    let isSombre = theme === 'sombre';

    if (isEmeraude) {
      backgroundRule = `background: linear-gradient(135deg, #50a3a2 0%, #53e3a6 100%); color: #ffffff;`;
      cardRule = `background: rgba(255, 255, 255, 0.92); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.5);`;
      btnPrimaryRule = `background: #50a3a2; color: #ffffff;`;
    } else if (isSombre) {
      backgroundRule = `background: linear-gradient(160deg, #1e1e38 0%, #2d2b55 50%, #1a1930 100%); color: #f8fafc;`;
      cardRule = `background: rgba(26, 25, 48, 0.9); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); color: #f8fafc; border: 1px solid rgba(139, 92, 246, 0.3);`;
      btnPrimaryRule = `background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff;`;
    } else {
      backgroundRule = `background: #f8fafc; color: #0f172a;`;
      cardRule = `background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);`;
      btnPrimaryRule = `background: #0f172a; color: #ffffff;`;
    }

    return `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
html, body {
  min-height: 100%;
  width: 100%;
}
body {
  ${backgroundRule}
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
  overflow-x: hidden;
}
.portal-container {
  width: 100%;
  max-width: 400px;
  margin: auto;
  position: relative;
  z-index: 10;
  text-align: center;
}
.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 12px;
}
.avatar-img {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
.portal-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin-bottom: 2px;
}
.portal-subtitle {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 18px;
}
.card {
  ${cardRule}
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  text-align: left;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 18px;
}
.form-group {
  margin-bottom: 14px;
}
.form-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  opacity: 0.75;
}
.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.form-input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  font-size: 14px;
  outline: none;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  transition: border-color 0.2s, box-shadow 0.2s;
}
${isSombre ? '.form-input { background: rgba(30, 29, 56, 0.8); border-color: rgba(139, 92, 246, 0.3); color: #f8fafc; }' : ''}
.form-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
.btn-toggle-pwd {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 12px;
  color: #6366f1;
  cursor: pointer;
  padding: 4px;
}
.btn-submit {
  ${btnPrimaryRule}
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-submit:hover {
  transform: translateY(-1px);
  opacity: 0.95;
}
.btn-submit:active {
  transform: translateY(0);
}
.error-box {
  display: none;
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  font-size: 12px;
  text-align: center;
  font-weight: 600;
}
.action-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s;
}
.action-btn:hover {
  transform: translateY(-2px);
}
.btn-evals {
  background: #059669;
  color: #ffffff;
}
.btn-docs {
  background: rgba(255, 255, 255, 0.95);
  color: #1e293b;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
${isSombre ? '.btn-docs { background: rgba(45, 43, 85, 0.8); color: #f8fafc; border-color: rgba(139, 92, 246, 0.3); }' : ''}
.btn-pwa {
  margin-top: 14px;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: inherit;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(8px);
}
${theme === 'clair' ? '.btn-pwa { background: #ffffff; border-color: #cbd5e1; color: #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }' : ''}
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  z-index: 100;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-box {
  background: #ffffff;
  color: #0f172a;
  border-radius: 20px;
  padding: 22px;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  text-align: left;
}
${isSombre ? '.modal-box { background: #1e1e38; color: #f8fafc; border: 1px solid #4338ca; }' : ''}
.modal-title {
  font-size: 16px;
  font-weight: 800;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-step {
  padding: 10px;
  background: #f1f5f9;
  border-radius: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.4;
}
${isSombre ? '.modal-step { background: #2d2b55; }' : ''}

${
  isEmeraude
    ? `
/* Bulles flottantes pour le thème Émeraude */
.bg-bubbles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.bg-bubbles li {
  position: absolute;
  list-style: none;
  display: block;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.18);
  bottom: -160px;
  animation: square 25s infinite linear;
  border-radius: 8px;
}
.bg-bubbles li:nth-child(1) { left: 10%; width: 30px; height: 30px; animation-duration: 20s; }
.bg-bubbles li:nth-child(2) { left: 20%; width: 70px; height: 70px; animation-delay: 2s; animation-duration: 17s; }
.bg-bubbles li:nth-child(3) { left: 25%; width: 25px; height: 25px; animation-delay: 4s; }
.bg-bubbles li:nth-child(4) { left: 40%; width: 50px; height: 50px; animation-duration: 22s; background-color: rgba(255, 255, 255, 0.25); }
.bg-bubbles li:nth-child(5) { left: 70%; width: 35px; height: 35px; }
.bg-bubbles li:nth-child(6) { left: 80%; width: 90px; height: 90px; animation-delay: 3s; background-color: rgba(255, 255, 255, 0.2); }
.bg-bubbles li:nth-child(7) { left: 32%; width: 110px; height: 110px; animation-delay: 7s; }
.bg-bubbles li:nth-child(8) { left: 55%; width: 20px; height: 20px; animation-delay: 15s; animation-duration: 35s; }
.bg-bubbles li:nth-child(9) { left: 25%; width: 15px; height: 15px; animation-delay: 2s; animation-duration: 35s; background-color: rgba(255, 255, 255, 0.3); }
.bg-bubbles li:nth-child(10) { left: 90%; width: 120px; height: 120px; animation-delay: 11s; }
@keyframes square {
  0% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  100% { transform: translateY(-1100px) rotate(600deg); opacity: 0; }
}
`
    : ''
}
`;
  },

  /**
   * Générateur de scripts/app.js pour le portail autonome
   */
  generateAppJs() {
    return `// Logique d'authentification et d'installation PWA
(function() {
  'use strict';

  // Sélecteurs
  const formLogin = document.getElementById('formLogin');
  const dashStudent = document.getElementById('dashStudent');
  const inputLogin = document.getElementById('inputLogin');
  const inputPassword = document.getElementById('inputPassword');
  const btnLogin = document.getElementById('btnLogin');
  const btnTogglePwd = document.getElementById('btnTogglePwd');
  const errorBox = document.getElementById('errorBox');
  const studentNameEl = document.getElementById('studentName');
  const studentClassEl = document.getElementById('studentClass');
  const linkDropbox = document.getElementById('linkDropbox');
  const linkDocs = document.getElementById('linkDocs');
  const btnLogout = document.getElementById('btnLogout');
  const btnPwa = document.getElementById('btnPwa');
  const modalPwa = document.getElementById('modalPwa');
  const btnCloseModal = document.getElementById('btnCloseModal');

  // Afficher / Masquer mot de passe
  if (btnTogglePwd) {
    btnTogglePwd.addEventListener('click', () => {
      const isPwd = inputPassword.type === 'password';
      inputPassword.type = isPwd ? 'text' : 'password';
      btnTogglePwd.innerText = isPwd ? 'Masquer' : 'Afficher';
    });
  }

  // Déchiffrement AES-GCM avec Web Crypto API
  async function decryptPayload(password, saltHex, ivHex, ciphertextHex) {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const fromHex = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));

    const salt = fromHex(saltHex);
    const iv = fromHex(ivHex);
    const ciphertext = fromHex(ciphertextHex);

    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 10000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      ciphertext
    );

    return JSON.parse(dec.decode(decrypted));
  }

  // SHA256 avec Web Crypto API
  async function sha256(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Connexion de l'élève
  async function handleLogin() {
    errorBox.style.display = 'none';
    const login = inputLogin.value.trim().toLowerCase();
    const password = inputPassword.value.trim();

    if (!login || !password) {
      errorBox.innerText = 'Veuillez renseigner votre identifiant et votre mot de passe.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      btnLogin.disabled = true;
      btnLogin.innerText = 'Vérification...';

      const hashedLogin = await sha256(login);
      const studentEntry = (PortalData.students || []).find((s) => s.h === hashedLogin);

      if (!studentEntry) {
        throw new Error('Identifiant ou mot de passe incorrect.');
      }

      // Tentative de déchiffrement avec le mot de passe fourni
      const student = await decryptPayload(password, studentEntry.s, studentEntry.iv, studentEntry.c);

      // Succès : affichage de l'espace élève
      studentNameEl.innerText = student.name;
      studentClassEl.innerText = 'Classe : ' + student.classe;

      if (student.dropbox) {
        linkDropbox.href = student.dropbox;
        linkDropbox.style.display = 'flex';
      } else {
        linkDropbox.style.display = 'none';
      }

      if (PortalData.documentsUrl) {
        linkDocs.href = PortalData.documentsUrl;
        linkDocs.style.display = 'flex';
      } else {
        linkDocs.style.display = 'none';
      }

      formLogin.style.display = 'none';
      dashStudent.style.display = 'block';
      if (btnPwa) btnPwa.style.display = 'none';
    } catch (err) {
      errorBox.innerText = 'Identifiant ou mot de passe incorrect.';
      errorBox.style.display = 'block';
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<span>Ouvrir mon dossier</span> <span>→</span>';
    }
  }

  btnLogin.addEventListener('click', handleLogin);
  inputPassword.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  inputLogin.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') inputPassword.focus();
  });

  btnLogout.addEventListener('click', () => {
    dashStudent.style.display = 'none';
    formLogin.style.display = 'block';
    inputPassword.value = '';
    if (btnPwa && !isStandalone) btnPwa.style.display = 'inline-flex';
  });

  // ==========================================
  // Gestion PWA (Android 1-clic & Guide iOS)
  // ==========================================
  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if (isStandalone && btnPwa) {
    btnPwa.style.display = 'none';
  }

  // Interception de l'événement natif Android / Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnPwa && !isStandalone) {
      btnPwa.style.display = 'inline-flex';
    }
  });

  if (btnPwa) {
    btnPwa.addEventListener('click', () => {
      if (deferredPrompt) {
        // Déclenchement 1-clic sous Android / Chrome
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          if (choice.outcome === 'accepted') {
            btnPwa.style.display = 'none';
          }
          deferredPrompt = null;
        });
      } else {
        // Affichage de la boîte d'aide illustrée (iOS ou fallback)
        openPwaModal();
      }
    });
  }

  function openPwaModal() {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = isIos && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|Instagram|WhatsApp|FB/.test(navigator.userAgent);

    const iosContent = document.getElementById('modalIosContent');
    const genericContent = document.getElementById('modalGenericContent');

    if (isIos) {
      iosContent.style.display = 'block';
      genericContent.style.display = 'none';
      const webviewNotice = document.getElementById('iosWebviewNotice');
      if (webviewNotice) {
        webviewNotice.style.display = isSafari ? 'none' : 'block';
      }
    } else {
      iosContent.style.display = 'none';
      genericContent.style.display = 'block';
    }

    modalPwa.style.display = 'flex';
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      modalPwa.style.display = 'none';
    });
  }

  modalPwa.addEventListener('click', (e) => {
    if (e.target === modalPwa) modalPwa.style.display = 'none';
  });

  // Enregistrement du Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
`;
  },

  /**
   * Générateur de index.html pour le portail autonome
   */
  generateHtml(title, subtitle, theme, colors) {
    const isEmeraude = theme === 'emeraude';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>

  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="${colors.theme}">

  <!-- Support iOS Safari PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${title}">
  <link rel="apple-touch-icon" href="images/icons/icon-192x192.png">

  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  ${
    isEmeraude
      ? `
  <ul class="bg-bubbles">
    <li></li><li></li><li></li><li></li><li></li>
    <li></li><li></li><li></li><li></li><li></li>
  </ul>
  `
      : ''
  }

  <div class="portal-container">
    <div class="avatar-wrapper">
      <img src="images/icons/icon-192x192.png" alt="Avatar" class="avatar-img">
    </div>

    <h1 class="portal-title">${title}</h1>
    <p class="portal-subtitle">${subtitle}</p>

    <!-- FORMULAIRE DE CONNEXION -->
    <div id="formLogin" class="card">
      <h2 class="card-title">Bienvenue sur votre espace</h2>

      <div class="form-group">
        <label class="form-label" for="inputLogin">Identifiant élève</label>
        <div class="input-wrapper">
          <input
            type="text"
            id="inputLogin"
            class="form-input"
            placeholder="ex: prenom.nom"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
          >
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="inputPassword">Mot de passe</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="inputPassword"
            class="form-input"
            placeholder="ex: kiwi-bleu"
            autocapitalize="none"
          >
          <button type="button" id="btnTogglePwd" class="btn-toggle-pwd">Afficher</button>
        </div>
      </div>

      <button type="button" id="btnLogin" class="btn-submit">
        <span>Ouvrir mon dossier</span>
        <span>→</span>
      </button>

      <div id="errorBox" class="error-box"></div>
    </div>

    <!-- ESPACE ÉLÈVE (DÉVERROUILLÉ) -->
    <div id="dashStudent" class="card" style="display: none;">
      <div style="font-size: 11px; font-weight: 800; color: #059669; margin-bottom: 6px; text-transform: uppercase;">
        ● Dossier sécurisé ouvert
      </div>
      <h2 id="studentName" style="font-size: 18px; font-weight: 800; margin-bottom: 2px;"></h2>
      <p id="studentClass" style="font-size: 12px; opacity: 0.75; margin-bottom: 20px;"></p>

      <div>
        <a id="linkDropbox" href="#" target="_blank" class="action-btn btn-evals">
          <span>📂 Mes copies & évaluations</span>
          <span>↗</span>
        </a>

        <a id="linkDocs" href="#" target="_blank" class="action-btn btn-docs">
          <span>📚 Documents (Cours, DM...)</span>
          <span>↗</span>
        </a>
      </div>

      <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11px; opacity: 0.6;">Session sécurisée</span>
        <button type="button" id="btnLogout" style="background: none; border: none; color: #dc2626; font-size: 12px; font-weight: 700; cursor: pointer;">
          Se déconnecter
        </button>
      </div>
    </div>

    <!-- BOUTON D'INSTALLATION SMARTPHONE PWA -->
    <div>
      <button type="button" id="btnPwa" class="btn-pwa">
        <span>📲</span>
        <span>Installer sur l'écran d'accueil</span>
      </button>
    </div>
  </div>

  <!-- MODAL D'AIDE INSTALLATION SMARTPHONE -->
  <div id="modalPwa" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-title">
        <span>📲 Installer sur mon smartphone</span>
        <button type="button" id="btnCloseModal" style="background: none; border: none; font-size: 16px; cursor: pointer; color: inherit;">✕</button>
      </div>

      <!-- Guide iOS (iPhone / iPad) -->
      <div id="modalIosContent">
        <div id="iosWebviewNotice" style="display: none; padding: 8px; border-radius: 8px; background: #fef3c7; border: 1px solid #fde047; color: #854d0e; font-size: 11px; margin-bottom: 10px;">
          ⚠️ Vous êtes dans un navigateur interne : touchez l'icône 🧭 ou <strong>Safari</strong> en bas à droite pour ouvrir la page dans Safari.
        </div>
        <p style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">Pour créer l'icône sur votre écran d'accueil iPhone :</p>
        <div class="modal-step">
          1. Touchez le bouton <strong>Partager</strong> <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">⎋ / [ ↑ ]</kbd> en bas de Safari.
        </div>
        <div class="modal-step">
          2. Faites défiler vers le bas et touchez <strong>« Sur l'écran d'accueil »</strong> <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">➕</kbd>.
        </div>
      </div>

      <!-- Guide Générique / Android -->
      <div id="modalGenericContent" style="display: none;">
        <p style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">Pour ajouter ce portail à votre écran d'accueil :</p>
        <div class="modal-step">
          1. Touchez le menu <kbd style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">⋮</kbd> en haut à droite de votre navigateur.
        </div>
        <div class="modal-step">
          2. Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
        </div>
      </div>
    </div>
  </div>

  <script src="scripts/data.js"></script>
  <script src="scripts/app.js"></script>
</body>
</html>
`;
  },
};
