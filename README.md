# Droopy 🚀

Application de bureau moderne et ultra-légère conçue pour les enseignants afin de gérer facilement :
1. **Les élèves et leurs classes** (importation CSV, mots de passe aléatoires, dossiers locaux, export sécurisé `students.js`).
2. **Le découpage automatique des évaluations corrigées** (support PDF multi-pages, détection intelligente du nombre de pages par copie).
3. **L'identification ultra-fluide des copies** (aperçu haute définition du haut de la feuille, saisie au clavier en temps réel, navigation assistée).
4. **La distribution des copies et l'export des notes** (classement dans les dossiers Dropbox locaux des élèves, copie des notes pour Notion / Numbers / LibreOffice Calc).

---

## 🛠️ Stack Technique

- **Interface utilisateur** : Vue 3, PrimeVue v4 (Preset Aura avec basculement Thème Clair / Sombre), TailwindCSS, PrimeIcons.
- **Moteur PDF** : `pdf-lib` (découpage ultra-rapide des pages) et `pdfjs-dist` (rendu Canvas haute résolution).
- **Importation & Crypto** : `PapaParse` pour les CSV et `crypto-js` pour le hashage SHA-256 de `students.js`.
- **Application de bureau** : **Tauri 2** (Rust natif, multiplateforme macOS, Windows, Linux, empreinte mémoire minimale).

---

## 📂 Structure du dossier Source

Le dossier **Source** sélectionné dans les Paramètres possède l'arborescence suivante :

```text
Source/
├── eleves.json                  # Base de données JSON des élèves
├── students.js                  # Export optionnel chiffré (SHA-256)
├── Documents/                   # Documents généraux
└── Evaluations/
    ├── A corriger/              # Dossier de recherche par défaut des PDF
    ├── Backup/                  # Archivage automatique des évaluations complètes
    └── Eleves/                  # Arborescence par classe et par élève
        ├── 3e1/
        │   ├── DUPOND Martin/
        │   │   └── 2026-10-20 - 3e1 - Devoir 1 - DUPOND Martin.pdf
        │   └── DURAND Sophie/
        └── 4e2/
```

---

## 🧭 Fonctionnement étape par étape

### ⚙️ En-tête & Paramètres
- Bouton **Paramètres** (icône engrenage) : permet de sélectionner l'emplacement local du dossier **Source** et de basculer entre **Thème Clair** et **Thème Sombre**.
- **Stepper horizontal** indiquant l'avancement :
  - **Step 0 : Elèves** (toujours accessible)
  - **Step 1 : Chargement des copies**
  - **Step 2 : Identification des copies**
  - **Step 3 : Distribution des copies**

### Step 0 : Gestion des élèves
- **Importer un CSV** :
  - *Étape 1* : Détection automatique des colonnes, toggleswitch pour prendre en compte ou non la 1ère ligne de titre, sélection des colonnes (les menus sélectionnés passent en vert).
  - *Étape 2* : Tableau avec sélection multiple et import direct dans `eleves.json`.
- **Gestion individuelle & groupée** :
  - Ajouter / Modifier / Supprimer un élève.
  - **Générer le dossier** : Crée automatiquement `/Evaluations/Eleves/Classe/Nom` (sans accents ni caractères spéciaux).
  - **Générer un mot de passe** : Attribue un mot de passe aléatoire de 6 à 10 lettres courantes françaises sans accent.
  - **Exporter le JS chiffré** : Génère `students.js` avec `{ Login: sha256(login), Niveau: classe[0], Dropbox: url }`.
- Si tous les élèves ont leur dossier créé, le bouton **"Charger des copies..."** devient actif et mène au Step 1.

### Step 1 : Chargement des copies (PDF)
- Sélection du PDF (par défaut dans `/Evaluations/A corriger`).
- Sélection de la date (par défaut date du jour `YYYY-MM-DD`), de la classe et du nom de l'évaluation.
- Détection intelligente du nombre de pages par copie (1 à 6 pages, basée sur un effectif de 20 à 36 élèves).
- Clic sur **"Archiver et identifier les copies..."** :
  - Sauvegarde et déplacement du PDF complet dans `/Evaluations/Backup/<Date> - <Classe> - <Nom>.pdf`.
  - Découpage en copies individuelles stockées temporairement.
  - Transition vers le Step 2.

### Step 2 : Identification ultra-fluide des copies
- Barre de progression des copies identifiées en temps réel.
- Volet gauche : Liste des copies identifiées (avec note) et copies restantes à identifier.
- Volet droit :
  - Aperçu haute définition du haut de la feuille de copie pour lire le prénom, nom et la note manuscrite.
  - Champ de recherche d'élève en temps réel : tapez quelques lettres, descendez avec les flèches, appuyez sur **Entrée** (sélection immédiate si un seul résultat).
  - Le curseur passe automatiquement sur le champ **Note**. Tapez la note et appuyez sur **Entrée** pour valider et passer directement à la copie suivante !
- Vérification automatique de doublons (aucun élève ne peut recevoir 2 copies).
- Dès que toutes les copies sont identifiées, le bouton **"Passer à la distribution..."** s'affiche.

### Step 3 : Distribution & Export
- Tableau récapitulatif de tous les élèves de la classe par ordre alphabétique :
  - Statut de la copie (**Identifiée** en vert ou **Absente** en rouge, avec décompte dans le titre).
  - Note individuelle et **Moyenne de la classe** affichée en en-tête.
- **Distribuer les copies** : renomme et déplace chaque copie dans le dossier Dropbox local de chaque élève (`/Evaluations/Eleves/Classe/Nom de l'élève/`), puis supprime le dossier temporaire.
- **Exporter les notes** : copie dans le presse-papier un tableau 2 colonnes (`Elève \t Note`) prêt à être collé directement dans **Notion**, **Numbers** ou **LibreOffice Calc**.
- Bouton **"Distribuer une autre évaluation..."** pour réinitialiser et traiter une nouvelle classe.

---

## 🚀 Lancement & Compilation

### Mode Développement
```bash
# Lancement de l'interface Vite
npm run dev

# Lancement de l'application de bureau Tauri
npm run tauri dev
```

### Compilation finale de l'application de bureau (.app / .dmg sur Mac, .exe sur Windows, .deb/.AppImage sur Linux)
```bash
npm run tauri build
```
