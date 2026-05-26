# Architecture actuelle de CEE Vérif

**Date d'analyse** : 26 mai 2026  
**Fichier analysé** : `index.html` (6368 lignes)  
**Objectif** : Documenter l'architecture existante avant modularisation

---

## Vue d'ensemble

### Structure actuelle
```
index.html (6368 lignes)
├── HTML (lignes 1-1500) — Structure de l'interface
├── CSS (lignes 17-1500) — Styles intégrés
└── JavaScript (lignes 1500-6368) — Toute la logique
```

### Statistiques
- **Lignes HTML/CSS** : ~1500 lignes
- **Lignes JavaScript** : ~4800 lignes
- **Fonctions identifiées** : 61 fonctions
- **Constantes globales** : FICHES_TECHNIQUES, uploadedFiles, extractedData, currentChecks
- **Dépendances externes** : pdf.js (CDN), Google Fonts

---

## Catégorisation des fonctions

### 1️⃣ API & Communication externe (5 fonctions)

#### Appels API
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `compareWithGoogleSheet()` | 1526 | Comparaison avec Google Sheets | `/api/compareSheet` |
| `searchSiret()` | 1598 | Recherche SIRET gouvernementale | `/api/search` |
| `displaySearchResults()` | 1615 | Affichage résultats recherche | DOM |

#### Extraction PDF
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `extractTextFromPDF()` | 1781 | Extraction texte depuis PDF | pdf.js |
| `parseSurfacesFromSynthese()` | 2816 | Parser tableau surfaces Synthèse | regex |

**Dépendances externes** :
- `/api/analyze` — Claude Sonnet 4 pour extraction
- `/api/search` — API SIRET gouvernementale
- `/api/compareSheet` — Google Sheets API
- `pdf.js` — Extraction texte PDF côté client

---

### 2️⃣ Gestion des fichiers & Upload (10 fonctions)

#### Upload principal
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `setupUploadZone()` | 1660 | Configuration zone drag & drop | DOM events |
| `handleFileUpload()` | 1698 | Gestion upload fichier | `extractTextFromPDF()` |
| `removeFile()` | 1731 | Suppression fichier | DOM |
| `checkAnalyzeButton()` | 1756 | Validation bouton Analyser | `uploadedFiles` |
| `checkExtractButton()` | 1763 | Validation bouton Extraire | `uploadedFiles` |

#### Upload multi-chantiers
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `autoDetectChantiers()` | 2030 | Détection auto chantiers | `/api/analyze` |
| `detectAdressesLocally()` | 2091 | Détection adresses locales | regex |
| `renderChantiers()` | 2219 | Affichage UI multi-chantiers | DOM |
| `setupChantierUploadZone()` | 2292 | Setup upload par chantier | DOM events |
| `handleChantierFileUpload()` | 2327 | Upload fichier chantier | `extractTextFromPDF()` |
| `removeChantierFile()` | 2343 | Suppression fichier chantier | DOM |

**État global utilisé** :
- `uploadedFiles` — Objet contenant les fichiers uploadés
- `detectedChantiers` — Array des chantiers détectés

---

### 3️⃣ Utilitaires de comparaison (14 fonctions)

#### Comparaisons simples
| Fonction | Ligne | Description | Tolérance |
|----------|-------|-------------|-----------|
| `compareStrings()` | 2941 | Comparaison texte normalisé | Case-insensitive |
| `compareNumber()` | 2915 | Comparaison numérique | Exacte |
| `compareMoney()` | 2997 | Comparaison montants | Exacte |
| `compareDate()` | 2974 | Comparaison dates | Exacte |
| `compareSIRET()` | 3281 | Comparaison SIRET | Exacte (14 chiffres) |

#### Comparaisons complexes
| Fonction | Ligne | Description | Logique spéciale |
|----------|-------|-------------|------------------|
| `compareParcelles()` | 2855 | Comparaison parcelles cadastrales | Ignore ordre, espaces, séparateurs |
| `compareSecteurEtude()` | 2884 | Comparaison secteur activité | Équivalences (Entrepôt/Logistique/Stockage) |
| `compareProductRef()` | 3017 | Comparaison référence produit | Normalisation marque/modèle |
| `compareAddress()` | 3184 | Comparaison adresses | Normalisation complexe |

