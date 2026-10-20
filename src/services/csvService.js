import Papa from 'papaparse';
import { normalizeStudentName, normalizeGender } from './accentUtils.js';

export const CSV_COLUMN_OPTIONS = [
  { label: '(Ignorer)', value: 'none' },
  { label: 'NOM', value: 'nom' },
  { label: 'Prénom', value: 'prenom' },
  { label: 'NOM Prénom', value: 'nom_prenom' },
  { label: 'Classe', value: 'classe' },
  { label: 'Sexe (M/F)', value: 'sexe_mf' },
  { label: 'Sexe (G/F)', value: 'sexe_gf' },
  { label: 'Login', value: 'login' },
  { label: 'Password', value: 'password' },
  { label: 'URL Dropbox', value: 'dropbox_url' },
];

export const csvService = {
  /**
   * Parse le texte CSV brut en matrice 2D [ [cell, cell, ...], ... ]
   */
  parseRawCsv(csvText) {
    const result = Papa.parse(csvText, {
      skipEmptyLines: 'greedy',
    });
    return result.data || [];
  },

  /**
   * Heuristique pour pré-assigner automatiquement les colonnes selon les noms d'en-tête probables
   */
  guessColumnMapping(firstRow) {
    if (!firstRow || !firstRow.length) return [];
    return firstRow.map((header) => {
      const h = (header || '').toString().toLowerCase().trim();
      if (h.includes('nom') && h.includes('prenom')) return 'nom_prenom';
      if (h.includes('nom') || h === 'last_name' || h === 'lastname') return 'nom';
      if (h.includes('prenom') || h.includes('prénom') || h === 'first_name' || h === 'firstname') return 'prenom';
      if (h.includes('classe') || h.includes('division') || h.includes('groupe')) return 'classe';
      if (h.includes('sexe') || h.includes('genre')) return 'sexe_mf';
      if (h.includes('login') || h.includes('identifiant') || h.includes('user')) return 'login';
      if (h.includes('pass') || h.includes('mdp')) return 'password';
      if (h.includes('dropbox') || h.includes('url')) return 'dropbox_url';
      return 'none';
    });
  },

  /**
   * Transforme les lignes du CSV en objets élèves selon le mapping de colonnes
   */
  extractStudents(rawRows, columnMapping, hasHeaderRow = true) {
    const dataRows = hasHeaderRow ? rawRows.slice(1) : rawRows;
    const students = [];

    // On localise les index de chaque type de colonne
    const map = {};
    columnMapping.forEach((val, idx) => {
      if (val && val !== 'none') {
        map[val] = idx;
      }
    });

    dataRows.forEach((row, i) => {
      if (!row || !row.length || row.every((c) => !c || !c.toString().trim())) return;

      let name = '';
      if (map['nom_prenom'] !== undefined) {
        name = row[map['nom_prenom']] || '';
      } else {
        const nom = map['nom'] !== undefined ? row[map['nom']] || '' : '';
        const prenom = map['prenom'] !== undefined ? row[map['prenom']] || '' : '';
        name = `${nom.trim().toUpperCase()} ${prenom.trim()}`.trim();
      }

      name = normalizeStudentName(name);

      const classe = map['classe'] !== undefined ? (row[map['classe']] || '').toString().trim() : '';

      let gender = 'M';
      if (map['sexe_mf'] !== undefined) {
        gender = normalizeGender(row[map['sexe_mf']]);
      } else if (map['sexe_gf'] !== undefined) {
        gender = normalizeGender(row[map['sexe_gf']]);
      }

      const login = map['login'] !== undefined ? (row[map['login']] || '').toString().trim() : '';
      const password = map['password'] !== undefined ? (row[map['password']] || '').toString().trim() : '';
      const urlDropbox = map['dropbox_url'] !== undefined ? (row[map['dropbox_url']] || '').toString().trim() : '';

      students.push({
        id: i + 1,
        name,
        classe,
        gender,
        login,
        password,
        urlDropbox,
      });
    });

    return students;
  },
};
