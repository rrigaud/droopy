<template>
  <Dialog
    :visible="visible"
    modal
    :closable="!isConnecting"
    :style="{ width: '520px', maxWidth: '92vw' }"
    @update:visible="(val) => $emit('update:visible', val)"
  >
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
          <i class="pi pi-box text-base" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            Configuration du compte Dropbox
          </h3>
          <p class="text-[11px] text-gray-500 dark:text-slate-400">
            Association sécurisée via votre App Key personnelle
          </p>
        </div>
      </div>
    </template>

    <div class="py-2 space-y-4">
      <!-- Explication Droopy & Scoped App -->
      <div class="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
        <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 text-sm mt-0.5 shrink-0" />
        <div>
          <p class="font-semibold mb-0.5">Pourquoi une App Key ?</p>
          <p class="text-[11px] text-blue-800/90 dark:text-blue-300">
            Droopy utilise votre propre application Dropbox pour créer automatiquement les liens de partage (en lecture seule) vers les dossiers élèves, sans aucune limite ni serveur tiers intermédiaire.
          </p>
        </div>
      </div>

      <!-- Champ de saisie App Key -->
      <div>
        <label class="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5 flex items-center justify-between">
          <span>App Key Dropbox</span>
          <button
            type="button"
            @click="openDropboxConsole"
            class="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <i class="pi pi-external-link text-[10px]" />
            <span>Où trouver mon App Key ?</span>
          </button>
        </label>
        <InputText
          v-model="appKey"
          placeholder="Collez votre App Key Dropbox ici (ex: abc123def456)"
          class="w-full text-xs font-mono !py-2.5"
          :disabled="isConnecting"
          @keyup.enter="handleConnect"
        />
        <p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
          L'App Key reste stockée en local sur votre Mac et n'est jamais transmise à des tiers.
        </p>
      </div>

      <!-- Message d'erreur éventuel -->
      <div
        v-if="errorMessage"
        class="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
      >
        <i class="pi pi-exclamation-circle text-rose-500 shrink-0" />
        <span class="flex-1">{{ errorMessage }}</span>
      </div>

      <!-- État pendant la connexion -->
      <div
        v-if="isConnecting"
        class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5 animate-pulse"
      >
        <i class="pi pi-spin pi-spinner text-amber-600 text-sm" />
        <span>Autorisation en cours dans votre navigateur web... Veuillez accepter la connexion sur Dropbox.</span>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
        <Button
          label="Plus tard"
          severity="secondary"
          size="small"
          class="p-button-outlined !text-xs !py-1.5"
          :disabled="isConnecting"
          @click="handleClose"
        />
        <Button
          :label="isConnecting ? 'Connexion...' : 'Connecter mon compte'"
          :icon="isConnecting ? 'pi pi-spin pi-spinner' : 'pi pi-link'"
          size="small"
          :disabled="!appKey.trim() || isConnecting"
          @click="handleConnect"
          class="!bg-blue-600 !hover:bg-blue-500 !text-white !text-xs !font-bold !py-1.5 shadow-md shadow-blue-600/25"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { storage } from '../services/storage.js';
import { dropboxService } from '../services/dropboxService.js';
import { nativeFs } from '../services/fs.js';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:visible', 'connected', 'close']);

const toast = useToast();
const appKey = ref('');
const isConnecting = ref(false);
const errorMessage = ref('');

// Pré-remplit l'App Key si elle est déjà enregistrée en local
watch(
  () => props.visible,
  (val) => {
    if (val) {
      errorMessage.value = '';
      appKey.value = storage.getDropboxAppKey() || '';
    }
  },
  { immediate: true }
);

async function openDropboxConsole() {
  const url = 'https://www.dropbox.com/developers/apps';
  try {
    await nativeFs.openPath(url);
  } catch (_) {
    window.open(url, '_blank');
  }
}

async function handleConnect() {
  const clean = appKey.value.trim();
  if (!clean || isConnecting.value) return;

  isConnecting.value = true;
  errorMessage.value = '';

  try {
    const result = await dropboxService.connectAccount(clean);
    storage.setDropboxAppKey(clean);

    toast.add({
      severity: 'success',
      summary: 'Dropbox connecté',
      detail: `Compte associé : ${result.name || result.email || 'OK'}`,
      life: 3500,
    });

    emit('connected', result);
    emit('update:visible', false);
  } catch (err) {
    console.error('Erreur connexion Dropbox:', err);
    errorMessage.value = err.message || 'Impossible d\'associer votre compte Dropbox.';
    toast.add({
      severity: 'error',
      summary: 'Échec de connexion',
      detail: errorMessage.value,
      life: 5000,
    });
  } finally {
    isConnecting.value = false;
  }
}

function handleClose() {
  emit('update:visible', false);
  emit('close');
}
</script>
