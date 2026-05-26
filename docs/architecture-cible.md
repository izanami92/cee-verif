# Architecture cible — CEE Vérif Modulaire

**Date de création** : 26 mai 2026  
**Objectif** : Plan détaillé de l'architecture modulaire  
**Référence** : `docs/architecture-actuelle.md`

---

## Principes directeurs

### 1. Séparation des responsabilités (SoC)
- **core/** : Infrastructure technique (API, PDF, état, events)
- **utils/** : Fonctions pures réutilisables (0 dépendance externe)
- **operations/** : Logique métier spécifique (BAT-EQ-127, futures fiches)
- **ui/** : Composants d'affichage (interactions DOM)
- **config/** : Configuration et constantes

### 2. Dépendances unidirectionnelles
```
app.js
  ↓
ui/ ← operations/ ← core/ ← utils/
                      ↓
                   config/
```

**Règle** : Un module ne peut dépendre QUE des couches inférieures.

### 3. Modules testables
- Fonctions pures autant que possible
- Injection de dépendances pour les effets de bord
- Interfaces claires (input/output)

### 4. Évolutivité multi-fiches
- Structure `operations/BAT-EQ-127/` réplicable pour BAT-TH-XXX, etc.
- Socle commun (`core/`, `utils/`) partagé

---

## Structure des dossiers

```
cee-verif/
├── index.html                     ← HTML + CSS uniquement (~1000 lignes)
│
├── js/
│   ├── config/
│   │   ├── constants.js           ← Constantes globales
│   │   └── fiches-techniques.js   ← FICHES_TECHNIQUES LED
│   │
│   ├── utils/                     ← Fonctions pures (0 side effects)
│   │   ├── text.js
│   │   ├── numbers.js
│   │   ├── dates.js
│   │   ├── address.js
│   │   └── parcelles.js
│   │
│   ├── core/                      ← Infrastructure
│   │   ├── state.js               ← Gestion d'état centralisée
│   │   ├── events.js              ← Event bus
│   │   ├── api.js                 ← Appels API
│   │   └── pdf.js                 ← Extraction PDF
│   │
│   ├── operations/                ← Logique métier par fiche CEE
│   │   └── BAT-EQ-127/
│   │       ├── config.js          ← Config LED
│   │       ├── checks.js          ← Génération checks
│   │       ├── matching.js        ← Matching chantiers
│   │       └── validation.js      ← Validations métier
│   │
│   ├── ui/                        ← Composants UI
│   │   ├── results.js             ← Affichage résultats
│   │   ├── manual-input.js        ← Saisie manuelle
│   │   ├── navigation.js          ← Upload, navigation
│   │   └── messages.js            ← Messages utilisateur
│   │
│   └── app.js                     ← Point d'entrée, orchestration
│
├── tests/
│   ├── e2e/
│   │   ├── 01-analyse-complete.spec.js
│   │   ├── 02-multi-chantiers.spec.js
│   │   ├── 03-saisie-manuelle.spec.js
│   │   └── 04-attestations-manquantes.spec.js
│   │
│   ├── unit/
│   │   ├── utils/
│   │   ├── operations/
│   │   └── core/
│   │
│   └── fixtures/                  ← PDFs de test
│
└── api/                           ← Inchangé
    ├── analyze.js
    ├── search.js
    └── ...
```

---

## Détail des modules

### 📁 config/

#### `config/constants.js`
```javascript
// Niveaux de checks
export const NIVEAUX = {
  BLOQUANT: 'bloquant',
  MAJEUR: 'majeur',
  INFO: 'info'
};

// Messages
export const MESSAGES = {
  ERROR_UPLOAD: 'Erreur lors de l\'upload du fichier',
  ERROR_API: 'Erreur lors de l\'appel API',
  // ...
};

// Endpoints
export const API_ENDPOINTS = {
  ANALYZE: '/api/analyze',
  SEARCH: '/api/search',
  COMPARE_SHEET: '/api/compareSheet'
};
```

**Dépendances** : Aucune  
**Exports** : Constantes

---

#### `config/fiches-techniques.js`
```javascript
export const FICHES_TECHNIQUES = {
  DAEWOO: {
    reference: 'NES-HBL 250W',
    puissance: 48,
    THD: '3.7%',
    dureeVie: '50000 heures'
  },
  TECH: {
    reference: 'TECH LED 150W',
    puissance: 30,
    THD: '3.7%',
    dureeVie: '50000 heures'
  }
};
```

**Dépendances** : Aucune  
**Exports** : FICHES_TECHNIQUES

---

### 📁 utils/ (Fonctions pures)

#### `utils/text.js`
```javascript
/**
 * Normalisation texte (suppression accents, trim, lowercase)
 */
