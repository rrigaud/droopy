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
    <div class="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3 shrink-0">
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
    <div v-if="csvStep === 1" class="flex flex-col h-[calc(100%-75px)] justify-between space-y-3">
      <div class="overflow-auto flex-1 border border-gray-200 dark:border-gray-700 rounded-lg min-h-0 bg-white dark:bg-gray-800">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="sticky top-0 z-10">
            <tr class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
              <!-- Colonne numéro de ligne -->
              <th class="p-3 w-16 text-center border-r border-gray-300 dark:border-gray-700 font-semibold text-xs text-gray-500 uppercase">
                #
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
              class="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="p-2 text-center text-xs font-mono font-medium text-gray-500 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                {{ rowIdx + 1 }}
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

      <div class="pt-2 flex items-center justify-between shrink-0">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Colonnes identifiées : <strong class="text-blue-600 dark:text-blue-400">{{ identifiedColumnsCount }}</strong> (minimum 3 requis : Nom/Prénom, Classe...)
        </div>

        <Button
          :label="identifiedColumnsCount >= 3 ? 'Suivant : Sélection des élèves...' : 'Associez au moins 3 colonnes pour continuer...'"
          :icon="identifiedColumnsCount >= 3 ? 'pi pi-arrow-right' : 'pi pi-info-circle'"
          :iconPos="identifiedColumnsCount >= 3 ? 'right' : 'left'"
          :disabled="identifiedColumnsCount < 3"
          :class="[
            identifiedColumnsCount >= 3
              ? '!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold shadow-sm'
              : 'p-button-secondary'
          ]"
          @click="goToStep2"
        />
      </div>
    </div>

    <!-- Step CSV 02: Sélection des élèves -->
    <div v-else-if="csvStep === 2" class="flex flex-col h-[calc(100%-75px)] justify-between space-y-3">
      <!-- Visual Banner for First Row / Header Choice -->
      <div
        :class="[
          'p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 shrink-0 transition-all',
          !takeFirstRow
            ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
            : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60'
        ]"
      >
        <div class="flex items-center gap-3">
          <div
            :class="[
              'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base font-bold',
              !takeFirstRow
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
            ]"
          >
            <i :class="!takeFirstRow ? 'pi pi-filter-slash' : 'pi pi-user-plus'" />
          </div>
          <div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Première ligne du fichier CSV
            </div>
            <div class="text-xs text-gray-700 dark:text-gray-200 mt-0.5 flex flex-wrap items-center gap-2">
              <span class="font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 max-w-lg truncate" :title="firstRowPreview">
                "{{ firstRowPreview }}"
              </span>
              <span
                :class="[
                  'px-2 py-0.5 rounded-full font-semibold text-[11px]',
                  !takeFirstRow
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                ]"
              >
                {{ !takeFirstRow ? 'Ligne de titres (exclue de l\'import)' : 'Ligne de données (incluse comme 1er élève)' }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
          <label class="text-xs font-semibold cursor-pointer select-none text-gray-700 dark:text-gray-200" for="header-toggle">
            {{ takeFirstRow ? 'Prendre la 1ère ligne comme élève' : 'Ignorer la 1ère ligne (titres)' }}
          </label>
          <ToggleSwitch id="header-toggle" v-model="takeFirstRow" @change="recomputeParsedStudents" />
        </div>
      </div>

      <!-- Students DataTable with scrollable flex -->
      <div class="overflow-hidden flex-1 border border-gray-200 dark:border-gray-700 rounded-lg min-h-0 bg-white dark:bg-gray-800 flex flex-col">
        <DataTable
          :value="parsedStudents"
          v-model:selection="selectedStudents"
          dataKey="id"
          scrollable
          scrollHeight="flex"
          stripedRows
          class="p-datatable-sm flex-1 min-h-0"
          tableStyle="min-width: 50rem"
        >
          <Column selectionMode="multiple" headerStyle="width: 3rem" />
          <Column field="id" header="#" sortable headerStyle="width: 4rem" />
          <Column field="name" header="NOM Prénom" sortable />
          <Column field="classe" header="Classe" sortable style="width: 7rem">
            <template #body="{ data }">
              <span class="font-semibold text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                {{ data.classe }}
              </span>
            </template>
          </Column>
          <Column field="gender" header="Sexe" sortable headerStyle="width: 5rem">
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
          <Column field="login" header="Login" sortable />
          <Column field="password" header="Password" sortable />
          <Column field="urlDropbox" header="URL Dropbox" sortable />
        </DataTable>
      </div>

      <div class="pt-2 flex items-center justify-between shrink-0">
        <Button
          label="Précédent"
          icon="pi pi-arrow-left"
          severity="secondary"
          class="p-button-outlined"
          @click="csvStep = 1"
        />

        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
          <i class="pi pi-users mr-1.5 text-blue-500" />
          {{ selectedStudents.length }} sur {{ parsedStudents.length }} élève(s) sélectionné(s)
        </div>

        <Button
          label="Importer les élèves sélectionnés"
          icon="pi pi-check"
          :disabled="selectedStudents.length === 0"
          class="!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-semibold shadow-sm"
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
const takeFirstRow = ref(false);
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
  rawRows.value = csvService.parseRawCsv(text);

  if (rawRows.value.length > 0) {
    columnMapping.value = csvService.guessColumnMapping(rawRows.value[0]);
    // Détecte intelligemment : si c'est un titre -> takeFirstRow = false (on ne la prend pas)
    // si ce ne sont pas des titres (données réelles) -> takeFirstRow = true (on la prend)
    const isHeader = csvService.detectHasHeader(rawRows.value[0]);
    takeFirstRow.value = !isHeader;
  } else {
    columnMapping.value = [];
    takeFirstRow.value = false;
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

const firstRowPreview = computed(() => {
  if (!rawRows.value.length || !rawRows.value[0]) return 'Aucune donnée';
  return rawRows.value[0].filter((c) => c && c.toString().trim()).join(' | ');
});

const identifiedColumnsCount = computed(() => {
  return columnMapping.value.filter((val) => val && val !== 'none').length;
});

function recomputeParsedStudents() {
  // Si takeFirstRow = true -> hasHeaderRow = false (on prend toute la liste dont la 1ere ligne)
  // Si takeFirstRow = false -> hasHeaderRow = true (on ignore la 1ere ligne de titres)
  parsedStudents.value = csvService.extractStudents(
    rawRows.value,
    columnMapping.value,
    !takeFirstRow.value
  );
  selectedStudents.value = [...parsedStudents.value]; // sélectionne tous par défaut
}

function goToStep2() {
  recomputeParsedStudents();
  csvStep.value = 2;
}

function handleImportConfirm() {
  emit('import-students', selectedStudents.value);
  emit('update:visible', false);
}
</script>
