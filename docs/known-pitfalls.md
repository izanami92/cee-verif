# PIÈGES CONNUS ET BUGS RÉSOLUS

**Document de référence** pour éviter les erreurs récurrentes et ne pas réintroduire des bugs déjà résolus.

**Dernière mise à jour** : 6 juillet 2026

---

## ⚠️ TOP 5 PIÈGES À NE JAMAIS REFAIRE

### PIÈGE #1 : Utiliser `compareStrings()` pour les parcelles cadastrales

**❌ Code fautif** :
```javascript
const ok = compareStrings("129/YD/0203", "129 / YD / 0203");  // false
```

**✅ Code correct** :
```javascript
const ok = compareParcelles("129/YD/0203", "129 / YD / 0203");  // true
```

**Pourquoi ?**
- Parcelles ont des espaces variables : `"129/YD/0203"` vs `"129 / YD / 0203"`
- Ordre n'a pas d'importance : `"129/YD/0203, 129/YD/0151"` = `"129/YD/0151, 129/YD/0203"`
- Séparateurs variables : virgules OU tirets

**Impact** : Faux positifs massifs (50%+ des dossiers signalés à tort)

**Règle** : TOUJOURS utiliser `compareParcelles()` pour les parcelles, `compareSecteurEtude()` pour les secteurs, `compareAddress()` pour les adresses.

**Sources** :
- [RESUME_EXECUTIF.md] - Anti-pattern A1
- [Mémoire `reference_regles_validation_cee.md`]

---

### PIÈGE #2 : Extraire le SIRET de Prime Evolution au lieu du client

**❌ Code fautif** :
```javascript
// Extraire "SIRET: 98765432109876" de "Prime Evolution"
siret = extractFromPrimeEvolution();  // ❌ FAUX
```

**✅ Code correct** :
```javascript
// Extraire "SIRET: 12345678901234" du CLIENT (en-tête document)
siret = extractFromClientHeader();  // ✅ VRAI
```

**Pourquoi ?**
- Prime Evolution = bureau d'études qui fait l'audit
- Client bénéficiaire = celui qui reçoit le CEE
- Le SIRET à vérifier est TOUJOURS celui du client

**Impact** : Check SIRET bloquant systématiquement en erreur

**Règle** : Instructions explicites dans le prompt API :
```
⚠️ ATTENTION - Ne pas confondre :
- CLIENT/BÉNÉFICIAIRE : c'est lui qu'on veut extraire
- PRIME EVOLUTION : bureau d'études (NE PAS extraire)
- TOTAL ENERGIES : délégataire CEE (NE PAS extraire)
```

**Sources** :
- [ADR 008] - Extraction CLIENT vs Prime Evolution (8 mai 2026)
- [Mémoire `reference_extraction_audit_client_vs_bureau.md`]
- [api/analyze.js lignes 275-291]

---

### PIÈGE #3 : Oublier commit + push après modification

**❌ Workflow fautif** :
```bash
# Modifier le code
vim index.html

# Tester en local
# → Ça marche !

# Dire à l'utilisateur "C'est fait !"
# → Mais pas de git push → Vercel ne déploie PAS
# → Utilisateur voit l'ancienne version en ligne ❌
```

**✅ Workflow correct** :
```bash
# Modifier le code
vim index.html

# Tester en local

# Commit + push IMMÉDIATEMENT
git add index.html
git commit -m "fix: correction bug X"
git push origin develop

# Attendre déploiement Vercel (~1-2min)

# Dire à l'utilisateur "C'est déployé !"
```

**Pourquoi ?**
- Vercel déploie automatiquement sur `git push`
- Pas de push = pas de déploiement
- Utilisateur teste toujours sur URL Vercel, JAMAIS en local

**Impact** : Frustration utilisateur ("tu dis que c'est fait mais je vois toujours le bug!")

**Règle** : Commit + push APRÈS CHAQUE modification, AVANT de dire "c'est fait".

**Sources** :
- [Mémoire `feedback_vercel_deployment.md`]
- [RESUME_EXECUTIF.md] - Pattern obligatoire P2

---

### PIÈGE #4 : Modifier le code sans diagnostiquer d'abord

