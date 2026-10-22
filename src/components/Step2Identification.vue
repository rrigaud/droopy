<template>
  <div class="h-full flex flex-col p-4 space-y-3">
    <!-- Top Progress Bar & Next Step Button -->
    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4 shrink-0">
      <div class="flex-1 flex items-center gap-3">
        <div class="flex-1">
          <div class="flex justify-between items-center text-xs font-semibold mb-1">
            <span class="text-gray-700 dark:text-gray-300">
              Progression de l'identification :
              <strong class="text-blue-600 dark:text-blue-400 font-bold">
                {{ identifiedCopies.length }} / {{ totalCopiesCount }} copies
              </strong>
            </span>
            <span class="text-gray-500 font-mono">{{ progressPercentage }}%</span>
          </div>
          <ProgressBar :value="progressPercentage" :showValue="false" class="!h-2.5" />
        </div>
      </div>

      <!-- Button Passer à la distribution (apparaît quand toutes les copies sont identifiées) -->
      <Button
        v-if="isAllIdentified"
        label="Passer à la distribution..."
        icon="pi pi-arrow-right"
        iconPos="right"
        @click="handleProceedToDistribution"
        class="!bg-emerald-600 !hover:bg-emerald-700 !text-white !border-emerald-600 font-bold shadow-md animate-bounce shrink-0"
      />
    </div>

    <!-- Main 2-column layout (60% / 40%) -->
    <div class="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
      <!-- Colonne de GAUCHE (60%): Preview de l'évaluation de l'élève (100% largeur, scrollable verticalement) -->
      <div class="w-full md:w-[60%] flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-0">
        <!-- Toolbar aperçu copie -->
        <div class="p-2.5 bg-gray-50 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs shrink-0">
          <div class="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
            <i class="pi pi-file-pdf text-red-500" />
            <span v-if="activeCopy">
              Aperçu Copie n°{{ activeCopy.index }} ({{ activeCopy.pageCount }} page(s))
            </span>
            <span v-else>Aperçu copie</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 px-2 py-0.5 rounded font-medium">
              100% de la largeur
            </span>
          </div>
        </div>

        <!-- Frame d'affichage Canvas (scrollable verticalement, 100% de la largeur sans débordement horizontal) -->
        <div class="flex-1 bg-gray-100 dark:bg-gray-900/90 overflow-y-auto overflow-x-hidden p-3 flex flex-col items-center">
          <div v-if="!activeCopy" class="m-auto text-center text-gray-400">
            <i class="pi pi-file-pdf text-5xl mb-2 block" />
            <p class="text-sm font-semibold">Aucune copie sélectionnée</p>
          </div>

          <!-- Canvas fixé à 100% de la largeur du conteneur -->
          <canvas
            v-show="activeCopy"
            ref="copyCanvasRef"
            class="w-full h-auto max-w-full shadow-lg rounded-lg bg-white border border-gray-300 dark:border-gray-700 block transition-all"
          />
        </div>
      </div>

      <!-- Colonne de DROITE (40%): Formulaire d'identification + Copies à identifier + Copies identifiées -->
      <div class="w-full md:w-[40%] flex flex-col gap-3 min-h-0">
        <!-- 1. En haut: Bandeau d'identification de l'élève -->
        <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Identifier la copie en cours</span>
            <span v-if="activeCopy" class="text-blue-600 dark:text-blue-400 font-mono font-bold">
              Copie n°{{ activeCopy.index }}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <!-- Recherche élève avec autocomplétion -->
            <div class="flex-1 relative">
              <IconField iconPosition="left">
                <InputIcon class="pi pi-user text-xs text-gray-400" />
                <InputText
                  ref="studentInputRef"
                  v-model="studentSearchText"
                  placeholder="Nom ou prénom de l'élève..."
                  @input="handleStudentInput"
                  @keydown.down.prevent="navigateDropdown(1)"
                  @keydown.up.prevent="navigateDropdown(-1)"
                  @keydown.enter.prevent="handleStudentEnter"
                  @focus="isDropdownOpen = true"
                  class="w-full text-xs font-semibold"
                />
              </IconField>
              <button
                v-if="studentSearchText"
                @click="clearStudentSelection"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs z-10"
              >
                ✕
              </button>

              <!-- Suggestions dropdown -->
              <div
                v-if="isDropdownOpen && filteredClassStudents.length > 0"
                class="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-gray-700"
              >
                <div
                  v-for="(st, idx) in filteredClassStudents"
                  :key="st.name"
                  @mousedown.prevent="selectStudent(st)"
                  :class="[
                    'p-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors',
                    idx === highlightedIndex
                      ? 'bg-blue-600 text-white font-semibold'
                      : isStudentAlreadyAssigned(st.name)
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 text-gray-600 dark:text-gray-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                  ]"
                >
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ st.name }}</span>
                    <span
                      v-if="isStudentAlreadyAssigned(st.name)"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-mono"
                    >
                      Déjà identifié
                    </span>
                  </div>
                  <span class="text-[11px] opacity-75 font-mono">{{ st.classe }}</span>
                </div>
              </div>
            </div>

            <!-- Champ Note (sans supposition /20) -->
            <div class="w-full sm:w-28">
              <IconField iconPosition="left">
                <InputIcon class="pi pi-bookmark text-xs text-blue-500" />
                <InputText
                  ref="gradeInputRef"
                  v-model="gradeInput"
                  placeholder="Note..."
                  @keydown.enter.prevent="handleIdentify"
                  class="w-full text-center text-xs font-bold font-mono"
                />
              </IconField>
            </div>

            <!-- Bouton Identifier -->
            <Button
              label="Identifier"
              icon="pi pi-link"
              :disabled="!canIdentify"
              @click="handleIdentify"
              class="!bg-blue-600 !hover:bg-blue-700 !text-white font-semibold text-xs shrink-0 shadow-sm"
            />
          </div>
        </div>

        <!-- 2. Au-dessous : Copies à identifier -->
        <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden min-h-[160px]">
          <div class="px-3 py-2 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
            <span class="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <i class="pi pi-hourglass text-amber-600 dark:text-amber-400" />
              Copies à identifier ({{ pendingCopies.length }})
            </span>
            <span class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">En attente</span>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 p-1">
            <div
              v-for="copy in pendingCopies"
              :key="copy.index"
              @click="selectCopy(copy)"
              :class="[
                'p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs',
                activeCopy?.index === copy.index
                  ? 'bg-blue-100 dark:bg-blue-900/60 font-semibold text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              ]"
            >
              <div class="flex items-center gap-2">
                <i class="pi pi-file text-gray-400 text-sm" />
                <span>Copie {{ copy.index }}</span>
              </div>
              <span class="text-[11px] text-gray-400 font-mono">{{ copy.pageCount }} page(s)</span>
            </div>

            <div v-if="pendingCopies.length === 0" class="p-4 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <i class="pi pi-check-circle mr-1" /> Toutes les copies ont été identifiées !
            </div>
          </div>
        </div>

        <!-- 3. Au-dessous : Copies identifiées -->
        <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden min-h-[160px]">
          <div class="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <i class="pi pi-check-circle text-emerald-600 dark:text-emerald-400" />
              Copies identifiées ({{ identifiedCopies.length }})
            </span>
            <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ordre alphabétique</span>
          </div>

          <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60 p-1">
            <div
              v-for="copy in sortedIdentifiedCopies"
              :key="copy.index"
              @click="selectCopy(copy)"
              :class="[
                'p-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-xs',
                activeCopy?.index === copy.index
                  ? 'bg-blue-100 dark:bg-blue-900/60 font-semibold text-blue-900 dark:text-blue-100 ring-1 ring-blue-500/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              ]"
            >
              <div class="flex items-center gap-2 truncate">
                <i class="pi pi-file-pdf text-red-500 text-sm shrink-0" />
                <span class="truncate">{{ copy.studentName }}</span>
              </div>
              <span class="font-bold text-xs bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-mono shrink-0">
                {{ copy.grade !== undefined && copy.grade !== '' ? copy.grade : '—' }}
              </span>
            </div>

            <div v-if="identifiedCopies.length === 0" class="p-4 text-center text-xs text-gray-400 italic">
              Aucune copie encore identifiée.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import ProgressBar from 'primevue/progressbar';
