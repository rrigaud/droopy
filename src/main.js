import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

import 'primeicons/primeicons.css';
import './style.css';

import App from './App.vue';
import { storage, applyThemeToDOM } from './services/storage';

// Si lancé via le mode profil vierge (?virgin=1), on vide immédiatement le localStorage
// pour garantir un premier démarrage totalement neuf à chaque lancement du script de test
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('virgin') === '1' && !sessionStorage.getItem('__droopy_virgin_session__')) {
    sessionStorage.setItem('__droopy_virgin_session__', '1');
    localStorage.clear();
  }
}

// Initialise le thème sombre (par défaut) ou sauvegardé
applyThemeToDOM(storage.getTheme());

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.p-dark',
    },
  },
});

app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

app.mount('#app');
