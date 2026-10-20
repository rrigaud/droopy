<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans">
    <Toast position="bottom-right" />
    <ConfirmDialog />

    <!-- Horizontal Top Header with Stepper Menu & Settings Button -->
    <HeaderBar
      :activeStep="activeStep"
      :canAccessStep1="canAccessStep1"
      :canAccessStep2="canAccessStep2"
      :canAccessStep3="canAccessStep3"
      :step0Completed="step0Completed"
      :step1Completed="step1Completed"
      :step2Completed="step2Completed"
      :step3Completed="step3Completed"
      :sourceFolder="sourceFolder"
      @open-settings="settingsVisible = true"
      @change-step="handleChangeStep"
    />

    <!-- Main Content Area (displays active step view) -->
    <main class="flex-1 overflow-hidden">
      <!-- Step 0: Elèves -->
      <Step0Students
        v-if="activeStep === 0"
        :students="students"
        :sourceFolder="sourceFolder"
        :isAllOk="isStep0AllOk"
        @open-csv-picker="handleOpenCsvPicker"
        @go-step-1="goToStep1"
        @update-students="handleUpdateStudents"
      />

      <!-- Step 1: Chargement des copies -->
      <Step1Evaluation
        v-else-if="activeStep === 1"
        :sourceFolder="sourceFolder"
        :availableClasses="availableClasses"
        @start-identification="handleStartIdentification"
      />

      <!-- Step 2: Identification des copies -->
      <Step2Identification
        v-else-if="activeStep === 2"
        :copies="currentCopies"
        :classStudents="currentClassStudents"
        :evaluationInfo="currentEvaluationInfo"
        @go-step-3="handleGoStep3"
      />

      <!-- Step 3: Distribution des copies -->
      <Step3Distribution
        v-else-if="activeStep === 3"
        :sourceFolder="sourceFolder"
        :evaluationInfo="currentEvaluationInfo"
        :classStudents="currentClassStudents"
        :identifiedCopies="identifiedCopies"
        @reset-evaluation="handleResetEvaluation"
      />
    </main>

    <!-- Dialogs -->
    <SettingsDialog
      v-model:visible="settingsVisible"
      :sourceFolder="sourceFolder"
      @update:sourceFolder="handleSourceFolderChanged"
      @themeChanged="handleThemeChanged"
    />

    <CsvImportDialog
      v-model:visible="csvImportVisible"
      :csvText="currentCsvText"
      @import-students="handleImportStudentsFromCsv"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useToast } from 'primevue/usetoast';

import HeaderBar from './components/HeaderBar.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import CsvImportDialog from './components/CsvImportDialog.vue';
import Step0Students from './components/Step0Students.vue';
import Step1Evaluation from './components/Step1Evaluation.vue';
import Step2Identification from './components/Step2Identification.vue';
import Step3Distribution from './components/Step3Distribution.vue';

import { storage } from './services/storage';
import { studentService } from './services/studentService';
import { nativeFs } from './services/fs';

const toast = useToast();

const activeStep = ref(0);
const sourceFolder = ref(storage.getSourceFolder());
const settingsVisible = ref(false);
const csvImportVisible = ref(false);
const currentCsvText = ref('');

const students = ref([]);
const availableClasses = ref([]);

// Évaluation en cours
const currentEvaluationInfo = ref({});
const currentCopies = ref([]);
const identifiedCopies = ref([]);

const step1Completed = ref(false);
const step2Completed = ref(false);
const step3Completed = ref(false);

const isStep0AllOk = computed(() => {
  if (!sourceFolder.value) return false;
  if (!students.value.length) return false;
  return studentService.allFoldersExist(students.value);
});

const step0Completed = computed(() => isStep0AllOk.value);
const canAccessStep1 = computed(() => isStep0AllOk.value);
const canAccessStep2 = computed(() => currentCopies.value.length > 0);
const canAccessStep3 = computed(() => identifiedCopies.value.length > 0);

const currentClassStudents = computed(() => {
  if (!currentEvaluationInfo.value?.classe) return [];
  const targetClass = currentEvaluationInfo.value.classe.toLowerCase();
  return students.value.filter(
    (s) => (s.classe || '').toLowerCase() === targetClass
  );
});

onMounted(async () => {
  await loadAppData();
});