export function normalize(str) {
  // Implémentation actuelle ligne 2785
}

/**
 * Comparaison texte normalisé
 */
export function compareStrings(val1, val2) {
  // Implémentation actuelle ligne 2941
}

/**
 * Normalisation données extraites API
 */
export function normalizeExtracted(extracted) {
  // Implémentation actuelle ligne 3306
}
```

**Dépendances** : Aucune  
**Exports** : normalize, compareStrings, normalizeExtracted  
**Tests** : `tests/unit/utils/text.test.js`

---

#### `utils/numbers.js`
```javascript
/**
 * Comparaison numérique avec tolérance optionnelle
 */
export function compareNumber(val1, val2, tolerance = 0) {
  // Implémentation actuelle ligne 2915
}

/**
 * Comparaison montants monétaires
 */
export function compareMoney(val1, val2) {
  // Implémentation actuelle ligne 2997
}

/**
 * Somme des surfaces d'un tableau
 */
export function sumSurfaces(surfacesArray) {
  // Implémentation actuelle ligne 3295
}

/**
 * Somme LED multi-documents
 */
export function sumLED(documents) {
  // Implémentation actuelle ligne 3390
}
```

**Dépendances** : Aucune  
**Exports** : compareNumber, compareMoney, sumSurfaces, sumLED  
**Tests** : `tests/unit/utils/numbers.test.js`

---

#### `utils/dates.js`
```javascript
/**
 * Comparaison dates
 */
export function compareDate(date1, date2) {
  // Implémentation actuelle ligne 2974
}

/**
 * Validation format date
 */
export function isValidDateFormat(dateStr) {
  // Implémentation actuelle ligne 3045
}
```

**Dépendances** : Aucune  
**Exports** : compareDate, isValidDateFormat  
**Tests** : `tests/unit/utils/dates.test.js`

---

#### `utils/address.js`
```javascript
/**
 * Normalisation adresse sans bâtiment
 */
export function normaliserAdresseSansBatiment(adresse) {
  // Implémentation actuelle ligne 3088
}

/**
 * Extraction nombre de bâtiments
 */
export function extraireNombreBatiments(adresse) {
  // Implémentation actuelle ligne 3060
}

/**
 * Décomposition adresse en parties
 */
export function decomposeAddress(addr) {
  // Implémentation actuelle ligne 3237
}

/**
 * Comparaison adresses (logique complexe)
 */
export function compareAddress(addr1, addr2) {
  // Implémentation actuelle ligne 3184
}

/**
 * Détection adresses dans texte
 */
export function detectAdressesLocally(text) {
  // Implémentation actuelle ligne 2091
}
```

**Dépendances** : `text.js` (normalize)  
**Exports** : normaliserAdresseSansBatiment, extraireNombreBatiments, decomposeAddress, compareAddress, detectAdressesLocally  
**Tests** : `tests/unit/utils/address.test.js` (prioritaire)

---

#### `utils/parcelles.js`
```javascript
/**
 * Comparaison parcelles cadastrales
 */
export function compareParcelles(val1, val2) {
  // Implémentation actuelle ligne 2855
}

/**
 * Regroupement attestations par adresse
 */
export function regrouperAttestationsParAdresse(attestations) {
  // Implémentation actuelle ligne 3110
}
```

**Dépendances** : `address.js` (compareAddress)  
**Exports** : compareParcelles, regrouperAttestationsParAdresse  
**Tests** : `tests/unit/utils/parcelles.test.js` (prioritaire)

---

### 📁 core/ (Infrastructure)

#### `core/state.js`
```javascript
/**
 * État global de l'application (gestion centralisée)
 */
