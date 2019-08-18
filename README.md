[![Droopy Logo](https://github.com/rrigaud/droopy/blob/master/app-icon.png)](https://github.com/rrigaud/droopy)

# DROOPY (DROpbox cOPY) : Pourquoi faire ?

DROOPY (DROpbox cOPY) assure le découpage et la distribution de copies PDF dans des dossiers Dropbox.

Il s'intègre de manière plus large dans un Workflow d'enseignant de correction de copies numérisées :

1. Création d'un PDF pour une évaluation : Scan des copies (par exemple grâce un photocopieur muni d'un port USB)
2. Correction de l'évaluation (par exemple à l'aide d'une tablette numérique et d'un stylet)
3. Découpage du PDF de l'évaluation en copies PDF par élève
4. Distribution des copies corrigées dans des dossiers élèves Dropbox privés et sécurisés
5. Export des résultats (par exemple vers un tableur)
6. L'accès à ces dossiers se fait via un simple portail (par exemple une PWA) ultra léger qui redirige chaque élève vers son dossier personnel

Droopy s'occupe des points 3, 4 et 5 qui seraient extrêmement chronophages à gérer manuellement.


# Fonctionnalités de Droopy

- Import d'élèves au format CSV
- Génération de l'arborescence nécessaire à la remise des évaluations
- Génération d'un fichier chiffré pour le portail d'accès
- Découpage et recollage des pages d'une évaluation
- Identification rapide de la copie (tout au clavier)
- Attribution de la note
- Distribution des copies évaluées
- Archivage de l'évaluation
- Export des résultats pour une saisie simplifiée sur le logiciel de notes de l'établissement scolaire


# Dépendances

Droopy a besoin des programmes `pdfseparate` et `pdfunite` pour fonctionner correctement (manipulation de PDF en ligne de commande)


# Installation

- Télécharger la dernière version pour votre plateforme (Windows, Mac, Linux)
- Lancer le fichier téléchargé


# Développeurs

```sh
git clone https://github.com/rrigaud/droopy
cd droopy
yarn install
yarn dev
```

Pour créer les exécutables :
```sh
yarn build
```