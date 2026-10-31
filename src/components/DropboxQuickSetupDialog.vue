<template>
  <Dialog
    :visible="visible"
    modal
    :closable="!isConnecting"
    :style="{ width: '550px', maxWidth: '94vw' }"
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

    <div class="py-2 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <!-- Bandeau informatif en haut (conservé) -->
      <div class="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed flex items-start gap-2.5">
        <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 text-sm mt-0.5 shrink-0" />
        <div>
          <p class="font-semibold mb-0.5">Pourquoi une App Key ?</p>
          <p class="text-[11px] text-blue-800/90 dark:text-blue-300 leading-snug">
            Droopy utilise votre propre application Dropbox pour créer automatiquement les liens de partage (en lecture seule) vers les dossiers élèves, sans aucune limite ni serveur tiers intermédiaire.
          </p>
        </div>
      </div>

      <!-- Séquence synthétique d'instructions pour récupérer l'App Key -->
      <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
            <i class="pi pi-compass text-blue-500" />
            <span>Comment récupérer votre App Key ?</span>
          </h4>
          <button
            type="button"
            @click="openDropboxConsole"
            class="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
          >
            <i class="pi pi-external-link text-[10px]" />
            <span>Ouvrir la console Dropbox</span>
          </button>
        </div>

        <ol class="space-y-2.5 text-[11px] text-gray-600 dark:text-slate-300">
          <li class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
            <span>
              Connectez-vous à la <strong>console Dropbox Developers</strong> en cliquant sur le bouton ci-dessus.
            </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
            <span>
              Si vous avez déjà une application, <strong>cliquez dessus</strong>. Sinon, cliquez sur <strong>Create app</strong> (choisir <em>Scoped access</em> puis <em>Full Dropbox</em>).
            </span>
          </li>
          <li class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
            <div class="flex-1 min-w-0">
              <span class="font-semibold text-gray-800 dark:text-gray-100">Onglet « Permissions » :</span>
              <span> cochez impérativement ces 4 droits, puis cliquez sur le bouton bleu <strong>Submit</strong> en bas de page :</span>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <span class="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold">
                  sharing.write
                </span>
                <span class="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold">
                  sharing.read
                </span>
                <span class="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold">
                  files.metadata.read
                </span>
                <span class="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-semibold">
                  account_info.read
                </span>
              </div>
            </div>
          </li>
          <li class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
            <div class="flex-1 min-w-0">
              <span>Dans l'onglet <strong>Settings</strong>, vérifiez que l'URI de redirection est bien enregistrée :</span>
              <div class="flex items-center gap-1.5 mt-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                <span class="truncate flex-1 select-all font-semibold text-blue-600 dark:text-blue-400">{{ redirectUri }}</span>
                <button
                  type="button"
                  @click="copyRedirectUri"
                  class="text-[10px] text-blue-600 dark:text-blue-400 font-sans font-bold hover:underline shrink-0 cursor-pointer"
                >
                  {{ copiedUri ? '✓ Copié !' : 'Copier' }}
                </button>
              </div>
            </div>
          </li>
          <li class="flex items-start gap-2">
            <span class="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">5</span>
            <span>
              Toujours dans l'onglet <strong>Settings</strong>, copiez la valeur de votre <strong>App key</strong> et collez-la dans le champ ci-dessous.
            </span>
          </li>
        </ol>
      </div>

      <!-- Champ de saisie App Key -->
      <div>
        <label class="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
          App Key Dropbox
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

    <!-- BOUTONS DU BAS : Style identique au Splash Screen -->
    <template #footer>
      <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
        <!-- Bouton "Plus tard" (style "Ne pas configurer" du splashscreen avec icône horloge) -->
        <button
          type="button"
          :disabled="isConnecting"
          @click="handleClose"
          class="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i class="pi pi-clock text-[10px]" />
          <span>Plus tard</span>
        </button>

        <!-- Bouton "Connecter" (style "Configurer" du splashscreen avec maillon de chaîne) -->
        <button
          type="button"
          :disabled="!appKey.trim() || isConnecting"
          @click="handleConnect"
          class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <i :class="isConnecting ? 'pi pi-spin pi-spinner text-xs' : 'pi pi-link text-xs'" />
          <span>{{ isConnecting ? 'Connexion en cours...' : 'Connecter mon compte' }}</span>
        </button>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
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
const copiedUri = ref(false);
const redirectUri = 'http://localhost:52478/oauth/callback';

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

async function copyRedirectUri() {
  try {
    await navigator.clipboard.writeText(redirectUri);
    copiedUri.value = true;
    setTimeout(() => {
      copiedUri.value = false;
    }, 2500);
  } catch (_) {
    const textArea = document.createElement('textarea');
    textArea.value = redirectUri;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copiedUri.value = true;
    setTimeout(() => {
      copiedUri.value = false;
    }, 2500);
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