#### Utilitaires adresses
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `normaliserAdresseSansBatiment()` | 3088 | Suppression mentions BAT/Bâtiment | regex |
| `extraireNombreBatiments()` | 3060 | Extraction nombre bâtiments | regex |
| `decomposeAddress()` | 3237 | Décomposition adresse en parties | regex |
| `regrouperAttestationsParAdresse()` | 3110 | Regroupement attestations | `compareAddress()` |

#### Validation
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `isValidDateFormat()` | 3045 | Validation format date | regex |

**Principe de normalisation** :
1. Suppression accents, espaces superflus
2. Mise en minuscules
3. Suppression mentions bâtiments/parcelles
4. Comparaison texte final

---

### 4️⃣ Utilitaires de transformation (5 fonctions)

| Fonction | Ligne | Description | Usage |
|----------|-------|-------------|-------|
| `normalize()` | 2785 | Normalisation texte générique | Partout |
| `normalizeExtracted()` | 3306 | Normalisation données extraites | API response |
| `sumSurfaces()` | 3295 | Somme tableau surfaces | Checks surfaces |
| `sumLED()` | 3390 | Somme LED multi-docs | Checks LED |
| `updateProgress()` | 2775 | Mise à jour barre progression | UI feedback |

---

### 5️⃣ Logique métier CEE BAT-EQ-127 (8 fonctions)

#### Matching multi-chantiers
| Fonction | Ligne | Description | Algorithme |
|----------|-------|-------------|------------|
| `matchChantiers()` | 3364 | Matching audits/synthèses | Par INDEX (pas adresse) |
| `getFirstAudit()` | 3398 | Récupération 1er audit | Helper |
| `getFirstSynthese()` | 3402 | Récupération 1ère synthèse | Helper |

#### Validation métier
| Fonction | Ligne | Description | Critère |
|----------|-------|-------------|---------|
| `checkMentionsAgricoles()` | 3407 | Détection mentions agricoles | BLOQUANT si trouvé |

#### Génération des checks
| Fonction | Ligne | Description | Complexité |
|----------|-------|-------------|------------|
| `generateChecks()` | 3519 | Génération des 47 checks | ~1250 lignes (!) |

**Détail `generateChecks()` (lignes 3519-4786)** :
- **Checks 01-02** : Page de garde (BLOQUANT)
- **Checks 03-09** : Identité client
- **Checks 10-16** : LED et fiche technique
- **Checks 17-38** : Validation croisée docs
- **Check 39** : Cohérence nb chantiers
- **Checks 40-47** : Surfaces (avec logique saisie manuelle)

**Complexité cyclomatique** : Très élevée (if imbriqués, loops multi-niveaux)

---

### 6️⃣ Affichage des résultats (16 fonctions)

#### Rendu principal
| Fonction | Ligne | Description | Dépendances |
|----------|-------|-------------|-------------|
| `displayResults()` | 5158 | Affichage résultats globaux | Toutes les fonctions de rendu |
| `createCheckCard()` | 5236 | Création carte check individuel | DOM |

#### Groupement et organisation
| Fonction | Ligne | Description | Logique |
|----------|-------|-------------|---------|
| `groupSimilarErrors()` | 5283 | Regroupement erreurs similaires | Par similitude texte |
| `createErrorGroupCard()` | 5404 | Carte pour groupe d'erreurs | DOM |
| `groupChecksByCategory()` | 5463 | Regroupement par catégorie | audit/synthese/cee |
| `renderChecksWithGroups()` | 5505 | Rendu avec groupes | DOM |
| `groupChecksByHierarchy()` | 5663 | Regroupement hiérarchique | Par chantier + niveau |

#### Utilitaires affichage
| Fonction | Ligne | Description | Usage |
|----------|-------|-------------|-------|
| `getGroupeForCheck()` | 3470 | Détermination groupe check | Organisationnel |
| `getCheckProvenance()` | 5572 | Provenance du check | Couleur badge |
| `computeCounter()` | 5758 | Calcul compteurs niveaux | Stats |
| `createCounterHTML()` | 5768 | HTML compteurs | UI |
| `shouldAutoExpand()` | 5779 | Auto-expansion section | UX |
| `renderChecksSortedWithCollapsible()` | 5784 | Rendu avec accordéons | DOM |
| `renderChecksHierarchical()` | 5827 | Rendu hiérarchique complet | DOM orchestration |