import { useToast } from 'primevue/usetoast';

import { pdfService } from '../services/pdfService';
import { sanitizeFolderName } from '../services/accentUtils';

const props = defineProps({
  copies: {
    type: Array,
    default: () => [],
  },
  classStudents: {
    type: Array,
    default: () => [],
  },
  evaluationInfo: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['go-step-3']);

const toast = useToast();

const localCopies = ref([]);
const activeCopy = ref(null);
const studentSearchText = ref('');
const selectedStudentObj = ref(null);
const gradeInput = ref('');
const isDropdownOpen = ref(false);
const highlightedIndex = ref(0);

const studentInputRef = ref(null);
const gradeInputRef = ref(null);
const copyCanvasRef = ref(null);

watch(
  () => props.copies,
  (newCopies) => {
    if (newCopies && newCopies.length) {
      localCopies.value = newCopies.map((c) => ({
        ...c,
        studentName: c.studentName || '',
        grade: c.grade !== undefined ? c.grade : '',
        identified: !!c.studentName,
      }));
      const firstPending = localCopies.value.find((c) => !c.identified) || localCopies.value[0];
      selectCopy(firstPending);
    }
  },
  { immediate: true }
);

const totalCopiesCount = computed(() => localCopies.value.length);

const identifiedCopies = computed(() => {
  return localCopies.value.filter((c) => c.identified);
});

const sortedIdentifiedCopies = computed(() => {
  return [...identifiedCopies.value].sort((a, b) =>
    (a.studentName || '').localeCompare(b.studentName || '')
  );
});

const pendingCopies = computed(() => {
  return localCopies.value.filter((c) => !c.identified);
});

const progressPercentage = computed(() => {
  if (!totalCopiesCount.value) return 0;
  return Math.round((identifiedCopies.value.length / totalCopiesCount.value) * 100);
});

const isAllIdentified = computed(() => {
  return totalCopiesCount.value > 0 && identifiedCopies.value.length === totalCopiesCount.value;
});

const canIdentify = computed(() => {
  return (
    !!activeCopy.value &&
    !!studentSearchText.value.trim() &&
    gradeInput.value.trim() !== ''
  );
});

const filteredClassStudents = computed(() => {
  const query = studentSearchText.value.toLowerCase().trim();
  const list = !query
    ? [...props.classStudents]
    : props.classStudents.filter((s) => {
        return (s.name || '').toLowerCase().includes(query);
      });
  return list.sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
  );
});