**❌ Workflow fautif** :
```
User: "Il y a un bug dans l'adresse"
→ Modifier directement le code
→ Ça casse autre chose
→ Modifier à nouveau
→ 5 commits plus tard, toujours pas résolu
```

**✅ Workflow correct** :
```
User: "Il y a un bug dans l'adresse"
→ 1. DIAGNOSTIQUER : Lire le code, identifier la cause exacte
→ 2. EXPLIQUER : "Le problème vient de X ligne Y, car Z"
→ 3. PROPOSER : "Solution A (simple), Solution B (robuste)"
→ 4. ATTENDRE VALIDATION
→ 5. MODIFIER : Une seule fois, correctement
```

**Pourquoi ?**
- Modifier sans comprendre → bugs en cascade
- Utilisateur frustré par les multiples allers-retours
- Perte de temps énorme

**Impact** : Régression multiple, code instable

**Règle** : TOUJOURS diagnostiquer et expliquer AVANT de toucher au code.

**Sources** :
- [Mémoire `feedback_diagnostic_avant_modification.md`]
- [RESUME_EXECUTIF.md] - Pattern obligatoire P1

---

### PIÈGE #5 : Comparaison stricte `===` pour les surfaces

**❌ Code fautif** :
```javascript
const ok = (850 === 850.5);  // false → Faux positif !
```

**✅ Code correct** :
```javascript
const ok = Math.abs(850 - 850.5) < 1;  // true → Tolérance ±1 m²
```

**Pourquoi ?**
- Arrondis différents entre documents
- Audit calcule 850,3 m² → affiché "850 m²"
- CEE calcule 850,7 m² → affiché "851 m²"
- Différence réelle : 0,4 m² (négligeable)

**Impact** : Faux positifs sur 30-40% des dossiers

**Règle** : Toujours utiliser tolérance ±1 m² pour les surfaces : `Math.abs(surf1 - surf2) < 1`

**Sources** :
- [ADR 005] - Support NAF et surfaces manuelles
- [Mémoire `reference_saisie_surfaces_manuelles.md`]

---

## 🐛 HISTORIQUE DES BUGS RÉSOLUS

### Bug #1 : "Chantier 3 fantôme"

**Date** : 9 mai 2026
**Symptôme** : Détection de 3 chantiers au lieu de 2 dans un dossier

**Cause racine** :
```javascript
// ❌ Code fautif : Compteur global
let chantierCounter = 0;
audits.forEach(audit => {
  chantierCounter++;  // 1, 2, 3... (continue à incrémenter!)
  checks.push({ chantierIndex: chantierCounter });
});

// Si 2 audits + 1 synthèse sans audit → compteur = 3
```

**Solution** : Matching par INDEX d'apparition (pas par adresse normalisée)
```javascript
// ✅ Code correct : INDEX basé sur ordre d'apparition
function matchChantiers(audits, syntheses, attestations) {
  const nbChantiers = Math.max(audits.length, syntheses.length, attestations.length);

  const matched = [];
  for (let i = 0; i < nbChantiers; i++) {
    matched.push({
      chantierIndex: i,  // ✅ INDEX basé sur ordre
      audit: audits[i] || null,
      synthese: syntheses[i] || null,
      attestation: attestations[i] || null
    });
  }

  return matched;
}
```

**Leçon apprise** : Utiliser l'ordre d'apparition (INDEX) pour matcher, pas des compteurs manuels ou normalisation d'adresse.

**Sources** :
- [ADR 011] - Matching audits/synthèses par INDEX (9 mai 2026)
- [Commit 7ee508b] - "CORRECTIONS CRITIQUES : détection chantiers + couleurs boutons"
- [Commit 96e906a] - "Fix: Ajout propriété chantierIndex pour distribution correcte des checks"
- [Commit 1a4fb32] - "Fix: Matcher audits/synthèses par INDEX au lieu de par adresse"
- [RESUME_EXECUTIF.md] - Bug #1

---

### Bug #2 : Matching par adresse échoue (normalisation insuffisante)