#### Navigation et interactions
| Fonction | Ligne | Description | Events |
|----------|-------|-------------|--------|
| `switchView()` | 6112 | Changement de vue | Click |
| `toggleSection()` | 6144 | Toggle accordéon | Click |
| `toggleSectionById()` | 6158 | Toggle par ID | Programmatic |
| `toggleMajeurs()` | 6175 | Toggle checks majeurs | Click |
| `filterChecksByLevel()` | 6180 | Filtrage par niveau | Click |
| `refreshDisplay()` | 6201 | Rafraîchissement affichage | State change |

---

### 7️⃣ Saisie manuelle surfaces (5 fonctions)

| Fonction | Ligne | Description | Trigger |
|----------|-------|-------------|---------|
| `displayManualSurfaceInputs()` | 4818 | Affichage UI saisie manuelle | Si `surfaceManuelle = true` |
| `validateAndRecalculate()` | 4897 | Validation + recalcul | Submit form |
| `recalculateSurfaceChecks()` | 4937 | Recalcul checks 42-47 | Après validation |
| `refreshDisplayAfterRecalculation()` | 5131 | Rafraîchissement UI | Après recalcul |

**Logique de déclenchement** :
1. `surfaces: []` (attestation manquante) → `surfaceManuelle = true`
2. Secteur "Autres" → `surfaceManuelle = true`
3. NAF non agricole → `surfaceManuelle = true`

---

### 8️⃣ Messages et feedback utilisateur (2 fonctions)

| Fonction | Ligne | Description | Format |
|----------|-------|-------------|--------|
| `buildMessageAuditeur()` | 4786 | Génération message auditeur | Texte formaté |

---

### 9️⃣ Gestion globale application (3 fonctions)

| Fonction | Ligne | Description | Scope |
|----------|-------|-------------|-------|
| `resetApplication()` | 6254 | Reset complet app | Global |
| `updateChecklistProgress()` | 6333 | MAJ progression checklist | UI stats |

---

## Variables globales (état)

### État de l'application

```javascript
// Fichiers uploadés
let uploadedFiles = {
  audit: null,
  synthese: null,
  cee: null,
  fiche: null
};

// Données extraites
let extractedData = null;

// Checks générés
let currentChecks = [];

// Chantiers détectés
let detectedChantiers = [];

// Vue actuelle
let currentView = 'par-niveau';
```

### Configuration

```javascript
// Fiches techniques LED
const FICHES_TECHNIQUES = {
  'DAEWOO': {
    reference: 'NES-HBL 250W',
    puissance: 48,
    THD: '3.7%',
    dureeVie: '50000 heures'
  },
  'TECH': {
    reference: 'TECH LED 150W',
    puissance: 30,
    THD: '3.7%',
    dureeVie: '50000 heures'
  }
};
```

---

## Points d'entrée (Event listeners)

### Au chargement de la page

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup zones upload
  setupUploadZone(/* ... */);
  
  // 2. Event listeners boutons
  document.getElementById('analyzeBtn').addEventListener('click', async () => {
    // Orchestration analyse complète
  });
  
  // 3. Event listeners recherche SIRET
  document.getElementById('searchBtn').addEventListener('click', () => {
    searchSiret(query);
  });
  
  // 4. Event listeners login
  document.getElementById('loginBtn').addEventListener('click', () => {
    // Validation mot de passe
  });
  
  // 5. Event listeners reset
  document.getElementById('resetBtn').addEventListener('click', () => {
    resetApplication();
  });
});
```

---

## Dépendances entre modules

### Graphe de dépendances (simplifié)

```
extractTextFromPDF()
  └── handleFileUpload()
        └── setupUploadZone()

normalize()
  ├── compareStrings()
  ├── normalizeExtracted()
  └── compareAddress()

compareAddress()
  ├── normaliserAdresseSansBatiment()
  ├── decomposeAddress()
  └── regrouperAttestationsParAdresse()

generateChecks()
  ├── compareParcelles()
  ├── compareAddress()
  ├── compareSecteurEtude()
  ├── compareNumber()
  ├── compareStrings()
  ├── compareMoney()
  ├── compareProductRef()
  ├── compareSIRET()
  ├── sumSurfaces()
  ├── sumLED()
  └── checkMentionsAgricoles()

displayResults()
  ├── groupChecksByHierarchy()
  ├── renderChecksHierarchical()
  ├── createCheckCard()
  ├── createErrorGroupCard()
  ├── computeCounter()
  └── createCounterHTML()