function isStudentAlreadyAssigned(studentName) {
  return localCopies.value.some(
    (c) => c.identified && c.studentName === studentName && c.index !== activeCopy.value?.index
  );
}

async function selectCopy(copy) {
  if (!copy) return;
  activeCopy.value = copy;
  studentSearchText.value = copy.studentName || '';
  gradeInput.value = copy.grade !== undefined ? copy.grade.toString() : '';
  isDropdownOpen.value = false;
  highlightedIndex.value = 0;

  await nextTick();
  await renderCopyPdf();

  if (studentInputRef.value?.$el) {
    studentInputRef.value.$el.focus();
    studentInputRef.value.$el.select();
  }
}

async function renderCopyPdf() {
  if (!activeCopy.value || !copyCanvasRef.value) return;
  try {
    const bytes = pdfService.base64ToUint8Array(activeCopy.value.base64);
    // Rendu haute résolution (scale 1.8), le style CSS w-full ajuste la largeur à 100% de la colonne
    await pdfService.renderPageToCanvas(bytes, copyCanvasRef.value, 1.8, 1);
  } catch (e) {
    console.error('Erreur rendu canvas copie:', e);
  }
}

function handleStudentInput() {
  isDropdownOpen.value = true;
  highlightedIndex.value = 0;
}

function clearStudentSelection() {
  studentSearchText.value = '';
  selectedStudentObj.value = null;
  isDropdownOpen.value = true;
  highlightedIndex.value = 0;
  if (studentInputRef.value?.$el) {
    studentInputRef.value.$el.focus();
  }
}

function navigateDropdown(delta) {
  if (!isDropdownOpen.value) {
    isDropdownOpen.value = true;
    return;
  }
  const max = filteredClassStudents.value.length;
  if (!max) return;
  highlightedIndex.value = (highlightedIndex.value + delta + max) % max;
}

function handleStudentEnter() {
  if (filteredClassStudents.value.length > 0) {
    const chosen = filteredClassStudents.value[highlightedIndex.value] || filteredClassStudents.value[0];
    selectStudent(chosen);
  } else if (studentSearchText.value.trim()) {
    isDropdownOpen.value = false;
    focusGradeInput();
  }
}

function selectStudent(student) {
  studentSearchText.value = student.name;
  selectedStudentObj.value = student;
  isDropdownOpen.value = false;
  focusGradeInput();
}

function focusGradeInput() {
  nextTick(() => {
    if (gradeInputRef.value?.$el) {
      gradeInputRef.value.$el.focus();
      gradeInputRef.value.$el.select();
    }
  });
}

function handleIdentify() {
  if (!canIdentify.value) return;

  const rawGrade = gradeInput.value.replace(',', '.').trim();
  const numGrade = parseFloat(rawGrade);

  if (isNaN(numGrade) || numGrade < 0) {
    toast.add({
      severity: 'warn',
      summary: 'Note invalide',
      detail: 'Veuillez saisir une valeur numérique positive pour la note.',
      life: 3000,
    });
    return;
  }

  const cleanedStudentName = sanitizeFolderName(studentSearchText.value);

  activeCopy.value.studentName = cleanedStudentName;
  activeCopy.value.grade = numGrade;
  activeCopy.value.identified = true;

  toast.add({
    severity: 'success',
    summary: 'Copie identifiée',
    detail: `${cleanedStudentName} : Note ${numGrade}`,
    life: 1800,
  });

  const nextPending = localCopies.value.find((c) => !c.identified);
  if (nextPending) {
    selectCopy(nextPending);
  } else {
    toast.add({
      severity: 'info',
      summary: 'Toutes les copies identifiées !',
      detail: 'Vous pouvez à présent cliquer sur "Passer à la distribution..."',
      life: 4000,
    });
  }
}

function handleProceedToDistribution() {
  const nameCounts = {};
  for (const c of localCopies.value) {
    const name = c.studentName;
    if (name) {
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    }
  }

  const duplicates = Object.keys(nameCounts).filter((name) => nameCounts[name] > 1);

  if (duplicates.length > 0) {
    toast.add({
      severity: 'error',
      summary: 'Doublon détecté',
      detail: `Attention, 2 copies ont été attribuées à un même élève ! (${duplicates.join(', ')})`,
      life: 5000,
    });
    return;
  }

  emit('go-step-3', {
    identifiedCopies: localCopies.value,
  });
}
</script>
