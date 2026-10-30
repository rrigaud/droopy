import { invoke } from '@tauri-apps/api/core';
import { storage } from './storage.js';
import { isTauri, nativeFs } from './fs.js';
import { sanitizeFolderName } from './accentUtils.js';

function generateCodeVerifier(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => charset[byte % charset.length]).join('');
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const REDIRECT_URI = 'http://localhost:52478/oauth/callback';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

export const dropboxService = {
  /**
   * Lance le flux d'autorisation OAuth 2 PKCE pour associer un compte Dropbox
   */
  async connectAccount(appKey) {
    if (!appKey || !appKey.trim()) {
      throw new Error('Veuillez renseigner votre App Key Dropbox.');
    }

    const cleanAppKey = appKey.trim();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

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
      // Fallback web
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

    // Récupère les informations du profil utilisateur connecté
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

    // Sauvegarde persistante sur le Mac
    storage.setDropboxAppKey(cleanAppKey);
    storage.setDropboxRefreshToken(refreshToken);
    storage.setDropboxAccountEmail(accountEmail);
    storage.setDropboxAccountName(accountName);

    cachedAccessToken = accessToken;
    tokenExpiresAt = Date.now() + (tokenData.expires_in || 14400) * 1000 - 60000;

    return {
      success: true,
      email: accountEmail,
      name: accountName,
    };
  },

  /**
   * Obtient un Access Token valide (le rafraîchit automatiquement si expiré)
   */
  async getValidAccessToken() {
    const appKey = storage.getDropboxAppKey();
    const refreshToken = storage.getDropboxRefreshToken();

    if (!appKey || !refreshToken) {
      throw new Error('Compte Dropbox non connecté. Rendez-vous dans les Paramètres.');
    }

    // Si on a un jeton en mémoire encore valide, on le réutilise
    if (cachedAccessToken && Date.now() < tokenExpiresAt) {
      return cachedAccessToken;
    }

    // Rafraîchissement automatique auprès de Dropbox
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', appKey);

    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error_description || 'Impossible de rafraîchir le jeton Dropbox.');
    }

    const data = await res.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 14400) * 1000 - 60000;

    return cachedAccessToken;
  },

  /**
   * Teste la validité de la connexion et met à jour le profil
   */
  async testConnection() {
    const token = await this.getValidAccessToken();
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('La connexion à Dropbox a échoué.');
    }

    const data = await res.json();
    const email = data.email || '';
    const name = data.name?.display_name || '';

    storage.setDropboxAccountEmail(email);
    storage.setDropboxAccountName(name);

    return { email, name };
  },

  /**
   * Vérifie si le dossier Source est situé dans le dossier Dropbox local
   * et retourne son chemin relatif pour l'API Dropbox.
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

    // Construire la liste de tous les alias possibles pour la racine Dropbox
    // Notamment sur macOS où ~/Dropbox est un lien symbolique vers ~/Library/CloudStorage/Dropbox
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
   * Vérifie le statut Dropbox pour chaque élève :
   * - Dossier Dropbox en ligne (isDropboxFolder)
   * - Partage activé (isShared)
   * - Nettoie les éventuelles adresses d'exemple factices
   */
  async checkStudentsDropboxStatus(sourceFolder, students) {
    if (!students || !students.length) return students;

    const isConnected = storage.isDropboxConnected();
    const sourceInfo = await this.getSourceFolderDropboxInfo(sourceFolder);

    // Cas 1 : Non connecté ou dossier Source hors de Dropbox
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
   * Crée ou récupère le lien de partage public en lecture seule pour un dossier élève
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
   * Crée ou récupère le lien de partage public en lecture seule pour le dossier "Documents"
   * situé à la racine du dossier Source.
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
   * Déconnecte le compte Dropbox
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
