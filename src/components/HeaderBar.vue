<template>
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-30">
    <div class="w-full px-5 py-2 flex items-center justify-between gap-6 min-h-[56px]">
      <!-- Left: App Brand, Settings & Source Folder -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2.5">
          <img src="/logo.png" alt="Droopy" class="w-10 h-10 rounded-xl shadow-sm object-contain shrink-0" />
          <span class="font-bold text-lg tracking-wide text-blue-600 dark:text-blue-400 select-none flex items-center gap-1.5">
            DROOPY <span class="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded font-mono font-semibold">v5.0.1</span>
          </span>
        </div>

        <!-- ButtonGroup Paramètres + Dossier Source -->
        <ButtonGroup class="shadow-xs shrink-0">
          <Button
            icon="pi pi-cog"
            severity="secondary"
            outlined
            @click="$emit('open-settings')"
            v-tooltip.bottom="'Paramètres (Dossier Source & Thème)'"
            class="!border-gray-300 dark:!border-gray-600 !text-gray-600 dark:!text-gray-300 hover:!text-blue-600 dark:hover:!text-blue-400 hover:!bg-gray-100 dark:hover:!bg-gray-700 !rounded-l-lg !rounded-r-none !h-9 !w-9 !p-0 flex items-center justify-center shrink-0 cursor-pointer"
          />
          <span
            class="inline-flex items-center text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50/90 dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 border-l-0 rounded-r-lg px-3 h-9 select-none max-w-[280px] truncate"
            :title="sourceFolder || 'Aucun dossier source configuré'"
          >
            <i class="pi pi-folder mr-1.5 text-blue-500 dark:text-blue-400 shrink-0 text-xs" />
            <span class="truncate">{{ sourceFolderName }}</span>
          </span>
        </ButtonGroup>
      </div>

      <!-- Right: Horizontal Stepper General Menu (aligned to the right) -->
      <nav class="flex items-center justify-end shrink-0 ml-auto">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <template v-for="(step, idx) in steps" :key="step.id">
            <!-- Step Item -->
            <button
              type="button"
              :disabled="step.disabled"
              @click="$emit('change-step', step.id)"
              :class="[
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                activeStep === step.id
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/30 font-semibold'
                  : step.completed
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                  : step.disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
              ]"
            >
              <i
                :class="[
                  step.icon,
                  'text-base',
                  activeStep === step.id
                    ? 'text-white'
                    : step.completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-gray-400'
                ]"
              />
              <span class="hidden md:inline">{{ step.title }}</span>
              <span class="inline md:hidden">Step {{ step.id }}</span>
              <i
                v-if="step.completed && activeStep !== step.id"
                class="pi pi-check text-xs text-emerald-600 dark:text-emerald-400 ml-0.5"
              />
            </button>

            <!-- Separator between steps -->
            <div
              v-if="idx < steps.length - 1"
              :class="[
                'h-0.5 w-4 sm:w-6 rounded transition-colors',
                activeStep > idx || (step.completed && steps[idx + 1].completed)
                  ? 'bg-emerald-500'
                  : activeStep === idx
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              ]"
            />
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import Button from 'primevue/button';
import ButtonGroup from 'primevue/buttongroup';

const props = defineProps({
  activeStep: {
    type: Number,
    default: 0,
  },
  canAccessStep1: {
    type: Boolean,
    default: false,
  },
  canAccessStep2: {
    type: Boolean,
    default: false,
  },
  canAccessStep3: {
    type: Boolean,
    default: false,
  },
  step0Completed: {
    type: Boolean,
    default: false,
  },
  step1Completed: {
    type: Boolean,
    default: false,
  },
  step2Completed: {
    type: Boolean,
    default: false,
  },
  step3Completed: {
    type: Boolean,
    default: false,
  },
  sourceFolder: {
    type: String,
    default: '',
  },
});

defineEmits(['open-settings', 'change-step']);

const sourceFolderName = computed(() => {
  if (!props.sourceFolder) return 'Source: Non configuré';
  const parts = props.sourceFolder.replace(/\/+$/, '').split('/');
  return parts[parts.length - 1] || props.sourceFolder;
});

const steps = computed(() => [
  {
    id: 0,
    title: 'Elèves',
    icon: 'pi pi-users',
    completed: props.step0Completed,
    disabled: false,
  },
  {
    id: 1,
    title: 'Chargement des copies',
    icon: 'pi pi-file-edit',
    completed: props.step1Completed,
    disabled: !props.canAccessStep1,
  },
  {
    id: 2,
    title: 'Identification des copies',
    icon: 'pi pi-arrows-h',
    completed: props.step2Completed,
    disabled: !props.canAccessStep2,
  },
  {
    id: 3,
    title: 'Distribution des copies',
    icon: 'pi pi-send',
    completed: props.step3Completed,
    disabled: !props.canAccessStep3,
  },
]);
</script>
