<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    modal
    header="Paramètres de l'application"
    :style="{ width: '640px' }"
    :closable="true"
    class="p-fluid"
  >
    <!-- Onglets Général vs Portail de connexion -->
    <div class="flex border-b border-gray-200 dark:border-gray-700 -mx-6 px-6 mb-5">
      <button
        type="button"
        @click="activeTab = 'general'"
        :class="[
          'py-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer',
          activeTab === 'general'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        ]"
      >
        <i class="pi pi-cog text-base" />
        <span>Général</span>
      </button>

      <button
        type="button"
        @click="activeTab = 'portal'"
        :class="[
          'py-2.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer',
          activeTab === 'portal'
            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        ]"
      >
        <i class="pi pi-globe text-base" />
        <span>Portail de connexion</span>
      </button>
    </div>

    <!-- ========================================== -->
    <!-- ONGLET 1 : GÉNÉRAL                         -->
    <!-- ========================================== -->
    <div v-show="activeTab === 'general'" class="space-y-6 pt-1">
      <!-- Dossier Source -->
      <div>
        <label class="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
          Dossier "Source"
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
          Contient la base élèves (<code class="text-blue-600 dark:text-blue-400 font-mono">eleves.json</code>), le dossier <code class="text-blue-600 dark:text-blue-400 font-mono">Documents</code> (cours, DM) et les <code class="text-blue-600 dark:text-blue-400 font-mono">Evaluations</code>.
        </p>
        <div class="flex gap-2 items-center">
          <InputText
            :model-value="sourceFolder"
            placeholder="Aucun dossier sélectionné..."
            readonly
            class="flex-1 bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-sm font-mono truncate"
          />
          <Button
            label="Parcourir..."
            icon="pi pi-folder-open"
            @click="handleSelectFolder"
            class="p-button-outlined shrink-0"
          />
        </div>
      </div>

      <!-- Thème de Droopy -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-5">
        <label class="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">
          Thème de l'interface Droopy
        </label>
        <div class="flex gap-3">
          <Button
            label="Clair"
            icon="pi pi-sun"
            :class="[
              'flex-1 p-button-outlined',
              currentTheme === 'light' ? '!bg-blue-600 !text-white !border-blue-600 font-semibold shadow-sm' : ''
            ]"
            @click="handleThemeChange('light')"
          />
          <Button
            label="Sombre"
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

    <!-- ========================================== -->
    <!-- ONGLET 2 : PORTAIL DE CONNEXION            -->
    <!-- ========================================== -->
    <div v-show="activeTab === 'portal'" class="space-y-5 pt-1">
      
      <!-- 1. Compte Dropbox -->
      <div>
        <label class="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <i class="pi pi-box text-blue-500" />
            Compte Dropbox (Création des partages élèves)
          </span>
          <span v-if="isConnectedToDropbox" class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
            <i class="pi pi-check text-[10px]" /> Connecté
          </span>
          <span v-else class="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-medium">
            Non connecté
          </span>
        </label>

        <!-- État CONNECTÉ -->
        <div v-if="isConnectedToDropbox" class="mt-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              {{ dropboxAccountName || 'Compte personnel' }}
            </p>
            <p class="text-xs text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
              {{ dropboxAccountEmail || 'Connecté avec succès' }}
            </p>
          </div>
          <Button
            label="Déconnecter"
            icon="pi pi-power-off"
            severity="danger"
            size="small"
            class="p-button-outlined shrink-0"
            @click="handleDisconnectDropbox"
            v-tooltip.bottom="'Dissocier ce compte Dropbox de Droopy'"
          />
        </div>

        <!-- État NON CONNECTÉ -->
        <div v-else class="mt-2 space-y-2.5">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Droopy utilise votre propre App Key Dropbox pour créer les liens de partage de manière autonome et sécurisée.
          </p>

          <div>
            <div class="flex gap-2">
              <InputText
                v-model="dropboxAppKey"
                @input="handleAppKeyChange"
                placeholder="Collez votre App Key Dropbox ici"
                class="flex-1 text-xs font-mono"
              />
              <Button
                :label="isConnectingDropbox ? 'Connexion...' : 'Connecter'"
                :icon="isConnectingDropbox ? 'pi pi-spin pi-spinner' : 'pi pi-link'"
                :disabled="!dropboxAppKey.trim() || isConnectingDropbox"
                @click="handleConnectDropbox"
                class="!bg-blue-600 !hover:bg-blue-700 !text-white shrink-0 font-semibold"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 2. URL du Portail -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label class="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
          URL du Portail de connexion élève
        </label>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Adresse web publique où se connectent les élèves (ex: <span class="font-mono text-purple-600 dark:text-purple-400 font-semibold">https://espace-eleves.fr</span> ou <span class="font-mono text-purple-600 dark:text-purple-400">https://mon-portail.fr</span>).
        </p>
        <InputText
          v-model="portalUrl"
          @input="handlePortalUrlChange"
          placeholder="https://espace-eleves.fr/"
          class="w-full text-sm font-mono"
        />
      </div>

      <!-- 3. Personnalisation du Portail -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i class="pi pi-palette text-purple-600 dark:text-purple-400 text-base" />
            <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">
              Personnalisation du portail généré
            </h3>
          </div>
          <Button
            label="Sécurité & Chiffrement"
            icon="pi pi-shield"
            size="small"
            class="p-button-outlined !border-emerald-500/60 !text-emerald-700 dark:!text-emerald-300 !bg-emerald-50/50 dark:!bg-emerald-950/30 !text-xs !py-1 !px-2.5 font-semibold"
            @click="showSecurityInfoDialog = true"
            v-tooltip.bottom="'Comprendre comment sont protégées les données des élèves'"
          />
        </div>

        <!-- Avatar / Icône du portail -->
        <div class="flex items-center gap-4 bg-purple-50/40 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-200 dark:border-purple-900/40">
          <div class="relative shrink-0">
            <img
              :src="currentAvatarUrl"
              alt="Avatar Portail"
              class="w-16 h-16 rounded-full object-cover border-2 border-purple-300 dark:border-purple-600 shadow-sm"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-gray-800 dark:text-gray-100">
              Icône & Avatar de l'enseignant
            </p>
            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Affichée au centre du portail et utilisée comme icône de raccourci sur smartphone.
            </p>
            <div class="flex items-center gap-2 mt-2">
              <Button
                label="Changer l'image..."
                icon="pi pi-upload"
                size="small"
                class="p-button-outlined !border-purple-400 !text-purple-700 dark:!text-purple-300 !text-xs !py-1"
                @click="triggerCustomIconPicker"
              />
              <Button
                v-if="hasCustomAvatar"
                label="Rétablir par défaut"
                icon="pi pi-refresh"
                size="small"
                severity="secondary"
                class="p-button-text !text-xs !py-1"
                @click="resetToDefaultAvatar"
              />
              <input
                ref="fileInputRef"
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                class="hidden"
                @change="handleCustomIconUploaded"
              />
            </div>
          </div>
        </div>

        <!-- Titre et Sous-titre -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Nom du portail
            </label>
            <InputText
              v-model="portalTitle"
              @input="handlePortalTitleChange"
              placeholder="ex: Espace-Eleves.fr"
              class="w-full text-xs"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Sous-titre / Établissement
            </label>
            <InputText
              v-model="portalSubtitle"
              @input="handlePortalSubtitleChange"
              placeholder="ex: Évaluations & Documents de la classe"
              class="w-full text-xs"
            />
          </div>
        </div>

        <!-- Choix du Thème Graphique du Portail -->
        <div>
          <label class="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
            Thème graphique du portail élève
          </label>
          <div class="grid grid-cols-3 gap-2.5">
            <!-- Thème Emeraude (Défaut) -->
            <button
              type="button"
              @click="handlePortalThemeChange('emeraude')"
              :class="[
                'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                portalTheme === 'emeraude'
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  🌿 Émeraude
                </span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-semibold">
                  Défaut
                </span>
              </div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">
                Menthe & turquoise, bulles d'air flottantes.
              </p>
            </button>

            <!-- Thème Sombre -->
            <button
              type="button"
              @click="handlePortalThemeChange('sombre')"
              :class="[
                'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                portalTheme === 'sombre'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                  🌙 Sombre
                </span>
              </div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">
                Bleu nuit profond, ambiance feutrée et moderne.
              </p>
            </button>

            <!-- Thème Clair -->
            <button
              type="button"
              @click="handlePortalThemeChange('clair')"
              :class="[
                'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
                portalTheme === 'clair'
                  ? 'border-slate-800 dark:border-slate-300 bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 bg-white dark:bg-gray-800'
              ]"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  ☀️ Clair
                </span>
              </div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">
                Design épuré et blanc pur, ultra-léger.
              </p>
            </button>
          </div>
        </div>

        <!-- Note d'information Documents -->
        <div class="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 text-xs flex items-start gap-2">
          <i class="pi pi-info-circle text-blue-500 mt-0.5 shrink-0" />
          <span>
            Le bouton <strong>« Documents »</strong> du portail pointera automatiquement vers votre dossier partagé Dropbox <code class="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">Documents/</code> situé à la racine de votre dossier Source (cours, DM, fiches).
          </span>
        </div>

      </div>

    </div>

    <template #footer>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Fermer" icon="pi pi-check" @click="$emit('update:visible', false)" autofocus />
      </div>
    </template>
  </Dialog>

  <!-- Boîte de dialogue Sécurité & Confidentialité -->
  <Dialog
    v-model:visible="showSecurityInfoDialog"
    modal
    header="Sécurité & Confidentialité du Portail"
    :style="{ width: '560px' }"
    :closable="true"
  >
    <div class="space-y-3.5 pt-1 text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
      <!-- Item 1: AES-GCM -->
      <div class="flex items-start gap-3 p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
        <span class="text-xl">🛡️</span>
        <div>
          <h4 class="font-bold text-sm text-purple-950 dark:text-purple-200 mb-0.5">
            Chiffrement Militaire AES-GCM 256 bits
          </h4>
          <p class="text-gray-600 dark:text-gray-300">
            Chaque fiche élève est chiffrée individuellement avec son mot de passe en utilisant l'algorithme W3C Web Crypto standard (AES-GCM 256 bits). La clé est renforcée par dérivation <strong>PBKDF2 à 10 000 itérations</strong> avec un sel aléatoire unique par élève.
          </p>
        </div>
      </div>

      <!-- Item 2: Confidentialité élèves -->
      <div class="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
        <span class="text-xl">🔒</span>
        <div>
          <h4 class="font-bold text-sm text-emerald-950 dark:text-emerald-200 mb-0.5">
            Confidentialité Totale entre Élèves
          </h4>
          <p class="text-gray-600 dark:text-gray-300">
            Le fichier public généré <code class="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded">scripts/data.js</code> ne contient aucun nom, aucune classe et aucune adresse Dropbox en clair. Même si un élève curieux inspecte le code source avec son navigateur, il lui est impossible de découvrir les dossiers de ses camarades sans leurs mots de passe.
          </p>
        </div>
      </div>

      <!-- Item 3: Architecture Statique -->
      <div class="flex items-start gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
        <span class="text-xl">⚡</span>
        <div>
          <h4 class="font-bold text-sm text-blue-950 dark:text-blue-200 mb-0.5">
            Architecture 100% Statique (Zéro Serveur Central)
          </h4>
          <p class="text-gray-600 dark:text-gray-300">
            Le portail est autonome. Aucun mot de passe ne transite sur Internet vers un serveur tiers : le déchiffrement s'effectue localement et instantanément dans le navigateur de l'élève (smartphone ou ordinateur). Il n'y a aucune base de données centrale à pirater.
          </p>
        </div>
      </div>

      <!-- Item 4: Partage lecture seule -->
      <div class="flex items-start gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
        <span class="text-xl">👁️</span>
        <div>
          <h4 class="font-bold text-sm text-amber-950 dark:text-amber-200 mb-0.5">
            Partages Dropbox en Lecture Seule
          </h4>
          <p class="text-gray-600 dark:text-gray-300">
            Les liens Dropbox créés par Droopy n'accordent qu'un accès en consultation (<em>viewer</em>). Les élèves et parents peuvent consulter et télécharger leurs évaluations, mais ne peuvent ni modifier, ni écraser, ni supprimer de documents dans le dossier.
          </p>
        </div>
      </div>

      <p class="text-[11px] text-gray-500 dark:text-gray-400 text-center pt-1">
        Conforme RGPD et cadre scolaire • Zéro cookie publicitaire • Zéro traceur tiers
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end pt-2">
        <Button label="Compris !" icon="pi pi-check" size="small" @click="showSecurityInfoDialog = false" autofocus />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { storage } from '../services/storage';
