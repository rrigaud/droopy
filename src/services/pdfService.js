import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

if (pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href;
  } catch (_) {}
}

/**
 * Nettoie et vérifie que les octets commencent bien par le header %PDF-
 * (gère les éventuels BOM ou métadonnées parasites insérés par certains scanners)
 */
function sanitizePdfBuffer(rawBytes) {
  if (!rawBytes || rawBytes.length === 0) {
    throw new Error('Le document PDF est vide (0 octet).');
  }

  // Header %PDF- en hexadécimal: [0x25, 0x50, 0x44, 0x46, 0x2D]
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d];
  const maxSearch = Math.min(rawBytes.length - 5, 2048);

  for (let i = 0; i <= maxSearch; i++) {
    if (
      rawBytes[i] === header[0] &&
      rawBytes[i + 1] === header[1] &&
      rawBytes[i + 2] === header[2] &&
      rawBytes[i + 3] === header[3] &&
      rawBytes[i + 4] === header[4]
    ) {
      if (i > 0) {
        return rawBytes.subarray(i);
      }
      return rawBytes;
    }
  }

  return rawBytes;
}

export const pdfService = {
  /**
   * Convertit une chaîne base64 en Uint8Array de manière sûre
   */
  base64ToUint8Array(base64) {
    if (!base64) return new Uint8Array(0);
    const cleanB64 = base64.replace(/\s+/g, '');
    const binary = atob(cleanB64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Convertit un Uint8Array en chaîne base64 par paquets de 32 Ko
   * (évite le débordement de pile ou de mémoire V8 sur les gros PDF)
   */
  uint8ArrayToBase64(bytes) {
    if (!bytes || !bytes.byteLength) return '';
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // 32768
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  },

  /**
   * Lit un PDF et retourne le nombre total de pages
   */
  async getPageCount(pdfBytes) {
    const bytes = sanitizePdfBuffer(new Uint8Array(pdfBytes.slice ? pdfBytes.slice(0) : pdfBytes));
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  },

  /**
   * Calcule le nombre supposé de pages par copie
   * en se basant sur une classe typique de 20 à 36 élèves.
   * Propose 1, 2, 3, 4, 5 ou 6 pages.
   */
  deducePagesPerCopy(totalPageCount) {
    if (!totalPageCount || totalPageCount <= 0) return 1;

    let bestK = 1;
    let minDiffFromMedian = Infinity;

    for (let k = 1; k <= 6; k++) {
      const estimatedStudents = totalPageCount / k;
      if (Number.isInteger(estimatedStudents) && estimatedStudents >= 20 && estimatedStudents <= 36) {
        const diff = Math.abs(estimatedStudents - 28);
        if (diff < minDiffFromMedian) {
          minDiffFromMedian = diff;
          bestK = k;
        }
      }
    }

    if (minDiffFromMedian === Infinity) {
      for (let k = 1; k <= 6; k++) {
        const estimatedStudents = totalPageCount / k;
        if (estimatedStudents >= 18 && estimatedStudents <= 38) {
          const diff = Math.abs(estimatedStudents - 28);
          if (diff < minDiffFromMedian) {
            minDiffFromMedian = diff;
            bestK = k;
          }
        }
      }
    }

    return bestK;
  },

  /**
   * Découpe un PDF en plusieurs sous-PDF de `pagesPerCopy` pages
   * Retourne un tableau d'objets: [{ index: 1, base64: '...' }, ...]
   */
  async splitPdf(pdfBytes, pagesPerCopy) {
    const bytes = sanitizePdfBuffer(new Uint8Array(pdfBytes.slice ? pdfBytes.slice(0) : pdfBytes));
    const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();
    const copies = [];

    const k = Math.max(1, parseInt(pagesPerCopy, 10) || 1);
    let copyIndex = 1;

    for (let i = 0; i < totalPages; i += k) {
      const subDoc = await PDFDocument.create();
      const pageIndices = [];
      for (let p = 0; p < k && i + p < totalPages; p++) {
        pageIndices.push(i + p);
      }
      const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        subDoc.addPage(page);
      }
      const subBytes = await subDoc.save();
      const base64 = this.uint8ArrayToBase64(subBytes);
      copies.push({
        index: copyIndex++,
        pageCount: pageIndices.length,
        base64,
        filename: `copie_${copyIndex - 1}.pdf`,
      });
    }

    return copies;
  },

  /**
   * Affiche une page d'un PDF sur un élément Canvas
   * Clone explicitement les données pour empêcher pdfjs de détacher le buffer d'origine !
   */
  async renderPageToCanvas(pdfData, canvas, scale = 1.4, pageNum = 1) {
    if (!canvas) return;

    let raw;
    if (typeof pdfData === 'string') {
      raw = this.base64ToUint8Array(pdfData);
    } else {
      raw = pdfData;
    }

    // Clone impératif pour éviter le transfert/détachement par le Web Worker de pdfjs
    const dataClone = sanitizePdfBuffer(new Uint8Array(raw.slice(0)));

    const loadingTask = pdfjsLib.getDocument({ data: dataClone });
    const pdf = await loadingTask.promise;
    const targetPage = Math.min(Math.max(1, parseInt(pageNum, 10) || 1), pdf.numPages);
    const page = await pdf.getPage(targetPage);

    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    await page.render(renderContext).promise;
  },

  /**
   * Génère les étiquettes élèves sur 2 colonnes (idéales pour cahiers A5),
   * séparées par des lignes en pointillés (verticales et horizontales),
   * avec changement systématique de page à chaque changement de classe.
   */
  async generateLabelsPdf(students, portalUrl = '') {
    const doc = await PDFDocument.create();
    if (!students || students.length === 0) {
      return await doc.save();
    }

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const cleanPortal = safeWinAnsiText(portalUrl.trim());
    const pageWidth = 595.28; // A4 pt
    const pageHeight = 841.89;
    const marginX = 24;
    const marginY = 24;

    const colsPerPage = 2;
    const rowsPerPage = 5;
    const labelsPerPage = colsPerPage * rowsPerPage; // 10 par page A4

    const usableWidth = pageWidth - marginX * 2; // ~547.28
    const usableHeight = pageHeight - marginY * 2; // ~793.89
    const colWidth = usableWidth / colsPerPage; // ~273.64 (9.6 cm -> parfait pour A5)
    const rowHeight = usableHeight / rowsPerPage; // ~158.77 (5.6 cm)
    const midX = marginX + colWidth; // ~297.64

    // 1. Groupement des élèves par classe
    const classesMap = new Map();
    for (const s of students) {
      const cl = (s.classe || 'Sans classe').toString().trim();
      if (!classesMap.has(cl)) classesMap.set(cl, []);
      classesMap.get(cl).push(s);
    }

    // 2. Tri des classes par ordre naturel (6A, 6B, 5e1, etc.)
    const sortedClasses = Array.from(classesMap.keys()).sort((a, b) =>
      a.localeCompare(b, 'fr', { numeric: true })
    );

    // 3. Tri alphabétique des élèves au sein de chaque classe
    for (const cl of sortedClasses) {
      classesMap.get(cl).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    }

    // 4. Génération des étiquettes : chaque classe commence sur une nouvelle page
    for (const cl of sortedClasses) {
      const classStudents = classesMap.get(cl);
      let currentPage = null;

      for (let idx = 0; idx < classStudents.length; idx++) {
        const student = classStudents[idx];
        const posOnPage = idx % labelsPerPage;

        if (posOnPage === 0) {
          currentPage = doc.addPage([pageWidth, pageHeight]);

          // Ligne verticale centrale en pointillés
          currentPage.drawLine({
            start: { x: midX, y: pageHeight - marginY },
            end: { x: midX, y: marginY },
            thickness: 0.7,
            color: rgb(0.72, 0.75, 0.8),
            dashArray: [4, 4],
          });

          // 4 lignes horizontales de séparation en pointillés
          for (let r = 1; r < rowsPerPage; r++) {
            const lineY = pageHeight - marginY - r * rowHeight;
            currentPage.drawLine({
              start: { x: marginX, y: lineY },
              end: { x: pageWidth - marginX, y: lineY },
              thickness: 0.7,
              color: rgb(0.72, 0.75, 0.8),
              dashArray: [4, 4],
            });
          }
        }

        const col = posOnPage % colsPerPage;
        const row = Math.floor(posOnPage / colsPerPage);

        const cellLeft = marginX + col * colWidth + 8;
        const cellTop = pageHeight - marginY - row * rowHeight - 8;
        const cellWidth = colWidth - 16;

        // 1. Classe et Nom de l'élève
        const classe = safeWinAnsiText(student.classe ? String(student.classe).toUpperCase() : '');
        const nom = safeWinAnsiText(student.name ? String(student.name).toUpperCase() : '');
        const headerTitle = classe ? `${classe}  -  ${nom}` : nom;

        currentPage.drawText(headerTitle, {
          x: cellLeft,
          y: cellTop - 13,
          size: 11,
          font: fontBold,
          color: rgb(0.12, 0.28, 0.54),
        });

        // 2. Portail de connexion
        const portalLabel = 'Portail : ';
        currentPage.drawText(portalLabel, {
          x: cellLeft,
          y: cellTop - 28,
          size: 8,
          font: fontRegular,
          color: rgb(0.38, 0.42, 0.48),
        });

        const labelW = fontRegular.widthOfTextAtSize(portalLabel, 8);
        currentPage.drawText(cleanPortal || 'Non configure', {
          x: cellLeft + labelW,
          y: cellTop - 28,
          size: 8,
          font: fontBold,
          color: cleanPortal ? rgb(0.15, 0.42, 0.8) : rgb(0.7, 0.3, 0.3),
        });

        // 3. Cadre des identifiants
        const boxY = cellTop - 100;
        const boxH = 64;
        currentPage.drawRectangle({
          x: cellLeft,
          y: boxY,
          width: cellWidth,
          height: boxH,
          color: rgb(0.97, 0.98, 1.0),
          borderColor: rgb(0.83, 0.86, 0.93),
          borderWidth: 0.8,
        });

        // Colonne gauche : Identifiant
        currentPage.drawText('IDENTIFIANT', {
          x: cellLeft + 10,
          y: boxY + boxH - 18,
          size: 7,
          font: fontBold,
          color: rgb(0.45, 0.5, 0.6),
        });

        const login = safeWinAnsiText(student.login || '(aucun)');
        currentPage.drawText(login, {
          x: cellLeft + 10,
          y: boxY + boxH - 38,
          size: 11,
          font: fontBold,
          color: rgb(0.1, 0.12, 0.16),
        });

        // Ligne de séparation au milieu du cadre
        currentPage.drawLine({
          start: { x: cellLeft + cellWidth / 2, y: boxY + 8 },
          end: { x: cellLeft + cellWidth / 2, y: boxY + boxH - 8 },
          thickness: 0.6,
          color: rgb(0.85, 0.88, 0.94),
        });

        // Colonne droite : Mot de passe
        currentPage.drawText('MOT DE PASSE', {
          x: cellLeft + cellWidth / 2 + 10,
          y: boxY + boxH - 18,
          size: 7,
          font: fontBold,
          color: rgb(0.45, 0.5, 0.6),
        });

        const password = safeWinAnsiText(student.password || '(aucun)');
        currentPage.drawText(password, {
          x: cellLeft + cellWidth / 2 + 10,
          y: boxY + boxH - 38,
          size: 11,
          font: fontBold,
          color: rgb(0.1, 0.12, 0.16),
        });

        // 4. Petite note sous le cadre
        currentPage.drawText('A conserver pour consulter vos copies.', {
          x: cellLeft,
          y: cellTop - 116,
          size: 6.5,
          font: fontOblique,
          color: rgb(0.55, 0.58, 0.62),
        });
      }
    }

    return await doc.save();
  },

  /**
   * Alias de compatibilité
   */
  async generateCredentialsPdf(students, portalUrl = '') {
    return this.generateLabelsPdf(students, portalUrl);
  },

  /**
   * Génère un tableau récapitulatif complet des données de connexion,
   * trié par classe puis par nom alphabétique, avec séparation visuelle entre chaque classe.
   */
  async generateConnectionTablePdf(students, portalUrl = '') {
    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const cleanPortal = safeWinAnsiText(portalUrl.trim());
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginX = 36;
    const tableWidth = pageWidth - marginX * 2; // 523.28

    // Groupement des élèves par classe
    const classesMap = new Map();
    students.forEach((s) => {
      const cl = (s.classe || 'Sans classe').toString().trim();
      if (!classesMap.has(cl)) classesMap.set(cl, []);
      classesMap.get(cl).push(s);
    });

    // Tri des classes
    const sortedClasses = Array.from(classesMap.keys()).sort((a, b) =>
      a.localeCompare(b, 'fr', { numeric: true })
    );

    // Tri des élèves dans chaque classe par nom alphabétique
    sortedClasses.forEach((cl) => {
      classesMap.get(cl).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
    });

    let currentPage = null;
    let y = 0;
    let pageNum = 0;

    const colDef = [
      { key: 'idx', label: '#', width: 28 },
      { key: 'name', label: 'Nom & Prénom', width: 195 },
      { key: 'gender', label: 'Sexe', width: 35 },
      { key: 'login', label: 'Identifiant (Login)', width: 130 },
      { key: 'password', label: 'Mot de passe', width: 135 },
    ];

    function addNewPage() {
      currentPage = doc.addPage([pageWidth, pageHeight]);
      pageNum++;
      y = pageHeight - 36;

      // En-tête de page
      currentPage.drawText('TABLEAU DE CONNEXION ELEVES', {
        x: marginX,
        y: y - 14,
        size: 14,
        font: fontBold,
        color: rgb(0.12, 0.28, 0.54),
      });

      const today = new Date().toLocaleDateString('fr-FR');
      const subtitle = `Portail : ${cleanPortal || 'Non configure'}   -   Edite le ${today}   -   Total : ${students.length} eleve(s)`;
      currentPage.drawText(safeWinAnsiText(subtitle), {
        x: marginX,
        y: y - 28,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.44, 0.5),
      });

      // Ligne fine sous l'en-tête
      currentPage.drawLine({
        start: { x: marginX, y: y - 34 },
        end: { x: marginX + tableWidth, y: y - 34 },
        thickness: 0.8,
        color: rgb(0.85, 0.88, 0.94),
      });

      y -= 44;
    }

    function drawTableHeader() {
      currentPage.drawRectangle({
        x: marginX,
        y: y - 18,
        width: tableWidth,
        height: 18,
        color: rgb(0.92, 0.94, 0.97),
        borderColor: rgb(0.82, 0.86, 0.92),
        borderWidth: 0.6,
      });

      let curX = marginX;
      colDef.forEach((col) => {
        currentPage.drawText(safeWinAnsiText(col.label), {
          x: curX + 6,
          y: y - 12.5,
          size: 7.5,
          font: fontBold,
          color: rgb(0.3, 0.35, 0.42),
        });
        curX += col.width;
      });

      y -= 18;
    }

    addNewPage();

    for (const cl of sortedClasses) {
      const classStudents = classesMap.get(cl);

      // Si pas assez de place pour bandeau classe + en-tête + 2 lignes (environ 75 pt)
      if (y < 85) {
        addNewPage();
      }

      // 1. Bandeau de séparation de la classe
      currentPage.drawRectangle({
        x: marginX,
        y: y - 22,
        width: tableWidth,
        height: 22,
        color: rgb(0.12, 0.28, 0.54),
      });

      currentPage.drawText(`CLASSE : ${safeWinAnsiText(cl.toUpperCase())}  (${classStudents.length} eleves)`, {
        x: marginX + 10,
        y: y - 15,
        size: 10,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      y -= 22;
      drawTableHeader();

      // 2. Lignes des élèves
      for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
        const s = classStudents[sIdx];

        if (y < 42) {
          addNewPage();
          drawTableHeader();
        }

        const isEven = sIdx % 2 === 0;
        const rowH = 18;

        if (isEven) {
          currentPage.drawRectangle({
            x: marginX,
            y: y - rowH,
            width: tableWidth,
            height: rowH,
            color: rgb(0.97, 0.98, 1.0),
          });
        }

        // Bordure inférieure fine
        currentPage.drawLine({
          start: { x: marginX, y: y - rowH },
          end: { x: marginX + tableWidth, y: y - rowH },
          thickness: 0.5,
          color: rgb(0.88, 0.9, 0.94),
        });

        // Contenu des cellules
        let curX = marginX;

        // #
        currentPage.drawText(String(sIdx + 1), {
          x: curX + 6,
          y: y - 12.5,
          size: 8,
          font: fontRegular,
          color: rgb(0.5, 0.55, 0.6),
        });
        curX += colDef[0].width;

        // Nom
        currentPage.drawText(safeWinAnsiText(s.name || ''), {
          x: curX + 6,
          y: y - 12.5,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.15, 0.2),
        });
        curX += colDef[1].width;

        // Sexe
        currentPage.drawText(safeWinAnsiText(s.gender || 'M'), {
          x: curX + 6,
          y: y - 12.5,
          size: 8,
          font: fontRegular,
          color: rgb(0.35, 0.4, 0.45),
        });
        curX += colDef[2].width;

        // Identifiant
        currentPage.drawText(safeWinAnsiText(s.login || '-'), {
          x: curX + 6,
          y: y - 12.5,
          size: 8.5,
          font: fontBold,
          color: rgb(0.15, 0.35, 0.65),
        });
        curX += colDef[3].width;

        // Mot de passe
        currentPage.drawText(safeWinAnsiText(s.password || '-'), {
          x: curX + 6,
          y: y - 12.5,
          size: 8.5,
          font: fontBold,
          color: rgb(0.2, 0.22, 0.26),
        });

        y -= rowH;
      }

      // Espace de respiration avant la classe suivante
      y -= 14;
    }

    return await doc.save();
  },
};

function safeWinAnsiText(str) {
  if (!str) return '';
  return String(str)
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\xFF]/g, '');
}
