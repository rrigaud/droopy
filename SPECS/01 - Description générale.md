# Objectif
L'application s'appelle "DROOPY". C'est la version 4.
Application de bureau qui permette de gérer des élèves (répartis dans des classes), leurs copies corrigées (identification et distribution) et l'export de leurs notes.

# Fonctionnalités
- Permettre l'import d'une liste d'élèves au format CSV, comprenant divers champs (nom, prénom, classe, sexe, identifiant, mot de passe, url,...)
- Permettre la gestion de ces élèves : Ajouter/Supprimer/Editer ces élèves, générer des dossiers correspondants, des mots de passes, des identifiants
- Permettre d'ouvrir un fichier PDF contenant toutes les copies corrigées d'une classe, de la visualiser, lui donner un nom, une date de passation, la découper (par 1, 2, 3 ou plusieurs pages selon la longueur du sujet) et distribuer ces PDF ainsi créés dans le dossier de chaque élève après avoir permis d'identifier l'élève et sa note. Cette opération doit se faire de la manière la plus fluide possible, en affichant automatiquement le haut de chaque copie afin que je puisse déterminer l'élève et la note manuscrite, en proposant de taper quelques lettres pour filter en temps réel les élèves correspondant, puis sur une validation sur la touche "Entrée", permettre de taper la note, puis taper sur "Entrée", ce qui ferait passer à la copie suivante et ainsi de suite jusqu'à la fin de l'identification de toutes les copies découpées
- Permettre un export d'un tableau "Elève - note" pour le clipboard afin de les copier dans un tableau Notion, ou bien un tableur comme Numbers ou Llibreoffice Calc

# Tech Stack
- Une application Javascript avec une interface uniforme proposant de nombreux composants homogènes et qualitatifs comme des tableaux filtrables, triables, sélectionnables pour des actions... J'ai pensé à PrimeVue et Vite (Quasar en solution de secours ?)
- Application bureau multiplateforme avec un produit distribuable pour Mac OS, Windows et Linux... La plus légère possible, donc utilisant Tauri pour la distribution (plutôt que Electron)