# Tests CEE Vérif

## Tests e2e (End-to-End)

Tests qui simulent un utilisateur réel utilisant l'application.

### Prérequis

1. **Variables d'environnement** : Copier `.env.test` vers `.env.local` et remplir avec les vraies valeurs
2. **Dépendances installées** : `npm install`
3. **Navigateurs Playwright** : `npx playwright install chromium`

### Commandes

```bash
# Lancer tous les tests e2e
npm run test:e2e

# Lancer les tests en mode UI (interface graphique)
npm run test:e2e:ui

# Lancer les tests en mode headed (voir le navigateur)
npm run test:e2e:headed

# Lancer les tests en mode debug
npm run test:e2e:debug

# Voir le rapport des tests
npm run test:report
```

### Structure

```
tests/
├── e2e/
│   ├── helpers.js                          ← Utilitaires communs
│   ├── 01-analyse-complete.spec.js         ← Test workflow complet
│   ├── 02-multi-chantiers.spec.js          ← Test détection multi-chantiers
│   ├── 03-saisie-manuelle.spec.js          ← Test saisie manuelle surfaces
│   └── 04-attestations-manquantes.spec.js  ← Test gestion attestations absentes
│
└── fixtures/
    ├── audit-exemple.pdf                    ← PDF de test
    ├── synthese-exemple.pdf
    ├── cee-exemple.pdf
    └── fiche-led-exemple.pdf
```

### Helpers disponibles

```javascript
import {
  login,
  uploadFile,
  launchAnalysis,
  checkExists,
  countChecksByLevel,
  getPageGardeBannerColor,
  switchToChantier,
  enterManualSurface,
  resetApp
} from './helpers.js';
```

## Tests unitaires (à venir)

Tests des fonctions individuelles isolément.

```
tests/
├── unit/
│   ├── utils/           ← Tests fonctions utils/
│   ├── operations/      ← Tests logique métier
│   └── core/            ← Tests infrastructure
```

### Commandes (à venir)

```bash
# Lancer tous les tests unitaires
npm run test:unit

# Lancer les tests avec coverage
npm run test:coverage
```

---

## Debugging

### En cas d'échec de test

1. **Voir les screenshots** : `test-results/` contient les captures d'écran des échecs
2. **Voir les vidéos** : `test-results/` contient aussi les vidéos
3. **Voir les traces** : `npm run test:report` pour le rapport interactif
4. **Mode debug** : `npm run test:e2e:debug` pour débugger pas à pas

### Logs utiles

```bash
# Voir les logs du serveur Vercel
vercel dev --listen 3000

# Voir les logs des tests en temps réel
npm run test:e2e:headed
```

---

## CI/CD

Les tests e2e sont exécutés automatiquement sur chaque push via GitHub Actions (à configurer).

```yaml
# .github/workflows/test.yml
- name: Run e2e tests
  run: npm run test:e2e
```

---

**Dernière mise à jour** : 26 mai 2026
