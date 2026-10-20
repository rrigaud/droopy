<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Paramètres de l'application"
    :style="{ width: '560px' }"
    :closable="true"
    class="p-fluid"
  >
    <div class="space-y-6 pt-2">
      <!-- Dossier Source -->
      <div>
        <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
          Dossier "Source"
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Contient tous les documents, informations élèves (eleves.json) et évaluations.
        </p>
        <div class="flex gap-2 items-center">
          <InputText
            :model-value="sourceFolder"
            placeholder="Aucun dossier sélectionné..."
            readonly
            class="flex-1 bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-sm"
          />
          <Button
            label="Sélectionner le dossier..."
            icon="pi pi-folder-open"
            @click="handleSelectFolder"
            class="p-button-outlined shrink-0"
          />
        </div>
      </div>

      <!-- Thème -->
      <div>
        <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
          Thème de l'interface
        </label>
        <div class="flex gap-3">
          <Button
            :label="'Clair'"
            icon="pi pi-sun"
            :class="[
              'flex-1 p-button-outlined',
              currentTheme === 'light' ? '!bg-blue-600 !text-white !border-blue-600 font-semibold shadow-sm' : ''
            ]"
            @click="handleThemeChange('light')"
          />
          <Button
            :label="'Sombre'"
            icon="pi pi-moon"
            :class="[
              'flex-1 p-button-outlined',
              currentTheme === 'dark' ? '!bg-blue-600 !text-white !border-blue-600 font-semibold shadow-sm' : ''
            ]"
            @click="handleThemeChange('dark')"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Fermer" icon="pi pi-check" @click="$emit('update:visible', false)" autofocus />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { storage } from '../services/storage';
import { nativeFs } from '../services/fs';
import { studentService } from '../services/studentService';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  sourceFolder: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:visible', 'update:sourceFolder', 'themeChanged']);

const currentTheme = ref(storage.getTheme());

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentTheme.value = storage.getTheme();
    }
  }
);

async function handleSelectFolder() {
  const selected = await nativeFs.selectFolder(props.sourceFolder);
  if (selected) {
    storage.setSourceFolder(selected);
    // Initialise et vérifie l'arborescence standard (Documents, Evaluations/A corriger, Backup, Eleves)
    await studentService.ensureSourceStructure(selected);
    emit('update:sourceFolder', selected);
  }
}

function handleThemeChange(theme) {
  currentTheme.value = theme;
  storage.setTheme(theme);
  emit('themeChanged', theme);
}
</script>
