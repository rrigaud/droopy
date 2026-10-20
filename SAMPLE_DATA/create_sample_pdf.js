import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createSamplePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);

  const students = [
    { name: 'DUPOND Martin', grade: '16.5' },
    { name: 'DURAND Sophie', grade: '14' },
    { name: 'LEFEBVRE Thomas', grade: '18' },
    { name: 'MOREAU Camille', grade: '12.5' },
    { name: 'PETIT Lucas', grade: '15' },
    { name: 'ROUX Emma', grade: '17' },
    { name: 'BERNARD Hugo', grade: '13.5' },
    { name: 'GIRARD Lea', grade: '19' },
  ];

  // 2 pages par élève = 16 pages
  for (const st of students) {
    // Page 1 (Haut de la copie avec nom et note)
    const page1 = doc.addPage([595, 842]); // A4
    page1.drawRectangle({
      x: 30,
      y: 720,
      width: 535,
      height: 90,
      borderColor: rgb(0.2, 0.4, 0.8),
      borderWidth: 2,
      color: rgb(0.95, 0.97, 1),
    });

    page1.drawText('ÉVALUATION DE MATHÉMATIQUES - CLASSE DE 3e4', {
      x: 45,
      y: 780,
      size: 14,
      font,
      color: rgb(0.1, 0.2, 0.5),
    });

    page1.drawText(`Élève : ${st.name}`, {
      x: 45,
      y: 745,
      size: 13,
      font,
      color: rgb(0, 0, 0),
    });

    page1.drawText(`Note : ${st.grade} / 20`, {
      x: 420,
      y: 745,
      size: 15,
      font,
      color: rgb(0.8, 0.1, 0.1),
    });

    page1.drawText('Exercice 1 : Théorème de Pythagore et trigonométrie (8 points)', {
      x: 45,
      y: 670,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText('Réponse de l\'élève et calculs détaillés rédigés ci-dessous...', {
      x: 45,
      y: 640,
      size: 10,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Page 2
    const page2 = doc.addPage([595, 842]);
    page2.drawText(`Évaluation de Mathématiques - Page 2 (${st.name})`, {
      x: 45,
      y: 800,
      size: 10,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    page2.drawText('Exercice 2 : Fonctions affines et pourcentages (12 points)', {
      x: 45,
      y: 760,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const pdfBytes = await doc.save();
  const outputPath = path.join(__dirname, 'Evaluation_Maths_3e4.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`✅ Sample PDF generated: ${outputPath} (${students.length * 2} pages)`);
}

createSamplePdf();