**Date** : 7 mai 2026 (jour refonte multi-chantiers)
**Symptôme** : "541 RUE SAINT-JEAN" ≠ "541 Rue Saint-jean" → 2 chantiers détectés au lieu de 1

**Cause racine** : Comparaison sensible à la casse et aux accents

**Solution** : Normalisation agressive
```javascript
function normalizeAddress(addr) {
  return addr
    .toLowerCase()                    // SAINT-JEAN → saint-jean
    .normalize('NFD')                 // é → e
    .replace(/[̀-ͯ]/g, '') // Supprimer accents
    .replace(/\s+/g, ' ')            // Espaces multiples → simple
    .trim();
}
```

**Leçon apprise** : Normaliser TOUT (casse, accents, espaces) pour les comparaisons d'adresses.

**Sources** :
- [ADR 007] - Normalisation adresses - Ignorer mentions bâtiments (8 mai 2026)
- [Commit 1ee7664] - "Fix: Déduplication insensible à la casse pour adresses"
- [Commit 080f407] - "Fix: Ignorer mentions BAT/Bâtiment dans adresses de chantiers"

---

### Bug #3 : Adresses collées (concaténation au lieu de tableau)

**Date** : 7 mai 2026
**Symptôme** : `"adresse1 adresse2 adresse3"` au lieu de `["adresse1", "adresse2", "adresse3"]`

**Cause racine** : Prompt API ambigu
```javascript
// ❌ Code Claude généré :
adressesChantiers: "route de la raimbaudière 49380 10 la brosse 49750"

// ✅ Code attendu :
adressesChantiers: [
  "route de la raimbaudière 49380 bellevigne-en-layon",
  "10 la brosse de chanzeaux 49750 chemillé-en-anjou"
]
```

**Solution** : Instructions explicites dans le prompt
```
5. ADRESSES DE CHANTIERS (CEE) - RÈGLE CRITIQUE :
   - adressesChantiers est un TABLEAU avec une entrée séparée pour CHAQUE adresse
   - NE JAMAIS concaténer plusieurs adresses en une seule chaîne
   - CHAQUE attestation a UNE adresse → créer UNE entrée dans le tableau

   EXEMPLE CORRECT (2 attestations = 2 adresses) :
   ✅ "adressesChantiers": ["adresse1", "adresse2"]

   EXEMPLE INCORRECT :
   ❌ "adressesChantiers": ["adresse1 adresse2"]
```

**Leçon apprise** : Être ultra-explicite dans les prompts, donner des exemples positifs ET négatifs.

**Sources** :
- [Commit bf8ebe3] - "Fix adressesChantiers : empêcher mélange des adresses"
- [api/analyze.js lignes 187-209]

---

### Bug #4 : Variables utilisées avant déclaration

**Date** : Multiple (7-8 mai 2026)
**Symptôme** : `ReferenceError: Cannot access 'nbChantiers' before initialization`

**Cause racine** : Ordre des déclarations après refactorisation
```javascript
// ❌ Code fautif
const chantierSuffix = nbChantiers > 1 ? ` (chantier ${i+1})` : '';
// ...
const nbChantiers = audits.length;  // Déclaré APRÈS utilisation !
```

**Solution** :
```javascript
// ✅ Code correct
const nbChantiers = audits.length;  // Déclarer EN PREMIER
// ...
const chantierSuffix = nbChantiers > 1 ? ` (chantier ${i+1})` : '';
```

**Leçon apprise** : Déclarer les variables en haut de scope, surtout après refactorisation.

**Sources** :
- [Commit 9c21e61] - "Fix: Déplacer déclaration nbChantiers en haut de generateChecks"
- [Mémoire `feedback_diagnostic_avant_modification.md`] - Incident 1

---

### Bug #5 : Claude Haiku rate les extractions

**Date** : 6 mai 2026
**Symptôme** : Données manquantes ou incomplètes après extraction

**Cause racine** : Claude Haiku 3.5 moins performant que Sonnet 4 sur extraction structurée complexe

**Solution** : Retour à Claude Sonnet 4
```javascript
// Tentative d'optimisation coût → échec
model: 'anthropic/claude-haiku-3.5'  // ❌ Performances insuffisantes

// Retour configuration stable
model: 'anthropic/claude-sonnet-4'   // ✅ Précision excellente
```

