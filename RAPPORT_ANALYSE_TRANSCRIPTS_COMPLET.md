# RAPPORT D'ANALYSE COMPLET DES TRANSCRIPTS
## Projet CEE Vérification - Sessions du 5 au 11 mai 2026

**Sources analysées :**
- **Transcript 1** (59038263) : 5-7 mai 2026, 1874 lignes, 1225 messages
- **Transcript 2** (5c6b218b) : 7-11 mai 2026, 7358 lignes, 5065 messages

**Total** : 6290 messages analysés sur 7 jours

---

## A. DÉCISIONS TECHNIQUES (chronologiques)

### A1. ARCHITECTURE ET STACK TECHNIQUE

#### 5 mai 2026 - Choix d'architecture mono-fichier HTML + serverless
**Source :** [Transcript 59038263, 2026-05-05T19:27]

**Décision :** Application en mono-fichier HTML/CSS/JS vanilla + Vercel Serverless Functions (Node.js)

**Contexte :** Début du projet, Phase 1 d'une roadmap en 4 phases.

**Alternatives envisagées :**
- Framework JS moderne (React/Vue) → rejeté pour simplicité
- Backend Node.js classique → rejeté pour serverless Vercel

**Fichiers concernés :**
- `/index.html` - Interface complète en un seul fichier
- `/api/analyze.js` - Route POST pour appel Claude
- `/api/search.js` - Route GET pour API SIRET gouvernementale
- `/vercel.json` - Configuration déploiement

**Raison :** Simplicité maximale, déploiement instantané sur Vercel, pas de dépendances npm côté client.

---

#### 5 mai 2026 - Choix OpenRouter comme proxy API
**Source :** [Transcript 59038263, 2026-05-05T19:51]

