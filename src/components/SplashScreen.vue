<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md font-sans antialiased"
    >
      <!-- Cadre central du Splash Screen -->
      <div
        class="w-full max-w-[560px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300"
      >
        <!-- Lueur subtile en arrière-plan -->
        <div class="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-glow"></div>
        <div class="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-glow"></div>

        <!-- EN-TÊTE : ICÔNE OFFICIELLE DROOPY + TITRE -->
        <div class="text-center relative z-10 mb-6">
          <!-- Icône Officielle Droopy (Style Géométrique Low-Poly) -->
          <div class="relative inline-block mb-4">
            <div
              class="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl bg-gradient-to-b from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center p-3 sm:p-4 shadow-2xl shadow-blue-950/30 animate-gentle"
            >
              <img src="/logo.png" alt="Droopy" class="w-full h-full object-contain rounded-2xl drop-shadow-lg" />
            </div>
            <span
              class="absolute -bottom-1 -right-1 px-2.5 py-1 rounded-full bg-blue-600 text-xs font-extrabold text-white uppercase tracking-wider shadow-lg border border-blue-400/40"
            >
              v5.0.0
            </span>
          </div>

          <!-- Titre principal -->
          <h1 class="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-wide flex items-center justify-center gap-2">
            <span>DROOPY</span>
            <span
              class="text-xs px-2 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-medium border border-blue-500/20 dark:border-blue-500/30"
            >
              Dropbox Copy
            </span>
          </h1>
          <p class="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium transition-all">
            {{ currentSubtitle }}
          </p>
        </div>

        <!-- BARRE DE PROGRESSION DISCRÈTE -->
        <div class="relative w-full h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden mb-5">
          <div
            class="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 transition-all duration-300 rounded-full"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>

        <!-- CHECKLIST SÉQUENTIELLE EN 4 ÉTAPES -->
        <div class="space-y-2.5 relative z-10">
          <!-- Étape 1 : Dossier Source & Préférences -->
          <div :class="getStepClass(steps.step1)">
            <div class="flex items-center gap-3 min-w-0">
              <div :class="getStepIconClass(steps.step1)">
                <template v-if="steps.step1.status === 'running'">
                  <i class="pi pi-spin pi-spinner text-xs" />
                </template>
                <template v-else-if="steps.step1.status === 'success'">
                  <i class="pi pi-check text-xs font-bold" />
                </template>
                <template v-else-if="steps.step1.status === 'action' || steps.step1.showSelectBtn">
                  <i class="pi pi-folder-open text-xs font-bold" />
                </template>
                <template v-else-if="steps.step1.status === 'error'">
                  <i class="pi pi-times text-xs font-bold" />
                </template>
                <template v-else>
                  1
                </template>
              </div>
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-gray-800 dark:text-white truncate">
                  Dossier Source & Préférences
                </h4>
                <p class="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                  {{ steps.step1.desc }}
                </p>
              </div>
            </div>

            <!-- Bouton de sélection directe du dossier Source -->
            <button
              v-if="steps.step1.showSelectBtn || steps.step1.status === 'action' || (steps.step1.status === 'error' && !actionBanner)"
              type="button"
              @click="$emit('select-source')"
              class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ml-2"
            >
              <i class="pi pi-folder-open text-xs" />
              <span>Choisir le dossier</span>
            </button>
            <span v-else :class="getStepBadgeClass(steps.step1)">
              {{ steps.step1.badge }}
            </span>
          </div>

          <!-- Étape 2 : Dossiers locaux des élèves -->
          <div :class="getStepClass(steps.step2)">
            <div class="flex items-center gap-3">
              <div :class="getStepIconClass(steps.step2)">
                <template v-if="steps.step2.status === 'running'">
                  <i class="pi pi-spin pi-spinner text-xs" />
                </template>
                <template v-else-if="steps.step2.status === 'success'">
                  <i class="pi pi-check text-xs font-bold" />
                </template>
                <template v-else-if="steps.step2.status === 'warning' || steps.step2.status === 'error'">
                  <i class="pi pi-exclamation-triangle text-xs font-bold" />
                </template>
                <template v-else>
                  2
                </template>
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-800 dark:text-white">
                  Dossiers locaux des élèves
                </h4>
                <p class="text-[11px] text-gray-500 dark:text-slate-400">
                  {{ steps.step2.desc }}
                </p>
              </div>
            </div>
            <span :class="getStepBadgeClass(steps.step2)">
              {{ steps.step2.badge }}
            </span>
          </div>

          <!-- Étape 3 : Compte Dropbox & Partages -->
          <div :class="getStepClass(steps.step3)">
            <div class="flex items-start gap-3 w-full">
              <div :class="getStepIconClass(steps.step3)">
                <template v-if="steps.step3.status === 'running'">
                  <i class="pi pi-spin pi-spinner text-xs" />
                </template>
                <template v-else-if="steps.step3.status === 'success'">
                  <i class="pi pi-check text-xs font-bold" />
                </template>
                <template v-else-if="steps.step3.status === 'deferred'">
                  <i class="pi pi-clock text-xs font-bold" />
                </template>
                <template v-else-if="steps.step3.status === 'action'">
                  <i class="pi pi-box text-xs font-bold" />
                </template>
                <template v-else-if="steps.step3.status === 'warning' || steps.step3.status === 'error'">
                  <i class="pi pi-exclamation-triangle text-xs font-bold" />
                </template>
                <template v-else>
                  3
                </template>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-xs font-bold text-gray-800 dark:text-white">
                    Compte Dropbox & Partages
                  </h4>
                  <span :class="getStepBadgeClass(steps.step3)">
                    {{ steps.step3.badge }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {{ steps.step3.desc }}
                </p>

                <!-- Boutons d'action Étape 3 (si non configuré / action requise) -->
                <div
                  v-if="steps.step3.status === 'action'"
                  class="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-blue-200/50 dark:border-blue-900/40"
                >
                  <button
                    type="button"
                    @click="$emit('skip-dropbox')"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <i class="pi pi-clock text-[10px]" />
                    <span>Ne pas configurer</span>
                  </button>
                  <button
                    type="button"
                    @click="$emit('configure-dropbox')"
                    class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <i class="pi pi-box text-xs" />
                    <span>Configurer le compte Dropbox</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Étape 4 : Portail de connexion web -->
          <div :class="getStepClass(steps.step4)">
            <div class="flex items-start gap-3 w-full">
              <div :class="getStepIconClass(steps.step4)">
                <template v-if="steps.step4.status === 'running'">
                  <i class="pi pi-spin pi-spinner text-xs" />
                </template>
                <template v-else-if="steps.step4.status === 'success'">
                  <i class="pi pi-check text-xs font-bold" />
                </template>
                <template v-else-if="steps.step4.status === 'deferred'">
                  <i class="pi pi-clock text-xs font-bold" />
                </template>
                <template v-else-if="steps.step4.status === 'action'">
                  <i class="pi pi-globe text-xs font-bold" />
                </template>
                <template v-else-if="steps.step4.status === 'warning' || steps.step4.status === 'error'">
                  <i class="pi pi-exclamation-triangle text-xs font-bold" />
                </template>
                <template v-else>
                  4
                </template>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-xs font-bold text-gray-800 dark:text-white">
                    Portail de connexion web
                  </h4>
                  <span :class="getStepBadgeClass(steps.step4)">
                    {{ steps.step4.badge }}
                  </span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {{ steps.step4.desc }}
                </p>

                <!-- Boutons d'action Étape 4 (si adresse non renseignée / action requise) -->
                <div
                  v-if="steps.step4.status === 'action'"
                  class="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-purple-200/50 dark:border-purple-900/40"
                >
                  <button
                    type="button"
                    @click="$emit('skip-portal')"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <i class="pi pi-clock text-[10px]" />
                    <span>Ne pas configurer</span>
                  </button>
                  <button
                    type="button"
                    @click="$emit('configure-portal')"
                    class="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <i class="pi pi-globe text-xs" />
                    <span>Configurer le portail de connexion</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ZONE D'ACTION RÉSOLUTIVE (Si anomalie ou action requise) -->
        <div
          v-if="actionBanner"
          class="mt-5 p-4 rounded-2xl border transition-all duration-300"
          :class="actionBanner.bgBorderClass"
        >
          <div class="flex items-start gap-3 mb-3">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-base">
              {{ actionBanner.icon }}
            </div>
            <div>
              <h5 class="text-xs font-bold text-gray-900 dark:text-white">
                {{ actionBanner.title }}
              </h5>
              <p class="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {{ actionBanner.text }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="$emit('action', actionBanner.type)"
            class="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
            :class="actionBanner.btnClass"
          >
            <span>{{ actionBanner.btnText }}</span>
            <i class="pi pi-arrow-right text-xs" />
          </button>
        </div>

        <!-- NOTIFICATION DE SUCCÈS NOMINAL -->
        <div
          v-else-if="allOk"
          class="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in"
        >
          <div
            class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white mb-2 shadow-lg shadow-emerald-500/20"
          >
            <i class="pi pi-check text-sm font-bold" />
          </div>
          <h5 class="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Tout est parfaitement opérationnel !
          </h5>
          <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
            Accès immédiat au chargement des copies...
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  steps: {
    type: Object,
    required: true,
  },
  progressPercent: {
    type: Number,
    default: 15,
  },
  currentSubtitle: {
    type: String,
    default: 'Initialisation de votre environnement enseignant...',
  },
  actionBanner: {
    type: Object,
    default: null,
  },
  allOk: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'action',
  'close',
  'select-source',
  'configure-dropbox',
  'skip-dropbox',
  'configure-portal',
  'skip-portal',
]);

