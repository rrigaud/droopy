<template>
  <div class="h-full flex flex-col p-4 space-y-3">
    <!-- Top Configuration Banner -->
    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-2.5">
      <!-- Tous les éléments sur une seule ligne -->
      <div class="flex flex-wrap items-center gap-2.5 xl:gap-3">
        <!-- 1. Bouton Charger... avec icône PDF (même style et taille que les boutons du Step 0) -->
        <Button
          label="Charger..."
          icon="pi pi-file-pdf"
          @click="handleSelectPdf"
          class="p-button-outlined shrink-0"
        />

        <!-- 2. Datepicker (compact et bien lisible) -->
        <div class="flex items-center gap-1 shrink-0">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-300">Date :</label>
          <DatePicker
            v-model="evaluationDate"
            dateFormat="yy-mm-dd"
            showIcon
            class="p-inputtext-sm w-44 text-xs"
            inputClass="!font-sans text-xs font-medium"
          />
        </div>

        <!-- 3. Classe -->
        <div class="flex items-center gap-1 shrink-0">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-300">Classe :</label>
          <Select
            v-model="selectedClass"
            :options="availableClasses"
            placeholder="Classe..."
            class="w-32 text-xs font-bold"
          />
        </div>

        <!-- 4. Nom de l'évaluation -->
        <div class="flex items-center gap-1 flex-1 min-w-[150px]">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">Nom :</label>
          <InputText
            v-model="evaluationName"
            placeholder="ex: Devoir 1"
            class="p-inputtext-sm text-xs font-medium w-full"
          />
        </div>

        <!-- 5. Pages par copie -->
        <div class="flex items-center gap-1.5 shrink-0">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">Pages :</label>
          <div class="flex gap-1">
            <Button
              v-for="k in [1, 2, 3, 4, 5, 6]"
              :key="k"
              :label="k.toString()"
              size="small"
              :class="[
                'p-button-sm !w-7 !h-7 !p-0 font-bold text-xs',
                pagesPerCopy === k
                  ? '!bg-blue-600 !text-white !border-blue-600 shadow-sm'
                  : 'p-button-outlined text-gray-700 dark:text-gray-300'
              ]"
              @click="pagesPerCopy = k"
            />
          </div>
        </div>

        <!-- 6. Bouton Archiver et identifier les copies... (clignotant avec flèche droite comme Step 0) -->
        <Button
          label="Archiver et identifier les copies..."
          icon="pi pi-arrow-right"
          iconPos="right"
          :disabled="!canProceed"
          :loading="isProcessing"
          :class="[
            '!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold shadow-sm shrink-0 ml-auto',
            canProceed ? 'animate-pulse' : ''
          ]"
          @click="handleSplitAndProceed"
        />
      </div>

      <!-- Informations sur le fichier chargé et barre d'outils d'aperçu -->
      <div v-if="pdfPath" class="text-xs flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
        <div class="flex items-center gap-2 truncate">
          <i class="pi pi-file text-red-500" />
          <span class="font-mono text-gray-700 dark:text-gray-200 truncate font-semibold">{{ pdfPath.split(/[/\\]/).pop() }}</span>
          <span class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-medium">
            {{ totalPages }} page(s)
          </span>
          <span v-if="totalPages" class="text-blue-600 dark:text-blue-400 font-medium">
            ({{ Math.ceil(totalPages / pagesPerCopy) }} copies estimées)
          </span>
        </div>

        <!-- Controls aperçu page & Zoom -->
        <div class="flex items-center gap-3">
          <!-- Zoom controls -->
          <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg p-0.5">
            <Button
              icon="pi pi-search-minus"
              text
              rounded
              size="small"
              :disabled="previewScale <= 1.0"
              @click="zoomPreview(-0.3)"
              v-tooltip.top="'Réduire zoom'"
            />
            <span class="text-[11px] font-mono px-1 font-semibold">{{ Math.round(previewScale * 50) }}%</span>
            <Button
              icon="pi pi-search-plus"
              text
              rounded
              size="small"
              :disabled="previewScale >= 3.5"
              @click="zoomPreview(0.3)"
              v-tooltip.top="'Agrandir zoom'"
            />
          </div>

          <!-- Page navigation -->
          <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 rounded-lg p-0.5">
            <Button
              icon="pi pi-chevron-left"
              text
              rounded
              size="small"
              :disabled="currentPage <= 1"
              @click="changePreviewPage(currentPage - 1)"
              v-tooltip.top="'Page précédente'"
            />
            <span class="font-mono text-xs px-1 font-semibold">Page {{ currentPage }} / {{ totalPages }}</span>
            <Button
              icon="pi pi-chevron-right"
              text
              rounded
              size="small"
              :disabled="currentPage >= totalPages"
              @click="changePreviewPage(currentPage + 1)"
              v-tooltip.top="'Page suivante'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Below: Cadre affichant le PDF chargé (Largeur doublée, scroll vertical) -->
    <div class="flex-1 bg-gray-100 dark:bg-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col items-center justify-center relative">
      <div v-if="!pdfBytes" class="text-center text-gray-400 dark:text-gray-500 py-20">
        <i class="pi pi-file-pdf text-6xl mb-3 text-red-300 dark:text-red-900/60 block" />
        <p class="text-base font-semibold text-gray-700 dark:text-gray-300">Aucune évaluation chargée</p>
        <p class="text-xs text-gray-400 max-w-sm mt-1">
          Cliquez sur "Charger..." pour ouvrir le document contenant toutes les copies à corriger.
        </p>
      </div>

      <!-- Preview Canvas Scrollable Container -->
      <div v-show="pdfBytes" class="w-full h-full flex flex-col items-center overflow-auto p-4">
        <canvas
          ref="canvasRef"
          class="border border-gray-300 dark:border-gray-700 shadow-xl rounded-lg bg-white my-auto block max-w-none transition-all"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import { useToast } from 'primevue/usetoast';