import { nativeFs } from '../services/fs';
import { studentService } from '../services/studentService';
import { dropboxService } from '../services/dropboxService';
import { settingsService } from '../services/settingsService';
import { DEFAULT_PORTAL_ICON_B64 } from '../assets/portal-icons/defaultIconBase64.js';

// Icône par défaut (Chouette savante) embarquée
import defaultPortalAvatar from '../assets/portal-icons/icon-192x192.png';

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

const emit = defineEmits(['update:sourceFolder', 'update:visible', 'themeChanged']);

const toast = useToast();

const activeTab = ref('general');
const fileInputRef = ref(null);
const showSecurityInfoDialog = ref(false);

// Préférences Générales
const currentTheme = ref(storage.getTheme());

// Préférences Portail & Dropbox
const portalUrl = ref(storage.getPortalUrl());
const dropboxAppKey = ref(storage.getDropboxAppKey());
const isConnectedToDropbox = ref(storage.isDropboxConnected());
const dropboxAccountEmail = ref(storage.getDropboxAccountEmail());
const dropboxAccountName = ref(storage.getDropboxAccountName());
const isConnectingDropbox = ref(false);

// Personnalisation Portail
const portalTitle = ref(storage.getPortalTitle());
const portalSubtitle = ref(storage.getPortalSubtitle());
const portalTheme = ref(storage.getPortalTheme());
const customAvatar = ref(storage.getPortalAvatar());