**Leçon apprise** : Haiku = trop léger pour ce use case. Sonnet 4 obligatoire pour précision requise.

**Sources** :
- [ADR 002] - Alternative 1 (échec Haiku)
- [Commit b17bffd] - "Fix: Correction du nom du modèle Claude"
- [Commit f372087] - "Back to Claude Sonnet 4 (working model)"

---

### Bug #6 : Regex bâtiments trop restrictive

**Date** : 11 mai 2026
**Symptôme** : "batiments 1-2-3-4" non nettoyé des adresses (alors que "BAT 1" l'était)

**Cause racine** : Regex `\d+` matche UN chiffre, pas `1-2-3-4`
```javascript
// ❌ Code fautif
addr.replace(/\s*(bat|batiment)\s*\d+/gi, '');
// Matche : "BAT 1", "BAT 2" ✅
// Ne matche PAS : "batiments 1-2-3-4" ❌
```

**Solution** :
```javascript
// ✅ Code correct
addr.replace(/\s*(bat|batiment|batiments)\s*[\d\-]+/gi, '');
// Matche : "BAT 1", "batiments 1-2-3-4", "BAT 1-2" ✅
```

**Leçon apprise** : Tester les regex avec des cas réels complexes, pas juste les cas simples.

**Sources** :
- [ADR 007] - Normalisation adresses - Ignorer mentions bâtiments (8 mai 2026)
- [Commit 3673109] - "Fix: Support batiments multi-chiffres (1-2-3-4) dans nettoyage adresses"
- [Commit 97a7f97] - "fix: regex compareAddress pour supporter batiments avec tirets"

---

### Bug #7 : Checks 39-40 manquants (régression après merge)

**Date** : 11 mai 2026 (détecté)
**Symptôme** : Checks 39-40 documentés dans mémoire absents du code

**Cause racine** : Merge de branches où checks 39-40 = autres vérifications (reste à payer, adresse siège)

**Documentation attendue** :
- Check 39 : Cohérence nombre chantiers (audits.length = syntheses.length = attestations.length)
- Check 40 : Total LED global (somme chantiers = total CEE)

**Code actuel** :
- Check 39 : Reste à payer = 0€
- Check 40 : Adresse siège social (+ doublon ID check_40 pour date signature!)

**Solution** : En cours (Phase 2 corrections audit mémoire)

**Leçon apprise** : Vérifier la cohérence code/documentation après chaque merge de branches.

**Sources** :
- [Audit mémoire 11 mai 2026]
- [index.html lignes 4155-4194]

---

### Leçons #27 — découpage/appariement multi-bâtiments (LATRILLE, juillet 2026)

**Contexte** : un chantier = 1 adresse peut contenir plusieurs bâtiments (cellules), dont un de secteur « Autres ».
Corrections livrées sur `fix/27-decoupage-parcelle` (S0 + Blocs 1/2/3). Leçons à ne pas réapprendre :

1. **Les ≥4 normalisations d'adresse doivent bouger ENSEMBLE.** Un demi-fix (corriger le regroupement sans
   `compareAddress` + les blocs surface) **a causé une régression** (faux « adresse différente » à chaque chantier)
   → toujours unifier via le helper partagé (`retirerParcelle` / `normaliserAdresseSansBatiment`) **et tester
   `compareAddress` au harnais** (`test-batiments.mjs`, il est extractible et déterministe).

2. **Apparier au grain CHANTIER, pas au grain BÂTIMENT par index.** `attestations[auditIndex]` (grain bâtiment,
   6-7 entrées) désaligné des audits (grain adresse, 3) → comparait Grozeille à « Lauriol BAT 2 ». Toujours passer
   par le guichet `regrouperAttestationsParAdresse` + `compareAddress`, comme `check_09d`.

3. **`info` (« à vérifier ») n'est PAS un faux conforme.** Rétrograder un check de `majeur` → `info` quand la
   comparaison est légitimement ambiguë (secteur mixte, bâtiment « Autres » sans attestation) **respecte** le
   principe n°1 : l'anomalie **surgit** en jaune, elle ne passe pas « vert » en silence. Ne pas confondre.

