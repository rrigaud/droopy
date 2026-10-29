<template>
  <div class="h-full flex flex-col p-4 space-y-3 overflow-hidden">
    <!-- Bandeau 1: Actions Générales & Navigation (Toujours visible) -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- ButtonGroup : Importer un CSV + Ajouter un élève -->
        <ButtonGroup class="shadow-sm">
          <Button
            label="Importer un CSV"
            icon="pi pi-upload"
            @click="$emit('open-csv-picker')"
            class="p-button-outlined"
            v-tooltip.bottom="'Importer ou fusionner un fichier CSV d\'élèves'"
          />
          <Button
            label="Ajouter un élève"
            icon="pi pi-user-plus"
            @click="openAddStudentDialog"
            class="p-button-outlined"
            v-tooltip.bottom="'Créer manuellement une nouvelle fiche élève'"
          />
        </ButtonGroup>

        <!-- Bouton séparé : Synchroniser les dossiers & partages -->
        <Button
          label="Synchroniser les dossiers & partages"
          icon="pi pi-sync"
          severity="info"
          class="p-button-outlined"
          @click="handleSyncFoldersAndShares"
          v-tooltip.bottom="'Crée les dossiers locaux, mots de passe et partages manquants sans écraser l\'existant'"
        />

        <!-- Bouton séparé : Générer le portail de connexion -->
        <Button
          label="Générer le portail de connexion"
          icon="pi pi-globe"
          severity="help"
          class="p-button-outlined"
          @click="handleGeneratePortal"
          v-tooltip.bottom="'Génère le dossier autonome Portail-Web prêt à être mis en ligne sur votre hébergement web'"
        />
      </div>

      <!-- Right Action: Statut et Charger des copies -->
      <div class="flex items-center gap-2">
        <!-- Status badge info -->
        <div v-if="!isAllOk" class="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
          <i class="pi pi-exclamation-triangle" />
          <span>{{ missingConditionMessage }}</span>
        </div>

        <Button
          v-if="isAllOk"
          label="Charger des copies..."
          icon="pi pi-arrow-right"
          iconPos="right"
          @click="$emit('go-step-1')"
          class="!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold shadow-sm animate-pulse"
        />
      </div>
    </div>

    <!-- Bandeau 2: Actions par Lots (Affiché juste au-dessous si des élèves sont sélectionnés) -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2 max-h-0 overflow-hidden"
      enter-to-class="opacity-100 translate-y-0 max-h-24"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 max-h-24"
      leave-to-class="opacity-0 -translate-y-2 max-h-0 overflow-hidden"
    >
      <div
        v-if="selectedStudents.length > 0"
        class="flex flex-wrap items-center justify-between gap-3 bg-purple-50/60 dark:bg-purple-950/25 p-2.5 px-3 rounded-xl border border-purple-200 dark:border-purple-900/50 shadow-sm shrink-0"
      >
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- ButtonGroup des Actions de Génération avec préfixe "Générer..." -->
          <ButtonGroup class="shadow-sm">
            <span
              class="inline-flex items-center px-3.5 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/50 border border-purple-300 dark:border-purple-700 select-none rounded-l-lg border-r-0"
            >
              Générer...
            </span>
            <Button
              label="Les dossiers"
              icon="pi pi-folder-plus"
              severity="help"
              class="p-button-outlined !border-purple-300 dark:!border-purple-700 !rounded-none"
              @click="handleBatchCreateFolders"
              v-tooltip.bottom="'Créer le dossier local pour chaque élève sélectionné'"
            />
            <Button
              label="Les mots de passe"
              icon="pi pi-key"
              severity="help"
              class="p-button-outlined !border-purple-300 dark:!border-purple-700 !rounded-none"
              @click="handleBatchGeneratePasswords"
              v-tooltip.bottom="'Générer un mot de passe pour les élèves sélectionnés'"
            />
            <Button
              label="Les étiquettes Élèves"
              icon="pi pi-id-card"
              severity="help"
              class="p-button-outlined !border-purple-300 dark:!border-purple-700 !rounded-none"
              @click="handleBatchGenerateLabelsPdf"
              v-tooltip.bottom="'PDF des étiquettes individuelles (2 colonnes) pour cahiers d\'élèves'"
            />
            <Button
              label="Le tableau de connexion"
              icon="pi pi-table"
              severity="help"
              class="p-button-outlined !border-purple-300 dark:!border-purple-700 !rounded-none"
              @click="handleBatchGenerateTablePdf"
              v-tooltip.bottom="'PDF récapitulatif en tableau classé par classe et nom pour le professeur'"
            />
            <Button
              label="Un CSV"
              icon="pi pi-file-export"
              severity="help"
              class="p-button-outlined !border-purple-300 dark:!border-purple-700 !rounded-r-lg"
              @click="handleBatchExportCsv"
              v-tooltip.bottom="'Exporter un fichier CSV des données des élèves sélectionnés'"
            />
          </ButtonGroup>

          <!-- Bouton séparé : Supprimer -->
          <Button
            :label="`Supprimer (${selectedStudents.length})`"
            icon="pi pi-trash"
            severity="danger"
            class="p-button-outlined shadow-sm"
            @click="handleBatchDeleteStudents"
            v-tooltip.bottom="'Supprimer les élèves sélectionnés'"
          />
        </div>

        <!-- Droite : Indicateur et bouton désélectionner -->
        <div class="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
          <span class="font-medium">{{ selectedStudents.length }} sélectionné(s)</span>
          <button
            type="button"
            @click="selectedStudents = []"
            class="text-purple-600 dark:text-purple-400 hover:underline hover:text-purple-800 dark:hover:text-purple-200 ml-1"
          >
            Tout désélectionner
          </button>
        </div>
      </div>
    </transition>

    <!-- Main DataTable -->
    <div class="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
      <DataTable
        :value="students"
        v-model:selection="selectedStudents"
        dataKey="id"
        v-model:filters="filters"
        filterDisplay="menu"
        :globalFilterFields="['id', 'classe', 'name', 'login', 'urlDropbox']"
        scrollable
        scrollHeight="flex"
        stripedRows
        removableSort
        class="p-datatable-sm flex-1 min-h-0"
        tableStyle="min-width: 50rem"
      >
        <template #header>
          <div class="flex flex-wrap justify-between items-center gap-2 px-1 py-1">
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <i class="pi pi-users text-blue-500" />
              <span>Total : {{ students.length }} élève(s)</span>
              <span v-if="selectedStudents.length" class="text-xs font-normal text-blue-600 dark:text-blue-400">
                ({{ selectedStudents.length }} sélectionné(s))
              </span>
            </div>
            <!-- Filtres en partant de la droite : Recherche, Sexe, Classe -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Filtre Classe -->
              <div v-if="availableClasses.length > 0" class="flex items-center">
                <SelectButton
                  v-model="selectedClass"
                  :options="classFilterOptions"
                  :allowEmpty="false"
                  size="small"
                  class="text-xs font-semibold"
                />
              </div>

              <!-- Filtre Sexe -->
              <div v-if="availableGenders.length > 0" class="flex items-center">
                <SelectButton
                  v-model="selectedGender"
                  :options="genderFilterOptions"
                  :allowEmpty="false"
                  size="small"
                  class="text-xs font-semibold"
                />
              </div>

              <!-- Champ de recherche rapide -->
              <IconField iconPosition="left">
                <InputIcon class="pi pi-search text-xs text-gray-400" />
                <InputText
                  v-model="filters['global'].value"
                  placeholder="Recherche rapide..."
                  class="p-inputtext-sm w-48 text-xs"
                />
              </IconField>
            </div>
          </div>
        </template>

        <template #empty>
          <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <i class="pi pi-users text-4xl text-gray-300 dark:text-gray-600 mb-2 block" />
            <p class="font-medium">Aucun élève trouvé.</p>
            <p class="text-xs text-gray-400 mt-1">Importez un fichier CSV ou ajoutez un élève pour commencer.</p>
          </div>
        </template>

        <!-- Colonnes -->
        <Column selectionMode="multiple" headerStyle="width: 3rem" />

        <Column field="id" header="#" sortable style="width: 4rem; text-align: center">
          <template #body="{ data }">
            <span class="font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">
              {{ data.id }}
            </span>
          </template>
        </Column>

        <Column field="classe" header="Classe" sortable style="width: 8rem">
          <template #body="{ data }">
            <span class="font-semibold text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
              {{ data.classe }}
            </span>
          </template>
        </Column>

        <Column field="name" header="Nom de l'élève" sortable>
          <template #body="{ data }">
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ data.name }}</span>
          </template>
        </Column>

        <Column field="gender" header="Sexe" sortable style="width: 5rem">
          <template #body="{ data }">
            <span
              :class="[
                'text-xs px-1.5 py-0.5 rounded font-bold',
                data.gender === 'F' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
              ]"
            >
              {{ data.gender }}
            </span>
          </template>
        </Column>

        <Column field="login" header="Login" sortable style="width: 10rem">
          <template #body="{ data }">
            <span class="font-mono text-xs text-gray-600 dark:text-gray-300">{{ data.login || '—' }}</span>
          </template>
        </Column>

        <Column field="password" header="Password" sortable style="width: 10rem">
          <template #body="{ data }">
            <span v-if="data.password" class="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">
              {{ data.password }}
            </span>
            <span v-else class="text-gray-400 text-xs italic">Aucun</span>
          </template>
        </Column>

        <Column field="isFolder" header="Dossier local" sortable style="width: 7.5rem; text-align: center">
          <template #body="{ data }">
            <div class="flex justify-center" :title="data.isFolder ? 'Dossier créé sur le Mac' : 'Dossier manquant sur le Mac'">
              <i
                v-if="data.isFolder"
                class="pi pi-check-circle text-emerald-600 dark:text-emerald-400 text-lg"
              />
              <i
                v-else
                class="pi pi-times-circle text-red-500 text-lg"
              />
            </div>
          </template>
        </Column>

        <Column field="isDropboxFolder" header="Dossier Dropbox" sortable style="width: 8.5rem; text-align: center">
          <template #body="{ data }">
            <div
              class="flex justify-center"
              :title="data.dropboxStatusReason || (data.isDropboxFolder ? 'Dossier trouvé sur Dropbox' : 'Dossier non trouvé sur Dropbox')"
            >
              <i
                v-if="data.isDropboxFolder"
                class="pi pi-check-circle text-emerald-600 dark:text-emerald-400 text-lg"
              />
              <i
                v-else
                class="pi pi-times-circle text-gray-300 dark:text-gray-600 text-lg"
              />
            </div>
          </template>
        </Column>

        <Column field="isShared" header="Partage activé" sortable style="width: 8rem; text-align: center">
          <template #body="{ data }">
            <div
              class="flex justify-center"
              :title="data.isShared ? 'Partage activé en lecture seule' : 'Partage non activé'"
            >
              <i
                v-if="data.isShared"
                class="pi pi-check-circle text-emerald-600 dark:text-emerald-400 text-lg"
              />
              <i
                v-else
                class="pi pi-times-circle text-gray-300 dark:text-gray-600 text-lg"
              />
            </div>
          </template>
        </Column>

        <Column field="urlDropbox" header="URL Dropbox" sortable>
          <template #body="{ data }">
            <a
              v-if="data.urlDropbox"
              :href="data.urlDropbox"
              target="_blank"
              class="text-blue-600 dark:text-blue-400 text-xs truncate max-w-[200px] inline-flex items-center gap-1 hover:underline font-mono"
              :title="data.urlDropbox"
            >
              <i class="pi pi-external-link text-[10px]" />
              <span class="truncate">{{ data.urlDropbox }}</span>
            </a>
            <span v-else class="text-gray-400 text-xs italic">Non généré</span>
          </template>
        </Column>

        <!-- Actions -->
        <Column header="Actions" style="width: 6rem; text-align: right">
          <template #body="{ data }">
            <div class="flex items-center justify-end gap-1">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                severity="secondary"
                @click="openEditStudentDialog(data)"
                v-tooltip.left="'Modifier'"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click="confirmDeleteStudent(data)"
                v-tooltip.left="'Supprimer'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Student Edit / Add Dialog -->
    <Dialog
      v-model:visible="studentDialogVisible"
      modal
      :header="isEditingStudent ? `Modifier l'élève #${editingOriginalStudent?.id || ''}` : 'Ajouter un élève'"
      :style="{ width: '450px' }"
      class="p-fluid"
    >
      <div class="space-y-4 pt-2">
        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Classe *</label>
          <InputText v-model="studentForm.classe" placeholder="ex: 3e4" />
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Nom de l'élève (NOM Prénom) *</label>
          <InputText v-model="studentForm.name" placeholder="ex: DUPOND Martin" />
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Sexe</label>
          <div class="flex gap-4">
            <div class="flex items-center gap-2">
              <RadioButton v-model="studentForm.gender" inputId="genderM" value="M" />
              <label for="genderM" class="text-sm">Masculin (M)</label>
            </div>
            <div class="flex items-center gap-2">
              <RadioButton v-model="studentForm.gender" inputId="genderF" value="F" />
              <label for="genderF" class="text-sm">Féminin (F)</label>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Login</label>
          <InputText v-model="studentForm.login" placeholder="ex: martin.dupond" />
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Mot de passe</label>
          <div class="flex gap-2">
            <InputText v-model="studentForm.password" placeholder="Mot de passe..." class="flex-1" />
            <Button
              icon="pi pi-refresh"
              v-tooltip="'Générer aléatoirement'"
              @click="studentForm.password = generateRandomPassword()"
              class="shrink-0 p-button-outlined"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">URL Dropbox</label>
          <InputText v-model="studentForm.urlDropbox" placeholder="https://www.dropbox.com/..." />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2 pt-2">
          <Button label="Annuler" severity="secondary" @click="studentDialogVisible = false" />
          <Button label="Enregistrer" icon="pi pi-check" @click="saveStudentForm" />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Dialog from 'primevue/dialog';