const hasCustomAvatar = computed(() => {
  return Boolean(customAvatar.value && !customAvatar.value.includes(DEFAULT_PORTAL_ICON_B64));
});
const currentAvatarUrl = computed(() => customAvatar.value || defaultPortalAvatar);

async function refreshSettingsFromSource() {
  currentTheme.value = storage.getTheme();
  dropboxAppKey.value = storage.getDropboxAppKey();
  isConnectedToDropbox.value = storage.isDropboxConnected();
  dropboxAccountEmail.value = storage.getDropboxAccountEmail();
  dropboxAccountName.value = storage.getDropboxAccountName();

  if (props.sourceFolder) {
    const loaded = await settingsService.loadSettings(props.sourceFolder);
    portalUrl.value = loaded.portalUrl;
    portalTitle.value = loaded.portalTitle;
    portalSubtitle.value = loaded.portalSubtitle;
    portalTheme.value = loaded.portalTheme;
    customAvatar.value = loaded.iconDataUrl;
  } else {
    portalUrl.value = storage.getPortalUrl();
    portalTitle.value = storage.getPortalTitle();
    portalSubtitle.value = storage.getPortalSubtitle();
    portalTheme.value = storage.getPortalTheme();
    customAvatar.value = storage.getPortalAvatar();
  }
}

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await refreshSettingsFromSource();
    }
  }
);

