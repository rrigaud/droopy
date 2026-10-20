import { PDFDocument } from 'pdf-lib';
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
};