import RadioButton from 'primevue/radiobutton';
import SelectButton from 'primevue/selectbutton';
import ButtonGroup from 'primevue/buttongroup';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

import { studentService } from '../services/studentService';
import { pdfService } from '../services/pdfService';
import { storage } from '../services/storage';
import { generateRandomPassword } from '../services/dictionary';
import { nativeFs, isTauri } from '../services/fs';
import { sanitizeFolderName } from '../services/accentUtils';

const props = defineProps({
  students: {
    type: Array,
    default: () => [],
  },
  sourceFolder: {
    type: String,
    default: '',
  },
  isAllOk: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'open-csv-picker',
  'go-step-1',
  'update-students',
  'sync-folders-shares',
  'generate-portal',
]);

const toast = useToast();
const confirm = useConfirm();

const selectedStudents = ref([]);

// Filtres par classe et sexe
const selectedClass = ref('Toutes');
const selectedGender = ref('Tous');

const availableClasses = computed(() => {
  const set = new Set();
  props.students.forEach((s) => {
    if (s.classe && s.classe.trim()) {
      set.add(s.classe.trim());
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
});

const classFilterOptions = computed(() => {
  return ['Toutes', ...availableClasses.value];
});

const availableGenders = computed(() => {
  const set = new Set();
  props.students.forEach((s) => {
    if (s.gender && s.gender.trim()) {
      set.add(s.gender.trim());
    }
  });
  return Array.from(set).sort();
});

const genderFilterOptions = computed(() => {
  return ['Tous', ...availableGenders.value];
});

watch(availableClasses, (newClasses) => {
  if (selectedClass.value !== 'Toutes' && !newClasses.includes(selectedClass.value)) {
    selectedClass.value = 'Toutes';
  }
});

watch(availableGenders, (newGenders) => {
  if (selectedGender.value !== 'Tous' && !newGenders.includes(selectedGender.value)) {
    selectedGender.value = 'Tous';
  }
});

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  classe: { value: null, matchMode: FilterMatchMode.EQUALS },
  gender: { value: null, matchMode: FilterMatchMode.EQUALS },
});

watch(selectedClass, (val) => {
  filters.value.classe.value = !val || val === 'Toutes' ? null : val;
});

watch(selectedGender, (val) => {
  filters.value.gender.value = !val || val === 'Tous' ? null : val;
});

const missingConditionMessage = computed(() => {
  if (!props.sourceFolder) return 'Sélectionnez un dossier Source dans les Paramètres';
  if (!props.students.length) return 'Aucun élève dans eleves.json';
  const missingCount = props.students.filter((s) => !s.isFolder).length;
  if (missingCount > 0) return `${missingCount} dossier(s) d'élève(s) manquant(s)`;
  return '';
});

// Student Form Dialog
const studentDialogVisible = ref(false);
const isEditingStudent = ref(false);
const editingOriginalStudent = ref(null);
const studentForm = ref({
  classe: '',
  name: '',
  gender: 'M',
  login: '',
  password: '',
  urlDropbox: '',
});

function openAddStudentDialog() {
  isEditingStudent.value = false;
  editingOriginalStudent.value = null;
  studentForm.value = {
    classe: '',
    name: '',
    gender: 'M',
    login: '',
    password: generateRandomPassword(),
    urlDropbox: '',
  };
  studentDialogVisible.value = true;
}

function openEditStudentDialog(student) {
  isEditingStudent.value = true;
  editingOriginalStudent.value = student;
  studentForm.value = {
    classe: student.classe || '',
    name: student.name || '',
    gender: student.gender || 'M',
    login: student.login || '',
    password: student.password || '',
    urlDropbox: student.urlDropbox || '',
  };
  studentDialogVisible.value = true;
}

async function saveStudentForm() {
  if (!studentForm.value.name.trim() || !studentForm.value.classe.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Champs obligatoires',
      detail: 'La classe et le nom de l\'élève sont obligatoires.',
      life: 3000,
    });
    return;
  }

  const updatedList = [...props.students];
  const cleanedName = sanitizeFolderName(studentForm.value.name);

  if (isEditingStudent.value && editingOriginalStudent.value) {
    const idx = updatedList.findIndex(
      (s) => s.id === editingOriginalStudent.value.id
    );
    if (idx !== -1) {
      updatedList[idx] = {
        ...updatedList[idx],
        classe: studentForm.value.classe.trim(),
        name: cleanedName,
        gender: studentForm.value.gender,
        login: studentForm.value.login.trim(),
        password: studentForm.value.password.trim(),
        urlDropbox: studentForm.value.urlDropbox.trim(),
      };
    }
  } else {
    const maxId = updatedList.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0);
    updatedList.push({
      id: maxId + 1,
      classe: studentForm.value.classe.trim(),
      name: cleanedName,
      gender: studentForm.value.gender,
      login: studentForm.value.login.trim(),
      password: studentForm.value.password.trim(),
      urlDropbox: studentForm.value.urlDropbox.trim(),
      isFolder: false,
    });
  }

  studentDialogVisible.value = false;
  emit('update-students', updatedList);

  toast.add({
    severity: 'success',
    summary: 'Enregistré',
    detail: 'L\'élève a bien été mis à jour.',
    life: 2500,
  });
}