const state = {
  // Fichiers
  uploadedFiles: {
    audit: null,
    synthese: null,
    cee: null,
    fiche: null
  },
  
  // Données extraites
  extractedData: null,
  
  // Checks
  currentChecks: [],
  
  // UI
  currentView: 'par-niveau',
  currentChantier: 0,
  
  // Chantiers
  detectedChantiers: [],
  
  // Saisie manuelle
  manualInputs: {}
};

/**
 * Getters
 */
export function getState(key) {
  return state[key];
}

export function getFullState() {
  return { ...state };
}

/**
 * Setters
 */
export function setState(key, value) {
  state[key] = value;
  emit('state-changed', { key, value });
}

export function updateState(updates) {
  Object.assign(state, updates);
  emit('state-changed', updates);
}

/**
 * Reset
 */
export function resetState() {
  state.uploadedFiles = { audit: null, synthese: null, cee: null, fiche: null };
  state.extractedData = null;
  state.currentChecks = [];
  state.currentView = 'par-niveau';
  state.currentChantier = 0;
  state.detectedChantiers = [];
  state.manualInputs = {};
  emit('state-reset', {});
}
```

**Dépendances** : `events.js`  
**Exports** : getState, setState, updateState, resetState  
**Tests** : `tests/unit/core/state.test.js`

---

#### `core/events.js`
```javascript
/**
 * Event bus pour communication inter-modules
 */
const listeners = {};

/**
 * Enregistrer un listener
 */
export function on(event, callback) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
}

/**
 * Supprimer un listener
 */
export function off(event, callback) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(cb => cb !== callback);
}

/**
 * Émettre un événement
 */
export function emit(event, data) {
  if (!listeners[event]) return;
  listeners[event].forEach(callback => callback(data));
}

/**
 * Événements disponibles
 */
export const EVENTS = {
  STATE_CHANGED: 'state-changed',
  STATE_RESET: 'state-reset',
  FILE_UPLOADED: 'file-uploaded',
  FILE_REMOVED: 'file-removed',
  EXTRACTION_STARTED: 'extraction-started',
  EXTRACTION_COMPLETED: 'extraction-completed',
  EXTRACTION_FAILED: 'extraction-failed',
  CHECKS_GENERATED: 'checks-generated',
  MANUAL_INPUT_SUBMITTED: 'manual-input-submitted',
  VIEW_CHANGED: 'view-changed'
};
```

**Dépendances** : Aucune  
**Exports** : on, off, emit, EVENTS  
**Tests** : `tests/unit/core/events.test.js`

---

#### `core/pdf.js`
```javascript
import { emit, EVENTS } from './events.js';

/**
 * Extraction texte depuis PDF
 */
export async function extractTextFromPDF(file) {
  // Implémentation actuelle ligne 1781
  // Utilise pdf.js
}

/**
 * Parser surfaces depuis tableau Synthèse section 5.1
 */
export function parseSurfacesFromSynthese(syntheseText) {
  // Implémentation actuelle ligne 2816
}
```

**Dépendances** : `events.js`, pdf.js (externe)  
**Exports** : extractTextFromPDF, parseSurfacesFromSynthese  
**Tests** : `tests/unit/core/pdf.test.js`

---

#### `core/api.js`
```javascript
import { API_ENDPOINTS } from '../config/constants.js';
import { emit, EVENTS } from './events.js';

/**
 * Appel API analyse Claude
 */
export async function callAnalyzeAPI(messages, system) {
  const response = await fetch(API_ENDPOINTS.ANALYZE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, password: getPassword() })
  });
  
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}

/**
 * Recherche SIRET
 */
export async function searchSiret(query) {
  // Implémentation actuelle ligne 1598
}

/**
 * Comparaison avec Google Sheet
 */
export async function compareWithGoogleSheet(extractedData) {
  // Implémentation actuelle ligne 1526
}

/**
 * Helper : récupération mot de passe
 */
