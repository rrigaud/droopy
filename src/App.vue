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
        @sync-folders-shares="handleSyncFoldersShares"
        @generate-portal="handleGeneratePortal"
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

    <!-- Boîte de dialogue de succès : Génération Portail Web -->
    <Dialog
      v-model:visible="portalSuccessVisible"
      modal
      :style="{ width: '500px' }"
      :closable="true"
    >
      <template #header>
        <div class="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-gray-100">
          <i class="pi pi-globe text-purple-600 text-lg" />
          <span>Portail Web généré</span>
        </div>
      </template>

      <div class="py-2 text-sm text-gray-700 dark:text-gray-200 space-y-4">
        <!-- En-tête avec check vert et détails espacés -->
        <div class="flex items-start gap-3.5">
          <i class="pi pi-check-circle text-emerald-500 text-3xl shrink-0 mt-0.5" />
          <div class="space-y-2">
            <p class="font-bold text-gray-900 dark:text-gray-100 text-sm">
              Le portail web a bien été généré avec succès !
            </p>
            <div class="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                <span><strong>{{ portalSuccessData.studentCount }}</strong> élève(s) chiffré(s) (AES-GCM 256 bits)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Thème graphique : <strong>{{ portalThemeLabel }}</strong></span>
              </div>
              <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-mono text-[11px] truncate max-w-[360px]" :title="portalSuccessData.path">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span class="truncate">Dossier : {{ portalSuccessData.folderName }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Saut de ligne / séparation et question Finder -->
        <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-800 dark:text-gray-200 font-medium">
            Souhaitez-vous ouvrir ce dossier dans le Finder pour le mettre en ligne ?
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <Button
            label="Fermer"
            severity="secondary"
            class="p-button-outlined text-xs"
            @click="portalSuccessVisible = false"
          />
          <Button
            label="Ouvrir dans le Finder"
            icon="pi pi-folder-open"
            class="!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold text-xs shadow-sm"
            @click="handleOpenPortalInFinder"
            autofocus
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

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
import { generateRandomPassword } from './services/dictionary';
import { dropboxService } from './services/dropboxService';
import { settingsService } from './services/settingsService';
import { portalGeneratorService } from './services/portalGeneratorService';
import { sanitizeFolderName } from './services/accentUtils';

const toast = useToast();
const confirm = useConfirm();

const activeStep = ref(0);
const sourceFolder = ref(storage.getSourceFolder());
const settingsVisible = ref(false);
const csvImportVisible = ref(false);
const currentCsvText = ref('');
const hasPromptedUrlCleanup = ref(false);

const students = ref([]);
const availableClasses = ref([]);

// Modal Succès Portail Web
const portalSuccessVisible = ref(false);
const portalSuccessData = ref({
  path: '',
  folderName: 'Portail-Web',
  studentCount: 0,
  portalTheme: 'emeraude',
});

const portalThemeLabel = computed(() => {
  const t = portalSuccessData.value.portalTheme;
  if (t === 'emeraude') return 'Émeraude';
  if (t === 'sombre') return 'Sombre';
  if (t === 'clair') return 'Clair';
  return t;
});