function confirmDeleteStudent(student) {
  confirm.require({
    message: `Voulez-vous vraiment supprimer l'élève ${student.name} ?`,
    header: 'Confirmation de suppression',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      const updatedList = props.students.filter(
        (s) => s.id !== student.id
      );
      selectedStudents.value = selectedStudents.value.filter(
        (s) => s.id !== student.id
      );
      emit('update-students', updatedList);
      toast.add({
        severity: 'info',
        summary: 'Supprimé',
        detail: `L'élève ${student.name} a été supprimé.`,
        life: 2500,
      });
    },
  });
}

// Batch Actions
async function handleBatchCreateFolders() {
  if (!props.sourceFolder) {
    toast.add({
      severity: 'error',
      summary: 'Dossier Source manquant',
      detail: 'Veuillez configurer le dossier Source dans les Paramètres.',
      life: 3000,
    });
    return;
  }

  try {
    const count = await studentService.createFoldersForStudents(
      props.sourceFolder,
      selectedStudents.value
    );

    // Met à jour la liste des élèves en mémoire
    const selectedIds = new Set(selectedStudents.value.map((s) => s.id));
    const updatedList = props.students.map((s) => {
      if (selectedIds.has(s.id)) s.isFolder = true;
      return s;
    });

    emit('update-students', updatedList);

    toast.add({
      severity: 'success',
      summary: 'Dossiers créés',
      detail: `${count} dossier(s) d'élèves ont été créés avec succès.`,
      life: 3000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Erreur création dossiers',
      detail: e.message || 'Impossible de créer les dossiers.',
      life: 4000,
    });
  }
}

