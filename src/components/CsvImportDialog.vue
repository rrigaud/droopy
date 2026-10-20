<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Importation d'élèves via CSV"
    :style="{ width: '92vw', maxWidth: '1200px', height: '88vh' }"
    :closable="true"
    class="p-dialog-maximized"
  >
    <!-- Stepper CSV Header -->
    <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
      <div class="flex items-center justify-center max-w-md mx-auto gap-3">
        <div
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            csvStep === 1
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
          ]"
        >
          <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
          <span>Sélection des colonnes</span>
        </div>

        <i class="pi pi-chevron-right text-gray-400 text-sm" />

        <div
          :class="[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            csvStep === 2
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          ]"
        >
          <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
          <span>Sélection des élèves</span>
        </div>
      </div>
    </div>

    <!-- Step CSV 01: Sélection des colonnes -->
    <div v-if="csvStep === 1" class="flex flex-col h-[calc(100%-120px)] justify-between">
      <div class="overflow-auto flex-1 border border-gray-200 dark:border-gray-700 rounded-lg">
        <table class="w-full text-sm text-left border-collapse">
          <thead>
            <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
              <!-- Colonne 0 : toggleswitch pour ignorer/prendre en compte la 1ere ligne -->
              <th class="p-3 w-36 text-center border-r border-gray-300 dark:border-gray-700 font-normal">
                <div class="flex flex-col items-center gap-1">
                  <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">1ère ligne titre ?</span>
                  <ToggleSwitch v-model="hasHeaderRow" />
                </div>
              </th>

              <!-- Menulist pour chaque colonne -->
              <th
                v-for="(col, colIdx) in maxCols"
                :key="colIdx"
                class="p-2 border-r border-gray-300 dark:border-gray-700 min-w-[170px]"
              >
                <div class="space-y-1">
                  <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Colonne {{ colIdx + 1 }}
                  </div>
                  <Select
                    v-model="columnMapping[colIdx]"
                    :options="CSV_COLUMN_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choisir..."
                    :class="[
                      'w-full text-xs font-medium',
                      columnMapping[colIdx] && columnMapping[colIdx] !== 'none'
                        ? '!bg-emerald-100 !text-emerald-900 dark:!bg-emerald-900/60 dark:!text-emerald-100 !border-emerald-500'
                        : ''
                    ]"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Aperçu des 5 premières lignes -->
            <tr
              v-for="(row, rowIdx) in previewRows"
              :key="rowIdx"
              :class="[
                'border-b border-gray-200 dark:border-gray-700 transition-colors',
                rowIdx === 0 && !hasHeaderRow
                  ? 'bg-gray-200/70 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 line-through'
                  : 'hover:bg-blue-50/50 dark:hover:bg-gray-800/50'
              ]"
            >
              <td class="p-2 text-center text-xs font-mono font-medium text-gray-500 border-r border-gray-200 dark:border-gray-700">
                Ligne {{ rowIdx + 1 }}
              </td>
              <td
                v-for="(col, colIdx) in maxCols"
                :key="colIdx"
                class="p-2.5 border-r border-gray-200 dark:border-gray-700 text-xs truncate max-w-[200px]"
                :title="row[colIdx] || ''"
              >
                {{ row[colIdx] || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pt-4 flex items-center justify-between">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Colonnes identifiées : <strong class="text-blue-600 dark:text-blue-400">{{ identifiedColumnsCount }}</strong> (minimum 3 requis)
        </div>

        <Button
          :label="identifiedColumnsCount >= 3 ? 'Importer ces données...' : 'Identifier les colonnes avant de pouvoir importer les données...'"
          :icon="identifiedColumnsCount >= 3 ? 'pi pi-arrow-right' : 'pi pi-info-circle'"
          :disabled="identifiedColumnsCount < 3"
          :class="[
            identifiedColumnsCount >= 3
              ? '!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold'
              : 'p-button-secondary'
          ]"
          @click="goToStep2"
        />
      </div>
    </div>

    <!-- Step CSV 02: Sélection des élèves -->
    <div v-else-if="csvStep === 2" class="flex flex-col h-[calc(100%-120px)] justify-between">
      <div class="overflow-auto flex-1 border border-gray-200 dark:border-gray-700 rounded-lg">
        <DataTable
          :value="parsedStudents"
          v-model:selection="selectedStudents"
          dataKey="id"
          responsiveLayout="scroll"
          stripedRows
          class="p-datatable-sm"
        >
          <Column selectionMode="multiple" headerStyle="width: 3rem" />
          <Column field="id" header="ID" sortable headerStyle="width: 5rem" />
          <Column field="name" header="NOM Prénom" sortable />
          <Column field="classe" header="Classe" sortable />
          <Column field="gender" header="Sexe" sortable headerStyle="width: 6rem" />
          <Column field="login" header="Login" sortable />
          <Column field="password" header="Password" sortable />
          <Column field="urlDropbox" header="URL Dropbox" sortable />
        </DataTable>
      </div>

      <div class="pt-4 flex items-center justify-between">
        <Button
          label="Précédent"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="csvStep = 1"
        />

        <div class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ selectedStudents.length }} sur {{ parsedStudents.length }} élève(s) sélectionné(s)
        </div>

        <Button
          label="Importer les élèves sélectionnés"
          icon="pi pi-check"
          :disabled="selectedStudents.length === 0"
          @click="handleImportConfirm"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

import { CSV_COLUMN_OPTIONS, csvService } from '../services/csvService';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  csvText: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:visible', 'import-students']);

const csvStep = ref(1);
const hasHeaderRow = ref(true);
const rawRows = ref([]);
const columnMapping = ref([]);
const parsedStudents = ref([]);
const selectedStudents = ref([]);

watch(
  () => props.csvText,
  (text) => {
    if (text) {
      initCsv(text);
    }
  },
  { immediate: true }
);

function initCsv(text) {
  csvStep.value = 1;
  hasHeaderRow.value = true;
  rawRows.value = csvService.parseRawCsv(text);

  if (rawRows.value.length > 0) {
    columnMapping.value = csvService.guessColumnMapping(rawRows.value[0]);
  } else {
    columnMapping.value = [];
  }

  parsedStudents.value = [];
  selectedStudents.value = [];
}

const maxCols = computed(() => {
  let count = 0;
  rawRows.value.slice(0, 5).forEach((r) => {
    if (r.length > count) count = r.length;
  });
  return count;
});

const previewRows = computed(() => {
  return rawRows.value.slice(0, 5);
});

const identifiedColumnsCount = computed(() => {
  return columnMapping.value.filter((val) => val && val !== 'none').length;
});

function goToStep2() {
  parsedStudents.value = csvService.extractStudents(rawRows.value, columnMapping.value, hasHeaderRow.value);
  selectedStudents.value = [...parsedStudents.value]; // sélectionne tous par défaut
  csvStep.value = 2;
}

function handleImportConfirm() {
  emit('import-students', selectedStudents.value);
  emit('update:visible', false);
}
</script>
