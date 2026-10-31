<template>
  <Dialog
    :visible="visible"
    modal
    :style="{ width: '560px', maxWidth: '94vw' }"
    @update:visible="(val) => $emit('update:visible', val)"
  >
    <template #header>
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
          <i class="pi pi-globe text-base" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            Configuration du portail de connexion
          </h3>
          <p class="text-[11px] text-gray-500 dark:text-slate-400">
            Personnalisation et adresse web du portail autonome pour vos élèves
          </p>
        </div>
      </div>
    </template>

    <div class="py-2 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <!-- 1. Adresse web publique du portail -->
      <div>
        <label class="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <i class="pi pi-link text-purple-600 dark:text-purple-400" />
            <span>Adresse web publique du portail</span>
          </span>
          <span class="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
            Recommandé
          </span>
        </label>
        <InputText
          v-model="portalUrl"
          placeholder="https://portail-eleves.mon-etablissement.fr"
          class="w-full text-xs font-mono !py-2.5"
        />
        <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">
          L'adresse web publique où vous mettrez en ligne le dossier <code class="font-mono text-purple-600 dark:text-purple-400 font-bold">Portail-Web</code> généré par Droopy.
        </p>
      </div>

      <!-- 2. Titre et sous-titre -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-slate-800">
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Nom du portail
          </label>
          <InputText
            v-model="portalTitle"
            placeholder="Portail Élèves"
            class="w-full text-xs !py-2"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Sous-titre / Établissement
          </label>
          <InputText
            v-model="portalSubtitle"
            placeholder="Évaluations & Documents"
            class="w-full text-xs !py-2"
          />
        </div>
      </div>

      <!-- 3. Choix du thème graphique -->
      <div class="pt-2 border-t border-gray-100 dark:border-slate-800">
        <label class="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
          <i class="pi pi-palette text-purple-600 dark:text-purple-400" />
          <span>Thème visuel du portail élève</span>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <!-- Émeraude & Constellation -->
          <button
            type="button"
            @click="portalTheme = 'emeraude'"
            :class="[
              'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative',
              portalTheme === 'emeraude'
                ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-sm'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 bg-white dark:bg-slate-900'
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                🌿 Émeraude & Constellation
              </span>
              <span v-if="portalTheme === 'emeraude'" class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p class="text-[10px] text-gray-500 dark:text-slate-400 leading-snug">
              Fond sombre vert émeraude, néon menthe et verre dépoli.
            </p>
          </button>

          <!-- Azur Horizon -->
          <button
            type="button"
            @click="portalTheme = 'azur'"
            :class="[
              'p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative',
              portalTheme === 'azur'
                ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/40 shadow-sm'
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 bg-white dark:bg-slate-900'
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                🌊 Azur Horizon
              </span>
              <span v-if="portalTheme === 'azur'" class="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
            </div>
            <p class="text-[10px] text-gray-500 dark:text-slate-400 leading-snug">
              Dégradés bleu ciel et cyan, ambiance claire et épurée.
            </p>
          </button>
        </div>
      </div>

      <!-- 4. Avatar de l'enseignant -->
      <div class="pt-2 border-t border-gray-100 dark:border-slate-800">
        <label class="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
          <i class="pi pi-user text-purple-600 dark:text-purple-400" />
          <span>Avatar / Icône du portail</span>
        </label>
        <div class="flex items-center gap-3 p-2.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40">
          <img
            :src="currentAvatarUrl"
            alt="Avatar"
            class="w-12 h-12 rounded-full object-cover border-2 border-purple-400 shadow-sm shrink-0"
          />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">
              Avatar enseignant
            </p>
            <div class="flex items-center gap-2 mt-1">
              <Button
                label="Changer l'image..."
                icon="pi pi-upload"
                size="small"
                class="p-button-outlined !border-purple-400 !text-purple-700 dark:!text-purple-300 !text-[11px] !py-1"
                @click="triggerCustomIconPicker"
              />
              <Button
                v-if="hasCustomAvatar"
                label="Rétablir par défaut"
                icon="pi pi-refresh"
                size="small"
                severity="secondary"
                class="p-button-text !text-[11px] !py-1"
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
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
        <Button
          label="Plus tard"
          severity="secondary"
          size="small"
          class="p-button-outlined !text-xs !py-1.5"
          @click="handleClose"
        />
        <Button
          label="Enregistrer les réglages"
          icon="pi pi-check"
          size="small"
          @click="handleSave"
          class="!bg-purple-600 !hover:bg-purple-500 !text-white !text-xs !font-bold !py-1.5 shadow-md shadow-purple-600/25"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { storage } from '../services/storage.js';
