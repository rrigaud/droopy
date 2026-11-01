# 🤝 Contribuer à Droopy

Merci pour votre intérêt pour **Droopy** ! Ce projet est développé par un enseignant pour les enseignants, avec le soutien de la communauté open-source.

---

## 🧭 Comment contribuer ?

Vous pouvez contribuer à Droopy de nombreuses manières, que vous soyez développeur, enseignant ou designer :

1. **Signaler un bug** : Ouvrez une [Issue GitHub](https://github.com/rrigaud/droopy/issues) en décrivant le problème rencontré, votre version de macOS et les étapes pour le reproduire.
2. **Proposer une amélioration** : Vous avez une idée pour rendre le flux de travail encore plus rapide ? Partagez-la dans les discussions ou ouvrez une issue avec le label `enhancement`.
3. **Améliorer la documentation** : Proposez des modifications dans le [Guide Enseignant](docs/GUIDE_ENSEIGNANT.md) ou dans les traductions.
4. **Contribuer au code** : Soumettez une Pull Request (voir les consignes ci-dessous).

---

## 🛠️ Règles de développement

### 1. Conventions de code
- **Frontend** : Vue 3 avec la `Composition API` (`<script setup>`).
- **Styles** : Utiliser TailwindCSS pour les espacements et mises en page, coordonné avec les thèmes PrimeVue v4 Aura.
- **Documentation du code** : Toute nouvelle fonction doit comporter un bloc de commentaires JSDoc en français décrivant son rôle, ses paramètres (`@param`) et sa valeur de retour (`@returns`).

### 2. Workflow Git
1. Forkez le dépôt et créez votre branche de fonctionnalité :
   ```bash
   git checkout -b feature/ma-nouvelle-fonctionnalite
   ```
2. Vérifiez que la compilation fonctionne sans erreur :
   ```bash
   npm run build
   ```
3. Commitez vos modifications avec un message explicite respectant les conventions standard :
   - `feat(...)`: nouvelle fonctionnalité
   - `fix(...)`: correction de bug
   - `docs(...)`: amélioration de la documentation
   - `style(...)`: ajustements cosmétiques
4. Poussez votre branche et ouvrez une Pull Request vers `main`.

---

## 📜 Licence

En contribuant à Droopy, vous acceptez que vos contributions soient placées sous la licence libre [MIT](LICENSE).