function getPassword() {
  return sessionStorage.getItem('app-password');
}
```

**Dépendances** : `config/constants.js`, `events.js`  
**Exports** : callAnalyzeAPI, searchSiret, compareWithGoogleSheet  
**Tests** : `tests/unit/core/api.test.js` (avec mocks)

---

### 📁 operations/BAT-EQ-127/ (Logique métier LED)

#### `operations/BAT-EQ-127/config.js`
```javascript
import { FICHES_TECHNIQUES } from '../../config/fiches-techniques.js';

export const BAT_EQ_127_CONFIG = {
  operation: 'BAT-EQ-127',
  name: 'Installation LED',
  
  documents: ['audit', 'synthese', 'cee', 'ficheTechnique'],
  
  fields: {
    common: ['client', 'adresse', 'surfaces', 'secteur', 'siret'],
    specific: ['led', 'puissance', 'THD', 'dureeVie', 'pceLuminaires']
  },
  
  thresholds: {
    surfaceTolerance: 1,      // ±1 m²
    ledTolerance: 0,          // Exacte
    thdExpected: '3.7%'       // Exacte
  },
  
  fichesAutorisees: FICHES_TECHNIQUES
};
```

**Dépendances** : `config/fiches-techniques.js`  
**Exports** : BAT_EQ_127_CONFIG

---

#### `operations/BAT-EQ-127/validation.js`
```javascript
import { normalize } from '../../utils/text.js';
import { NIVEAUX } from '../../config/constants.js';

/**
 * Vérification mentions agricoles (BLOQUANT)
 */
export function checkMentionsAgricoles(extracted, nomSociete) {
  // Implémentation actuelle ligne 3407
}

/**
 * Comparaison secteur d'étude (équivalences)
 */
export function compareSecteurEtude(val1, val2) {
  // Implémentation actuelle ligne 2884
}

/**
 * Comparaison référence produit LED
 */
export function compareProductRef(val1, val2) {
  // Implémentation actuelle ligne 3017
}

/**
 * Comparaison SIRET
 */
export function compareSIRET(siret1, siret2) {
  // Implémentation actuelle ligne 3281
}
```

**Dépendances** : `utils/text.js`, `config/constants.js`  
**Exports** : checkMentionsAgricoles, compareSecteurEtude, compareProductRef, compareSIRET  
**Tests** : `tests/unit/operations/validation.test.js`

---

#### `operations/BAT-EQ-127/matching.js`
```javascript
import { detectAdressesLocally } from '../../utils/address.js';
import { callAnalyzeAPI } from '../../core/api.js';

/**
 * Matching audits/synthèses par INDEX
 */
export function matchChantiers(audits, syntheses) {
  // Implémentation actuelle ligne 3364
}

/**
 * Détection automatique chantiers
 */
export async function autoDetectChantiers(extractedText) {
  // Implémentation actuelle ligne 2030
}

/**
 * Helpers
 */
export function getFirstAudit(normalized) {
  // Implémentation actuelle ligne 3398
}

export function getFirstSynthese(normalized) {
  // Implémentation actuelle ligne 3402
}
```

**Dépendances** : `utils/address.js`, `core/api.js`  
**Exports** : matchChantiers, autoDetectChantiers, getFirstAudit, getFirstSynthese  
**Tests** : `tests/unit/operations/matching.test.js`

---

#### `operations/BAT-EQ-127/checks.js`
```javascript
import { compareParcelles } from '../../utils/parcelles.js';
import { compareAddress } from '../../utils/address.js';
import { compareNumber, sumSurfaces, sumLED } from '../../utils/numbers.js';
import { compareDate } from '../../utils/dates.js';
import { checkMentionsAgricoles, compareSecteurEtude, compareProductRef, compareSIRET } from './validation.js';
import { NIVEAUX } from '../../config/constants.js';

/**
 * Génération des 47 checks CEE BAT-EQ-127
 */
export function generateChecks(extracted, references) {
  const checks = [];
  
  // Délégation par type de check
  checks.push(...generatePageGardeChecks(extracted));      // Checks 01-02
  checks.push(...generateIdentiteChecks(extracted));       // Checks 03-09
  checks.push(...generateLEDChecks(extracted, references)); // Checks 10-16
  checks.push(...generateCrossDocChecks(extracted));       // Checks 17-38
  checks.push(...generateChantiersChecks(extracted));      // Check 39
  checks.push(...generateSurfacesChecks(extracted));       // Checks 40-47
  
  return checks;
}