import { settingsService } from '../services/settingsService.js';
import { DEFAULT_PORTAL_ICON_B64 } from '../assets/portal-icons/defaultIconBase64.js';

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

const emit = defineEmits(['update:visible', 'saved', 'close']);

const toast = useToast();
const portalUrl = ref('');
const portalTitle = ref('Portail Élèves');
const portalSubtitle = ref('Évaluations & Documents');
const portalTheme = ref('emeraude');
const customAvatar = ref('');
const fileInputRef = ref(null);

const currentAvatarUrl = computed(() => {
  return customAvatar.value || DEFAULT_PORTAL_ICON_B64;
});

const hasCustomAvatar = computed(() => {
  return !!customAvatar.value && customAvatar.value !== DEFAULT_PORTAL_ICON_B64;
});

watch(
  () => props.visible,
  async (val) => {
    if (val && props.sourceFolder) {
      try {
        const s = await settingsService.loadSettings(props.sourceFolder);
        const storedUrl = storage.getPortalUrl() || s.portalUrl || '';
        // Si c'est le placeholder par défaut, on laisse le champ vide avec le placeholder pour faciliter la saisie
        portalUrl.value = storedUrl.trim().replace(/\/+$/, '') === 'https://portail-eleve.fr' ? '' : storedUrl;
        portalTitle.value = s.portalTitle || 'Portail Élèves';
        portalSubtitle.value = s.portalSubtitle || 'Évaluations & Documents';
        portalTheme.value = s.portalTheme || 'emeraude';
        customAvatar.value = s.iconDataUrl || '';
      } catch (err) {
        console.warn('Erreur chargement paramètres portail:', err);
      }
    }
  },
  { immediate: true }
);

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
    }
    toast.add({
      severity: 'success',
      summary: 'Icône enregistrée',
      detail: 'Image enregistrée pour votre portail web.',
      life: 2500,
    });
  };
  reader.readAsDataURL(file);
}

async function resetToDefaultAvatar() {
  if (props.sourceFolder) {
    customAvatar.value = await settingsService.resetPortalIcon(props.sourceFolder);
  } else {
    customAvatar.value = '';
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
  toast.add({
    severity: 'info',
    summary: 'Icône réinitialisée',
    detail: 'L\'avatar par défaut a été rétabli.',
    life: 2500,
  });
}

async function handleSave() {
  const cleanUrl = portalUrl.value.trim();
  storage.setPortalUrl(cleanUrl);
  storage.setPortalTheme(portalTheme.value);
  storage.setPortalTitle(portalTitle.value);
  storage.setPortalSubtitle(portalSubtitle.value);

  if (props.sourceFolder) {
    await settingsService.saveSettings(props.sourceFolder, {
      portalUrl: cleanUrl,
      portalTitle: portalTitle.value,
      portalSubtitle: portalSubtitle.value,
      portalTheme: portalTheme.value,
    });
  }

  toast.add({
    severity: 'success',
    summary: 'Portail web configuré',
    detail: cleanUrl ? `Adresse enregistrée : ${cleanUrl}` : 'Réglages enregistrés.',
    life: 3000,
  });

  emit('saved', {
    portalUrl: cleanUrl,
    portalTitle: portalTitle.value,
    portalSubtitle: portalSubtitle.value,
    portalTheme: portalTheme.value,
  });
  emit('update:visible', false);
}

function handleClose() {
  emit('update:visible', false);
  emit('close');
}
</script>
