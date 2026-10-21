import assert from 'node:assert';
import { removeAccents, sanitizeFolderName, normalizeGender, normalizeStudentName } from '../src/services/accentUtils.js';
import { FRENCH_WORDS, generateRandomPassword } from '../src/services/dictionary.js';
import { sha256 } from '../src/services/cryptoService.js';
import { csvService } from '../src/services/csvService.js';
import { studentService } from '../src/services/studentService.js';
import { pdfService } from '../src/services/pdfService.js';
import { PDFDocument } from 'pdf-lib';

console.log('🧪 Starting Droopy v4 Logic & Business Rules Tests...\n');

// 1. Tests accentUtils
console.log('1. Testing accentUtils...');
assert.strictEqual(removeAccents('DUPOND Martin éèêëàâäôöûüïîç'), 'DUPOND Martin eeeeaaaoouuiic');
assert.strictEqual(removeAccents('Cœur et Lætitia'), 'Coeur et Laetitia');
assert.strictEqual(sanitizeFolderName('DUPOND / Martin : 3e4 * ?'), 'DUPOND Martin 3e4');
assert.strictEqual(normalizeGender('F'), 'F');
assert.strictEqual(normalizeGender('fille'), 'F');
assert.strictEqual(normalizeGender('G'), 'M');
assert.strictEqual(normalizeGender('Garçon'), 'M');
assert.strictEqual(normalizeGender('M'), 'M');
console.log('  ✅ accentUtils passed\n');

// 2. Tests dictionary & password generation
console.log('2. Testing dictionary & password generation...');
assert(FRENCH_WORDS.length > 100, 'Dictionnaire non vide');
for (let i = 0; i < 50; i++) {
  const pwd = generateRandomPassword();
  assert(pwd.length >= 6 && pwd.length <= 10, `Longueur invalide: ${pwd} (${pwd.length})`);
  assert(/^[a-z]+$/.test(pwd), `Caractères invalides dans le mot de passe: ${pwd}`);
}
console.log('  ✅ Password generation passed (all 6-10 lowercase a-z words)\n');

// 3. Tests cryptoService (sha256)
console.log('3. Testing cryptoService...');
const hash1 = sha256('martin.dupond');
assert.strictEqual(hash1.length, 64, 'SHA256 hash must be 64 hex characters');
assert.strictEqual(hash1, sha256('martin.dupond'), 'SHA256 must be deterministic');
console.log('  ✅ cryptoService passed\n');

// 4. Tests csvService
console.log('4. Testing csvService...');
const sampleCsv = `NOM;Prénom;Classe;Sexe;Login;Password
DUPOND;Martin;3e4;M;martin.dupond;soleil
DURAND;Sophie;3e4;F;sophie.durand;nuage
LECLERC;Thomas;4e2;G;thomas.leclerc;bateau
`;

const rawRows = csvService.parseRawCsv(sampleCsv);
assert.strictEqual(rawRows.length, 4, 'Doit contenir 4 lignes (1 titre + 3 données)');

const mapping = ['nom', 'prenom', 'classe', 'sexe_mf', 'login', 'password'];
const studentsFromCsv = csvService.extractStudents(rawRows, mapping, true);

assert.strictEqual(studentsFromCsv.length, 3, 'Doit extraire 3 élèves');
assert.strictEqual(studentsFromCsv[0].name, 'DUPOND Martin');
assert.strictEqual(studentsFromCsv[0].classe, '3e4');
assert.strictEqual(studentsFromCsv[0].gender, 'M');
assert.strictEqual(studentsFromCsv[1].name, 'DURAND Sophie');
assert.strictEqual(studentsFromCsv[1].gender, 'F');
assert.strictEqual(studentsFromCsv[2].gender, 'M'); // G -> M normalisé

// Test detectHasHeader & extractStudents without header
assert.strictEqual(csvService.detectHasHeader(rawRows[0]), true, 'Doit détecter les en-têtes');
assert.strictEqual(csvService.detectHasHeader(['1', 'ABC', 'XYZ']), false, 'Ne doit pas détecter d\'en-tête');
const allStudents = csvService.extractStudents(rawRows, mapping, false);
assert.strictEqual(allStudents.length, 4, 'Doit extraire 4 lignes si hasHeaderRow = false');
console.log('  ✅ csvService passed\n');

// 5. Tests studentService
console.log('5. Testing studentService (encrypted JS, folders, passwords)...');
const sampleStudents = [
  { name: 'DUPOND Martin', classe: '3e4', gender: 'M', login: 'martin.d', password: '', urlDropbox: 'https://dropbox.com/1', isFolder: true },
  { name: 'DURAND Sophie', classe: '3e4', gender: 'F', login: 'sophie.d', password: '', urlDropbox: 'https://dropbox.com/2', isFolder: true }
];

// Test allFoldersExist
assert.strictEqual(studentService.allFoldersExist(sampleStudents), true);
sampleStudents[1].isFolder = false;
assert.strictEqual(studentService.allFoldersExist(sampleStudents), false);
sampleStudents[1].isFolder = true;

// Test generatePasswords
studentService.generatePasswords(sampleStudents);
assert(sampleStudents[0].password.length >= 6);
assert(sampleStudents[1].password.length >= 6);

// Test encrypted JS
const jsContent = studentService.generateEncryptedJs(sampleStudents);
assert(jsContent.startsWith('const Students = ['), 'JS content must declare const Students');
assert(jsContent.includes(`"Niveau": "3"`), 'Niveau must be first char of classe');
assert(jsContent.includes(sha256('martin.d')), 'Must include sha256 of login');
console.log('  ✅ studentService passed\n');

// 6. Tests pdfService (deducing pages per copy & splitting)
console.log('6. Testing pdfService...');
// Test déduction: si 56 pages pour classe de 28 -> 2 pages par copie
assert.strictEqual(pdfService.deducePagesPerCopy(56), 2);
// si 28 pages pour classe de 28 -> 1 page par copie
assert.strictEqual(pdfService.deducePagesPerCopy(28), 1);
// si 84 pages pour classe de 28 -> 3 pages par copie
assert.strictEqual(pdfService.deducePagesPerCopy(84), 3);

// Test création et découpage réel de PDF via pdf-lib
async function testPdfSplitting() {
  const doc = await PDFDocument.create();
  // Ajoute 6 pages
  for (let i = 0; i < 6; i++) {
    doc.addPage([200, 200]);
  }
  const bytes = await doc.save();
  const pageCount = await pdfService.getPageCount(bytes);
  assert.strictEqual(pageCount, 6);

  // Découpe par 2 pages -> doit donner 3 copies
  const copies = await pdfService.splitPdf(bytes, 2);
  assert.strictEqual(copies.length, 3);
  assert.strictEqual(copies[0].pageCount, 2);
  assert.strictEqual(copies[1].pageCount, 2);
  assert.strictEqual(copies[2].pageCount, 2);
  console.log('  ✅ pdfService splitPdf passed with real PDFDocument\n');
}

await testPdfSplitting();

console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! Droopy v4 is fully functional and complies with all specifications.');
