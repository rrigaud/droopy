# Données de l'application
- L'application doit conserver 2 informations en préférences : Le lien vers le dossier "Source" (où seront stockées les données des élèves et leurs copies) et le thème de l'application (sombre/clair)
- La sauvegarde des données des élèves doit se faire dans un fichier JSON lisible "eleves.json", le plus simple possible, à la racine du dossier "Source", et qui doit contenir : Le nom de l'élève (composé du NOM DE FAMILLE et du prénom, en ayant pris soin de remplacer les caractères accentués par ceux sans accents), la classe, le sexe (M ou F), le login, le password, et une dropbox-url (contenant une adresse URL vers le dossier en ligne de l'élève stocké dans un dossier partagé de mon espace Dropbox)
- Les PDF découpées mais pas encore identifiés devront être stockés dans un répertoire temporaire à effacer après leur copie dans les dossiers des élèves
- Structure du dossier "Source" :
* Documents
* Evaluations
Dans le dossier "Evaluations" :
* A corriger : Qui contient les PDF à corriger et ceux qui sont corrigés
* Backup : Qui contient les évaluations sauvegardées par classe (et qui sont découpées par la suite)
* Eleves : Qui doit contenir une première arborescence des classes, du type "3e1", "3e2", "4e5",... et qui eux-même contiendront les dossier des élèves nommés grâce à leur "nom" mais sans caractères spéciaux. Les caractères spéciaux et accentués doivent être remplacés par les versions sans accent. Dans les dossiers des élèves, il devra y avoir les évaluations au format "Date de passation - Classe - Nom de l'évaluation - Nom de l'élève.pdf"