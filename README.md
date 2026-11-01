<div align="center">

  <img src="public/logo.png" alt="Droopy Logo" width="130" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />

  # DROOPY
  ### Le workflow nomade de correction d'évaluations pour enseignants

  [![Version](https://img.shields.io/badge/version-5.0.0-emerald.svg?style=flat-square)](https://github.com/rrigaud/droopy/releases)
  [![Platform](https://img.shields.io/badge/plateforme-macOS%2012%2B-blue.svg?style=flat-square&logo=apple)](https://github.com/rrigaud/droopy/releases)
  [![Tauri](https://img.shields.io/badge/moteur-Tauri%202%20(Rust)-orange.svg?style=flat-square&logo=tauri)](https://tauri.app)
  [![License](https://img.shields.io/badge/licence-MIT-purple.svg?style=flat-square)](LICENSE)
  [![Site Vitrine](https://img.shields.io/badge/site_vitrine-En_Ligne-teal.svg?style=flat-square&logo=safari)](https://rrigaud.github.io/droopy)

  <p align="center">
    <strong>Ne portez plus 150 copies. Corrigez sur tablette où vous voulez, quand vous voulez.</strong><br>
    Droopy découpe, extrait vos notes et distribue chaque copie chiffrée dans votre Dropbox personnel.
  </p>

  <p align="center">
    <a href="https://rrigaud.github.io/droopy"><strong>🌐 Découvrir le Site Vitrine</strong></a> •
    <a href="docs/GUIDE_ENSEIGNANT.md"><strong>📖 Manuel Enseignant</strong></a> •
    <a href="docs/ARCHITECTURE_TECHNIQUE.md"><strong>🛠️ Architecture Développeur</strong></a> •
    <a href="https://github.com/rrigaud/droopy/releases"><strong>🍏 Télécharger pour Mac (.dmg)</strong></a>
  </p>

</div>

---

> **« Vous savez quoi ? Vos 130 copies sont déjà corrigées, découpées et rangées. »** ☕😴  
> *L'étymologie de Droopy : **DRO**pbox + c**OPY** = le génie de la paresse utile.*

---

## 💡 Pourquoi Droopy ?

Le problème de la correction n'a jamais été le geste d'écrire sur une copie : c'est **la lourdeur logistique du papier**. Porter 10 kg de copies empêche toute flexibilité : impossible d'avancer 15 minutes dans une salle d'attente chez le médecin, au café, sur un banc, ou en attendant ses enfants à leur sport du mercredi après-midi.

**La méthode nomade Droopy transforme cette routine en 4 étapes :**

1. **Le Scan Express (1 minute)** : Vous passez le paquet complet au photocopieur du collège avec une clé USB.
2. **La Correction Nomade (Partout)** : Les 140 copies tiennent dans un iPad ou une tablette. Vous annotez au stylet par tranches de 15 minutes, où vous voulez, quand vous voulez.
3. **Le Clic Droopy (3 secondes)** : Droopy identifie les élèves, découpe les copies individuelles, relève automatiquement les notes (prêtes à coller dans Notion, Excel ou Pronote) et les dépose dans votre Dropbox.
4. **La Consultation Universelle pour les Familles** : Les élèves accèdent à leurs copies sur un portail web moderne (smartphone, tablette, PC, console PS5 / Nintendo Switch ou TV connectée) installable comme une vraie application (PWA).

---

## ✨ Fonctionnalités Clés

- **⚡ Découpage sans ré-encodage** : Moteur vectoriel natif ultra-rapide capable de découper 100 pages en moins de 3 secondes tout en préservant la netteté de vos annotations au stylet.
- **🏷️ Planches d'étiquettes de rentrée** : Génération en un clic des fiches individuelles en PDF (format 2 colonnes) à faire coller sur les cahiers avec identifiant, mot de passe et QR code de consultation.
- **📊 Relevé automatique des notes** : Copie dans le presse-papier d'un tableau propre (`Élève \t Note`) prêt à coller dans Notion, Pronote ou LibreOffice Calc.
- **🔐 Chiffrement AES-256 GCM Client-Side** : Les liens de partage en ligne sont chiffrés avec le mot de passe individuel de l'élève. Même l'hébergeur web ne peut pas lire les copies.
- **🛡️ 100% Hors-Ligne & RGPD Conforme** : Zéro serveur central, zéro compte tiers payant, zéro télémétrie. Tout le traitement est exécuté localement sur votre Mac.

---

## 📂 Organisation du Dossier Source

Droopy organise automatiquement votre dossier de travail :

```text
Dossier_Source/
├── eleves.json                  # Base de données locale de vos élèves
├── settings.json                # Préférences (URL portail, thèmes, synchronisations)
├── Documents/                   # Espace pour documents généraux de l'enseignant
└── Evaluations/
    ├── A corriger/              # Dossier de dépôt de vos scans PDF
    ├── Backup/                  # Archivage automatique des paquets complets
    └── Eleves/                  # Un sous-dossier par classe et par élève
        ├── 4eme B/
        │   ├── DUPONT Lucas/
        │   └── MARTIN Emma/
        └── 3eme 1/
```

---

## 🛠️ Stack Technique

- **Moteur Desktop** : [Tauri v2](https://tauri.app/) (Rust natif, macOS M1/M2/M3/M4 & Intel).
- **Interface Utilisateur** : [Vue 3](https://vuejs.org/) (Composition API), [PrimeVue v4](https://primevue.org/) (Preset Aura), [TailwindCSS](https://tailwindcss.com/).
- **Moteur PDF** : `pdf-lib` (découpage vectoriel pur) et `pdfjs-dist` (zoom Canvas haute définition).
- **Stockage Cloud** : Dropbox API v2 (Protocole OAuth 2.0 PKCE, architecture Scoped App).
- **Cryptographie** : WebCrypto API standard (PBKDF2 SHA-256 + AES-GCM 256 bits).

Consultez le document complet d'[Architecture Technique](docs/ARCHITECTURE_TECHNIQUE.md) pour approfondir les protocoles.

---

## 🚀 Démarrage Rapide (Pour les Développeurs)

### Prérequis
- macOS avec Node.js (v18+) et Rust (`cargo`).

```bash
# 1. Cloner le projet
git clone https://github.com/rrigaud/droopy.git
cd droopy

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm run tauri dev

# 4. Compiler le fichier d'installation (.dmg)
npm run tauri build
```

---

## 📚 Liens Utiles

- 🌐 **Site Vitrine Officiel** : [https://rrigaud.github.io/droopy](https://rrigaud.github.io/droopy)
- 📖 **Manuel Enseignant Pas-à-Pas** : [docs/GUIDE_ENSEIGNANT.md](docs/GUIDE_ENSEIGNANT.md)
- 🛠️ **Architecture & Cryptographie** : [docs/ARCHITECTURE_TECHNIQUE.md](docs/ARCHITECTURE_TECHNIQUE.md)
- 🤝 **Guide de Contribution** : [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- 🐛 **Signaler un Problème** : [GitHub Issues](https://github.com/rrigaud/droopy/issues)

---

## 📜 Licence

Projet publié sous licence libre **[MIT](LICENSE)** — Développé avec passion pour la communauté enseignante.
