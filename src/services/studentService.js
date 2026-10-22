import { nativeFs } from './fs.js';
import { sanitizeFolderName } from './accentUtils.js';
import { generateRandomPassword } from './dictionary.js';
import { sha256 } from './cryptoService.js';

export const studentService = {
  getStudentsFilePath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/eleves.json`;
  },

  getElevesFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/Eleves`;
  },

  getBackupFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/Backup`;
  },

  getAcorrigerFolderPath(sourceFolder) {
    if (!sourceFolder) return '';
    return `${sourceFolder.replace(/\/+$/, '')}/Evaluations/A corriger`;
  },

  /**
   * Vérifie et crée si nécessaire l'arborescence standard dans le dossier Source :
   * - Documents/
   * - Evaluations/
   * - Evaluations/A corriger/
   * - Evaluations/Backup/
   * - Evaluations/Eleves/
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

  getStudentFolderPath(sourceFolder, student) {
    const root = this.getElevesFolderPath(sourceFolder);
    const cleanClass = sanitizeFolderName(student.classe);
    const cleanName = sanitizeFolderName(student.name);
    return `${root}/${cleanClass}/${cleanName}`;
  },

  /**
   * Charge eleves.json et vérifie l'existence du dossier de chaque élève
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

      // Vérifie pour chaque élève si son dossier local existe et attribue un ID unique
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
   * Sauvegarde la liste des élèves dans eleves.json
   */
  async saveStudents(sourceFolder, students) {
    if (!sourceFolder) throw new Error('Dossier Source non défini');
    const filePath = this.getStudentsFilePath(sourceFolder);

    // Nettoyage de la structure pour le stockage JSON lisible avec ID unique garanti
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
    return cleanList;
  },

  /**
   * Crée le dossier local d'un élève
   */
  async createFolderForStudent(sourceFolder, student) {
    const studentFolder = this.getStudentFolderPath(sourceFolder, student);
    await nativeFs.createDir(studentFolder);
    return studentFolder;
  },

  /**
   * Génère les dossiers pour une sélection d'élèves
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
   * Génère un mot de passe aléatoire pour les élèves sélectionnés
   */
  generatePasswords(students) {
    students.forEach((s) => {
      s.password = generateRandomPassword();
    });
  },

  /**
   * Exporte le fichier JavaScript chiffré students.js
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
   * Vérifie si tous les dossiers d'élèves existent
   */
  allFoldersExist(students) {
    if (!students || !students.length) return false;
    return students.every((s) => s.isFolder === true);
  },

  /**
   * Récupère la liste des classes disponibles
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