function getStepClass(step) {
  const base = 'step-card p-3 rounded-2xl flex items-center justify-between transition-all duration-300 ';
  if (step.status === 'running') {
    return (
      base +
      'bg-blue-50/70 dark:bg-slate-800/60 border border-blue-500/40 opacity-100 shadow-sm shadow-blue-500/5'
    );
  }
  if (step.status === 'action' || step.showSelectBtn) {
    return (
      base +
      'bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-500/60 opacity-100 shadow-md shadow-blue-500/10'
    );
  }
  if (step.status === 'deferred') {
    return (
      base +
      'bg-blue-50/50 dark:bg-slate-800/40 border border-blue-300/60 dark:border-blue-500/30 opacity-90'
    );
  }
  if (step.status === 'success') {
    return (
      base +
      'bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-500/30 opacity-100'
    );
  }
  if (step.status === 'error') {
    return (
      base +
      'bg-rose-50/70 dark:bg-rose-500/10 border border-rose-500/40 opacity-100 shadow-sm shadow-rose-500/10'
    );
  }
  if (step.status === 'warning') {
    return (
      base +
      'bg-amber-50/70 dark:bg-amber-500/10 border border-amber-500/40 opacity-100'
    );
  }
  return (
    base +
    'bg-gray-50/80 dark:bg-slate-800/20 border border-gray-200 dark:border-slate-800/80 opacity-50'
  );
}