async function handleOpenPortalInFinder() {
  portalSuccessVisible.value = false;
  if (portalSuccessData.value.path) {
    await nativeFs.openPath(portalSuccessData.value.path);
  }
}

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
      // Initialise ou charge les préférences du portail pour ce dossier Source
      await settingsService.loadSettings(sourceFolder.value);

      const loaded = await studentService.loadStudents(sourceFolder.value);
      // Assigner un ID unique permanent
      const mapped = loaded.map((s, idx) => ({
        ...s,
        id: s.id !== undefined && s.id !== null ? Number(s.id) : idx + 1,
      }));

      // Vérification du statut Dropbox réel
      const checked = await dropboxService.checkStudentsDropboxStatus(sourceFolder.value, mapped);
      students.value = checked;

      // Détection des URLs orphelines (ex: URL présente alors que le dossier n'existe pas en ligne)
      const orphanStudents = checked.filter((s) => s.urlDropbox && !s.isDropboxFolder);

      if (orphanStudents.length > 0 && !hasPromptedUrlCleanup.value) {
        hasPromptedUrlCleanup.value = true;
        confirm.require({
          message: `${orphanStudents.length} élève(s) possèdent une adresse URL Dropbox qui ne correspond à aucun dossier valide en ligne (ou votre dossier Source actuel est hors de Dropbox). Souhaitez-vous supprimer ces URLs non valides ?`,
          header: 'Nettoyage des URLs Dropbox',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'Supprimer les URLs',
          rejectLabel: 'Conserver (pour tests)',
          acceptClass: 'p-button-danger',
          rejectClass: 'p-button-secondary p-button-outlined',
          accept: async () => {
            const cleaned = checked.map((s) => {
              if (s.urlDropbox && !s.isDropboxFolder) {
                return { ...s, urlDropbox: '', isShared: false };
              }
              return s;
            });
            students.value = cleaned;
            await studentService.saveStudents(sourceFolder.value, cleaned);
            toast.add({
              severity: 'success',
              summary: 'Nettoyage terminé',
              detail: `${orphanStudents.length} URL(s) Dropbox factice(s) ou orpheline(s) ont été supprimées.`,
              life: 3500,
            });
          },
          reject: () => {
            toast.add({
              severity: 'info',
              summary: 'URLs conservées',
              detail: 'Les URLs existantes ont été conservées pour vos tests.',
              life: 3000,
            });
          },
        });
      }

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
  hasPromptedUrlCleanup.value = false;
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

    let maxId = existing.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);

    for (const ns of newStudents) {
      const key = `${ns.classe}__${ns.name}`.toLowerCase();
      if (!existingMap.has(key)) {
        maxId += 1;
        existing.push({
          ...ns,
          id: maxId,
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
  let maxId = 0;
  const listWithIds = updatedList.map((s, idx) => {
    let id = s.id !== undefined && s.id !== null && !isNaN(Number(s.id)) ? Number(s.id) : (maxId + 1);
    if (id <= maxId) id = maxId + 1;
    maxId = Math.max(maxId, id);
    return { ...s, id };
  });

  students.value = listWithIds;
  if (sourceFolder.value) {
    try {
      await studentService.saveStudents(sourceFolder.value, listWithIds);
      availableClasses.value = await studentService.getAvailableClasses(
        sourceFolder.value,
        students.value
      );
    } catch (e) {
      console.error('Erreur sauvegarde students:', e);
    }
  }
}

async function handleSyncFoldersShares() {
  if (!sourceFolder.value) {
    toast.add({
      severity: 'warn',
      summary: 'Dossier Source requis',
      detail: 'Configurez d\'abord le dossier Source dans les Paramètres.',
      life: 3000,
    });
    return;
  }

  try {
    let createdLocalFolders = 0;
    let generatedPasswords = 0;
    let createdDropboxShares = 0;

    const updated = [...students.value];

    // 1. Synchronisation locale (dossiers physiques & mots de passe manquants)
    for (const s of updated) {
      if (!s.isFolder) {
        await studentService.createFolderForStudent(sourceFolder.value, s);
        s.isFolder = true;
        createdLocalFolders++;
      }
      if (!s.password) {
        s.password = generateRandomPassword();
        generatedPasswords++;
      }
    }

    // 2. Synchronisation Dropbox (uniquement si connecté ET si dossier Source dans Dropbox)
    const isConnected = storage.isDropboxConnected();
    const sourceInfo = await dropboxService.getSourceFolderDropboxInfo(sourceFolder.value);

    if (isConnected && sourceInfo.inDropbox) {
      const elevesDropboxPath = `${sourceInfo.relativePath}/Evaluations/Eleves`;

      for (let i = 0; i < updated.length; i++) {
        const s = updated[i];
        if (!s.urlDropbox || !s.urlDropbox.startsWith('https://www.dropbox.com/')) {
          const cleanClass = sanitizeFolderName(s.classe || '');
          const cleanName = sanitizeFolderName(s.name || '');
          const targetFolder = `${elevesDropboxPath}/${cleanClass}/${cleanName}`;

          try {
            const url = await dropboxService.getOrCreateSharedLink(targetFolder);
            if (url) {
              s.urlDropbox = url;
              s.isShared = true;
              s.isDropboxFolder = true;
              createdDropboxShares++;

              // Mise à jour visuelle en direct dans le tableau
              students.value = [...updated];

              // Pause de 200ms entre les requêtes pour ne pas surcharger Dropbox
              await new Promise((r) => setTimeout(r, 200));
            }
          } catch (err) {
            console.warn(`Lien Dropbox non créé pour ${s.name}:`, err);
          }
        }
      }
    }

    // Sauvegarde persistante dans eleves.json
    await studentService.saveStudents(sourceFolder.value, updated);
    students.value = [...updated];

    // Rapport d'état selon la configuration
    if (!isConnected) {
      toast.add({
        severity: 'info',
        summary: 'Synchronisation locale réussie',
        detail: `${createdLocalFolders} dossier(s) créés, ${generatedPasswords} mot(s) de passe. Connectez Dropbox dans les Paramètres pour activer les partages.`,
        life: 5000,
      });
    } else if (!sourceInfo.inDropbox) {
      toast.add({
        severity: 'warn',
        summary: 'Dossier Source hors Dropbox',
        detail: `${createdLocalFolders} dossier(s) locaux créés. Le dossier Source actuel n'étant pas dans votre Dropbox (${sourceInfo.dropboxRoot}), aucun partage en ligne n'a été créé.`,
        life: 6000,
      });
    } else {
      toast.add({
        severity: 'success',
        summary: 'Synchronisation complète terminée',
        detail: `${createdLocalFolders} dossier(s) locaux, ${generatedPasswords} mot(s) de passe, ${createdDropboxShares} nouveau(x) partage(s) Dropbox activé(s).`,
        life: 5000,
      });
    }
  } catch (e) {
    console.error('Erreur synchronisation:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur synchronisation',
      detail: e.message || 'Échec lors de la synchronisation.',
      life: 4000,
    });
  }
}

async function handleGeneratePortal() {
  if (!sourceFolder.value) {
    toast.add({
      severity: 'warn',
      summary: 'Dossier Source requis',
      detail: 'Configurez d\'abord le dossier Source dans les Paramètres.',
      life: 3000,
    });
    return;
  }

  if (!students.value.length) {
    toast.add({
      severity: 'warn',
      summary: 'Aucun élève',
      detail: 'Importez ou ajoutez des élèves avant de générer le portail.',
      life: 3000,
    });
    return;
  }

  try {
    const res = await portalGeneratorService.generatePortal(sourceFolder.value, students.value);

    portalSuccessData.value = {
      path: res.path,
      folderName: 'Portail-Web',
      studentCount: res.studentCount,
      portalTheme: res.portalTheme,
    };
    portalSuccessVisible.value = true;

    toast.add({
      severity: 'success',
      summary: 'Portail Web généré',
      detail: `${res.studentCount} élèves chiffrés. Dossier Portail-Web prêt.`,
      life: 4000,
    });
  } catch (err) {
    console.error('Erreur génération portail:', err);
    toast.add({
      severity: 'error',
      summary: 'Échec de génération',
      detail: err.message || 'Impossible de générer le portail Web.',
      life: 5000,
    });
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
