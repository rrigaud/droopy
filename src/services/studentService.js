import { nativeFs } from './fs.js';
import { sanitizeFolderName } from './accentUtils.js';
import { generateRandomPassword } from './dictionary.js';
import { sha256 } from './cryptoService.js';
import { settingsService } from './settingsService.js';

/**
 * Service de gestion des élèves et de l'arborescence du dossier Source.
 * 
 * Ce service centralise :
 * - Les chemins standards du dossier Source (eleves.json, Evaluations, Backup...).
 * - La création de l'arborescence physique sur disque.
 * - Le chargement et la sauvegarde atomique de la base d'élèves.
 * - La génération des dossiers individuels et des mots de passe.
 * - L'export au format CSV et le calcul des classes disponibles.
 */
export const studentService = {
  /**
   * Retourne le chemin absolu vers le fichier eleves.json.
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {string} Chemin vers eleves.json (ou chaîne vide si non spécifié).
   */
  getStudentsFilePath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/eleves.json`;
  },

  /**
   * Retourne le chemin absolu vers le dossier contenant les copies des élèves.
   * Arborescence : <Source>/Evaluations/Eleves/<Classe>/<Nom>/
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {string} Chemin absolu vers Evaluations/Eleves.
   */
  getElevesFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/Eleves`;
  },

  /**
   * Retourne le chemin absolu vers le dossier d'archivage des paquets scannés complets.
   * Arborescence : <Source>/Evaluations/Backup/<Date - Classe - Titre>.pdf
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {string} Chemin absolu vers Evaluations/Backup.
   */
  getBackupFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/Backup`;
  },

  /**
   * Retourne le chemin absolu vers le dossier de dépôt des scans à traiter.
   * C'est l'emplacement par défaut où l'enseignant dépose les PDF venant de sa clé USB.
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {string} Chemin absolu vers Evaluations/A corriger.
   */
  getAcorrigerFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/A corriger`;
  },

  /**
   * Initialise et garantit la présence de l'arborescence standard dans le dossier Source :
   * - Documents/ (documents généraux de l'enseignant, synchronisés avec Dropbox)
   * - Evaluations/
   * - Evaluations/A corriger/
   * - Evaluations/Backup/
   * - Evaluations/Eleves/
   * 
   * Ne supprime ni n'écrase aucun dossier existant.
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   */
  async ensureSourceStructure(sourceFolder) {
    if (!sourceFolder) return;
    const cleanRoot = sourceFolder.replace(/\/+$/, '');
    const dirs = [
      `${cleanRoot}/Documents`,
      `${cleanRoot}/Evaluations`,
      `${cleanRoot}/Evaluations/A corriger`,
      `${cleanRoot}/Evaluations/Backup`,
      `${cleanRoot}/Evaluations/Eleves`,
    ];
    for (const d of dirs) {
      try {
        const exists = await nativeFs.checkExists(d);
        if (!exists) {
          await nativeFs.createDir(d);
        }
      } catch (err) {
        console.warn(`Création du dossier ${d}:`, err);
      }
    }
  },

  /**
   * Calcule le chemin physique normalisé du dossier personnel d'un élève.
   * Le nom de la classe et le nom de l'élève sont nettoyés (accents et caractères spéciaux retirés)
   * pour éviter tout problème d'encodage sur macOS, Windows ou Dropbox.
   * 
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @param {Object} student - Objet élève avec propriétés `classe` et `name`.
   * @returns {string} Chemin absolu : <Source>/Evaluations/Eleves/<Classe>/<Nom>
   */
  getStudentFolderPath(sourceFolder, student) {
    const root = this.getElevesFolderPath(sourceFolder);
    const cleanClass = sanitizeFolderName(student.classe);
    const cleanName = sanitizeFolderName(student.name);
    return `${root}/${cleanClass}/${cleanName}`;
  },

  /**
   * Charge le fichier eleves.json et vérifie l'existence locale du dossier de chaque élève.
   * Attribue également un identifiant numérique unique permanent (ID) si absent.
   * 
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @returns {Promise<Array<Object>>} Liste des élèves enrichie avec `isFolder: boolean` et `id: number`.
   */
  async loadStudents(sourceFolder) {
    if (!sourceFolder) return [];
    const filePath = this.getStudentsFilePath(sourceFolder);
    const exists = await nativeFs.checkExists(filePath);
    if (!exists) return [];

    try {
      const raw = await nativeFs.readTextFile(filePath);
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed.students || [];

      // Vérification pour chaque élève de l'existence de son dossier local et attribution de l'ID
      let maxId = 0;
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (s.id !== undefined && s.id !== null && !isNaN(Number(s.id)) && Number(s.id) > 0) {
          s.id = Number(s.id);
          if (s.id > maxId) maxId = s.id;
        } else {
          maxId += 1;
          s.id = maxId;
        }

        if (!s.name || !s.classe) {
          s.isFolder = false;
          continue;
        }
        const studentFolder = this.getStudentFolderPath(sourceFolder, s);
        s.isFolder = await nativeFs.checkExists(studentFolder);
      }

      return list;
    } catch (e) {
      console.error('Erreur lors du chargement de eleves.json:', e);
      return [];
    }
  },

  /**
   * Sauvegarde la liste des élèves dans eleves.json avec formatage propre (2 espaces).
   * Nettoie les champs superflus et met à jour l'horodatage de modification dans settings.json.
   * 
   * @param {string} sourceFolder - Chemin absolu du dossier Source.
   * @param {Array<Object>} students - Liste des élèves à persister.
   * @returns {Promise<Array<Object>>} Liste nettoyée telle qu'enregistrée.
   */
  async saveStudents(sourceFolder, students) {
    if (!sourceFolder) throw new Error('Dossier Source non défini');
    const filePath = this.getStudentsFilePath(sourceFolder);

    // Attribution d'un ID numérique unique et croissant
    let maxId = 0;
    const cleanList = students.map((s, idx) => {
      let id = s.id !== undefined && s.id !== null && !isNaN(Number(s.id)) && Number(s.id) > 0
        ? Number(s.id)
        : maxId + 1;
      if (id <= maxId) id = maxId + 1;
      maxId = Math.max(maxId, id);

      return {
        id,
        name: sanitizeFolderName(s.name),
        classe: s.classe ? s.classe.toString().trim() : '',
        gender: s.gender === 'F' ? 'F' : 'M',
        login: s.login || '',
        password: s.password || '',
        urlDropbox: s.urlDropbox || s['dropbox-url'] || '',
      };
    });

    const jsonStr = JSON.stringify(cleanList, null, 2);
    await nativeFs.writeTextFile(filePath, jsonStr);
    try {
      await settingsService.recordStudentsModified(sourceFolder);
    } catch (_) {}
    return cleanList;
  },

  /**
   * Crée le sous-dossier physique sur disque pour un élève spécifique.
   * @param {string} sourceFolder - Chemin du dossier Source.
   * @param {Object} student - Élève concerné.
   * @returns {Promise<string>} Chemin absolu du dossier créé.
   */
  async createFolderForStudent(sourceFolder, student) {
    const studentFolder = this.getStudentFolderPath(sourceFolder, student);
    await nativeFs.createDir(studentFolder);
    return studentFolder;
  },

  /**
   * Génère les sous-dossiers locaux pour un groupe d'élèves sélectionnés.
   * Met à jour `student.isFolder = true` pour chaque élève traité.
   * 
   * @param {string} sourceFolder - Chemin du dossier Source.
   * @param {Array<Object>} students - Liste des élèves sélectionnés.
   * @returns {Promise<number>} Nombre de dossiers créés.
   */
  async createFoldersForStudents(sourceFolder, students) {
    let count = 0;
    for (const s of students) {
      await this.createFolderForStudent(sourceFolder, s);
      s.isFolder = true;
      count++;
    }
    return count;
  },

  /**
   * Attribue un mot de passe aléatoire de 3 mots simples en français à chaque élève.
   * Modifie les objets en place (`student.password`).
   * @param {Array<Object>} students - Liste des élèves concernés.
   */
  generatePasswords(students) {
    students.forEach((s) => {
      s.password = generateRandomPassword();
    });
  },

  /**
   * Exporte la sélection d'élèves sous la forme d'un fichier CSV tabulaire standard.
   * Protège les valeurs contenant des virgules ou guillemets avec des guillemets d'échappement.
   * 
   * @param {Array<Object>} students - Élèves à exporter.
   * @returns {string} Contenu textuel CSV avec en-têtes.
   */
  exportCsv(students) {
    const headers = ['Classe', 'Nom', 'Sexe', 'Login', 'Mot de passe', 'URL Dropbox'];
    const rows = students.map((s) => [
      `"${(s.classe || '').replace(/"/g, '""')}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.gender || 'M').replace(/"/g, '""')}"`,
      `"${(s.login || '').replace(/"/g, '""')}"`,
      `"${(s.password || '').replace(/"/g, '""')}"`,
      `"${(s.urlDropbox || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  /**
   * Génère l'ancien format exportable `students.js` chiffré par empreinte SHA-256.
   * @param {Array<Object>} students - Élèves concernés.
   * @returns {string} Script JavaScript contenant la constante `const Students = [...]`.
   */
  generateEncryptedJs(students) {
    const array = students.map((s) => ({
      Login: sha256(s.login || ''),
      Niveau: s.classe ? s.classe.toString().trim().charAt(0) : '',
      Dropbox: s.urlDropbox || '',
    }));

    return `const Students = ${JSON.stringify(array, null, 2)};\n`;
  },

  /**
   * Vérifie si tous les élèves de la liste possèdent bien un dossier physique sur disque.
   * @param {Array<Object>} students - Liste des élèves.
   * @returns {boolean} True si tous les élèves ont isFolder === true.
   */
  allFoldersExist(students) {
    if (!students || !students.length) return false;
    return students.every((s) => s.isFolder === true);
  },

  /**
   * Récupère la liste dédoublonnée et triée de toutes les classes disponibles.
   * Combine les classes enregistrées dans eleves.json et les sous-dossiers physiques
   * présents dans Evaluations/Eleves.
   * 
   * @param {string} sourceFolder - Chemin du dossier Source.
   * @param {Array<Object>} [students=[]] - Élèves actuellement en mémoire.
   * @returns {Promise<Array<string>>} Liste triée des noms de classes (ex: ["3e1", "4eme B", "5e3"]).
   */
  async getAvailableClasses(sourceFolder, students = []) {
    const classes = new Set();

    // 1. Depuis les élèves en mémoire
    students.forEach((s) => {
      if (s.classe) classes.add(s.classe.toString().trim());
    });

    // 2. Depuis le dossier physique Evaluations/Eleves
    if (sourceFolder) {
      const elevesFolder = this.getElevesFolderPath(sourceFolder);
      try {
        const dirs = await nativeFs.listSubdirs(elevesFolder);
        dirs.forEach((d) => classes.add(d));
      } catch (_) {}
    }

    return Array.from(classes).sort();
  },
};
