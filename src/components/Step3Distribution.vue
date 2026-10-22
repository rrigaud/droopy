<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-hidden">
    <!-- Top Evaluation Header Banner -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-300">
          <i class="pi pi-file-edit text-xl" />
        </div>
        <div>
          <div class="text-xs uppercase tracking-wider font-bold text-gray-400">Évaluation</div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
            {{ fullEvaluationName }}
          </h2>
        </div>
      </div>

      <!-- Stats pills -->
      <div class="flex items-center gap-3 text-xs">
        <span class="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full font-semibold">
          {{ presentCopiesCount }} copie(s) identifiée(s)
        </span>
        <span class="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 px-2.5 py-1 rounded-full font-semibold">
          {{ absentCopiesCount }} copie(s) absente(s)
        </span>
        <span v-if="classAverage !== null" class="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full font-semibold font-mono">
          Moyenne : {{ classAverage }}
        </span>
      </div>
    </div>

    <!-- Full-width Recap Table -->
    <div class="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
      <DataTable
        :value="recapRows"
        scrollable
        scrollHeight="flex"
        stripedRows
        removableSort
        class="p-datatable-sm flex-1 min-h-0"
        tableStyle="min-width: 50rem"
      >
        <Column field="classe" header="Classe" sortable style="width: 8rem">
          <template #body="{ data }">
            <span class="font-bold text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {{ data.classe }}
            </span>
          </template>
        </Column>

        <Column field="name" header="Elève" sortable>
          <template #body="{ data }">
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ data.name }}</span>
          </template>
        </Column>

        <!-- Colonne Copie -->
        <Column field="isIdentified" header="Copie" sortable style="width: 12rem">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span
                v-if="data.isIdentified"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <i class="pi pi-check-circle text-emerald-600 dark:text-emerald-400" />
                Identifiée
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              >
                <i class="pi pi-times-circle text-red-600 dark:text-red-400" />
                Absente
              </span>
            </div>
          </template>
        </Column>

        <!-- Colonne Note -->
        <Column field="grade" header="Note" sortable style="width: 10rem; text-align: right">
          <template #body="{ data }">
            <span
              v-if="data.grade !== null && data.grade !== undefined && data.grade !== ''"
              class="font-mono font-bold text-sm bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded text-gray-900 dark:text-gray-100"
            >
              {{ data.grade }}
            </span>
            <span v-else class="text-gray-400 italic text-xs">—</span>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Bottom Action Bar -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between shrink-0">
      <div class="flex-1" />

      <!-- Boutons au milieu -->
      <div class="flex items-center gap-4">
        <Button
          label="Distribuer les copies"
          icon="pi pi-send"
          :loading="isDistributing"
          :disabled="isDistributed"
          @click="handleDistributeCopies"
          class="!bg-blue-600 !hover:bg-blue-700 !text-white font-bold px-5 py-2.5 shadow"
        />

        <ButtonGroup class="shadow-sm">
          <Button
            label="Exporter [élève, note]"
            icon="pi pi-copy"
            severity="success"
            class="p-button-outlined font-semibold py-2.5 px-4"
            @click="handleExportStudentAndGrades"
            v-tooltip.top="'Copier [Nom\tNote] dans le presse-papier'"
          />
          <Button
            label="Exporter [note]"
            icon="pi pi-clipboard"
            severity="success"
            class="p-button-outlined font-semibold py-2.5 px-4"
            @click="handleExportGradesOnly"
            v-tooltip.top="'Copier uniquement la colonne des notes (lignes vides respectées)'"
          />
        </ButtonGroup>
      </div>

      <!-- Bouton tout à droite (révélé après export ou distribution) -->
      <div class="flex-1 flex justify-end">
        <Button
          v-if="showNewEvaluationButton"
          label="Distribuer une autre évaluation..."
          icon="pi pi-refresh"
          severity="help"
          @click="$emit('reset-evaluation')"
          class="font-semibold shadow animate-fadeIn"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';
import { useToast } from 'primevue/usetoast';

import { nativeFs } from '../services/fs';
import { studentService } from '../services/studentService';
import { sanitizeFolderName } from '../services/accentUtils';