4. **Détecter un secteur « Autres » par TYPE MÉTIER, pas par libellés bruts.** `[...new Set(libellés)].length > 1`
   déclenche à tort sur deux entrepôts de libellés différents. Utiliser `detectAutresSecteurs` (logique
   `mapSecteurActivite`, la même que la Règle A).

5. **`compareAddress` doit rejeter les adresses vides/nulles.** `compareAddress('', '')` retournait `true` → faux
   match silencieux possible. Garde `if (!addr1 || !addr2) return false` en tête (verrouillée au harnais).

6. **Une vérif adversariale s'ARBITRE, elle ne se recopie pas.** Sur 14 findings « confirmés » par des relecteurs,
   4 étaient réels (retenus), 10 étaient des faux positifs (relecteurs ignorant les validations métier, ex.
   « `info` = faux conforme »). Toujours croiser chaque finding avec la règle métier et la preuve terrain.

---

### Leçons 4b — validation LED DELEFORTRIE (juillet 2026)

**Contexte** : validation de la substitution `ledTotal chantier = Σ ledCellule` (étape 4b volet 1/2, ADR-015)
sur le dossier réel DELEFORTRIE. Aucun code modifié — mais quatre leçons de diagnostic à ne pas réapprendre :

1. **Vérifier la cardinalité d'extraction AVANT de diagnostiquer un « bug » multi-chantiers.** Un import
   incomplet (2 audits / 1 synthèse) fait zipper par index des documents de chantiers différents
   (`matchChantiers`) → 09b/09c/09d_synthese/12/44a décrochent en cascade et **miment un bug LED**.
   Réflexe : lire « Audits extraits: N / Synthèses extraites: N » dans la console F12 en premier.

2. **Ne jamais conclure qu'un check est vert (ou rouge) par inférence.** Les logs console ne montrent que la
   GÉNÉRATION des checks, jamais leurs niveaux ; seuls l'écran (attendu/trouvé) ou un banc d'essai
   déterministe font foi. (Erreur commise puis corrigée le 06/07 : 09x déclarés verts par inférence.)

3. **Cinq checks affichent « Attendu 66 / Trouvé 52 » sans être check_09d.** check_19/21 (tableaux synthèse)
   et check_28/29/30 (états initial/projeté + liste luminaires audit) comparent des valeurs PAR CHANTIER au
   **total du dossier** — mauvais grain de référence hérité du mono-chantier, libellés trompeurs. Ne pas les
   confondre avec 09d (qui compare au LED du chantier reconstruit). Dette tracée TODO #22.