displayManualSurfaceInputs()
  └── validateAndRecalculate()
        └── recalculateSurfaceChecks()
              ├── generateChecks()
              └── refreshDisplayAfterRecalculation()
```

---

## Problèmes identifiés (à résoudre par modularisation)

### 🔴 Problème 1 : Fonction `generateChecks()` trop longue
- **Lignes** : 3519-4786 (~1250 lignes)
- **Complexité** : Très élevée
- **Solution** : Séparer par type de check (page-garde, identité, LED, surfaces)

### 🔴 Problème 2 : Mélange responsabilités
- UI et logique métier dans les mêmes fonctions
- Exemple : `displayResults()` fait calculs + affichage
- **Solution** : Séparer calculs (operations/) et affichage (ui/)

### 🔴 Problème 3 : État global mutable
- Variables globales modifiées partout
- Difficile de tracer qui modifie quoi
- **Solution** : State management centralisé (core/state.js)

### 🔴 Problème 4 : Duplication de code
- Normalisation d'adresses répétée
- Logique de comparaison similaire
- **Solution** : Utilitaires réutilisables (utils/)

### 🔴 Problème 5 : Couplage fort
- `generateChecks()` appelle directement fonctions DOM
- Difficile de tester indépendamment
- **Solution** : Event bus (core/events.js)

### 🟡 Problème 6 : Pas de tests
- Aucun test automatisé
- Régression possible à chaque modification
- **Solution** : Tests e2e + tests unitaires

---

## Métriques de complexité

| Métrique | Valeur | Évaluation |
|----------|--------|------------|
| Lignes JavaScript | ~4800 | 🔴 Très élevé |
| Nombre de fonctions | 61 | 🟡 Modéré |
| Fonction la plus longue | 1250 lignes | 🔴 Critique |
| Variables globales | 5+ | 🟡 Modéré |
| Dépendances externes | 3 (pdf.js, APIs) | 🟢 Acceptable |
| Niveaux d'imbrication max | 6+ | 🔴 Élevé |

---

## Plan de modularisation

### Architecture cible

```
js/
├── core/
│   ├── state.js           ← État global centralisé
│   ├── events.js          ← Event bus
│   ├── api.js             ← Appels API (analyze, search, sheets)
│   └── pdf.js             ← Extraction PDF
│
├── utils/
│   ├── text.js            ← normalize, compareStrings
│   ├── numbers.js         ← compareNumber, sumSurfaces, sumLED
│   ├── dates.js           ← compareDate, isValidDateFormat
│   ├── address.js         ← compareAddress, normaliserAdresse, etc.
│   └── parcelles.js       ← compareParcelles, regrouperAttestations
│
├── operations/BAT-EQ-127/
│   ├── config.js          ← FICHES_TECHNIQUES, seuils
│   ├── checks.js          ← generateChecks (décomposé)
│   ├── matching.js        ← matchChantiers, autoDetect
│   └── validation.js      ← checkMentionsAgricoles, etc.
│
├── ui/
│   ├── results.js         ← displayResults, createCheckCard
│   ├── manual-input.js    ← displayManualSurfaceInputs, recalculate
│   ├── navigation.js      ← setupUploadZone, renderChantiers
│   └── messages.js        ← buildMessageAuditeur
│
└── app.js                 ← Point d'entrée, orchestration
```

### Ordre d'extraction (de bas en haut)

1. **utils/** — Fonctions pures (pas de dépendances)
2. **core/** — Infrastructure (state, events, API, PDF)
3. **operations/** — Logique métier LED
4. **ui/** — Composants UI
5. **app.js** — Orchestration finale

---

## Conclusion

L'architecture actuelle est **fonctionnelle mais monolithique**. La modularisation permettra :

✅ **Maintenabilité** : Code organisé, facile à naviguer  
✅ **Testabilité** : Fonctions isolées, tests unitaires possibles  
✅ **Réutilisabilité** : Modules réutilisables pour autres fiches CEE  
✅ **Scalabilité** : Ajout de fonctionnalités facilité  
✅ **Collaboration** : Plusieurs développeurs peuvent travailler en parallèle

**Prochaine étape** : Créer le plan d'architecture cible détaillé.

---

**Document créé le** : 26 mai 2026  
**Auteur** : Claude Code  
**Statut** : ✅ Analyse complète terminée