function getStepIconClass(step) {
  const base = 'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ';
  if (step.status === 'running') {
    return base + 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
  }
  if (step.status === 'action' || step.showSelectBtn) {
    return base + 'bg-blue-600 text-white shadow-md shadow-blue-600/30';
  }
  if (step.status === 'deferred') {
    return base + 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold';
  }
  if (step.status === 'success') {
    return base + 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  }
  if (step.status === 'error') {
    return base + 'bg-rose-500/20 text-rose-600 dark:text-rose-400';
  }
  if (step.status === 'warning') {
    return base + 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
  }
  return base + 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400';
}

function getStepBadgeClass(step) {
  const base = 'text-[11px] font-mono shrink-0 ';
  if (step.status === 'running') {
    return base + 'text-blue-600 dark:text-blue-400 font-bold animate-pulse';
  }
  if (step.status === 'action') {
    return base + 'text-blue-600 dark:text-blue-400 font-bold';
  }
  if (step.status === 'deferred') {
    return base + 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full text-[10px]';
  }
  if (step.status === 'success') {
    return base + 'text-emerald-600 dark:text-emerald-400 font-bold';
  }
  if (step.status === 'error') {
    return base + 'text-rose-600 dark:text-rose-400 font-bold';
  }
  if (step.status === 'warning') {
    return base + 'text-amber-600 dark:text-amber-400 font-bold';
  }
  return base + 'text-gray-400 dark:text-slate-500';
}
</script>

<style scoped>
@keyframes gentleBounce {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
}
@keyframes pulseGlow {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.08);
  }
}

.animate-gentle {
  animation: gentleBounce 2.8s ease-in-out infinite;
}
.animate-glow {
  animation: pulseGlow 2.5s ease-in-out infinite;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.45s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