import { pdfService } from '../services/pdfService';
import { nativeFs } from '../services/fs';
import { studentService } from '../services/studentService';

const props = defineProps({
  sourceFolder: {
    type: String,
    default: '',
  },
  availableClasses: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['start-identification']);

const toast = useToast();

const pdfPath = ref('');
const pdfBytes = ref(null);
const totalPages = ref(0);
const currentPage = ref(1);
const pagesPerCopy = ref(1);
const evaluationName = ref('');
const selectedClass = ref('');
const evaluationDate = ref(new Date());
const isProcessing = ref(false);
const canvasRef = ref(null);
const previewScale = ref(2.0); // Largeur 2x plus grande pour voir très nettement le haut de la copie

watch(
  () => props.availableClasses,
  (classes) => {
    if (classes && classes.length && !selectedClass.value) {
      selectedClass.value = classes[0];
    }
  },
  { immediate: true }
);

const formattedDate = computed(() => {
  if (!evaluationDate.value) return '';
  const d = new Date(evaluationDate.value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const canProceed = computed(() => {
  return (
    !!pdfBytes.value &&
    !!evaluationName.value.trim() &&
    !!selectedClass.value &&
    !!formattedDate.value
  );
});

async function handleSelectPdf() {
  const cleanSource = props.sourceFolder ? props.sourceFolder.replace(/\/+$/, '') : '';
  const defaultDir = cleanSource ? `${cleanSource}/Evaluations/A corriger` : '';
  if (defaultDir) {
    try {
      await nativeFs.createDir(defaultDir);
    } catch (_) {}
  }
  const file = await nativeFs.selectFile(
    'Sélectionner les copies à corriger (PDF)',
    'Documents PDF',
    ['pdf'],
    defaultDir
  );

  if (!file) return;

  try {
    pdfPath.value = file;
    const fileName = file.split(/[/\\]/).pop().replace(/\.pdf$/i, '');
    if (!evaluationName.value) {
      evaluationName.value = fileName;
    }

    const b64 = await nativeFs.readFileBase64(file);
    const bytes = pdfService.base64ToUint8Array(b64);
    pdfBytes.value = bytes;

    const count = await pdfService.getPageCount(bytes);
    totalPages.value = count;
    currentPage.value = 1;

    const deduced = pdfService.deducePagesPerCopy(count);
    pagesPerCopy.value = deduced;

    await nextTick();
    await renderCurrentPage();

    toast.add({
      severity: 'info',
      summary: 'PDF Chargé',
      detail: `${count} pages détectées. Pages par copie suggérées : ${deduced}.`,
      life: 3000,
    });
  } catch (e) {
    console.error('Erreur ouverture PDF:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur PDF',
      detail: e.message || 'Impossible de lire le document PDF.',
      life: 4000,
    });
  }
}

async function renderCurrentPage() {
  if (!pdfBytes.value || !canvasRef.value) return;
  try {
    await pdfService.renderPageToCanvas(
      pdfBytes.value,
      canvasRef.value,
      previewScale.value,
      currentPage.value
    );
  } catch (e) {
    console.error('Erreur rendu PDF canvas:', e);
  }
}

async function changePreviewPage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return;
  currentPage.value = newPage;
  await renderCurrentPage();
}

async function zoomPreview(delta) {
  const newScale = Math.max(1.0, Math.min(3.5, previewScale.value + delta));
  previewScale.value = Math.round(newScale * 10) / 10;
  await renderCurrentPage();
}

async function handleSplitAndProceed() {
  if (!canProceed.value) return;

  isProcessing.value = true;
  try {
    const backupDir = studentService.getBackupFolderPath(props.sourceFolder);
    const fullEvalName = `${formattedDate.value} - ${selectedClass.value} - ${evaluationName.value.trim()}`;
    const backupFilePath = `${backupDir}/${fullEvalName}.pdf`;

    // 1. Vérification de conflit : vérifier si un fichier portant ce nom existe déjà dans Backup
    if (props.sourceFolder) {
      const alreadyExists = await nativeFs.checkExists(backupFilePath);
      if (alreadyExists) {
        toast.add({
          severity: 'error',
          summary: 'Fichier déjà existant dans Backup',
          detail: `Attention, le fichier "${fullEvalName}.pdf" est déjà présent dans le dossier Backup ! Veuillez modifier le nom ou la date pour éviter un conflit.`,
          life: 6000,
        });
        isProcessing.value = false;
        return;
      }
    }

    // 2. Recharger les octets du PDF depuis le fichier d'origine pour garantir une intégrité parfaite
    let bytesToSplit = pdfBytes.value;
    if (pdfPath.value) {
      const freshB64 = await nativeFs.readFileBase64(pdfPath.value);
      bytesToSplit = pdfService.base64ToUint8Array(freshB64);
      pdfBytes.value = bytesToSplit;
    }

    // 3. Découpe le PDF en copies individuelles
    const copies = await pdfService.splitPdf(bytesToSplit, pagesPerCopy.value);

    // 4. Stocke dans un répertoire temporaire
    const tempDir = props.sourceFolder
      ? `${props.sourceFolder}/Evaluations/.temp_${Date.now()}`
      : `/tmp/droopy_temp_${Date.now()}`;

    await nativeFs.createDir(tempDir);

    for (const copy of copies) {
      const copyPath = `${tempDir}/${copy.filename}`;
      await nativeFs.writeFileBase64(copyPath, copy.base64);
      copy.tempPath = copyPath;
      copy.classe = selectedClass.value;
      copy.evaluationName = evaluationName.value.trim();
      copy.evaluationDate = formattedDate.value;
    }

    // 5. Déplacer et renommer le PDF d'origine vers /Evaluations/Backup (au lieu d'une copie)
    if (props.sourceFolder && pdfPath.value) {
      await nativeFs.moveFile(pdfPath.value, backupFilePath);
    }

    toast.add({
      severity: 'success',
      summary: 'Évaluation archivée et découpée',
      detail: `${copies.length} copies découpées. Le PDF a été déplacé dans Backup sous le nom "${fullEvalName}.pdf".`,
      life: 4000,
    });

    // 6. Passe au Step 2
    emit('start-identification', {
      evaluationName: evaluationName.value.trim(),
      evaluationDate: formattedDate.value,
      fullEvalName,
      classe: selectedClass.value,
      copies,
      tempDir,
    });
  } catch (e) {
    console.error('Erreur découpage:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur découpage',
      detail: e.message || 'Échec lors du découpage du document PDF.',
      life: 4000,
    });
  } finally {
    isProcessing.value = false;
  }
}
</script>
