# MODIFICATIONS PLANIFIÉES ET EN COURS

**Document de suivi** des fonctionnalités discutées, en cours, ou à implémenter.

**Dernière mise à jour** : 11 mai 2026

---

## 🔴 PRIORITÉ 1 - CRITIQUES (À faire AVANT Phase 2)

### ✅ TODO #1 : Implémenter checks 39-47 conformes à la documentation

**Statut** : ✅ **COMPLÉTÉ** (12 mai 2026)

**Travaux effectués** :
1. ✅ Ajout Check 39 : Cohérence nombre chantiers (audits = synthèses = attestations)
   - Niveau MAJEUR
   - Détecte incohérences structurelles multi-chantiers
2. ✅ Renumérotation complète checks 40-47 :
   - Reste à payer : 39 → 40
   - Adresse siège : 40 → 41
   - Date signature : 40 (doublon) → 42 ← **Fix doublon ID**
   - Surfaces audit : 43_{i} → 44_{i}
   - Surfaces synthèse : 44_{i} → 45_{i}
   - Surfaces manuelles audit : 45_global → 46_global
   - Surfaces manuelles synthèse : 46_global → 47_global
3. ✅ Mise à jour 7 commentaires pour cohérence
4. ✅ Documentation business-rules.md : Règle R16 ajoutée + R05 corrigée

**Fichiers modifiés** :
- `index.html` (+46 lignes, -24 lignes)
- `docs/business-rules.md` (R16 ajoutée, R05 corrigée)

**Commits** :
- `7036e54` - "feat: ajout check 39 cohérence chantiers + renumérotation 40-47"