function handleBatchGeneratePasswords() {
  studentService.generatePasswords(selectedStudents.value);
  const updatedList = [...props.students];
  emit('update-students', updatedList);

  toast.add({
    severity: 'success',
    summary: 'Mots de passe générés',
    detail: `Nouveaux mots de passe attribués à ${selectedStudents.value.length} élève(s).`,
    life: 3000,
  });
}

async function handleBatchExportCsv() {
  if (!selectedStudents.value.length) return;
  const csvText = studentService.exportCsv(selectedStudents.value);
  const defaultName = `eleves_export_${new Date().toISOString().slice(0, 10)}.csv`;

  try {
    const savePath = await nativeFs.saveFile(
      'Exporter les élèves en CSV',
      defaultName,
      'Fichiers CSV (*.csv)',
      ['csv'],
      props.sourceFolder || ''
    );

    if (savePath) {
      await nativeFs.writeTextFile(savePath, csvText);
      toast.add({
        severity: 'success',
        summary: 'Export CSV réussi',
        detail: `${selectedStudents.value.length} élève(s) exporté(s) dans ${savePath.split('/').pop()}`,
        life: 3500,
      });
    } else if (!isTauri()) {
      nativeFs.downloadBlob(defaultName, csvText, 'text/csv;charset=utf-8;');
      toast.add({
        severity: 'success',
        summary: 'Téléchargement lancé',
        detail: `${selectedStudents.value.length} élève(s) exporté(s).`,
        life: 3000,
      });
    }
  } catch (e) {
    console.error('Erreur export CSV:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur export',
      detail: e.message || 'Impossible d\'exporter le fichier CSV.',
      life: 4000,
    });
  }
}