/**
 * Checks page de garde (BLOQUANT)
 */
function generatePageGardeChecks(extracted) {
  // Implémentation checks 01-02
}

/**
 * Checks identité client (MAJEUR)
 */
function generateIdentiteChecks(extracted) {
  // Implémentation checks 03-09
}

/**
 * Checks LED et fiche technique (MAJEUR)
 */
function generateLEDChecks(extracted, references) {
  // Implémentation checks 10-16
}

/**
 * Checks validation croisée documents (MAJEUR)
 */
function generateCrossDocChecks(extracted) {
  // Implémentation checks 17-38
}

/**
 * Checks cohérence chantiers (MAJEUR)
 */
function generateChantiersChecks(extracted) {
  // Implémentation check 39
}

/**
 * Checks surfaces (MAJEUR)
 */
function generateSurfacesChecks(extracted) {
  // Implémentation checks 40-47
}

/**
 * Helper : détermination groupe check
 */
export function getGroupeForCheck(check) {
  // Implémentation actuelle ligne 3470
}
```

**Dépendances** : Toutes les utils/, validation.js  
**Exports** : generateChecks, getGroupeForCheck  
**Tests** : `tests/unit/operations/checks.test.js`

**Note** : La fonction `generateChecks()` actuelle (1250 lignes) est décomposée en 6 sous-fonctions pour lisibilité et testabilité.

---

### 📁 ui/ (Composants UI)

#### `ui/results.js`
```javascript
import { getState } from '../core/state.js';
import { getGroupeForCheck } from '../operations/BAT-EQ-127/checks.js';

/**
 * Affichage résultats globaux
 */
export function displayResults(result) {
  // Implémentation actuelle ligne 5158
}

/**
 * Création carte check individuel
 */
export function createCheckCard(check) {
  // Implémentation actuelle ligne 5236
}

/**
 * Regroupement erreurs similaires
 */
export function groupSimilarErrors(checks) {
  // Implémentation actuelle ligne 5283
}

/**
 * Création carte groupe d'erreurs
 */
export function createErrorGroupCard(group) {
  // Implémentation actuelle ligne 5404
}

/**
 * Regroupement par hiérarchie (chantier + niveau)
 */
export function groupChecksByHierarchy(checks) {
  // Implémentation actuelle ligne 5663
}

/**
 * Rendu hiérarchique complet
 */
export function renderChecksHierarchical(checks, container) {
  // Implémentation actuelle ligne 5827
}

// ... Autres fonctions affichage
```

**Dépendances** : `core/state.js`, `operations/BAT-EQ-127/checks.js`  
**Exports** : displayResults, createCheckCard, groupSimilarErrors, etc.  
**Tests** : Tests e2e uniquement (manipulation DOM)

---

#### `ui/manual-input.js`
```javascript
import { getState, setState } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { generateChecks } from '../operations/BAT-EQ-127/checks.js';

/**
 * Affichage UI saisie manuelle
 */
export function displayManualSurfaceInputs(extractedData) {
  // Implémentation actuelle ligne 4818
}

/**
 * Validation et recalcul
 */
export function validateAndRecalculate(extractedData) {
  // Implémentation actuelle ligne 4897
  emit(EVENTS.MANUAL_INPUT_SUBMITTED, { extractedData });
}

/**
 * Recalcul checks surfaces
 */
export function recalculateSurfaceChecks(extractedData) {
  // Implémentation actuelle ligne 4937
  const newChecks = generateChecks(extractedData, getState('references'));
  setState('currentChecks', newChecks);
  emit(EVENTS.CHECKS_GENERATED, { checks: newChecks });
}

/**
 * Rafraîchissement UI après recalcul
 */
export function refreshDisplayAfterRecalculation() {
  // Implémentation actuelle ligne 5131
}
```

**Dépendances** : `core/state.js`, `core/events.js`, `operations/BAT-EQ-127/checks.js`  
**Exports** : displayManualSurfaceInputs, validateAndRecalculate, recalculateSurfaceChecks, refreshDisplayAfterRecalculation  
**Tests** : Tests e2e

---

#### `ui/navigation.js`
```javascript
import { getState, setState } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { extractTextFromPDF } from '../core/pdf.js';