4. **La substitution 4b échoue en silence si les `cellules[]` ne sont pas extraites** (LLM non déterministe) :
   le `ledTotal` brut agrégé l'emporte sans signal. Le majeur 09d qui en résulte reste visible (pas un faux
   conforme), mais rien n'indique que la reconstruction n'a pas eu lieu — candidat « volet 2/2 » (TODO #22).

---

### Leçons Audit phase A (06-07/07/2026)

**Contexte** : audit complet lecture seule de tout le code (6 axes, 76 agents multi-agents, 0 finding réfuté)
préalable à la modularisation (TODO #3). Findings priorisés dans `pending-todos.md` §TODO #3.

> **État au 08/07/2026** : **LOT 1** (auth) & **LOT 2** (comparateurs vides, LED 0=0, bannière) **mergés sur `main`** (`c197376`, `41a8f48`). **LOT 3** (M4 filet `check_09d_miss`, M5 `Promise.allSettled`, M1 `escapeHtml` anti-XSS) et **LOT 4** (erreurs non renvoyées au client, timeout `AbortController`, SRI pdf.js + en-têtes) **LIVRÉS + validés preview** sur `fix/m4-led-miss-signal` (non mergée). Pièges à **ne pas réintroduire** pendant la modularisation (phase B) : (a) ne pas ré-ouvrir un faux conforme en déplaçant `compareStrings`/`ledConforme`/le calcul de bannière ; (b) **`escapeHtml` doit rester à l'AFFICHAGE** (jamais échapper au stockage — les valeurs brutes servent aux comparaisons ; ne pas oublier de ré-appliquer `escapeHtml` aux sinks `innerHTML` déplacés) ; (c) garder `Promise.allSettled` + le tri critique/secondaire à l'extraction ; (d) le filet `check_09d_miss` doit rester routé famille 5 + provenance Méthode 0. Reste ouvert : point 5 (`generateChecks` monstre = objet de la phase B).

Leçons durables (pièges à ne pas réintroduire / faits établis) :

1. **Les 5 routes API n'ont AUCUNE authentification** (`grep APP_PASSWORD|password|401 api/` = 0). Retrait
   volontaire (commit `5a26ff0`, 06/05/2026) mais **jamais arbitré**, et CLAUDE.md « sécurité non négociable »,
   README.md:123, DoD « Login 401 », `.env.example` (`APP_PASSWORD` fantôme) affirment tous le contraire →
   **fausse assurance de sécurité documentaire**. Décision (06/07) : réimplémenter l'auth ; comprendre POURQUOI
   l'ancienne échouait avant de recoder (ne pas remettre l'ancien code tel quel).

2. **`compareStrings/compareSIRET/compareDate/compareParcelles/compareSecteurEtude` renvoient `true` quand les
   DEUX côtés sont vides** (`''===''`). Le durcissement #27 (`dd65b9d`) a corrigé **UNIQUEMENT `compareAddress`** ;
   les 5 autres comparateurs portent le même faux conforme (dont `check_01` bloquant). Même classe que la Leçon #27
   point 5 — le patron sûr existe déjà (`pushContactCheck` → `info` si vide). ⚠️ Un fix « ajouter la garde `!a||!b`
   partout » doit vérifier au cas par cas l'atteignabilité (quand le CEE est vide, `check_cee_incomplet` couvre
   certains cas) pour ne pas transformer des verts en rouges à tort.

3. **Faux conforme LED « 0 = 0 »** : `parseFloat(...)||0` des deux côtés (`check_09a/b/c`, `4265-4307`) → `|0-0|<0.1`
   passe **vert** quand rien n'est extrait. Court-circuite R05 (tolérance zéro). Même principe que le point 2 (fallback
   silencieux vers 0, interdit par le principe n°5).

4. **La bannière page de garde (le SEUL signal bloquant) est calculée sur `checks.slice(0,3)`** (`3045-3046`) :
   ne couvre QUE le chantier 1 (multi-chantiers : bloquant chantier 2+ ignoré) et devient **verte sans aucune vérif
   page de garde si 0 audit extrait**. Confirmé **critique** (faux conforme sur `page_garde_ok`). Ne pas confondre
   « alerte non bloquante » (voulu, §1) avec ce trou.