async function handleBatchGenerateLabelsPdf() {
  if (!selectedStudents.value.length) return;
  const portalUrl = storage.getPortalUrl();
  const defaultName = `etiquettes_eleves_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    const pdfBytes = await pdfService.generateLabelsPdf(selectedStudents.value, portalUrl);
    const b64 = pdfService.uint8ArrayToBase64(pdfBytes);

    const savePath = await nativeFs.saveFile(
      'Enregistrer les étiquettes élèves (PDF)',
      defaultName,
      'Documents PDF (*.pdf)',
      ['pdf'],
      props.sourceFolder || ''
    );

    if (savePath) {
      await nativeFs.writeFileBase64(savePath, b64);
      toast.add({
        severity: 'success',
        summary: 'Étiquettes générées',
        detail: `Document PDF (${selectedStudents.value.length} étiquettes) enregistré.`,
        life: 3500,
      });
    } else if (!isTauri()) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      nativeFs.downloadBlob(defaultName, blob, 'application/pdf');
      toast.add({
        severity: 'success',
        summary: 'Téléchargement lancé',
        detail: `${selectedStudents.value.length} étiquettes élèves prêtes à être imprimées.`,
        life: 3000,
      });
    }
  } catch (e) {
    console.error('Erreur génération étiquettes PDF:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur PDF',
      detail: e.message || 'Impossible de générer les étiquettes élèves.',
      life: 4000,
    });
  }
}

async function handleBatchGenerateTablePdf() {
  if (!selectedStudents.value.length) return;
  const portalUrl = storage.getPortalUrl();
  const defaultName = `tableau_connexion_${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    const pdfBytes = await pdfService.generateConnectionTablePdf(selectedStudents.value, portalUrl);
    const b64 = pdfService.uint8ArrayToBase64(pdfBytes);

    const savePath = await nativeFs.saveFile(
      'Enregistrer le tableau de connexion (PDF)',
      defaultName,
      'Documents PDF (*.pdf)',
      ['pdf'],
      props.sourceFolder || ''
    );

    if (savePath) {
      await nativeFs.writeFileBase64(savePath, b64);
      toast.add({
        severity: 'success',
        summary: 'Tableau généré',
        detail: `Tableau de connexion (${selectedStudents.value.length} élèves) enregistré.`,
        life: 3500,
      });
    } else if (!isTauri()) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      nativeFs.downloadBlob(defaultName, blob, 'application/pdf');
      toast.add({
        severity: 'success',
        summary: 'Téléchargement lancé',
        detail: `Tableau de connexion (${selectedStudents.value.length} élèves) prêt.`,
        life: 3000,
      });
    }
  } catch (e) {
    console.error('Erreur génération tableau PDF:', e);
    toast.add({
      severity: 'error',
      summary: 'Erreur PDF',
      detail: e.message || 'Impossible de générer le tableau de connexion.',
      life: 4000,
    });
  }
}