/**
 * Setup zone upload drag & drop
 */
export function setupUploadZone(zoneElement, inputElement, fileKey, isMultiple) {
  // Implémentation actuelle ligne 1660
}

/**
 * Gestion upload fichier
 */
export async function handleFileUpload(files, zoneElement, fileKey, isMultiple) {
  // Implémentation actuelle ligne 1698
  const text = await extractTextFromPDF(files[0]);
  const uploadedFiles = getState('uploadedFiles');
  uploadedFiles[fileKey] = { file: files[0], text };
  setState('uploadedFiles', uploadedFiles);
  emit(EVENTS.FILE_UPLOADED, { fileKey, file: files[0] });
}

/**
 * Suppression fichier
 */
export function removeFile(fileKey, buttonElement) {
  // Implémentation actuelle ligne 1731
  emit(EVENTS.FILE_REMOVED, { fileKey });
}

/**
 * Affichage résultats recherche SIRET
 */
export function displaySearchResults(results) {
  // Implémentation actuelle ligne 1615
}

/**
 * Rendu chantiers multi
 */
export function renderChantiers() {
  // Implémentation actuelle ligne 2219
}

/**
 * Mise à jour progress bar
 */
export function updateProgress(percent, text) {
  // Implémentation actuelle ligne 2775
}

// ... Autres fonctions navigation
```

**Dépendances** : `core/state.js`, `core/events.js`, `core/pdf.js`  
**Exports** : setupUploadZone, handleFileUpload, removeFile, etc.  
**Tests** : Tests e2e

---

#### `ui/messages.js`
```javascript
/**
 * Génération message pour auditeur
 */
export function buildMessageAuditeur(checks) {
  // Implémentation actuelle ligne 4786
}
```

**Dépendances** : Aucune  
**Exports** : buildMessageAuditeur  
**Tests** : `tests/unit/ui/messages.test.js`

---

### 📁 app.js (Orchestration)

```javascript
// Imports
import { setState, resetState } from './core/state.js';
import { on, EVENTS } from './core/events.js';
import { callAnalyzeAPI, searchSiret } from './core/api.js';
import { normalizeExtracted } from './utils/text.js';
import { generateChecks } from './operations/BAT-EQ-127/checks.js';
import { autoDetectChantiers } from './operations/BAT-EQ-127/matching.js';
import { displayResults, displayManualSurfaceInputs } from './ui/results.js';
import { setupUploadZone, handleFileUpload, updateProgress } from './ui/navigation.js';

/**
 * Initialisation de l'application
 */
async function initApp() {
  console.log('🚀 CEE Vérif - Initialisation');
  
  // Setup zones upload
  setupAllUploadZones();
  
  // Event listeners globaux
  setupEventListeners();
  
  // Event bus listeners
  setupEventBus();
  
  console.log('✅ Application prête');
}

/**
 * Setup zones upload
 */
function setupAllUploadZones() {
  const zones = [
    { zone: 'upload-audit', input: 'audit-input', key: 'audit' },
    { zone: 'upload-synthese', input: 'synthese-input', key: 'synthese' },
    { zone: 'upload-cee', input: 'cee-input', key: 'cee' },
    { zone: 'upload-fiche', input: 'fiche-input', key: 'fiche' }
  ];
  
  zones.forEach(({ zone, input, key }) => {
    const zoneEl = document.getElementById(zone);
    const inputEl = document.getElementById(input);
    setupUploadZone(zoneEl, inputEl, key, false);
  });
}

/**
 * Event listeners DOM
 */
function setupEventListeners() {
  // Bouton Analyser
  document.getElementById('analyzeBtn').addEventListener('click', handleAnalyze);
  
  // Bouton Recherche SIRET
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  
  // Bouton Reset
  document.getElementById('resetBtn').addEventListener('click', handleReset);
  
  // Bouton Login
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
}

/**
 * Event bus listeners
 */
