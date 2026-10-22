<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-hidden">
    <!-- Top Action Bar -->
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
      <div class="flex flex-wrap items-center gap-2">
        <!-- Importer un CSV -->
        <Button
          label="Importer un CSV"
          icon="pi pi-upload"
          @click="$emit('open-csv-picker')"
          class="p-button-outlined"
        />

        <!-- Ajouter un élève -->
        <Button
          label="Ajouter un élève"
          icon="pi pi-user-plus"
          @click="openAddStudentDialog"
          class="p-button-outlined"
        />

        <!-- Batch Actions (affichés si des lignes sont sélectionnées) -->
        <div v-if="selectedStudents.length > 0" class="flex flex-wrap items-center pl-2 border-l border-gray-300 dark:border-gray-600 animate-fadeIn">
          <ButtonGroup class="shadow-sm">
            <Button
              :label="`Générer le dossier (${selectedStudents.length})`"
              icon="pi pi-folder-plus"
              severity="info"
              @click="handleBatchCreateFolders"
              v-tooltip.bottom="'Créer le dossier local pour chaque élève sélectionné'"
            />
            <Button
              :label="`Générer un mot de passe (${selectedStudents.length})`"
              icon="pi pi-key"
              severity="warn"
              @click="handleBatchGeneratePasswords"
              v-tooltip.bottom="'Générer un mot de passe français 6-10 lettres sans accent'"
            />
            <Button
              :label="`Exporter le JS chiffré (${selectedStudents.length})`"
              icon="pi pi-lock"
              severity="help"
              @click="handleBatchExportEncryptedJs"
              v-tooltip.bottom="'Générer le fichier students.js avec sha256'"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              @click="handleBatchDeleteStudents"
              v-tooltip.bottom="'Supprimer les élèves sélectionnés'"
            />
          </ButtonGroup>
        </div>
      </div>

      <!-- Right Action: Charger des copies (affiché si conditions remplies) -->
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

        <Column field="isFolder" header="Dossier local" sortable style="width: 8rem; text-align: center">
          <template #body="{ data }">
            <div class="flex justify-center" :title="data.isFolder ? 'Dossier créé' : 'Dossier manquant'">
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

        <Column field="urlDropbox" header="Dossier Dropbox en ligne" sortable>
          <template #body="{ data }">
            <a
              v-if="data.urlDropbox"
              :href="data.urlDropbox"
              target="_blank"
              class="text-blue-600 dark:text-blue-400 text-xs truncate max-w-xs block hover:underline"
              :title="data.urlDropbox"
            >
              <i class="pi pi-external-link mr-1 text-[10px]" />{{ data.urlDropbox }}
            </a>
            <span v-else class="text-gray-400 text-xs italic">Non renseigné</span>
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
import { generateRandomPassword } from '../services/dictionary';
import { nativeFs } from '../services/fs';
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