5. **`generateChecks` = 1390 lignes (`4100-5489`), 20 autres fonctions > 50 l., 2 handlers inline géants**
   (`btnAnalyze` 565 l., `btnExtractFromCEE` 253 l.). C'est le terrain de la phase B. Rappel du précédent d'échec :
   **ne JAMAIS scinder `generateChecks` pendant une extraction de module** (le big-bang ES6 des 26-27 mai l'a tronquée) —
   l'extraire entière d'abord, la scinder dans un chantier séparé. Invariant ADR-014 (3 surfaces d'id de check) à
   respecter à chaque module.

6. **Une vérif adversariale multi-agents s'ARBITRE (rappel Leçon #27 point 6, re-confirmé)** : sur ~49 findings, la
   plupart des « critiques » des finders ont été **requalifiés majeur/mineur** à l'arbitrage (XSS d'un outil interne,
   dettes déjà tracées avec décision). Aucun réfuté, mais la gravité brute d'un finder n'est jamais le mot final.

---

## ⚠️ APPROCHES ABANDONNÉES

### Approche abandonnée #1 : Fichier JSON local pour feedback

**Tentative** : Stocker les feedbacks faux positifs dans `feedback.json` versionné avec Git

**Problème** :
- Vercel Serverless = stateless (pas de filesystem persistant)
- Écriture de fichier impossible côté serveur

**Alternative retenue** : Google Sheets API

**Sources** :
- [ADR 004] - Alternative 2 rejetée

---

### Approche abandonnée #2 : Analyses séparées par chantier

**Tentative** : Importer 3 fois les mêmes fichiers pour analyser 3 chantiers séparément

**Problème** :
- UX dégradée (utilisateur doit tout importer 3×)
- Pas de vérification du total global
- Pas de détection automatique du nombre de chantiers

**Alternative retenue** : Architecture multi-chantiers avec détection automatique

**Sources** :
- [ADR 003] - Alternative 2 rejetée

---

### Approche abandonnée #3 : GPT-4 ou Llama au lieu de Claude

**Tentative** : Tester d'autres modèles pour réduire coûts

**Problème** :
- GPT-4 : Moins bon sur documents français
- GPT-3.5 : Pas assez performant
- Llama : Infrastructure nécessaire (GPU)

**Alternative retenue** : Claude Sonnet 4 (meilleur rapport qualité/prix/simplicité)

**Sources** :
- [ADR 002] - Alternatives 2-3-4 rejetées

---

## 📋 CHECKLIST ANTI-RÉGRESSION

Avant de valider une modification, vérifier :

- [ ] Les 5 fonctions de comparaison spécialisées sont-elles correctement utilisées ?
  - `compareParcelles()` pour parcelles
  - `compareSecteurEtude()` pour secteurs
  - `compareAddress()` pour adresses
  - `compareNumber()` / `compareTHD()` pour nombres
  - `compareSurfaces()` avec tolérance ±1 m²

- [ ] Extraction SIRET : du CLIENT, pas de Prime Evolution ?

- [ ] Commit + push fait AVANT de dire "c'est terminé" ?

- [ ] Diagnostic effectué AVANT modification du code ?

- [ ] Console JavaScript (F12) sans erreurs rouges ?

- [ ] Tests avec dossiers réels (mono ET multi-chantiers) ?

- [ ] Documentation mise à jour (CLAUDE.md, mémoires, ADR) ?

- [ ] Aucun `--no-verify` ou `--force` dans les commandes git ?

- [ ] Variables déclarées en haut de scope ?

- [ ] Regex testées avec cas complexes réels ?

- [ ] Checks 39-40 conformes à la documentation ?

---

## 🔍 COMMENT RECHERCHER DANS L'HISTORIQUE

### Trouver quand un bug a été introduit
```bash
# Chercher dans l'historique Git
git log --all --grep="bug X" --oneline

# Voir les modifications d'un fichier
git log --all --oneline -- api/analyze.js

# Comparer deux versions
git diff commit1 commit2 -- index.html
```

### Trouver dans les transcripts
```bash
# Chercher un mot-clé dans les transcripts
grep -i "keyword" /Users/mac/.claude/projects/-Users-mac/*.jsonl

# Voir le contexte (5 lignes avant/après)
grep -C 5 "keyword" /Users/mac/.claude/projects/-Users-mac/*.jsonl
```

---

## SOURCES

### ADRs (Architecture Decision Records)
- [ADR 002] - Claude Sonnet 4 (échec Haiku) → Bug #5
- [ADR 003] - Refonte multi-chantiers (7 mai) → Bug #2, #3, #4
- [ADR 007] - Normalisation adresses (8 mai) → Piège #4, Bug #2, #6
- [ADR 008] - Extraction CLIENT vs bureau (8 mai) → Piège #2
- [ADR 011] - Matching INDEX (9 mai) → Bug #1

### Documentation
- [RESUME_EXECUTIF.md] - Section "Bugs majeurs résolus"
- [CLAUDE.md] - Pièges connus section
- [docs/business-rules.md] - Règles métier détaillées

### Mémoires auto
- `feedback_vercel_deployment.md` → Piège #3
- `feedback_diagnostic_avant_modification.md` → Piège #4
- `reference_adresses_batiments_cee.md` → Bug #2, #6

### Autres
- [Transcripts] - 59038263... (5-7 mai) et 5c6b218b... (7-11 mai)
- [Commits Git] - Historique complet des corrections

---

**Dernière révision** : 6 juillet 2026 (leçons 4b DELEFORTRIE)
**Prochaine révision** : À chaque bug majeur résolu