function setupEventBus() {
  on(EVENTS.FILE_UPLOADED, ({ fileKey }) => {
    console.log(`✅ Fichier ${fileKey} uploadé`);
    checkAnalyzeButton();
  });
  
  on(EVENTS.CHECKS_GENERATED, ({ checks }) => {
    console.log(`✅ ${checks.length} checks générés`);
  });
  
  on(EVENTS.MANUAL_INPUT_SUBMITTED, () => {
    console.log('✅ Saisie manuelle validée');
  });
}

/**
 * Handler : Analyse complète
 */
async function handleAnalyze() {
  try {
    updateProgress(10, 'Extraction des données...');
    
    // Appel API Claude
    const extracted = await extractData();
    
    updateProgress(50, 'Normalisation...');
    const normalized = normalizeExtracted(extracted);
    setState('extractedData', normalized);
    
    updateProgress(70, 'Génération des checks...');
    const checks = generateChecks(normalized, getReferences());
    setState('currentChecks', checks);
    
    updateProgress(90, 'Affichage des résultats...');
    displayResults({ checks, extracted: normalized });
    
    // Saisie manuelle si nécessaire
    if (needsManualInput(normalized)) {
      displayManualSurfaceInputs(normalized);
    }
    
    updateProgress(100, 'Terminé !');
    
  } catch (error) {
    console.error('❌ Erreur analyse:', error);
    showError(error.message);
  }
}

/**
 * Handler : Recherche SIRET
 */
async function handleSearch() {
  const query = document.getElementById('search-input').value;
  const results = await searchSiret(query);
  displaySearchResults(results);
}

/**
 * Handler : Reset
 */
function handleReset() {
  if (confirm('Réinitialiser l\'application ?')) {
    resetState();
    resetUI();
  }
}

/**
 * Handler : Login
 */