async function loadAppData() {
  if (sourceFolder.value) {
    try {
      // Vérifier et créer l'arborescence requise dans le dossier Source
      await studentService.ensureSourceStructure(sourceFolder.value);

      const loaded = await studentService.loadStudents(sourceFolder.value);
      // Assigner une clé unique loginKey
      students.value = loaded.map((s, idx) => ({
        ...s,
        loginKey: s.login || `st_${idx}_${s.name}`,
      }));

      availableClasses.value = await studentService.getAvailableClasses(
        sourceFolder.value,
        students.value
      );

      // Vérification du démarrage selon spécification:
      // "Au démarrage, le logiciel doit vérifier que toutes les données nécessaires
      // sont bien renseignées et présentes. Si c'est le cas, on doit valider le Step 0
      // et passer directement au Step 1."
      if (isStep0AllOk.value) {
        activeStep.value = 1;
      } else {
        activeStep.value = 0;
      }
    } catch (e) {
      console.error('Erreur chargement données au démarrage:', e);
      activeStep.value = 0;
    }
  } else {
    // Si aucun dossier source n'est configuré, ouvrir les paramètres
    activeStep.value = 0;
    settingsVisible.value = true;
  }
}

async function handleSourceFolderChanged(newFolder) {
  sourceFolder.value = newFolder;
  await loadAppData();
  toast.add({
    severity: 'success',
    summary: 'Dossier Source configuré',
    detail: newFolder,
    life: 3000,
  });
}

function handleThemeChanged() {
  // Le thème est déjà appliqué au DOM via storage.setTheme
}

function handleChangeStep(stepId) {
  activeStep.value = stepId;
}

function goToStep1() {
  if (canAccessStep1.value) {
    activeStep.value = 1;
  }
}

async function handleOpenCsvPicker() {
  const file = await nativeFs.selectFile(
    'Importer un fichier CSV d\'élèves',
    'Fichiers CSV',
    ['csv', 'txt']
  );
  if (!file) return;

  try {
    const text = await nativeFs.readTextFile(file);
    currentCsvText.value = text;
    csvImportVisible.value = true;
  } catch (e) {
    console.error('Erreur lecture CSV:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur CSV',
      detail: e.message || 'Impossible de lire le fichier CSV.',
      life: 4000,
    });
  }
}

async function handleImportStudentsFromCsv(newStudents) {
  if (!sourceFolder.value) {
    toast.add({
      severity: 'error',
      summary: 'Dossier Source requis',
      detail: 'Configurez d\'abord le dossier Source dans les Paramètres.',
      life: 3000,
    });
    return;
  }

  try {
    // Fusionne avec les élèves existants (évite les doublons par nom+classe)
    const existing = [...students.value];
    const existingMap = new Map();
    existing.forEach((s) => existingMap.set(`${s.classe}__${s.name}`.toLowerCase(), s));

    for (const ns of newStudents) {
      const key = `${ns.classe}__${ns.name}`.toLowerCase();
      if (!existingMap.has(key)) {
        existing.push({
          ...ns,
          loginKey: ns.login || `st_${Date.now()}_${ns.name}`,
          isFolder: false,
        });
      }
    }

    // Sauvegarde dans eleves.json
    await studentService.saveStudents(sourceFolder.value, existing);
    await loadAppData();

    toast.add({
      severity: 'success',
      summary: 'Importation réussie',
      detail: `${newStudents.length} élèves importés dans eleves.json`,
      life: 3500,
    });
  } catch (e) {
    console.error('Erreur sauvegarde élèves CSV:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur import',
      detail: e.message || 'Échec lors de l\'enregistrement des élèves.',
      life: 4000,
    });
  }
}

async function handleUpdateStudents(updatedList) {
  students.value = updatedList;
  if (sourceFolder.value) {
    try {
      await studentService.saveStudents(sourceFolder.value, updatedList);
      availableClasses.value = await studentService.getAvailableClasses(
        sourceFolder.value,
        students.value
      );
    } catch (e) {
      console.error('Erreur sauvegarde students:', e);
    }
  }
}

function handleStartIdentification(evalData) {
  currentEvaluationInfo.value = evalData;
  currentCopies.value = evalData.copies || [];
  step1Completed.value = true;
  activeStep.value = 2;
}

function handleGoStep3({ identifiedCopies: copies }) {
  identifiedCopies.value = copies;
  step2Completed.value = true;
  activeStep.value = 3;
}

function handleResetEvaluation() {
  currentEvaluationInfo.value = {};
  currentCopies.value = [];
  identifiedCopies.value = [];
  step1Completed.value = false;
  step2Completed.value = false;
  step3Completed.value = false;
  activeStep.value = 1;
}
</script>