function handleSyncFoldersAndShares() {
  emit('sync-folders-shares');
}

function handleGeneratePortal() {
  emit('generate-portal');
}

async function handleBatchExportEncryptedJs() {
  const jsContent = studentService.generateEncryptedJs(selectedStudents.value);

  if (props.sourceFolder) {
    const targetPath = `${props.sourceFolder.replace(/\/+$/, '')}/students.js`;
    await nativeFs.writeTextFile(targetPath, jsContent);
    toast.add({
      severity: 'success',
      summary: 'Export terminé',
      detail: `Fichier students.js exporté dans le dossier Source (${selectedStudents.value.length} élèves).`,
      life: 4000,
    });
  } else {
    // Si pas de dossier source, copie dans le presse-papier
    await nativeFs.copyToClipboard(jsContent);
    toast.add({
      severity: 'info',
      summary: 'Copié dans le presse-papier',
      detail: 'Le contenu de students.js a été copié dans votre presse-papier.',
      life: 4000,
    });
  }
}

function handleBatchDeleteStudents() {
  confirm.require({
    message: `Voulez-vous supprimer ces ${selectedStudents.value.length} élèves ?`,
    header: 'Confirmation groupée',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      const selectedIds = new Set(selectedStudents.value.map((s) => s.id));
      const updatedList = props.students.filter((s) => !selectedIds.has(s.id));
      selectedStudents.value = [];
      emit('update-students', updatedList);
      toast.add({
        severity: 'info',
        summary: 'Élèves supprimés',
        detail: 'Les élèves sélectionnés ont été supprimés.',
        life: 2500,
      });
    },
  });
}
</script>