const props = defineProps({
  sourceFolder: {
    type: String,
    default: '',
  },
  evaluationInfo: {
    type: Object,
    default: () => ({}),
  },
  classStudents: {
    type: Array,
    default: () => [],
  },
  identifiedCopies: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['reset-evaluation']);

const toast = useToast();

const isDistributing = ref(false);
const isDistributed = ref(false);
const showNewEvaluationButton = ref(false);

const fullEvaluationName = computed(() => {
  return (
    props.evaluationInfo.fullEvalName ||
    `${props.evaluationInfo.evaluationDate || ''} - ${props.evaluationInfo.classe || ''} - ${props.evaluationInfo.evaluationName || ''}`
  );
});

// Tableau récapitulatif trié par ordre alphabétique des élèves de la classe
const recapRows = computed(() => {
  const copiesMap = new Map();
  props.identifiedCopies.forEach((c) => {
    if (c.studentName) {
      copiesMap.set(c.studentName.toLowerCase(), c);
    }
  });

  return [...props.classStudents]
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map((st) => {
      const copy = copiesMap.get((st.name || '').toLowerCase());
      return {
        classe: st.classe,
        name: st.name,
        isIdentified: !!copy,
        grade: copy ? copy.grade : null,
        copyObj: copy || null,
      };
    });
});

const presentCopiesCount = computed(() => {
  return recapRows.value.filter((r) => r.isIdentified).length;
});

const absentCopiesCount = computed(() => {
  return recapRows.value.filter((r) => !r.isIdentified).length;
});

const classAverage = computed(() => {
  const grades = recapRows.value
    .filter((r) => r.isIdentified && r.grade !== null && r.grade !== undefined && !isNaN(r.grade))
    .map((r) => Number(r.grade));

  if (!grades.length) return null;
  const sum = grades.reduce((acc, g) => acc + g, 0);
  return (sum / grades.length).toFixed(2).replace('.', ',');
});


async function handleDistributeCopies() {
  if (!props.sourceFolder) {
    toast.add({
      severity: 'error',
      summary: 'Dossier Source manquant',
      detail: 'Veuillez configurer le dossier Source.',
      life: 3000,
    });
    return;
  }

  isDistributing.value = true;
  try {
    const rootEleves = studentService.getElevesFolderPath(props.sourceFolder);

    for (const copy of props.identifiedCopies) {
      if (!copy.studentName) continue;

      const cleanClass = sanitizeFolderName(props.evaluationInfo.classe || copy.classe);
      const cleanStudentName = sanitizeFolderName(copy.studentName);
      const targetFolder = `${rootEleves}/${cleanClass}/${cleanStudentName}`;

      await nativeFs.createDir(targetFolder);

      // Nom du fichier: "Date de passation - Classe - Nom de l'évaluation - Nom de l'élève.pdf"
      const datePart = props.evaluationInfo.evaluationDate || '';
      const evalPart = props.evaluationInfo.evaluationName || '';
      const newFileName = `${datePart} - ${cleanClass} - ${evalPart} - ${cleanStudentName}.pdf`;
      const targetPath = `${targetFolder}/${newFileName}`;

      if (copy.tempPath) {
        await nativeFs.moveFile(copy.tempPath, targetPath);
      } else if (copy.base64) {
        await nativeFs.writeFileBase64(targetPath, copy.base64);
      }
    }

    // Nettoyage du répertoire temporaire
    if (props.evaluationInfo.tempDir) {
      try {
        await nativeFs.deleteDir(props.evaluationInfo.tempDir);
      } catch (e) {
        console.warn('Suppression temp dir:', e);
      }
    }

    isDistributed.value = true;
    showNewEvaluationButton.value = true;

    toast.add({
      severity: 'success',
      summary: 'Distribution réussie',
      detail: 'Les copies ont bien été distribuées !',
      life: 4000,
    });
  } catch (e) {
    console.error('Erreur distribution copies:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur distribution',
      detail: e.message || 'Échec lors du déplacement des copies.',
      life: 4000,
    });
  } finally {
    isDistributing.value = false;
  }
}

async function handleExportStudentAndGrades() {
  // Formatage texte brut (TSV) pour tableurs classiques
  const tsvLines = recapRows.value.map((r) => {
    const gradeStr =
      r.grade !== null && r.grade !== undefined && r.grade !== ''
        ? r.grade.toString().replace('.', ',')
        : '';
    return `${r.name}\t${gradeStr}`;
  });
  const tsvText = tsvLines.join('\n');

  // Formatage HTML <table> pour Notion et éditeurs riches
  const htmlRows = recapRows.value
    .map((r) => {
      const gradeStr =
        r.grade !== null && r.grade !== undefined && r.grade !== ''
          ? r.grade.toString().replace('.', ',')
          : '';
      const safeName = (r.name || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<tr><td>${safeName}</td><td>${gradeStr}</td></tr>`;
    })
    .join('');
  const htmlTable = `<table><tbody>${htmlRows}</tbody></table>`;

  try {
    await nativeFs.copyToClipboard(tsvText, htmlTable);
    showNewEvaluationButton.value = true;

    toast.add({
      severity: 'success',
      summary: 'Export [élève, note]',
      detail: 'Les noms et notes ont été copiés dans le presse-papier !',
      life: 4000,
    });
  } catch (e) {
    console.error('Erreur export presse-papier:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur presse-papier',
      detail: 'Impossible de copier dans le presse-papier.',
      life: 3000,
    });
  }
}

async function handleExportGradesOnly() {
  // Formatage texte brut (1 note par ligne avec lignes vides pour absents)
  const lines = recapRows.value.map((r) => {
    return r.grade !== null && r.grade !== undefined && r.grade !== ''
      ? r.grade.toString().replace('.', ',')
      : '';
  });
  const text = lines.join('\n');

  // Formatage HTML <table> pour Notion et éditeurs riches
  const htmlRows = recapRows.value
    .map((r) => {
      const gradeStr =
        r.grade !== null && r.grade !== undefined && r.grade !== ''
          ? r.grade.toString().replace('.', ',')
          : '';
      return `<tr><td>${gradeStr}</td></tr>`;
    })
    .join('');
  const htmlTable = `<table><tbody>${htmlRows}</tbody></table>`;

  try {
    await nativeFs.copyToClipboard(text, htmlTable);
    showNewEvaluationButton.value = true;

    toast.add({
      severity: 'success',
      summary: 'Export [note]',
      detail: 'Les notes seules ont été copiées dans le presse-papier (lignes vides conservées) !',
      life: 4000,
    });
  } catch (e) {
    console.error('Erreur export presse-papier:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur presse-papier',
      detail: 'Impossible de copier dans le presse-papier.',
      life: 3000,
    });
  }
}
</script>