function handleLogin() {
  const password = document.getElementById('password-input').value;
  sessionStorage.setItem('app-password', password);
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', initApp);
```

**Dépendances** : Tous les modules  
**Exports** : Aucun (point d'entrée)  
**Tests** : Tests e2e (workflow complet)

---

## Flux de données

### Analyse complète (workflow principal)

```
1. User upload PDF
   ↓
2. setupUploadZone() → handleFileUpload()
   ↓
3. extractTextFromPDF() (core/pdf.js)
   ↓
4. setState('uploadedFiles', {...}) (core/state.js)
   ↓
5. emit(EVENTS.FILE_UPLOADED) (core/events.js)
   ↓
6. checkAnalyzeButton() (ui/navigation.js)

7. User click "Analyser"
   ↓
8. handleAnalyze() (app.js)
   ↓
9. callAnalyzeAPI() (core/api.js) → Claude Sonnet 4
   ↓
10. normalizeExtracted() (utils/text.js)
    ↓
11. setState('extractedData', {...})
    ↓
12. generateChecks() (operations/BAT-EQ-127/checks.js)
    ↓
13. setState('currentChecks', [...])
    ↓
14. emit(EVENTS.CHECKS_GENERATED)
    ↓
15. displayResults() (ui/results.js)
    ↓
16. Si saisie manuelle nécessaire:
    displayManualSurfaceInputs() (ui/manual-input.js)
```

### Saisie manuelle surfaces

```
1. User saisit surface
   ↓
2. validateAndRecalculate() (ui/manual-input.js)
   ↓
3. emit(EVENTS.MANUAL_INPUT_SUBMITTED)
   ↓
4. recalculateSurfaceChecks()
   ↓
5. generateChecks() (nouvelle génération)
   ↓
6. setState('currentChecks', newChecks)
   ↓
7. emit(EVENTS.CHECKS_GENERATED)
   ↓
8. refreshDisplayAfterRecalculation()
```

---

## Interfaces & Contrats

### État global (core/state.js)
```typescript
interface AppState {
  uploadedFiles: {
    audit: { file: File, text: string } | null;
    synthese: { file: File, text: string } | null;
    cee: { file: File, text: string } | null;
    fiche: { file: File, text: string } | null;
  };
  extractedData: ExtractedData | null;
  currentChecks: Check[];
  currentView: 'par-niveau' | 'par-chantier' | 'par-groupe';
  currentChantier: number;
  detectedChantiers: Chantier[];
  manualInputs: Record<number, number>;
}
```

### Check
```typescript
interface Check {
  id: string;
  categorie: string;
  niveau: 'bloquant' | 'majeur' | 'info';
  champ: string;
  localisation: string;
  detail: string;
  valeur_attendue: string;
  valeur_trouvee: string;
  chantierIndex?: number;
}
```

### Événements (core/events.js)
```typescript
type EventData =
  | { event: 'state-changed', data: { key: string, value: any } }
  | { event: 'file-uploaded', data: { fileKey: string, file: File } }
  | { event: 'file-removed', data: { fileKey: string } }
  | { event: 'checks-generated', data: { checks: Check[] } }
  | { event: 'manual-input-submitted', data: { extractedData: ExtractedData } };
```

---

## Plan d'extraction (ordre)

### Phase 1 : Utilitaires (utils/)
1. ✅ `config/constants.js` (0 dépendance)
2. ✅ `config/fiches-techniques.js` (0 dépendance)
3. ✅ `utils/text.js` (0 dépendance)
4. ✅ `utils/numbers.js` (0 dépendance)
5. ✅ `utils/dates.js` (0 dépendance)
6. ✅ `utils/address.js` (dépend: text.js)
7. ✅ `utils/parcelles.js` (dépend: address.js)

### Phase 2 : Infrastructure (core/)
8. ✅ `core/events.js` (0 dépendance)
9. ✅ `core/state.js` (dépend: events.js)
10. ✅ `core/pdf.js` (dépend: events.js)
11. ✅ `core/api.js` (dépend: constants.js, events.js)

### Phase 3 : Logique métier (operations/)
12. ✅ `operations/BAT-EQ-127/config.js` (dépend: fiches-techniques.js)
13. ✅ `operations/BAT-EQ-127/validation.js` (dépend: text.js, constants.js)
14. ✅ `operations/BAT-EQ-127/matching.js` (dépend: address.js, api.js)
15. ✅ `operations/BAT-EQ-127/checks.js` (dépend: tout utils/, validation.js)

### Phase 4 : UI (ui/)
16. ✅ `ui/messages.js` (0 dépendance DOM)
17. ✅ `ui/navigation.js` (dépend: state.js, events.js, pdf.js)
18. ✅ `ui/manual-input.js` (dépend: state.js, events.js, checks.js)
19. ✅ `ui/results.js` (dépend: state.js, checks.js)

### Phase 5 : Orchestration
20. ✅ `app.js` (dépend: TOUT)
21. ✅ `index.html` (HTML/CSS uniquement, import app.js)

---

## Checklist validation (après chaque extraction)

Après extraction de chaque module :

- [ ] npm run test:e2e → 4/4 tests passent
- [ ] Console navigateur → 0 erreur
- [ ] Interface fonctionne identique
- [ ] Commit avec message clair

Après extraction complète :

- [ ] Tests e2e : 4/4 ✅
- [ ] Tests manuels navigateurs (Chrome, Safari) ✅
- [ ] Taille index.html < 1000 lignes ✅
- [ ] Performance identique ✅
- [ ] Documentation à jour ✅

---

## Bénéfices attendus

### Avant (monolithique)
- 6368 lignes dans 1 fichier
- 61 fonctions mélangées
- Difficile de retrouver du code
- Tests impossibles
- Modifications risquées

### Après (modulaire)
- ~1000 lignes HTML/CSS + 21 modules JavaScript
- Organisation claire par responsabilité
- Navigation rapide (1 module = 1 fichier)
- Tests unitaires + e2e
- Modifications sûres (isolation)
- Réutilisable pour autres fiches CEE

---

## Conclusion

Cette architecture modulaire pose les fondations pour :
- ✅ Multi-fiches CEE (BAT-TH-XXX, BAT-EN-XXX)
- ✅ Mode batch
- ✅ Historique analyses
- ✅ Base de données auto-learning
- ✅ Collaboration multi-développeurs

**Prochaine étape** : Setup tests e2e (Tâche #3)

---

**Document créé le** : 26 mai 2026  
**Auteur** : Claude Code  
**Statut** : ✅ Plan d'architecture cible complet
