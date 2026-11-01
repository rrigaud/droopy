import { invoke } from '@tauri-apps/api/core';
import { storage } from './storage.js';
import { isTauri, nativeFs } from './fs.js';
import { sanitizeFolderName } from './accentUtils.js';

/**
 * Génère une chaîne aléatoire cryptographique pour le verifier PKCE (RFC 7636).
 * Cette chaîne sert de secret temporaire généré sur le Mac et n'est jamais stockée sur un serveur.
 * 
 * @param {number} [length=64] - Longueur de la chaîne en caractères.
 * @returns {string} Code verifier au format ASCII URL-safe.
 */
function generateCodeVerifier(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

/**
 * Calcule l'empreinte SHA-256 du code verifier encodée en Base64-URL (Code Challenge).
 * Cette empreinte est transmise à Dropbox lors de la demande d'autorisation pour empêcher
 * l'interception du code d'autorisation.
 * 
 * @param {string} verifier - Le code verifier d'origine.
 * @returns {Promise<string>} Le challenge Base64-URL sans padding '='.
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Port et point d'accès du serveur local de capture OAuth démarré en Rust */
const REDIRECT_URI = 'http://localhost:52478/oauth/callback';

/** Cache mémoire de l'Access Token pour éviter les requêtes de rafraîchissement superflues */
let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Service de communication avec l'API officielle de Dropbox v2.
 * 
 * Gère de manière autonome :
 * - L'authentification OAuth 2.0 PKCE sans secret d'application.
 * - Le rafraîchissement silencieux des jetons d'accès expirés.
 * - La résolution du chemin relatif du dossier Source dans l'arborescence Dropbox.
 * - La vérification en masse de l'existence des dossiers élèves en ligne.
 * - La création automatique des liens partagés en lecture seule.
 */
export const dropboxService = {
  /**
   * Déclenche le flux d'autorisation OAuth 2.0 PKCE pour associer le compte Dropbox de l'enseignant.
   * Démarre un serveur loopback temporaire sur http://localhost:52478, ouvre le navigateur par défaut,
   * capture le code de redirection et l'échange contre un Refresh Token persistant.
   * 
   * @param {string} appKey - L'App Key Dropbox créée par l'utilisateur dans la console développeur.
   * @returns {Promise<{success: boolean, email: string, name: string}>} Profil de l'utilisateur connecté.
   * @throws {Error} Si l'App Key est invalide ou si l'utilisateur annule l'opération.
   */
  async connectAccount(appKey) {
    if (!appKey || !appKey.trim()) {
      throw new Error('Veuillez renseigner votre App Key Dropbox.');
    }

    const cleanAppKey = appKey.trim();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    // URL officielle de connexion Dropbox avec token_access_type=offline pour obtenir un refresh_token
    const authUrl =
      `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(cleanAppKey)}` +
      `&response_type=code` +
      `&token_access_type=offline` +
      `&code_challenge=${encodeURIComponent(challenge)}` +
      `&code_challenge_method=S256` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    let code = null;

    if (isTauri()) {
      // Démarre le serveur d'écoute local en Rust et ouvre le navigateur
      code = await invoke('start_dropbox_oauth_listener', { authUrl });
    } else {
      // Fallback web (pour tests hors application de bureau)
      window.open(authUrl, '_blank');
      code = window.prompt('Collez le code d\'autorisation Dropbox reçu dans l\'URL :');
      if (!code) throw new Error('Connexion annulée.');
    }

    // Échange du code d'autorisation contre les jetons (Access Token & Refresh Token)
    const tokenParams = new URLSearchParams();
    tokenParams.append('code', code.trim());
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('client_id', cleanAppKey);
    tokenParams.append('code_verifier', verifier);
    tokenParams.append('redirect_uri', REDIRECT_URI);

    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      const msg = errJson.error_description || errJson.error || tokenRes.statusText;
      throw new Error(`Échec échange de jeton Dropbox: ${msg}`);
    }

    const tokenData = await tokenRes.json();
    const refreshToken = tokenData.refresh_token;
    const accessToken = tokenData.access_token;

    if (!refreshToken) {
      throw new Error('Aucun Refresh Token reçu de Dropbox. Vérifiez que token_access_type=offline est bien autorisé.');
    }

    // Récupération des informations de profil utilisateur connecté
    let accountEmail = '';
    let accountName = '';

    try {
      const accountRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (accountRes.ok) {
        const accountData = await accountRes.json();
        accountEmail = accountData.email || '';
        accountName = accountData.name?.display_name || '';
      }
    } catch (_) {}

    // Sauvegarde sécurisée et persistante dans le stockage local du Mac
    storage.setDropboxAppKey(cleanAppKey);
    storage.setDropboxRefreshToken(refreshToken);
    storage.setDropboxAccountEmail(accountEmail);
    storage.setDropboxAccountName(accountName);

    cachedAccessToken = accessToken;
    // Marge de sécurité de 60 secondes avant l'expiration déclarée par Dropbox
    tokenExpiresAt = Date.now() + (tokenData.expires_in || 14400) * 1000 - 60000;

    return {
      success: true,
      email: accountEmail,
      name: accountName,
    };
  },

  /**
   * Délivre un jeton d'accès (Access Token) valide pour les appels d'API.
   * Si le jeton en mémoire a expiré, le rafraîchit automatiquement et de manière transparente
   * auprès de l'API Dropbox grâce au Refresh Token.
   * 
   * @returns {Promise<string>} Le jeton Bearer valide.
   * @throws {Error} Si l'utilisateur n'a pas encore connecté son compte Dropbox.
   */
  async getValidAccessToken() {
    const appKey = storage.getDropboxAppKey();
    const refreshToken = storage.getDropboxRefreshToken();

    if (!appKey || !refreshToken) {
      throw new Error('Compte Dropbox non connecté. Rendez-vous dans les Paramètres.');
    }

    // Réutilisation du jeton en mémoire s'il est encore valide
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
      return cachedAccessToken;
    }

    // Rafraîchissement automatique auprès du serveur de jetons Dropbox
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', appKey);

    const refreshRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!refreshRes.ok) {
      const errJson = await refreshRes.json().catch(() => ({}));
      const msg = errJson.error_description || errJson.error || refreshRes.statusText;
      throw new Error(`Impossible de rafraîchir le jeton Dropbox (${msg}). Veuillez reconnecter votre compte.`);
    }

    const data = await refreshRes.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 14400) * 1000 - 60000;

    return cachedAccessToken;
  },

  /**
   * Récupère le nom et l'email du compte Dropbox actuellement associé.
   * @returns {Promise<{name: string, email: string}>}
   */
  async fetchAccountInfo() {
    const token = await this.getValidAccessToken();
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Impossible de récupérer les informations du compte Dropbox.');
    }

    const data = await res.json();
    const email = data.email || '';
    const name = data.name?.display_name || '';

    storage.setDropboxAccountEmail(email);
    storage.setDropboxAccountName(name);

    return { name, email };
  },

  /**
   * Analyse si le dossier Source est situé dans l'arborescence Dropbox locale de l'ordinateur
   * et détermine son chemin relatif pour l'API Dropbox.
   * Gère notamment le lien symbolique spécifique de macOS :
   * `~/Library/CloudStorage/Dropbox` <-> `~/Dropbox`.
   * 
   * @param {string} sourceFolder - Chemin absolu du dossier Source local.
   * @returns {Promise<{inDropbox: boolean, relativePath: string, dropboxRoot: string}>}
   */
  async getSourceFolderDropboxInfo(sourceFolder) {
    if (!sourceFolder) {
      return { inDropbox: false, relativePath: '', dropboxRoot: '' };
    }

    const cleanSource = sourceFolder.replace(/\/+$/, '');
    const dropboxRoot = await nativeFs.getDropboxRoot();

    if (!dropboxRoot) {
      return { inDropbox: false, relativePath: '', dropboxRoot: '' };
    }

    const cleanRoot = dropboxRoot.replace(/\/+$/, '');

    // Gestion des alias et symlinks sous macOS CloudStorage
    const candidateRoots = new Set([cleanRoot]);

    if (cleanRoot.includes('/Library/CloudStorage/Dropbox')) {
      candidateRoots.add(cleanRoot.replace('/Library/CloudStorage/Dropbox', '/Dropbox'));
    }
    if (cleanRoot.endsWith('/Dropbox') && !cleanRoot.includes('/Library/CloudStorage/')) {
      candidateRoots.add(cleanRoot.replace(/\/Dropbox$/, '/Library/CloudStorage/Dropbox'));
    }

    for (const root of candidateRoots) {
      if (cleanSource === root || cleanSource.startsWith(root + '/')) {
        let rel = cleanSource.slice(root.length) || '';
        if (rel && !rel.startsWith('/')) {
          rel = '/' + rel;
        }
        return {
          inDropbox: true,
          relativePath: rel,
          dropboxRoot: cleanRoot,
        };
      }
    }

    return { inDropbox: false, relativePath: '', dropboxRoot: cleanRoot };
  },

  /**
   * Contrôle en une seule requête groupée (`files/list_folder`) l'état des dossiers élèves sur Dropbox :
   * - Vérifie si le sous-dossier existe physiquement dans le cloud (`isDropboxFolder`).
   * - Vérifie si un lien public est actif (`isShared`).
   * - Renseigne une explication textuelle claire (`dropboxStatusReason`).
   * 
   * @param {string} sourceFolder - Dossier Source local.
   * @param {Array<Object>} students - Liste des élèves à inspecter.
   * @returns {Promise<Array<Object>>} Liste des élèves annotée avec les statuts réels.
   */
  async checkStudentsDropboxStatus(sourceFolder, students) {
    if (!students || !students.length) return students;

    const isConnected = storage.isDropboxConnected();
    const sourceInfo = await this.getSourceFolderDropboxInfo(sourceFolder);

    // Cas 1 : Compte non configuré ou dossier Source situé hors du dossier Dropbox
    if (!isConnected || !sourceInfo.inDropbox) {
      return students.map((s) => ({
        ...s,
        isDropboxFolder: false,
        isShared: false,
        dropboxStatusReason: !isConnected
          ? 'Dropbox non connecté dans les Paramètres'
          : 'Dossier Source hors de votre dossier Dropbox',
      }));
    }

    // Cas 2 : Connecté ET dossier Source bien situé dans Dropbox
    try {
      const token = await this.getValidAccessToken();
      const rawPath = `${sourceInfo.relativePath}/Evaluations/Eleves`;
      const elevesDropboxPath = ('/' + rawPath).replace(/\/+/g, '/').replace(/\/+$/, '');

      // Requête récursive sur le dossier Evaluations/Eleves pour collecter tous les dossiers existants
      const listRes = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: elevesDropboxPath,
          recursive: true,
          limit: 2000,
        }),
      });

      const existingFolders = new Set();

      if (listRes.ok) {
        const listData = await listRes.json();
        const entries = listData.entries || [];
        entries.forEach((e) => {
          if (e['.tag'] === 'folder' && e.path_lower) {
            existingFolders.add(e.path_lower);
          }
        });
      } else {
        const errJson = await listRes.json().catch(() => ({}));
        console.warn('Dropbox list_folder non-ok:', listRes.status, errJson);
      }

      return students.map((s) => {
        const cleanClass = sanitizeFolderName(s.classe || '');
        const cleanName = sanitizeFolderName(s.name || '');
        const expectedPath = `${elevesDropboxPath}/${cleanClass}/${cleanName}`.toLowerCase();

        const existsOnDropbox = existingFolders.has(expectedPath);
        const hasUrl = Boolean(s.urlDropbox && s.urlDropbox.startsWith('https://www.dropbox.com/'));

        // Le partage n'est actif QUE si le dossier existe sur Dropbox ET qu'il a une URL
        const isShared = existsOnDropbox && hasUrl;

        return {
          ...s,
          isDropboxFolder: existsOnDropbox,
          isShared,
          dropboxStatusReason: existsOnDropbox
            ? (isShared ? 'Dossier présent et partagé' : 'Dossier présent mais partage non activé')
            : 'Dossier non trouvé sur Dropbox',
        };
      });
    } catch (e) {
      console.warn('Erreur vérification Dropbox list_folder:', e);
      return students.map((s) => ({
        ...s,
        isDropboxFolder: false,
        isShared: false,
        dropboxStatusReason: 'Impossible de contacter Dropbox',
      }));
    }
  },

  /**
   * Crée ou récupère le lien de partage public en lecture seule (`access: viewer`) pour un dossier.
   * Si le lien existe déjà, interroge `sharing/list_shared_links` pour récupérer l'URL existante.
   * 
   * @param {string} dropboxFolderPath - Chemin relatif du dossier sur Dropbox (ex: /Evaluations/Eleves/4B/DUPONT_Lucas).
   * @returns {Promise<string>} URL publique de consultation Dropbox (ex: https://www.dropbox.com/scl/fo/...).
   */
  async getOrCreateSharedLink(dropboxFolderPath) {
    const token = await this.getValidAccessToken();

    const createRes = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: dropboxFolderPath,
        settings: {
          requested_visibility: 'public',
          audience: 'public',
          access: 'viewer',
        },
      }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      return data.url;
    }

    const errJson = await createRes.json().catch(() => ({}));
    const tag = errJson?.error?.['.tag'];

    // Si le lien a déjà été créé dans le passé, on le recherche et on le réutilise
    if (tag === 'shared_link_already_exists') {
      const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: dropboxFolderPath,
          direct_only: true,
        }),
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const firstLink = listData.links?.[0];
        if (firstLink?.url) {
          return firstLink.url;
        }
      }
    }

    throw new Error(errJson.error_summary || 'Échec création lien de partage Dropbox');
  },

  /**
   * Crée ou vérifie le lien de partage public du dossier "Documents" situé à la racine du dossier Source.
   * Ce dossier permet à l'enseignant de partager des cours ou fiches d'exercices communes sur le portail.
   * 
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {Promise<string>} URL du lien partagé Dropbox (ou chaîne vide si hors de Dropbox).
   */
  async ensureDocumentsSharedLink(sourceFolder) {
    if (!sourceFolder) return '';
    const isConnected = storage.isDropboxConnected();
    const sourceInfo = await this.getSourceFolderDropboxInfo(sourceFolder);

    if (!isConnected || !sourceInfo.inDropbox) {
      return '';
    }

    try {
      const docsDropboxPath = `${sourceInfo.relativePath}/Documents`;
      const link = await this.getOrCreateSharedLink(docsDropboxPath);
      if (link) {
        storage.setPortalDocumentsUrl(link);
      }
      return link;
    } catch (err) {
      console.warn('Impossible de créer le lien de partage pour Documents:', err);
      return '';
    }
  },

  /**
   * Déconnecte le compte Dropbox en révoquant le jeton d'accès auprès des serveurs Dropbox
   * et en effaçant les clés sauvegardées en local sur le Mac.
   */
  async disconnect() {
    try {
      if (cachedAccessToken) {
        await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cachedAccessToken}`,
          },
        }).catch(() => {});
      }
    } catch (_) {}

    cachedAccessToken = null;
    tokenExpiresAt = 0;
    storage.clearDropboxAuth();
  },
};