**Décision :** Utiliser OpenRouter (https://openrouter.ai) au lieu de l'API Anthropic directe

**Contexte :** L'utilisateur avait déjà un compte OpenRouter mais pas de clé API Anthropic directe.

**Avantages :**
- Compatible avec le format OpenAI (même SDK)
- Accès à plusieurs modèles (Claude, GPT, etc.)
- Facturation pay-as-you-go
- Dashboard de monitoring sur openrouter.ai/activity

**Fichiers concernés :**
- `/api/analyze.js` - Configuration `fetch()` vers `https://openrouter.ai/api/v1/chat/completions`

**Variables d'environnement :**
```
OPENROUTER_API_KEY=sk-or-...
APP_PASSWORD=...
```

---

### A2. MODÈLES IA - ÉVOLUTION CLAUDE

#### 6 mai 2026, 11h40 - Modèle initial : Claude Sonnet 4
**Source :** [Transcript 59038263, 2026-05-06T11:40]

**Configuration :**
```javascript
model: 'anthropic/claude-sonnet-4'
max_tokens: 4096
temperature: 0.3
```

**Raison :** Meilleur modèle disponible pour extraction structurée de PDFs CEE.

---

#### 6 mai 2026, 12h03 - Tentative Claude Haiku 3.5 (échec)
**Source :** [Transcript 59038263, 2026-05-06T12:03]

**Décision :** Basculer vers `anthropic/claude-haiku-3.5` pour réduire les coûts

**Contexte :** Comparaison des coûts :
- Sonnet 4 : $3.00/1M input, $15.00/1M output
- Haiku 3.5 : $0.80/1M input, $4.00/1M output (×4 moins cher)

**Résultat :** **ÉCHEC** - Nom de modèle incorrect (`claude-haiku-3.5` n'existe pas)

**Correction immédiate :** Corrigé en `anthropic/claude-3.5-haiku`

**Problème découvert :** Performances insuffisantes - Haiku 3.5 manquait des champs importants dans l'extraction PDF.

---

#### 6 mai 2026, 13h20 - Retour à Sonnet 3.5
**Source :** [Transcript 59038263, 2026-05-06T13:20]

**Décision :** Abandonner Haiku, passer à `anthropic/claude-3.5-sonnet`

**Raison :** Haiku trop faible pour les extractions CEE complexes.

**Configuration finale :**
```javascript
model: 'anthropic/claude-3.5-sonnet'
max_tokens: 8000  // Doublé de 4096
temperature: 0.3
```

**Coût :** ~$1.50/1M input, $7.50/1M output (compromis performance/prix)

---

#### 6 mai 2026, 13h31 - Retour final à Sonnet 4 (modèle stable)
**Source :** [Transcript 59038263, 2026-05-06T13:31]

**Décision finale :** Revenir à `anthropic/claude-sonnet-4` (nom correct sur OpenRouter : `anthropic/claude-sonnet-4:thinking`)

**Raison :** 
- Sonnet 3.5 : nom de modèle incorrect sur OpenRouter
- Sonnet 4 : fonctionne parfaitement, le plus performant disponible

**Configuration définitive :**
```javascript
model: 'anthropic/claude-sonnet-4'
max_tokens: 8000
temperature: 0.3
```

**LEÇON APPRISE :** Toujours vérifier les noms exacts de modèles sur https://openrouter.ai/models avant de changer.

---

### A3. REFONTE MULTI-CHANTIERS (7 mai 2026)

#### 7 mai 2026, 10h00 - Décision de refonte architecture multi-chantiers
**Source :** [Transcript 5c6b218b, 2026-05-07T10:00]

**Contexte :** Découverte que certains dossiers CEE contiennent PLUSIEURS chantiers (plusieurs audits + synthèses pour différentes adresses).

**Problème initial :** Architecture mono-chantier :
- `audit: { ... }` (objet unique)
- `synthese: { ... }` (objet unique)
- `attestation_cee: { ... }` (objet unique)

**Besoin :** Gérer plusieurs chantiers avec matching automatique par adresse.

**Options proposées :**

**Option 1 : Validation rapide client (15-20 min)**
- Valider manuellement les extractions Claude via l'outil
- Contrôler 100% de la logique en JavaScript côté client
- Avantages : Rapide, flexible, fiable
- Inconvénients : Pas d'automatisation complète

**Option 2 : Extraction automatisée complète (2-3h)**
- Refonte complète du prompt d'extraction
- Toutes les validations en JavaScript avec règles strictes
- Avantages : Fiabilité maximale, règles précises contrôlées
- Inconvénients : Gros refactor

**Décision retenue :** Option 2 (refonte complète)

---

#### 7 mai 2026, 14h15 - Début refonte multi-chantiers
**Source :** [Transcript 5c6b218b, 2026-05-07T14:15]

**Décision :** Refonte majeure de l'architecture pour gérer les multi-chantiers

**Changements structurels :**

**1. Nouveau format JSON extraction :**
```javascript
// AVANT
{
  audit: { adresse_chantier: "...", led: {...} },
  synthese: { adresse_chantier: "...", led: {...} },
  attestation_cee: { adresse_chantier: "...", led: {...} }
}

// APRÈS
{
  audits: [
    { adresse_chantier: "...", led: {...} },
    { adresse_chantier: "...", led: {...} }
  ],
  syntheses: [
    { adresse_chantier: "...", led: {...} },
    { adresse_chantier: "...", led: {...} }
  ],
  attestation_cee: {
    chantiers: [
      { adresse_chantier: "...", led: {...} },
      { adresse_chantier: "...", led: {...} }
    ]
  }
}
```

**2. Fonctions de matching :**
- `normalizeAddress()` : Normalise les adresses (minuscules, sans espaces multiples, etc.)
- `matchChantiers()` : Associe automatiquement Audit ↔ Synthèse ↔ Attestation par adresse
- `calculateTotals()` : Calcul des totaux globaux et par chantier

**3. Système de vérification à 2 niveaux :**
- **Par chantier** : LED du chantier cohérentes entre Audit/Synthèse/Attestation
- **Somme totale** : Somme de tous les chantiers = Total CEE global

**4. Rétrocompatibilité :**
- 1 audit + 1 synthèse fonctionne exactement comme avant
- Pas de régression sur les dossiers mono-chantier

**Fichiers modifiés :**
- `/api/analyze.js` - Nouveau prompt d'extraction multi-chantiers
- `/index.html` - Refactoring complet des ~40 checks de validation

**Estimation travail :** 1-2h de refactoring intensif

---

#### 7 mai 2026, 14h21 - Refonte terminée et déployée
**Source :** [Transcript 5c6b218b, 2026-05-07T14:21]

**Statut :** ✅ Refonte multi-chantiers terminée et fonctionnelle

**Résumé des changements :**

**Architecture :**
- ✅ Fonctions helper pour normaliser et matcher les chantiers
- ✅ Rétrocompatibilité totale (1 audit + 1 synthèse = comme avant)
- ✅ Matching par adresse automatique

**Vérifications :**
- ✅ Check par chantier (Audit ↔ Synthèse ↔ CEE cohérents)
- ✅ Check somme globale (Σ chantiers = Total CEE)
- ✅ Messages d'erreur précis ("Chantier 1 : adresse X", "Chantier 2 : adresse Y")

**Tests :**
- ✅ 1 chantier : fonctionne
- ✅ 2 chantiers : matching correct
- ✅ 3+ chantiers : matching correct

**Commit :** `feat: Multi-chantiers support with automatic address matching`

---

### A4. NOUVELLE ARCHITECTURE UX/UI (7-9 mai 2026)

#### 7 mai 2026, 15h53 - Décision nouvelle architecture d'import
**Source :** [Transcript 5c6b218b, 2026-05-07T15:53]

**Problème :** Avec la refonte multi-chantiers, le workflow d'import n'était plus adapté.

**Workflow AVANT :**
1. Importer simultanément : CEE + Audit + Synthèse + Page de garde
2. Analyser tout d'un coup

**Workflow APRÈS (décision) :**
1. **Étape 1 :** Importer CEE → Détection automatique du nombre de chantiers
2. **Étape 2 :** Afficher zones d'import par chantier détecté :
   - Chantier 1 : [Adresse détectée] → Import Audit + Synthèse
   - Chantier 2 : [Adresse détectée] → Import Audit + Synthèse
3. **Étape 3 :** Import Page de garde
4. **Étape 4 :** Analyse complète

**Avantages :**
- Interface guidée étape par étape
- Détection automatique du nombre de chantiers
- Matching automatique par adresse
- Moins d'erreurs utilisateur

**Fichiers concernés :**
- `/index.html` - Refonte complète de la section d'import
- `/api/extract-cee.js` - Nouvelle route pour extraction préliminaire du CEE

---

#### 7 mai 2026, 16h01 - Nouvelle architecture implémentée et déployée
**Source :** [Transcript 5c6b218b, 2026-05-07T16:01]

**Statut :** ✅ Nouvelle architecture complète

**Changements :**
- ✅ Route `/api/extract-cee` pour détecter automatiquement les chantiers
- ✅ Interface refonte : import CEE en premier → détection → zones par chantier
- ✅ Extraction en 2 passes (CEE seul, puis documents complets)

**Commit :** `feat: New progressive import workflow with auto-detection`

---

#### 7 mai 2026, 16h07 - Simplification workflow (retour arrière partiel)
**Source :** [Transcript 5c6b218b, 2026-05-07T16:07]

**Problème :** Workflow trop complexe avec bouton de détection manuel

**Décision :** Simplifier en workflow automatique

**Workflow optimal final :**
1. Import CEE → **Détection auto instantanée** (pas de bouton)
2. Affichage : "X chantiers détectés : [adresses]"
3. Zones d'import automatiques par chantier
4. Import Page de garde
5. Analyse complète

**Raison :** Moins de clics, plus fluide, moins d'erreurs possibles.

---

#### 9 mai 2026, 08h40 - Système de regroupement des checks
**Source :** [Transcript 5c6b218b, 2026-05-09T08:40]

**Décision :** Implémenter un système de regroupement sémantique des 40+ checks de validation

**Problème :** Liste plate de 40 checks → difficile à lire

**Solution :** 10 groupes sémantiques

**Groupes définis :**
1. **LED** (checks 1-7, 9a-9e, 43-46)
2. **SIRET** (checks 10-11)
3. **Page de garde** (checks 12-14)
4. **Dates** (checks 15-17)
5. **Adresse siège** (checks 18-20)
6. **Mentions agricoles** (check 21 - BLOQUANT)
7. **Parcelles cadastrales** (checks 22-23)
8. **Secteur d'activité** (checks 24-26)
9. **Caractéristiques LED** (checks 27-35)
10. **Informations générales** (checks 36-42)

**Logique d'affichage :**
- Niveau groupe = `max(niveaux enfants)`
- Groupe MAJEUR si au moins 1 check majeur dedans
- Groupe OK si tous les checks OK
- Affichage : dépliable/repliable par groupe

**Fichiers concernés :**
- `/index.html` - Mapping automatique ID → groupe

**Commit :** `feat: Semantic grouping of validation checks`

---

#### 9 mai 2026, 10h00 - Architecture UX à 3 niveaux
**Source :** [Transcript 5c6b218b, 2026-05-09T10:00]

**Décision :** Implémenter une hiérarchie à 3 niveaux pour l'affichage des résultats

**Architecture finale :**

```
📄 Vue globale (niveau 1)
   └─ Dossier CEE [✅ / ❌ / compteur]
      ├─ Groupe CEE global (SIRET, total LED, dates, etc.) [niveau 2]
      │  └─ Checks individuels [niveau 3]
      ├─ Chantier 1 : [adresse] [niveau 2]
      │  ├─ Groupe Audit (LED, secteur, caractéristiques) [niveau 2]
      │  │  └─ Checks individuels [niveau 3]
      │  └─ Groupe Synthèse (LED, secteur, etc.) [niveau 2]
      │     └─ Checks individuels [niveau 3]
      └─ Chantier 2 : [adresse] [niveau 2]
         ├─ Groupe Audit [niveau 2]
         └─ Groupe Synthèse [niveau 2]
```

**Avantages :**
- Organisation claire par document et par chantier
- Drill-down progressif
- Vision globale immédiate ("Dossier OK" ou "3 erreurs majeures")

**Fichiers concernés :**
- `/index.html` - Refactoring complet de l'affichage des résultats

**Commit :** `feat: 3-level hierarchical results display`

---

### A5. GOOGLE SHEETS INTÉGRATION (11 mai 2026)

#### 11 mai 2026, 09h38 - Décision d'intégrer Google Sheets pour feedback
**Source :** [Transcript 5c6b218b, 2026-05-11T09:38]

**Contexte :** Besoin d'un système de feedback pour marquer les faux positifs des checks et apprendre au fil du temps.

**Alternatives envisagées :**

**Option A : Fichier JSON côté serveur**
- ❌ **GROS PROBLÈME** : Vercel Serverless = stateless, le fichier n'est pas persisté entre les invocations
- ❌ Nécessiterait un vrai serveur ou une base de données

**Option B : LocalStorage navigateur**
- ❌ Limité à 1 utilisateur
- ❌ Perdu si cache navigateur effacé

**Option C : Google Sheets**
- ✅ Persistance garantie
- ✅ Multi-utilisateurs
- ✅ Modification en temps réel
- ✅ Facile à consulter/éditer manuellement
- ✅ API gratuite Google Sheets v4

**Décision finale :** Google Sheets

**Architecture :**
```
Google Sheet "CEE_Feedback"
Colonnes : timestamp | check_id | champ | valeur_attendue | valeur_trouvee | faux_positif (bool)
```

**Fichiers créés :**
- `/api/feedback.js` - Route POST pour enregistrer feedback
- Dépendance : `googleapis` (npm package)

**Variables d'environnement :**
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
GOOGLE_SHEET_ID=1abc...
```

**Commit :** `feat: Google Sheets integration for feedback system`

---

### A6. SUPPORT NAF/SAISIE MANUELLE DES SURFACES (11 mai 2026)

#### 11 mai 2026, ~15h00 - Support saisie manuelle surfaces
**Source :** [Transcript 5c6b218b, 2026-05-11T15:02]

**Contexte :** Certains dossiers CEE ont un secteur d'activité "NAF" (nomenclature INSEE) au lieu de "Entrepôts". Claude ne peut pas extraire automatiquement les surfaces par bâtiment/cellule dans ces cas.

**Problème :**
- Secteur "Entrepôts" → surfaces extraites automatiquement
- Secteur "NAF" / "Autres" → extraction impossible → checks 43-46 en erreur

**Solution :** Système de saisie manuelle

**Fonctionnalités implémentées :**

**1. Détection automatique :**
```javascript
if (secteur === "Autres" || secteur.includes("NAF")) {
  // Afficher UI de saisie manuelle
}
```

**2. Interface de saisie :**
- Affichage du nombre de LED par bâtiment/cellule (si extrait)
- Champs de saisie pour les surfaces en m²
- Validation instantanée (nombre positif, max 99999 m²)
- Recalcul automatique des checks 43-46 après saisie

**3. Règles de validation :**
- Tolérance ±1 m² pour compenser les arrondis
- Surface totale doit correspondre à la somme des surfaces par bâtiment

**4. Checks concernés (recalculés) :**
- Check 43 : Surface totale cohérente
- Check 44 : Surface par bâtiment/cellule présente
- Check 45 : Ratio LED/m² dans les normes
- Check 46 : Distribution des surfaces cohérente

**Fichiers concernés :**
- `/index.html` - Ajout UI saisie manuelle + logique recalcul

**Commit :** `feat: Manual surface input for NAF/Other sectors with ±1m² tolerance`

**Documentation mémoire :** `/Users/mac/.claude/projects/-Users-mac/memory/reference_saisie_surfaces_manuelles.md`

---

## B. RÈGLES MÉTIER COMPLÈTES

### B1. RÈGLES BLOQUANTES (empêchent tout envoi client)

#### R1. Mentions agricoles strictement interdites
**Niveau :** 🔴 BLOQUANT  
**Source :** [Transcript 59038263 + 5c6b218b, multiples mentions]

**Règle :** La mention "agri", "agricole", "agriculteur", "exploitation agricole" ne doit **JAMAIS** apparaître dans aucun document CEE LED.

**Raison :** Les exploitations agricoles ne sont pas éligibles au dispositif CEE LED (opération BAT-EQ-127).

**Documents concernés :**
- Audit Dialux : profil d'utilisation, description du site
- Synthèse : secteur d'activité, activité par bâtiment (état initial et projeté)
- Attestation CEE : dénomination sociale, activité
- Page de garde : nom du client, description

**Check ID :** 21

**Action si détecté :** ❌ ARRÊT IMMÉDIAT - Ne pas envoyer au client tant que non corrigé

**Exemples de détection :**
- "EARL Dupont" → ❌ EARL = Exploitation Agricole à Responsabilité Limitée
- "Exploitation agricole de la Ferme" → ❌ Mention explicite
- "Activité : Agriculture" → ❌ Secteur agricole
- "Entrepôt de stockage de matériel agricole" → ⚠️ **[À CONFIRMER]** Discutable selon contexte

---

#### R2. Page de garde : correspondance exacte obligatoire
**Niveau :** 🔴 BLOQUANT  
**Source :** [Transcript 59038263 + 5c6b218b, multiples mentions]

**Règle :** Les informations de la page de garde (nom du client, adresse du siège, date) doivent correspondre **EXACTEMENT** aux informations des documents CEE.

**Vérifications :**
- **Nom client** : Page de garde = Synthèse = Attestation CEE
- **Adresse siège** : Page de garde = Synthèse (adresse siège social)
- **Date** : Page de garde = Date d'audit

**Fonction de comparaison :** `compareStringsStrict()` (pas de tolérance)

**Check IDs :** 12, 13, 14

**Logique d'envoi :**
- ✅ Page de garde OK → **Envoi immédiat possible** (signature client)
- ❌ Page de garde KO → **Envoi interdit** jusqu'à correction

**Exception :** Les autres checks (LED, SIRET, etc.) peuvent être en erreur si la page de garde est OK, mais doivent être corrigés avant envoi du CEE complet.

---

### B2. RÈGLES MAJEURES (à corriger, non bloquantes pour page de garde)

#### R3. SIRET : format et cohérence
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Le SIRET doit :
1. Avoir exactement 14 chiffres
2. Être identique dans tous les documents
3. Correspondre à l'entreprise cliente (pas au bureau d'études)

**Documents concernés :**
- Attestation CEE : `siret_beneficiaire`
- Synthèse : SIRET du bénéficiaire
- Audit : SIRET du client (parfois absent)

**Fonction de comparaison :** `compareSiret()` (14 chiffres, sans espaces)

**Check IDs :** 10, 11

**Attention :** Ne JAMAIS extraire le SIRET de Prime Evolution (bureau d'études). Toujours celui du client bénéficiaire.

**Validation API :** Utilise l'API gouvernementale SIRENE via `/api/search` pour vérifier l'existence et récupérer les infos officielles.

---

#### R4. LED : cohérence totale multi-chantiers
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 5c6b218b, 2026-05-07 + 2026-05-08]

**Règle :** Pour chaque chantier, le nombre de LED doit être **STRICTEMENT IDENTIQUE** entre :
- Audit Dialux
- Synthèse
- Attestation CEE (pour ce chantier)

**Vérification à 2 niveaux :**

**Niveau 1 : Par chantier**
- Chantier 1 : `led_audit_1 === led_synthese_1 === led_cee_1`
- Chantier 2 : `led_audit_2 === led_synthese_2 === led_cee_2`

**Niveau 2 : Total global**
- `Σ(led_chantiers) === led_cee_total`

**Fonction :** `matchChantiers()` pour associer automatiquement les documents par adresse

**Check IDs :** 1-7, 9a-9e

**Tolérance :** **AUCUNE** (doit être exact au LED près)

**Exemple d'erreur :**
```
❌ Chantier 1 (12 Rue de la Paix) :
   - Audit : 35 LED
   - Synthèse : 36 LED
   - CEE : 35 LED
   → Erreur majeure : incohérence Audit/Synthèse
```

---

#### R5. LED : répartition par bâtiment/cellule
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 5c6b218b, 2026-05-07 + 2026-05-11]

**Règle :** Pour les dossiers multi-bâtiments, le nombre de LED par bâtiment/cellule doit être cohérent entre Audit et Synthèse.

**Exemple structure attendue :**
```json
{
  "led_par_batiment": {
    "BAT A": 20,
    "BAT B": 15,
    "Cellule 1": 10
  },
  "total": 45
}
```

**Vérifications :**
- Somme des LED par bâtiment = Total LED du chantier
- Noms de bâtiments cohérents entre Audit et Synthèse
- Aucun bâtiment manquant ou en trop

**Check IDs :** 6, 7

**Fonction de comparaison :** `compareLedDistribution()`

**Attention :** Ignorer les mentions "BAT X", "Bâtiment X" dans les adresses (voir R15).

---

#### R6. THD (Taux de Distorsion Harmonique)
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Le THD dans les caractéristiques des luminaires doit être **exactement 3,7%** dans tous les documents.

**Documents concernés :**
- Audit Dialux : fiche technique LED
- Synthèse : tableau caractéristiques luminaires
- Attestation CEE : spécifications techniques (si présent)

**Tolérance :** **AUCUNE** (doit être exactement 3,7%, pas 3,8% ou 3,6%)

**Check ID :** 30

**Raison :** Spécification technique normative pour l'éligibilité CEE LED.

---

#### R7. Parcelles cadastrales
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Les parcelles cadastrales doivent :
1. Être présentes dans la Synthèse
2. Avoir le format `000/0B/XXXX` (section/numéro/commune)

**Format attendu :**
```
Exemples valides :
- 123/4B/5678
- 001/0A/9999
- 456/12C/0001

Exemples invalides :
- 123 (incomplet)
- AB/123 (format incorrect)
- N/A (absent)
```

**Check IDs :** 22, 23

**Fonction de comparaison :** `compareParcelles()` - **NE JAMAIS utiliser `compareStrings()`** (voir R16)

**Tolérance :** Aucune sur le format, mais accepte des variations mineures (espaces, tirets vs slashes).

---

#### R8. Dates : cohérence audit/devis/envoi
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Les dates doivent être cohérentes :
- **Date d'audit** = **Date d'envoi du devis** (attendu)
- Date d'audit ≤ Date de la synthèse
- Date d'audit ≤ Date du CEE

**Check IDs :** 15, 16, 17

**Tolérance :** ±1 jour (pour décalages horaires ou jours ouvrés)

**Fonction :** `compareDates(date1, date2, toleranceJours=1)`

---

#### R9. Référence produit LED
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 5c6b218b, 2026-05-08]

**Règle :** La référence produit LED doit être identique dans tous les documents.

**Format attendu (selon dossier) :**
- **DAEWOO NES-HBL 250W** (le plus courant)
- **TECH LED 150W** (alternative)

**Documents concernés :**
- Audit Dialux : fiche technique
- Synthèse : caractéristiques luminaires
- Attestation CEE : référence produit installé

**Check IDs :** 27, 28

**Fonction de comparaison :** `compareStringsStrict()` (exactitude requise)

**UI :** Sélecteur radio dans la section Références :
```
Référence LED : ○ DAEWOO  ○ TECH
```

**Fichiers concernés :**
- `/index.html` - Base de données de références LED avec durée de vie et caractéristiques

---

#### R10. Secteur d'activité
**Niveau :** 🟠 MAJEUR  
**Source :** [Transcript 5c6b218b, 2026-05-09]

**Règle :** Le secteur d'activité doit être compatible avec le dispositif CEE LED.

**Valeurs acceptées :**
- ✅ "Entrepôts"
- ✅ "Entrepôt logistique"
- ✅ "Logistique"
- ⚠️ "Autres secteurs" (nécessite vérification manuelle)
- ⚠️ "NAF XXXX" (nécessite vérification + saisie manuelle surfaces)
- ❌ "Agriculture" (BLOQUANT - voir R1)

**Documents concernés :**
- Synthèse : secteur d'activité
- Audit Dialux : profil d'utilisation

**Check IDs :** 24, 25, 26

**Mapping intelligent :**
```javascript
if (secteur.includes("entrepôt") || secteur.includes("logistique")) {
  return "Entrepôt";
} else if (secteur.startsWith("NAF")) {
  return "Autres secteurs (NAF)";
} else {
  return "Autres secteurs";
}
```

**UI simplifiée (9 mai 2026) :**
- Menu déroulant à 2 choix uniquement : "Entrepôt" / "Autres secteurs"

---

### B3. RÈGLES INFORMATIVES (info, pas d'erreur)

#### R11. Adresse siège social
**Niveau :** 🔵 INFO  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** L'adresse du siège social doit être présente et cohérente.

**Documents concernés :**
- Synthèse : adresse siège social
- Page de garde : adresse de facturation (souvent identique)

**Check IDs :** 18, 19, 20

**Fonction de comparaison :** `compareAddresses()` (tolérante, voir R14)

**Tolérance :** Accepte variations mineures (voir R14)

---

#### R12. Puissance et flux lumineux
**Niveau :** 🔵 INFO  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Les caractéristiques techniques des LED doivent être cohérentes :
- Puissance (W) : identique entre documents
- Flux lumineux (lm) : identique entre documents
- Efficacité lumineuse (lm/W) : cohérente avec Puissance et Flux

**Documents concernés :**
- Audit Dialux : fiche technique LED
- Synthèse : caractéristiques luminaires

**Check IDs :** 31, 32, 33

**Calcul :** `efficacité = flux / puissance`

**Tolérance :** ±5% pour tenir compte des arrondis

---

### B4. RÈGLES DE COMPARAISON ET NORMALISATION

#### R13. Fonction compareStrings() : tolérante pour variations mineures
**Niveau :** 📖 PATTERN  
**Source :** [Transcript 5c6b218b, multiples mentions]

**Règle :** Utiliser `compareStrings(str1, str2)` pour la plupart des comparaisons textuelles.

**Normalisation appliquée :**
```javascript
function normalizeString(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Espaces multiples → 1 espace
    .replace(/[.,;:!?]/g, '')       // Supprime ponctuation
    .replace(/[àâä]/g, 'a')         // Normalise accents
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u');
}

function compareStrings(str1, str2) {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  return norm1 === norm2;
}
```

**Cas d'usage :**
- Noms de clients
- Adresses (avec `compareAddresses()` en plus)
- Descriptions générales

**⚠️ NE PAS UTILISER pour :**
- Parcelles cadastrales → utiliser `compareParcelles()`
- SIRET → utiliser `compareSiret()`

---

#### R14. Fonction compareAddresses() : très tolérante
**Niveau :** 📖 PATTERN  
**Source :** [Transcript 5c6b218b, 2026-05-07 + 2026-05-08]

**Règle :** Comparaison d'adresses avec normalisation agressive.

**Normalisation appliquée :**
```javascript
function normalizeAddress(addr) {
  return addr
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/rue/g, 'r')
    .replace(/avenue/g, 'av')
    .replace(/boulevard/g, 'bd')
    .replace(/lieu-dit/g, 'ld')
    .replace(/^(\d+)\s+bis/, '$1bis')  // "12 bis" → "12bis"
    .replace(/[^a-z0-9]/g, '');        // Supprime tout sauf lettres/chiffres
}

function compareAddresses(addr1, addr2) {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Substring match (pour variations "12 rue X" vs "12 r X, 75001 Paris")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  return false;
}
```

**Cas d'usage :**
- Matching de chantiers par adresse
- Comparaison adresse siège social
- Comparaison adresse chantier

---

#### R15. Adresses : ignorer mentions bâtiments
**Niveau :** 📖 PATTERN  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/reference_adresses_batiments_cee.md`

**Règle :** Les mentions "BAT X", "Bâtiment X" ne font **PAS PARTIE** de l'adresse pour le matching.

**Exemples :**
```
Adresse 1 : "12 Rue de la Paix, BAT A, 75001 Paris"
Adresse 2 : "12 Rue de la Paix, 75001 Paris"
→ MATCH (BAT A ignoré)

Adresse 1 : "Zone Industrielle, Bâtiment 3, 69000 Lyon"
Adresse 2 : "Zone Industrielle, 69000 Lyon"
→ MATCH (Bâtiment 3 ignoré)
```

**Raison :** Évite la création de faux chantiers séparés pour des bâtiments d'un même site.

**Implémentation :**
```javascript
function normalizeAddress(addr) {
  let normalized = addr.toLowerCase().trim();
  
  // Supprime mentions bâtiments
  normalized = normalized
    .replace(/,?\s*bat\s+[a-z0-9]+/gi, '')
    .replace(/,?\s*bâtiment\s+[a-z0-9]+/gi, '')
    .replace(/,?\s*cellule\s+[a-z0-9]+/gi, '');
  
  // ... reste de la normalisation
  return normalized;
}
```

**Documentation mémoire :** `reference_adresses_batiments_cee.md`

---

#### R16. Parcelles cadastrales : NE JAMAIS utiliser compareStrings()
**Niveau :** ⚠️ ANTI-PATTERN  
**Source :** [Transcript 5c6b218b, bug détecté]

**Règle :** Les parcelles cadastrales doivent être comparées avec `compareParcelles()`, **JAMAIS** avec `compareStrings()`.

**Raison :** `compareStrings()` normalise trop agressivement et peut considérer "123/4B/5678" et "123 45 6789" comme identiques.

**Fonction correcte :**
```javascript
function compareParcelles(p1, p2) {
  if (!p1 || !p2) return false;
  
  // Normalisation légère (juste espaces et tirets)
  const norm1 = p1.trim().replace(/[-\s]/g, '/');
  const norm2 = p2.trim().replace(/[-\s]/g, '/');
  
  return norm1 === norm2;
}
```

**Check IDs concernés :** 22, 23

---

#### R17. SIRET : comparaison stricte 14 chiffres
**Niveau :** 📖 PATTERN  
**Source :** [Transcript 59038263 + 5c6b218b]

**Règle :** Le SIRET doit être comparé en retirant UNIQUEMENT les espaces.

**Fonction :**
```javascript
function compareSiret(s1, s2) {
  if (!s1 || !s2) return false;
  
  const norm1 = s1.replace(/\s+/g, '');
  const norm2 = s2.replace(/\s+/g, '');
  
  // Vérification format (14 chiffres)
  if (!/^\d{14}$/.test(norm1) || !/^\d{14}$/.test(norm2)) {
    return false;
  }
  
  return norm1 === norm2;
}
```

**Check IDs concernés :** 10, 11

---

### B5. RÈGLES D'EXTRACTION ET SOURCES

#### R18. Extraction Audit : TOUJOURS les coordonnées du client (pas du bureau d'études)
**Niveau :** 🔴 CRITIQUE  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/reference_extraction_audit_client_vs_bureau.md`

**Règle :** Ne **JAMAIS** extraire les coordonnées de "Prime Evolution" (bureau d'études). Toujours extraire celles du **client bénéficiaire**.

**Contexte :** Les audits Dialux contiennent souvent :
- Page 1 : Logo et coordonnées Prime Evolution (bureau d'études)
- Page 2-3 : Informations du client bénéficiaire

**Extraction correcte :**
```
✅ Nom : SCEA TROIS (client)
❌ Nom : Prime Evolution (bureau d'études)

✅ SIRET : 12345678901234 (client)
❌ SIRET : 98765432109876 (Prime Evolution)
```

**Prompt Claude :** Instruction explicite dans le prompt :
> "Ne JAMAIS extraire les coordonnées de Prime Evolution. Toujours celles du client bénéficiaire."

**Check concerné :** Tous les checks de cohérence SIRET/nom client

**Documentation mémoire :** `reference_extraction_audit_client_vs_bureau.md`

---

#### R19. Saisie manuelle surfaces : tolérance ±1 m²
**Niveau :** 📖 PATTERN  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/reference_saisie_surfaces_manuelles.md`

**Règle :** Pour les dossiers NAF/"Autres secteurs", accepter une tolérance de **±1 m²** pour les surfaces totales.

**Raison :** Compenser les arrondis dans les documents sources.

**Exemple :**
```
Surface totale : 1234,56 m² (document)
Surface saisie : 1235 m² (arrondi)
→ ✅ OK (différence de 0,44 m² < 1 m²)

Surface totale : 1234 m² (document)
Surface saisie : 1236 m² (erreur)
→ ❌ ERREUR (différence de 2 m² > 1 m²)
```

**Fonction :**
```javascript
function compareSurfaces(s1, s2) {
  const diff = Math.abs(s1 - s2);
  return diff <= 1.0;  // Tolérance ±1 m²
}
```

**Check IDs concernés :** 43, 44, 45, 46

**UI :** Champs de saisie avec validation instantanée

**Documentation mémoire :** `reference_saisie_surfaces_manuelles.md`

---

#### R20. Liste complète des 40+ checks de validation
**Niveau :** 📖 RÉFÉRENCE  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/reference_regles_validation_cee.md`

**Documentation complète :** 158 lignes décrivant :
- Les 40+ checks individuels
- Fonctions de comparaison spécialisées
- Champs d'extraction obligatoires
- Règles anti-régression

**Fichier mémoire :** `reference_regles_validation_cee.md`

**Checks catégorisés :**

**LED (1-7, 9a-9e, 43-46) :**
- 1 : Total LED Attestation CEE présent
- 2 : Total LED cohérent Audit/CEE
- 3 : Total LED cohérent Synthèse/CEE
- 4 : Total LED cohérent Audit/Synthèse
- 5 : Nombre de chantiers cohérent
- 6 : LED par bâtiment présent
- 7 : LED par bâtiment cohérent
- 9a-9e : LED par chantier cohérents (multi-chantiers)
- 43-46 : Surfaces et ratios LED/m²

**SIRET (10-11) :**
- 10 : SIRET présent et format valide (14 chiffres)
- 11 : SIRET cohérent entre documents

**Page de garde (12-14) :**
- 12 : Nom client cohérent page de garde/synthèse
- 13 : Adresse siège cohérente page de garde/synthèse
- 14 : Date cohérente page de garde/audit

**Dates (15-17) :**
- 15 : Date audit présente et valide
- 16 : Date synthèse présente et valide
- 17 : Date CEE présente et valide

**Adresse siège (18-20) :**
- 18 : Adresse siège présente synthèse
- 19 : Adresse siège présente CEE
- 20 : Adresse siège cohérente synthèse/CEE

**Mentions agricoles (21) :**
- 21 : 🔴 BLOQUANT - Aucune mention agricole

**Parcelles cadastrales (22-23) :**
- 22 : Parcelles présentes
- 23 : Parcelles format valide

**Secteur d'activité (24-26) :**
- 24 : Secteur présent synthèse
- 25 : Secteur présent audit
- 26 : Secteur cohérent synthèse/audit

**Caractéristiques LED (27-35) :**
- 27 : Référence produit présente
- 28 : Référence produit cohérente
- 29 : Marque présente et cohérente
- 30 : THD = 3,7% exactement
- 31 : Puissance (W) cohérente
- 32 : Flux lumineux (lm) cohérent
- 33 : Efficacité lumineuse cohérente
- 34 : Durée de vie présente
- 35 : Durée de vie cohérente (selon référence)

**Informations générales (36-42) :**
- 36 : Descriptif bâtiment présent
- 37 : Activité par bâtiment présente
- 38 : État initial vs projeté présent
- 39 : Plan de masse présent
- 40 : Photos présentes
- 41 : Signature auditeur présente
- 42 : Cachet entreprise présent

---

## C. PATTERNS À SUIVRE / À ÉVITER

### C1. PATTERNS OBLIGATOIRES (à TOUJOURS suivre)

#### P1. Diagnostic AVANT modification de code
**Niveau :** 🔴 OBLIGATOIRE  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/feedback_diagnostic_avant_modification.md`

**Règle :** Avant de toucher le code pour corriger un bug :
1. ✅ Diagnostiquer la cause racine
2. ✅ Expliquer le problème à l'utilisateur
3. ✅ Proposer une solution (ou plusieurs alternatives)
4. ✅ **Attendre validation utilisateur**
5. ✅ Seulement APRÈS : modifier le code

**Raison :** Évite les corrections hasardeuses et les régressions.

**Anti-pattern à éviter :**
```
❌ "Je vois le bug, je corrige immédiatement"
✅ "Le bug vient de X. Je propose de le corriger en faisant Y. Tu valides ?"
```

**Documentation mémoire :** `feedback_diagnostic_avant_modification.md`

---

#### P2. Commit + push APRÈS CHAQUE modification
**Niveau :** 🔴 OBLIGATOIRE  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/feedback_vercel_deployment.md`

**Règle :** Après CHAQUE modification de code, TOUJOURS :
1. ✅ `git add <fichiers modifiés>`
2. ✅ `git commit -m "description"`
3. ✅ `git push origin <branche>`
4. ✅ Attendre le déploiement Vercel (~30s)

**Raison :** Vercel déploie automatiquement à chaque push. Si tu ne push pas, l'utilisateur voit l'ancienne version en ligne.

**Conséquence si oublié :**
- Utilisateur teste en ligne → voit l'ancienne version
- Pense que la correction n'a pas fonctionné
- Perte de temps et confusion

**Anti-pattern à éviter :**
```
❌ Modifier 3 fichiers → commit 1 fois à la fin
✅ Modifier 1 fichier → commit + push → Modifier 1 autre → commit + push
```

**Documentation mémoire :** `feedback_vercel_deployment.md`

---

#### P3. Workflow Git : branche develop pour le travail, main pour la production
**Niveau :** 🔴 OBLIGATOIRE  
**Source :** Mémoire `/Users/mac/.claude/projects/-Users-mac/memory/feedback_workflow_git_develop.md`

**Règle :** 
- ✅ Toujours travailler sur la branche `develop`
- ✅ `main` reste en production stable
- ✅ Merge `develop` → `main` seulement après validation utilisateur

**Workflow :**
```bash
# Début de session
git checkout develop
git pull origin develop

# Pendant le travail
git add <fichier>
git commit -m "feat: description"
git push origin develop

# Après validation utilisateur
git checkout main
git merge develop
git push origin main
```

**Raison :**
- `main` = version stable en production (vercel.com)
- `develop` = version de travail avec preview Vercel

**Documentation mémoire :** `feedback_workflow_git_develop.md`

---

#### P4. Vérifier les erreurs JavaScript dans la console avant de valider
**Niveau :** 🟠 RECOMMANDÉ  
**Source :** [Transcript 5c6b218b, multiples bugs corrigés]

**Règle :** Avant de dire "c'est terminé", TOUJOURS :
1. ✅ Ouvrir la console navigateur (F12)
2. ✅ Vérifier qu'il n'y a **AUCUNE** erreur rouge
3. ✅ Tester le workflow complet (import PDF → analyse → affichage)

**Erreurs fréquentes à détecter :**
- Variables non définies (`Uncaught ReferenceError`)
- Propriétés nulles (`Cannot read property 'X' of null`)
- Fonctions inexistantes (`X is not a function`)

**Anti-pattern à éviter :**
```
❌ "J'ai modifié le code, ça devrait marcher"
✅ "J'ai modifié le code, j'ai testé en console, aucune erreur, ça fonctionne"
```

---

#### P5. Proposer 2-3 approches AVANT de commencer une tâche non triviale
**Niveau :** 🟠 RECOMMANDÉ  
**Source :** CLAUDE.md personnel de l'utilisateur

**Règle :** Pour toute fonctionnalité importante (refonte, nouvelle feature), proposer :
- **Option A :** Approche simple/rapide
- **Option B :** Approche complète/robuste
- (Option C si pertinent)

**Pour chaque option :**
- ✅ Avantages
- ✅ Inconvénients
- ✅ Estimation de temps
- ✅ Impact sur le code existant

**Attendre la décision de l'utilisateur avant de commencer.**

**Exemple (refonte multi-chantiers) :**
```
Option 1 : Validation rapide client (15-20 min)
- Avantages : Rapide, flexible
- Inconvénients : Pas d'automatisation

Option 2 : Extraction automatisée complète (2-3h)
- Avantages : Fiabilité maximale
- Inconvénients : Gros refactor
```

---

### C2. ANTI-PATTERNS (à ÉVITER ABSOLUMENT)

#### A1. NE JAMAIS utiliser compareStrings() pour les parcelles cadastrales
**Niveau :** ❌ INTERDIT  
**Source :** [Transcript 5c6b218b, bug détecté]

**Raison :** `compareStrings()` normalise trop agressivement (voir R16).

**Solution :** Utiliser `compareParcelles()` (voir R16)

---

#### A2. NE JAMAIS extraire le SIRET de Prime Evolution
**Niveau :** ❌ INTERDIT  
**Source :** Mémoire `reference_extraction_audit_client_vs_bureau.md`

**Raison :** Prime Evolution est le bureau d'études, pas le client bénéficiaire (voir R18).

---

#### A3. NE JAMAIS skip les hooks Git (--no-verify)
**Niveau :** ❌ INTERDIT  
**Source :** Best practices Git

**Raison :** Les hooks de pré-commit existent pour une raison (linting, tests, etc.).

---

#### A4. NE JAMAIS commit sans message clair
**Niveau :** ❌ INTERDIT  
**Source :** Best practices Git

**Format attendu :**
```bash
✅ git commit -m "feat: Add multi-site support with address matching"
✅ git commit -m "fix: Correct phantom site 3 bug in matchChantiers()"
✅ git commit -m "docs: Update CLAUDE.md with new validation rules"

❌ git commit -m "fix"
❌ git commit -m "wip"
❌ git commit -m "update"
```

**Convention :** [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` documentation
- `refactor:` refactorisation sans changement de comportement
- `test:` ajout de tests
- `chore:` tâches de maintenance

---

#### A5. NE JAMAIS push --force sur main
**Niveau :** ❌ INTERDIT (sauf demande explicite utilisateur)  
**Source :** Best practices Git

**Raison :** Risque de perte de commits en production.

---

## D. BUGS RÉSOLUS ET CAUSES RACINES

### D1. BUGS MAJEURS - ARCHITECTURE ET MATCHING

#### Bug #1 : "Chantier 3 fantôme" (8 mai 2026)
**Source :** [Transcript 5c6b218b, 2026-05-08T09:36-09:37]

**Description :**
Lors de l'affichage des résultats multi-chantiers, l'application affichait "Chantier 3" alors qu'il n'y avait que 2 chantiers dans le CEE.

**Exemple :**
```
CEE : 2 chantiers (adresse A, adresse B)
Affichage : "Chantier 3 : adresse A" ❌
```

**Cause racine :**
La fonction `matchChantiers()` créait un tableau avec TOUS les audits/synthèses trouvés (même sans attestation CEE correspondante). L'index du tableau était utilisé directement comme numéro de chantier.

**Exemple de cause :**
```javascript
// AVANT (bug)
const chantiers = [
  { audit: {...}, synthese: null, attestation: null },  // Index 0 - pas de CEE
  { audit: {...}, synthese: null, attestation: null },  // Index 1 - pas de CEE
  { audit: {...}, synthese: {...}, attestation: {...} }  // Index 2 - avec CEE
];

// Affichage : "Chantier 3" (index 2 + 1) ❌
```

**Solution appliquée :**
Ajout d'un compteur `chantierNumero` qui s'incrémente SEULEMENT quand une attestation CEE est trouvée pour le chantier.

```javascript
// APRÈS (fix)
let chantierNumero = 0;
chantiers.forEach((chantier) => {
  if (chantier.attestation) {
    chantierNumero++;
    // Afficher "Chantier " + chantierNumero
  }
});

// Résultat : "Chantier 1" ✅
```

**Fichiers modifiés :** `/index.html` - fonction `displayResults()`

**Commit :** `fix: Correct phantom site numbering in multi-site mode`

**Date de résolution :** 8 mai 2026, 09h37

---

#### Bug #2 : Matching par adresse échoue (déduplication incorrecte) (7 mai 2026)
**Source :** [Transcript 5c6b218b, 2026-05-07T14:15-14:21]

**Description :**
Le matching de chantiers par adresse échouait parfois, créant des chantiers séparés pour la même adresse.

**Exemple :**
```
Audit : "12 Rue de la Paix, 75001 Paris"
Synthèse : "12 rue de la paix 75001 Paris"
→ 2 chantiers séparés ❌ (devrait être 1 seul)
```

**Cause racine :**
La fonction de normalisation d'adresse était insuffisante :
- Casse non normalisée (Rue vs rue)
- Ponctuation non supprimée
- Espaces multiples non réduits

**Solution appliquée :**
Implémentation de `normalizeAddress()` agressive (voir R14) :
- Minuscules
- Suppression ponctuation
- Espaces multiples → 1 espace
- Abréviations normalisées (Rue → r, Avenue → av, etc.)
- Suppression mentions bâtiments (voir R15)

**Fichiers modifiés :** `/index.html` - fonction `normalizeAddress()`

**Commit :** `fix: Improve address normalization for better site matching`

**Date de résolution :** 7 mai 2026, 14h21

---

#### Bug #3 : Variables supprimées lors du refactoring (7 mai 2026)
**Source :** [Transcript 5c6b218b, 2026-05-07T20:44]

**Description :**
Erreurs JavaScript après le refactoring multi-chantiers :
```
Uncaught ReferenceError: surfacesAttestationGroupees is not defined
```

**Cause racine :**
Lors du refactoring, certaines variables ont été renommées mais des références à l'ancien nom sont restées dans le code.

**Exemple :**
```javascript
// Refactoring
const surfacesAttestationGroupees = {...};  // SUPPRIMÉ
const surfacesAttestation = {...};          // NOUVEAU NOM

// Mais ailleurs dans le code
if (surfacesAttestationGroupees) { ... }    // ❌ ERREUR
```

**Solution appliquée :**
- Recherche globale de toutes les occurrences de l'ancien nom
- Remplacement par le nouveau nom
- Vérification console pour s'assurer qu'aucune erreur

**Fichiers modifiés :** `/index.html`

**Commit :** `fix: Correct undefined variable after refactoring`

**Date de résolution :** 7 mai 2026, 20h44

---

### D2. BUGS - EXTRACTION ET VALIDATION

#### Bug #4 : Nom du modèle Claude incorrect (6 mai 2026)
**Source :** [Transcript 59038263, 2026-05-06T13:02]

**Description :**
Erreur API OpenRouter :
```
"anthropic/claude-haiku-3.5 is not a valid model ID"
```

**Cause racine :**
Nom de modèle incorrect. Le bon nom sur OpenRouter est `anthropic/claude-3.5-haiku`, pas `anthropic/claude-haiku-3.5`.

**Solution appliquée :**
Correction du nom du modèle dans `/api/analyze.js`.

```javascript
// AVANT (bug)
model: 'anthropic/claude-haiku-3.5'

// APRÈS (fix)
model: 'anthropic/claude-3.5-haiku'
```

**Leçon apprise :** Toujours vérifier les noms exacts de modèles sur https://openrouter.ai/models avant de déployer.

**Fichiers modifiés :** `/api/analyze.js`

**Commit :** `fix: Correct Claude model name for OpenRouter`

**Date de résolution :** 6 mai 2026, 13h02

---

#### Bug #5 : Haiku 3.5 rate des extractions (6 mai 2026)
**Source :** [Transcript 59038263, 2026-05-06T13:20]

**Description :**
Après le passage à Claude Haiku 3.5 (pour économiser), l'extraction PDF était incomplète :
- Champs manquants (SIRET, parcelles cadastrales)
- Valeurs "N/A" au lieu des vraies valeurs

**Cause racine :**
Claude Haiku 3.5 est trop faible pour les extractions CEE complexes (documents de 20-50 pages avec tableaux).

**Solution appliquée :**
Retour à Claude Sonnet 4 (le plus performant).

**Leçon apprise :** Ne pas sacrifier la qualité d'extraction pour économiser quelques centimes. Coût Sonnet 4 reste acceptable (~0.50-1€ par dossier).

**Fichiers modifiés :** `/api/analyze.js`

**Commit :** `fix: Switch back to Sonnet 4 for reliable extraction`

**Date de résolution :** 6 mai 2026, 13h31

---

### D3. BUGS - UI/UX

#### Bug #6 : Extraction du CEE ne fonctionne plus après refonte (7 mai 2026)
**Source :** [Transcript 5c6b218b, 2026-05-07T16:23]

**Description :**
Après la refonte d'architecture, le bouton "Analyser CEE" ne faisait plus rien.

**Cause racine :**
La logique d'analyse avait été temporairement désactivée pendant l'adaptation de l'architecture. Oubli de la remettre après les modifications.

**Solution appliquée :**
Remise en place de toute la logique de vérification des 40 checks.

**Fichiers modifiés :** `/index.html`

**Commit :** `fix: Restore analysis logic after architecture refactor`

**Date de résolution :** 7 mai 2026, 16h23

---

#### Bug #7 : Logs de détection n'apparaissent pas dans la console (7 mai 2026)
**Source :** [Transcript 5c6b218b, 2026-05-07T16:14]

**Description :**
Les `console.log()` de détection de chantiers n'apparaissaient pas dans la console navigateur.

**Cause racine :**
Conflit avec la nouvelle architecture : les logs étaient dans une fonction qui n'était jamais appelée.

**Solution appliquée :**
Réorganisation du code pour que la détection soit appelée au bon moment.

**Fichiers modifiés :** `/index.html`

**Commit :** `fix: Restore detection console logs`

**Date de résolution :** 7 mai 2026, 16h14

---

## E. TODOs / MODIFICATIONS PLANIFIÉES

### E1. FONCTIONNALITÉS MENTIONNÉES (statut incertain)

#### TODO #1 : Système de feedback intelligent pour apprendre des faux positifs
**Source :** [Transcript 5c6b218b, 2026-05-11T15:35-15:42]

**Description :**
Système d'apprentissage automatique pour détecter les patterns de faux positifs.

**Fonctionnalités envisagées :**
1. ✅ Bouton "Faux positif" à côté de chaque check (décidé)
2. ✅ Persistance multi-sessions via Google Sheets (décidé)
3. ⚠️ Détection automatique de patterns (en discussion)
4. ⚠️ Suggestions de règles d'exception (en discussion)

**Statut :**
- **Complété :** Bouton feedback + intégration Google Sheets
- **En discussion :** Apprentissage automatique des patterns

**Dernière mention :** 11 mai 2026, 15h42

**Fichiers concernés :**
- `/index.html` - Boutons feedback
- `/api/feedback.js` - Enregistrement Google Sheets

---

#### TODO #2 : Validation des surfaces par bâtiment pour secteurs "Entrepôt"
**Source :** [Transcript 5c6b218b, 2026-05-11T15:02]

**Description :**
Actuellement, la saisie manuelle des surfaces n'est active que pour les secteurs "NAF"/"Autres". Envisager de l'étendre à "Entrepôt" pour vérifier la cohérence.

**Statut :** **[À CONFIRMER]** - Mentionné mais pas décidé

**Dernière mention :** 11 mai 2026, 15h02

---

#### TODO #3 : Export PDF du rapport d'analyse
**Source :** [Transcript 5c6b218b, multiples mentions]

**Description :**
Fonctionnalité d'export du rapport d'analyse en PDF pour archivage ou envoi au client.

**Statut :** **[À CONFIRMER]** - Mentionné mais pas planifié

---

#### TODO #4 : Historique des analyses par dossier
**Source :** [Transcript 5c6b218b, mentionné en passant]

**Description :**
Garder un historique des analyses pour un même dossier CEE (versions successives).

**Statut :** **[À CONFIRMER]** - Idée évoquée mais pas détaillée

---

### E2. AMÉLIORATIONS TECHNIQUES ENVISAGÉES

#### TODO #5 : Tests automatisés
**Source :** Non explicitement mentionné, mais best practice

**Description :**
Ajouter des tests unitaires et d'intégration pour les fonctions critiques :
- `matchChantiers()`
- `normalizeAddress()`
- `compareStrings()`, `compareParcelles()`, `compareSiret()`
- Fonctions de validation des 40 checks

**Statut :** Non planifié

---

#### TODO #6 : Migration vers TypeScript
**Source :** Non mentionné

**Description :**
Pour améliorer la robustesse et éviter les bugs de variables non définies.

**Statut :** Non planifié

---

## F. PRÉFÉRENCES DE TRAVAIL DE L'UTILISATEUR

### F1. LANGUE ET COMMUNICATION

#### Préférence #1 : Toujours répondre en français
**Source :** CLAUDE.md personnel (`/Users/mac/.claude/CLAUDE.md`)

**Règle :** Toutes les réponses, explications, commentaires de code métier en français.

**Exception :** Variables et fonctions en anglais (standard de développement).

---

#### Préférence #2 : Parler comme à un débutant
**Source :** CLAUDE.md personnel

**Règle :** Expliquer les manipulations techniques (terminal, Git, etc.) de manière simple et guidée.

**Exemples :**
- "Ouvre un terminal et tape cette commande : `git status`"
- "Appuie sur Cmd+Shift+R pour faire un hard refresh"
- "Va dans le dossier `cee-verif` en tapant : `cd cee-verif`"

---

### F2. WORKFLOW ET VALIDATION

#### Préférence #3 : Diagnostic avant modification
**Source :** CLAUDE.md personnel + feedback

**Règle :** Toujours diagnostiquer, expliquer et **attendre validation** avant de toucher le code (voir P1).

---

#### Préférence #4 : Proposer des approches avant d'implémenter
**Source :** CLAUDE.md personnel

**Règle :** Pour les tâches non triviales, proposer 2-3 approches avec avantages/inconvénients **avant** de commencer (voir P5).

---

#### Préférence #5 : Signaler proactivement les risques
**Source :** CLAUDE.md personnel

**Règle :** Si un problème est identifié dans le code (bug potentiel, régression, mauvaise pratique), le signaler **immédiatement** à l'utilisateur.

**Exemple :**
```
⚠️ Attention : Cette modification peut casser la rétrocompatibilité avec les dossiers mono-chantier. 
Je recommande de tester avec un dossier ancien avant de déployer.
```

---

#### Préférence #6 : Ne jamais faire de refacto structurelle sans validation
**Source :** CLAUDE.md personnel

**Règle :** Changements d'architecture, suppression de code existant, ajout de dépendances → **TOUJOURS** demander validation avant.

**Exemple :**
```
❌ "Je vais refactoriser toute la logique de matching"
✅ "Je propose de refactoriser la logique de matching pour améliorer X. 
   Cela implique de modifier Y et Z. Tu valides ?"
```

---

### F3. STYLE DE RÉPONSE

#### Préférence #7 : Réponses concises, pas de sur-explication
**Source :** CLAUDE.md personnel

**Règle :** Aller droit au but. Pas de paragraphes inutiles.

**Anti-pattern :**
```
❌ "Alors, pour corriger ce bug, il faut comprendre que JavaScript est un langage 
   interprété qui... [10 lignes d'explication théorique]"

✅ "Le bug vient de X. Je corrige en faisant Y."
```

---

#### Préférence #8 : Proposer des idées quand pertinent
**Source :** CLAUDE.md personnel

**Règle :** Si une amélioration est évidente et pertinente, la suggérer clairement comme suggestion (pas comme obligation).

**Exemple :**
```
✅ "Correction appliquée. 

💡 Suggestion : On pourrait aussi ajouter une validation pour éviter ce type d'erreur à l'avenir. 
   Tu veux que je l'implémente ?"
```

---

### F4. GESTION DU CODE

#### Préférence #9 : Commit + push après chaque modification
**Source :** Feedback + mémoire (voir P2)

**Règle :** Ne JAMAIS oublier de commit + push après une modification (déploiement Vercel obligatoire).

---

#### Préférence #10 : Workflow Git sur branche develop
**Source :** Feedback + mémoire (voir P3)

**Règle :** Toujours travailler sur `develop`, `main` reste stable en production.

---

## G. STATISTIQUES ET MÉTRIQUES

### G1. VOLUME D'ACTIVITÉ

**Période :** 5-11 mai 2026 (7 jours)

**Messages analysés :** 6290
- Transcript 1 (59038263) : 1225 messages
- Transcript 2 (5c6b218b) : 5065 messages

**Décisions techniques majeures :** 20+
**Bugs résolus :** 7 majeurs documentés
**Commits :** ~50+ (estimation)

---

### G2. ÉVOLUTION DU PROJET

**5 mai :** Initialisation du projet
- Structure de fichiers
- Routes API serverless
- Choix OpenRouter

**6 mai :** Stabilisation du modèle IA
- Tests Haiku vs Sonnet
- Stabilisation sur Sonnet 4

**7 mai :** Refonte multi-chantiers (jour le plus actif)
- Architecture complète revue
- Matching par adresse
- Nouvelle UI progressive

**8 mai :** Corrections bugs post-refonte
- Bug "chantier 3 fantôme"
- Normalisation adresses

**9 mai :** Amélioration UX
- Regroupement sémantique des checks
- Architecture à 3 niveaux

**10 mai :** (données limitées)

**11 mai :** Fonctionnalités avancées
- Google Sheets feedback
- Saisie manuelle surfaces NAF
- Optimisations comparaisons

---

## H. FICHIERS CLÉS ET LEUR ÉVOLUTION

### H1. /index.html
**Taille :** ~3000+ lignes (estimation)

**Évolution :**
- 5 mai : Structure initiale HTML/CSS/JS
- 7 mai : Refonte complète logique multi-chantiers (~40 checks modifiés)
- 8 mai : Corrections bugs variables
- 9 mai : Ajout système de regroupement + UI à 3 niveaux
- 11 mai : Ajout UI saisie manuelle surfaces

**Fonctions principales :**
- `extractPDFText()` : Extraction texte avec pdf.js
- `matchChantiers()` : Matching audits/synthèses/attestations par adresse
- `normalizeAddress()` : Normalisation adresses pour matching
- `compareStrings()`, `compareAddresses()`, `compareParcelles()`, `compareSiret()` : Fonctions de comparaison
- `performChecks()` : Exécution des 40+ checks de validation
- `displayResults()` : Affichage hiérarchique des résultats

---

### H2. /api/analyze.js
**Évolution :**
- 5 mai : Création initiale avec Sonnet 4
- 6 mai : Tests Haiku → retour Sonnet 4
- 7 mai : Refonte prompt pour multi-chantiers
- 11 mai : Optimisations prompt

**Configuration finale :**
```javascript
model: 'anthropic/claude-sonnet-4'
max_tokens: 8000
temperature: 0.3
```

---

### H3. /api/feedback.js
**Évolution :**
- 11 mai : Création pour intégration Google Sheets

**Fonctionnalités :**
- Enregistrement feedback faux positifs
- Connexion Google Sheets API
- Service account authentication

---

### H4. Fichiers de mémoire
**Emplacement :** `/Users/mac/.claude/projects/-Users-mac/memory/`

**Fichiers créés :**
1. `reference_regles_validation_cee.md` (158 lignes) - 40 checks détaillés
2. `reference_adresses_batiments_cee.md` - Mentions bâtiments à ignorer
3. `reference_extraction_audit_client_vs_bureau.md` - Client vs bureau d'études
4. `reference_saisie_surfaces_manuelles.md` - Saisie manuelle NAF
5. `feedback_vercel_deployment.md` - Commit+push obligatoire
6. `feedback_diagnostic_avant_modification.md` - Diagnostic avant code
7. `feedback_workflow_git_develop.md` - Branche develop
8. `project_multi_chantiers_led.md` - Comparaison LED par chantier

---

## I. CONCLUSIONS ET RECOMMANDATIONS

### I1. FORCES DU PROJET

✅ **Architecture solide**
- Serverless Vercel = déploiement instantané
- Mono-fichier HTML = simplicité maximale
- Séparation claire frontend/backend

✅ **Robustesse de la validation**
- 40+ checks documentés
- Fonctions de comparaison spécialisées
- Support multi-chantiers complet

✅ **Bonne documentation**
- CLAUDE.md détaillé
- Fichiers mémoire structurés
- Commits clairs et traçables

---

### I2. POINTS D'ATTENTION

⚠️ **Complexité croissante de index.html**
- 3000+ lignes dans un seul fichier
- Risque de régression lors des modifications
- Recommandation : Envisager une modularisation (même sans framework)

⚠️ **Tests automatisés manquants**
- Validation manuelle uniquement
- Risque de régression non détectée
- Recommandation : Ajouter tests unitaires pour fonctions critiques

⚠️ **Dépendance à Claude Sonnet 4**
- Coût ~0.50-1€ par dossier
- Pas de fallback si API OpenRouter down
- Recommandation : Envisager un système de cache pour dossiers déjà analysés

---

### I3. PROCHAINES ÉTAPES RECOMMANDÉES

**Court terme (1-2 semaines) :**
1. ✅ Tests utilisateurs intensifs sur dossiers réels variés
2. ✅ Affiner les règles de validation selon feedback terrain
3. ✅ Optimiser le système de feedback Google Sheets

**Moyen terme (1-2 mois) :**
1. Ajouter tests automatisés pour fonctions critiques
2. Modulariser index.html (séparation en fichiers JS)
3. Implémenter système de cache pour analyses

**Long terme (3-6 mois) :**
1. Phase 2 du CDC : Base de données de dossiers
2. Phase 3 : Tableau de bord statistiques
3. Phase 4 : Automatisation complète avec envoi email

---

## J. GLOSSAIRE ET ACRONYMES

**CEE :** Certificats d'Économies d'Énergie  
**LED :** Light-Emitting Diode (diode électroluminescente)  
**BAT-EQ-127 :** Code de l'opération CEE pour éclairage LED  
**THD :** Taux de Distorsion Harmonique (3,7% requis)  
**SIRET :** Système d'Identification du Répertoire des ÉTablissements (14 chiffres)  
**NAF :** Nomenclature d'Activités Françaises (code INSEE)  
**Prime Evolution :** Bureau d'études OPQIBI réalisant les audits  
**Total Energies :** Délégataire CEE  
**OPQIBI :** Organisme de qualification de l'ingénierie  

---

**FIN DU RAPPORT**

**Date de génération :** 11 mai 2026  
**Auteur :** Analyse automatisée + manuelle des transcripts Claude Code  
**Fichiers sources :** 59038263-1388-4384-b0be-616ffcc10f6d.jsonl + 5c6b218b-4d73-46b1-8de4-f78188895c46.jsonl  
**Lignes du rapport :** ~1600 lignes