watch(
  () => props.sourceFolder,
  async () => {
    if (props.visible) {
      await refreshSettingsFromSource();
    }
  }
);

async function persistCurrentSettings() {
  if (!props.sourceFolder) return;
  await settingsService.saveSettings(props.sourceFolder, {
    portalUrl: portalUrl.value,
    portalTitle: portalTitle.value,
    portalSubtitle: portalSubtitle.value,
    portalTheme: portalTheme.value,
  });
}

function handlePortalUrlChange() {
  storage.setPortalUrl(portalUrl.value);
  persistCurrentSettings();
}

function handleAppKeyChange() {
  storage.setDropboxAppKey(dropboxAppKey.value);
}

function handlePortalTitleChange() {
  storage.setPortalTitle(portalTitle.value);
  persistCurrentSettings();
}

function handlePortalSubtitleChange() {
  storage.setPortalSubtitle(portalSubtitle.value);
  persistCurrentSettings();
}

function handlePortalThemeChange(theme) {
  portalTheme.value = theme;
  storage.setPortalTheme(theme);
  persistCurrentSettings();
}

function triggerCustomIconPicker() {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
}

function handleCustomIconUploaded(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    customAvatar.value = dataUrl;
    if (props.sourceFolder) {
      await settingsService.savePortalIcon(props.sourceFolder, dataUrl);
    } else {
      storage.setPortalAvatar(dataUrl);
    }
    toast.add({
      severity: 'success',
      summary: 'Icône enregistrée',
      detail: 'Copiée dans votre dossier Source (Icon-portail.png) et prête pour le portail.',
      life: 3000,
    });
  };
  reader.readAsDataURL(file);
}

async function resetToDefaultAvatar() {
  if (props.sourceFolder) {
    customAvatar.value = await settingsService.resetPortalIcon(props.sourceFolder);
  } else {
    customAvatar.value = '';
    storage.setPortalAvatar('');
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  toast.add({
    severity: 'info',
    summary: 'Icône réinitialisée',
    detail: 'L\'icône par défaut a été rétablie dans le dossier Source.',
    life: 2500,
  });
}

async function handleConnectDropbox() {
  if (!dropboxAppKey.value.trim()) return;
  isConnectingDropbox.value = true;
  try {
    const result = await dropboxService.connectAccount(dropboxAppKey.value);
    isConnectedToDropbox.value = true;
    dropboxAccountEmail.value = result.email;
    dropboxAccountName.value = result.name;
    toast.add({
      severity: 'success',
      summary: 'Dropbox connecté',
      detail: `Compte associé (${result.email || result.name || 'OK'}).`,
      life: 4000,
    });
  } catch (e) {
    console.error('Erreur connexion Dropbox:', e);
    toast.add({
      severity: 'error',
      summary: 'Échec de connexion',
      detail: e.message || 'Impossible d\'associer votre compte Dropbox.',
      life: 5000,
    });
  } finally {
    isConnectingDropbox.value = false;
  }
}

async function handleDisconnectDropbox() {
  await dropboxService.disconnect();
  isConnectedToDropbox.value = false;
  dropboxAccountEmail.value = '';
  dropboxAccountName.value = '';
  toast.add({
    severity: 'info',
    summary: 'Compte déconnecté',
    detail: 'Votre compte Dropbox a été dissocié de Droopy.',
    life: 3000,
  });
}

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