**Sources** :
- [TODO #1] - Session 12 mai 2026

---

### ✅ TODO #2 : Corriger tolérance ±1 m² check 27

**Statut** : ✅ **COMPLÉTÉ** (12 mai 2026)

**Travaux effectués** :
```javascript
// Ligne 3960 - AVANT
sumSurfaces(audit.surfaces) === parseFloat(...)  // ❌ Comparaison stricte

// Ligne 3960 - APRÈS
Math.abs(sumSurfaces(audit.surfaces) - parseFloat(...)) < 1  // ✅ Tolérance ±1 m²
```

**Fichiers modifiés** :
- `index.html` (ligne 3960)

**Résultat** : Check 27 conforme à règle R09 (tolérance surfaces ±1 m² pour arrondis)

**Commits** :
- `7036e54` - "feat: ajout check 39 cohérence chantiers + renumérotation 40-47"

**Sources** :
- [TODO #2] - Session 12 mai 2026

---

## 🟡 PRIORITÉ 2 - IMPORTANTES (Phase 2-3)

### TODO #3 : Modularisation de index.html

**Statut** : 💭 **EN DISCUSSION**

**Problème** :
- `index.html` = ~6000 lignes (difficile à naviguer)
- Mélange HTML, CSS, JS dans un seul fichier

**Solutions envisagées** :

#### Option A : Modules ES6
```javascript
// Séparer en modules
import { generateChecks } from './modules/checks.js';
import { normalizeAddress } from './modules/utils.js';
import { displayResults } from './modules/ui.js';
```

**Avantages** :
- Code mieux organisé
- Réutilisabilité
- Debugging plus facile

**Inconvénients** :
- Perte de la simplicité "tout dans un fichier"
- Build step potentiellement nécessaire
- Plus complexe pour utilisateur non-tech

#### Option B : Rester mono-fichier avec sections claires
```html
<!-- ============================================ -->
<!-- SECTION 1 : CONSTANTS & CONFIGURATION       -->
<!-- ============================================ -->

<!-- ============================================ -->
<!-- SECTION 2 : UTILITY FUNCTIONS               -->
<!-- ============================================ -->

<!-- ============================================ -->
<!-- SECTION 3 : COMPARISON FUNCTIONS            -->
<!-- ============================================ -->
```

**Avantages** :
- Garde la simplicité
- Pas de build step
- Juste mieux organisé

**Inconvénients** :
- Toujours un gros fichier
- Pas de vraie modularisation

**Décision** : ⏳ À trancher avec utilisateur

**Estimation** : 4-6 heures (Option A), 2 heures (Option B)

**Sources** :
- [Phase 1 Analyse - Recommandation #6]

---

### TODO #4 : Tests automatisés pour fonctions critiques

**Statut** : 💭 **EN DISCUSSION**

**Problème** :
- Aucun test automatisé actuellement
- Régressions possibles à chaque modification
- Tests manuels fastidieux

**Fonctions à tester en priorité** :
1. `compareParcelles()` - Cas complexes : ordre, espaces, séparateurs
2. `compareSecteurEtude()` - Équivalences : Entrepôt/Logistique/Stockage
3. `compareAddress()` - Normalisation : bâtiments, parcelles, casse
4. `normalizeAddress()` - Tous les cas edge
5. `matchChantiers()` - Matching multi-chantiers

**Framework envisagé** :
- Jest (standard JavaScript)
- Vitest (plus moderne, plus rapide)

**Structure** :
```
cee-verif/
├── tests/
│   ├── comparisons.test.js
│   ├── normalization.test.js
│   └── matching.test.js
```

**Exemple de test** :
```javascript
describe('compareParcelles', () => {
  test('ignore les espaces', () => {
    expect(compareParcelles("129/YD/0203", "129 / YD / 0203")).toBe(true);
  });

  test('ignore l\'ordre', () => {
    expect(compareParcelles(
      "129/YD/0203, 129/YD/0151",
      "129/YD/0151, 129/YD/0203"
    )).toBe(true);
  });
});
```

**Décision** : ⏳ À trancher avec utilisateur (ROI à évaluer)

**Estimation** : 1-2 jours

**Sources** :
- [Phase 1 Analyse - Recommandation #7]

---

### TODO #5 : Base de données pour learning automatique

**Statut** : 💭 **EN DISCUSSION** (branche `feature/auto-learning` créée)

**Objectif** : Apprendre des corrections utilisateur pour améliorer automatiquement la détection.

**Architecture envisagée** :
```
Feedback utilisateur (Google Sheets)
  ↓
Script d'analyse (détecter patterns faux positifs)
  ↓
Base de données règles apprises
  ↓
Application des règles lors de l'analyse
```

**Exemples de règles à apprendre** :
- Si surface CEE - surface Audit < 1 m² → OK (arrondi)
- Si parcelle avec/sans espaces → normaliser
- Si adresse avec "BAT X" → supprimer

**Technologies envisagées** :
- SQLite (simple, local)
- PostgreSQL (Vercel Postgres, scalable)
- Supabase (PostgreSQL + Auth + API auto)

**Décision** : ⏳ Phase 4 probablement (pas urgent pour Phase 1-2-3)

**Estimation** : 1-2 semaines

**Sources** :
- [Conversation 11 mai 2026]
- [Branche feature/auto-learning]

---

## 🟢 PRIORITÉ 3 - NICE TO HAVE (Phase 3-4)

### TODO #6 : Export des résultats en PDF

**Statut** : 💭 **EN DISCUSSION**

**Besoin** : Exporter le rapport d'analyse en PDF pour archivage/envoi client.

**Solutions envisagées** :
- Bibliothèque jsPDF (client-side)
- Puppeteer (server-side, génération via headless Chrome)
- API externe (ex: PDF.co, CloudConvert)

**Décision** : ⏳ À trancher (besoin métier à confirmer)

**Estimation** : 2-3 jours

---

### TODO #7 : Mode "batch" pour analyser plusieurs dossiers d'un coup

**Statut** : 💭 **EN DISCUSSION**

**Besoin** : Importer 10 dossiers CEE, lancer l'analyse sur tous, recevoir un rapport global.

**Contrainte** : Timeout Vercel 60s → impossible d'analyser 10 dossiers séquentiellement.

**Solution** : Queue asynchrone avec notifications
- Upload de tous les dossiers
- Ajout dans une queue (BullMQ, Vercel Queue)
- Traitement asynchrone
- Notification par email quand terminé

**Décision** : ⏳ Besoin métier à confirmer

**Estimation** : 1 semaine

---

### TODO #8 : Historique des analyses

**Statut** : 💭 **EN DISCUSSION**

**Besoin** : Garder un historique des dossiers analysés avec résultats.

**Contrainte** : Vercel Serverless = stateless → nécessite BDD externe.

**Solution** : Base de données PostgreSQL/Supabase
```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY,
  date TIMESTAMP,
  siret VARCHAR(14),
  nom_client VARCHAR(255),
  nb_chantiers INT,
  nb_checks_bloquants INT,
  nb_checks_majeurs INT,
  resultat_json JSONB,
  created_at TIMESTAMP
);
```

**Décision** : ⏳ Phase 3-4 probablement

**Estimation** : 3-4 jours

---

## ✅ COMPLÉTÉS RÉCEMMENT

### ✅ TODO #9 : Support multi-chantiers

**Statut** : ✅ **COMPLÉTÉ** (7 mai 2026)

**Travaux effectués** :
- Refactorisation complète architecture
- Format JSON `audits[]` + `syntheses[]`
- Matching automatique par adresse
- Vérification à 2 niveaux (par chantier + total)
- Rétrocompatibilité totale

**Commits** :
- `dbad29f` - "feat: refonte architecture multi-chantiers avec détection auto"
- `6aced95` - "feat: adapter logique analyse pour architecture par chantier"
- `1a4fb32` - "Fix: Matcher audits/synthèses par INDEX au lieu de par adresse"

**Sources** :
- [ADR 003]

---

### ✅ TODO #10 : Google Sheets pour feedback faux positifs

**Statut** : ✅ **COMPLÉTÉ** (11 mai 2026)

**Travaux effectués** :
- Service Account Google créé
- Routes API `fetchSheet.js` + `compareSheet.js`
- Variables d'environnement Vercel configurées
- Tests réussis

**Commits** :
- `7a5ff03` - "Feature: Vérification avec Google Sheet"
- `e7504b6` - "Feature: Variable d'environnement pour onglet Google Sheet"

**Sources** :
- [ADR 004]

---

### ✅ TODO #11 : Support NAF et saisie manuelle surfaces

**Statut** : ✅ **COMPLÉTÉ** (11 mai 2026)

**Travaux effectués** :
- Extraction code NAF depuis API gouvernementale
- Détection automatique secteur "Autres"
- Interface saisie manuelle par chantier
- Recalcul instantané checks 43-46
- Tolérance ±1 m²

**Commits** :
- `f87b1ef` - "WIP: Détection attestations manquantes"
- `ae01be7` - "feat: ajout saisie manuelle des surfaces et recalcul instantané"
- `6fd0757` - "feat: ajout vérification globale des surfaces manuelles (Point 7)"

**Sources** :
- [ADR 005]

---

### ✅ TODO #12 : Sélecteur référence LED et fiches techniques

**Statut** : ✅ **COMPLÉTÉ** (8 mai 2026)

**Travaux effectués** :
- Objet FICHES_TECHNIQUES avec specs DAEWOO/TECH
- Extraction automatique référence LED depuis CEE
- Sélecteur déroulant avec remplissage auto
- Affichage specs techniques (THD, durée vie, puissance)

**Commits** :
- `f609ae3` - "Ajout objet FICHES_TECHNIQUES avec specs DAEWOO et TECH"
- `6b9d5f4` - "Implémentation complète sélecteur référence LED"
- `1dd0317` - "Ajout extraction automatique référence LED depuis CEE"
- `8b40854` - "Remplissage automatique du select référence LED"

**Sources** :
- [ADR 006]

---

### ✅ TODO #13 : Normalisation adresses - Ignorer mentions bâtiments

**Statut** : ✅ **COMPLÉTÉ** (8 mai 2026)

**Travaux effectués** :
- Regex nettoyage BAT/Bâtiment/batiments
- Support pluriel et tirets (batiments 1-2-3-4)
- Intégration dans `compareAddress()`
- Élimination faux positifs adresses

**Commits** :
- `080f407` - "Fix: Ignorer mentions BAT/Bâtiment dans adresses de chantiers"
- `1ee7664` - "Fix: Déduplication insensible à la casse pour adresses"
- `3673109` - "Fix: Support batiments multi-chiffres (1-2-3-4)" (11 mai)

**Sources** :
- [ADR 007]

---

### ✅ TODO #14 : Extraction CLIENT vs Prime Evolution

**Statut** : ✅ **COMPLÉTÉ** (8 mai 2026)

**Travaux effectués** :
- Clarification prompt extraction SIRET
- Instructions explicites CLIENT vs bureau d'études
- Règle heuristique position dans document
- Élimination risque extraction SIRET erroné

**Commits** :
- `e688204` - "Fix: Prompt extraction Audit - Préciser CLIENT vs bureau d'études"

**Sources** :
- [ADR 008]

---

### ✅ TODO #15 : Refonte UX - Structure hiérarchique

**Statut** : ✅ **COMPLÉTÉ** (9 mai 2026)

**Travaux effectués** :
- Structure à 3 niveaux (Page garde / Par chantier / Global)
- Navigation par boutons entre chantiers
- Regroupement sémantique des checks
- Priorisation visuelle (bloquant vs majeur)

**Commits** :
- `2bd2af6` - "Implémentation structure hiérarchique UX (develop-ux)"
- `b9447d0` - "Correction structure hiérarchique : navigation par boutons"
- `abcc680` - "Implémentation regroupement sémantique des checks"
- `ee113c7` - "Fix regroupement checks : analyse contenu au lieu d'ID"

**Sources** :
- [ADR 009]

---

### ✅ TODO #16 : Extraction secteur d'activité par chantier

**Statut** : ✅ **COMPLÉTÉ** (9 mai 2026)

**Travaux effectués** :
- Secteur par attestation (non global)
- Modification prompt extraction API
- Checks secteur par chantier
- Alerte si secteur "Autres" détecté

**Commits** :
- `6524840` - "Feature: Détection automatique du secteur d'activité dans le CEE"
- `435b846` - "API: Extraction secteur d'activité par chantier (au lieu de global)"
- `eac41e7` - "Frontend Partie 2: Alerte et stockage secteur par chantier"
- `371591f` - "Frontend Partie 3: Vérifications secteur par chantier"

**Sources** :
- [ADR 010]

---

### ✅ TODO #17 : Matching audits/synthèses par INDEX

**Statut** : ✅ **COMPLÉTÉ** (9 mai 2026)

**Travaux effectués** :
- Matching par INDEX d'apparition (non par adresse)
- Correction bug "chantier 3 fantôme"
- Attribution chantierIndex basé sur ordre
- Simplification architecture matching

**Commits** :
- `7ee508b` - "CORRECTIONS CRITIQUES : détection chantiers + couleurs boutons"
- `96e906a` - "Fix: Ajout propriété chantierIndex pour distribution correcte des checks"
- `1a4fb32` - "Fix: Matcher audits/synthèses par INDEX au lieu de par adresse"

**Sources** :
- [ADR 011]

---

### ✅ TODO #18 : Documentation complète Phase 1-2-3

**Statut** : ✅ **COMPLÉTÉ** (12 mai 2026)

**Travaux effectués** :
- Phase 1 (ANALYSE) : Lecture et analyse complète projet + mémoire
- Phase 2 (PROPOSITION) : Création 6 nouveaux ADRs (006-011) pour travail 8-9 mai
- Phase 3 (VALIDATION/MERGE) : Merge de tous les .proposed vers versions finales
- Restructure CLAUDE.md (10 sections + rituel de session)
- Cross-référencement exhaustif ADRs ↔ business-rules ↔ known-pitfalls

**Résultat** :
- 1 fichier restructuré : CLAUDE.md (383 lignes)
- 11 ADRs complets : docs/decisions/001-011-*.md
- 3 docs métier : business-rules (615L), known-pitfalls (543L), pending-todos (541L)
- Documentation couvre 100% du travail mai 5-11

**Commits** :
- `1a3a8b7` - "docs: restructure complète documentation avec 11 ADRs (mai 5-11)"

**Sources** :
- [Session 12 mai 2026]
- [Transcripts Phase 1-2-3]

---

### ✅ TODO #19 : Détection erreurs surfaces individuelles par bâtiment

**Statut** : ✅ **COMPLÉTÉ** (23 mai 2026)

**Problème** :
- Claude copiait surfaces depuis attestations CEE au lieu du tableau Synthèse
- Erreurs de saisie non détectées (ex: 7.23 m² tapé comme 703 m² dans Synthèse)
- Malgré instructions ultra-explicites, extraction IA inefficace pour ce cas

**Solution implémentée** :
1. **Parser JavaScript côté client** (index.html lignes 2794-2831)
   - Extraction regex section 5.1 : `/^(\d+)\s+\S+\s+(\d+(?:\.\d+)?)/gm`
   - Indépendant du formatage PDF exact
   - Remplace surfacesDetaillees après extraction Claude

2. **Check 45b - Comparaison surfaces individuelles** (index.html lignes 4610-4664)
   - Compare chaque surface bâtiment : Synthèse vs Attestations
   - Niveau MAJEUR si différence détectée
   - Complète check 45a (sommes totales)

**Résultat** : Erreurs de saisie individuelles détectées automatiquement ✅

**Fichiers modifiés** :
- `index.html` (+82 lignes, -16 lignes)
- `api/analyze.js` (+47 lignes)

**Commits** :
- `448195a` - "feat: ajout vérification individuelle surfaces par bâtiment"
- `ea96555` - "feat: parsing JavaScript surfaces détaillées tableau Synthèse"
- `d8df027` - "refactor: retrait log temporaire debug surfaces"

**Sources** :
- [Session 23 mai 2026]
- [ADR 012]

---

## 📊 STATISTIQUES

**TODOs actifs** : 6
- 🔴 Critiques : 0 ✅
- 🟡 Importantes : 3
- 🟢 Nice to have : 3

**TODOs complétés récemment** : 13 (7-23 mai 2026)
- 7 mai : Multi-chantiers (ADR 003)
- 8 mai : Sélecteur LED (ADR 006), Normalisation adresses (ADR 007), Extraction CLIENT (ADR 008)
- 9 mai : UX hiérarchique (ADR 009), Secteur par chantier (ADR 010), Matching INDEX (ADR 011)
- 11 mai : Google Sheets (ADR 004), Support NAF (ADR 005)
- 12 mai : Documentation Phase 1-2-3 (TODO #18), Checks 39-47 (TODO #1), Check 27 tolérance (TODO #2)
- 23 mai : Surfaces individuelles (ADR 012, TODO #19)

**Taux de complétion** : 68% (13/19) 🎯

---

## 🔄 PROCESSUS DE MISE À JOUR

Ce document doit être mis à jour :
- ✅ En fin de chaque session de développement
- ✅ Quand une nouvelle fonctionnalité est proposée
- ✅ Quand un TODO est complété (déplacer vers section ✅)
- ✅ Quand un TODO est abandonné (ajouter raison)

**Responsable** : Claude Code (mise à jour automatique en fin de session)

---

## SOURCES

### ADRs (Architecture Decision Records)
**7 mai** :
- [ADR 003] - Refonte multi-chantiers → TODO #9

**8 mai** :
- [ADR 006] - Sélecteur LED + fiches techniques → TODO #12
- [ADR 007] - Normalisation adresses (ignorer bâtiments) → TODO #13
- [ADR 008] - Extraction CLIENT vs Prime Evolution → TODO #14

**9 mai** :
- [ADR 009] - Refonte UX hiérarchique → TODO #15
- [ADR 010] - Secteur d'activité par chantier → TODO #16
- [ADR 011] - Matching audits/synthèses par INDEX → TODO #17

**11 mai** :
- [ADR 004] - Google Sheets pour feedback → TODO #10
- [ADR 005] - Support NAF et surfaces manuelles → TODO #11

### Documentation et historique
- [Phase 1 Analyse] - Audit mémoire 11 mai 2026
- [Transcripts] - Conversations 5-11 mai
- [Git log] - Historique des commits
- [CLAUDE.md] - Documentation principale
- [docs/business-rules.md] - Règles métier
- [docs/known-pitfalls.md] - Bugs résolus

---

**Dernière révision** : 23 mai 2026 (session TODO #19 - Surfaces individuelles)
**Prochaine révision** : Fin de session actuelle
