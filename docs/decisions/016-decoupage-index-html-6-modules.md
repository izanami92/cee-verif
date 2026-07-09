# ADR 016 — Découpage d'index.html en 6 modules de scripts classiques (phase B, TODO #3)

**Date** : 08/07/2026
**Statut** : ✅ Accepté (08/07/2026) — extraction M1→M5 réalisée et validée preview (09/07/2026) ; étapes 6/7 différées à la cible B (voir §Réalisation)
**TODO lié** : #3 (audit complet + modularisation) — phase B
**Principe directeur** : jamais de faux conforme silencieux ; extraction PURE (fonctions byte-identiques), app fonctionnelle à chaque commit

---

## Contexte

`index.html` fait **8204 lignes**, avec un unique `<script>` (lignes 1476-8190, ~100 fonctions
top-level). Le finding M8 de l'audit phase A (06-07/07/2026) a établi : `generateChecks` = ~1400 lignes
(4280-5683), 20 autres fonctions > 50 lignes, 2 handlers inline géants (`btnAnalyze` ~565 l.,
`btnExtractFromCEE` ~253 l.). **Précédent d'échec** : la tentative de modularisation ES6 des 26-27 mai
a tronqué `generateChecks` (big-bang écarté par l'ADR-015).

Un diagnostic lecture seule (08/07/2026, cartographie multi-agents 11 zones + 3 lentilles de
vérification adversariale, chaque point re-vérifié sur le code réel) a établi le **socle technique**
qui rend une extraction pure possible :

- Le script principal est un script **classique non-strict** (pas de `'use strict'`, l.1476-1478).
  Une déclaration `function` top-level y est **déjà** une globale `window.*` → la déplacer
  byte-identique dans un fichier `<script src>` classique chargé avant le script principal ne change
  rien à son exposition. C'est le patron **déjà en prod** avec `familles-config.js` (chargé l.1474).
- `const state` (l.1519) et `const elements` (l.1544) sont des bindings lexicaux globaux **partagés
  entre scripts classiques et résolus au call-time** : une fonction déplacée dans un module chargé
  avant peut les lire sans erreur, car elle n'est appelée qu'après le chargement complet de la page.
- Les zones à extraire ne contiennent **aucune instruction top-level exécutable** (vérifié
  exhaustivement) hormis deux littéraux purs (`const FICHES_TECHNIQUES` l.1497, `const GROUPES_CONFIG`
  l.4075) — aucun risque TDZ/ordre de chargement.
- Les 29 `onclick` sont tous générés dans des template literals JS (0 dans le HTML statique) ; les
  fonctions qu'ils référencent (`removeFile`, `removeChantierFile`, `resetApplication`…) restent
  globales tant qu'on reste en scripts classiques.
- `vercel.json` applique les 4 en-têtes de sécurité à `/(.*)`→ les nouveaux `.js` sont couverts sans
  changement de config ; pas de SRI nécessaire (fichiers same-origin).
- `test-batiments.mjs` lit `./index.html` en dur (l.14-15) et extrait 6 fonctions par signature avec
  `throw` si introuvable → il **casse au commit 1** si non re-routé dans le même commit.

## Décision

### 1. Technique : scripts classiques, extraction byte-identique (« approche A »)

Chaque module est un fichier `.js` à la racine, chargé par `<script src>` **entre**
`familles-config.js` (l.1474) et le script principal inline. Les fonctions y sont déplacées
**byte-identiques** (indentation comprise). Aucun wrapper, aucun `window.x =`, aucune réécriture.

**Cible B gravée (décision IZANAMI 08/07/2026)** : la conversion en **modules ES6** est l'étape
suivante souhaitée, en chantier dédié APRÈS la phase B, **module par module** sur des fichiers déjà
séparés et prouvés (jamais en même temps que le déplacement — leçon des 26-27 mai). Les frontières
des 6 modules ci-dessous sont conçues pour correspondre 1-pour-1 aux futurs modules ES6.
**Objectif produit noté** : la personnalisation de l'outil par client/produit CEE (revente à d'autres
sociétés) passera par un chantier ultérieur « règles métier en configuration » (généralisation du
patron `familles-config.js`), indépendant du choix A/B.

### 2. Inventaire des 6 modules (frontières vérifiées contre le code)

**M1 — `utils-comparaison.js`** (21 fonctions pures, ~lignes 3338-4023) :
`normalize`, `parseSurfacesFromSynthese`, `compareParcelles`, `compareSecteurEtude`, `compareNumber`,
`compareStrings`, `comparePhone`, `compareDate`, `compareMoney`, `compareProductRef`,
`isValidDateFormat`, `extraireNombreBatiments`, `retirerParcelle`, `normaliserAdresseSansBatiment`,
`sommerCellulesParAdresse`, `compareAddress`, `decomposeAddress`, `compareSIRET`, `sumSurfaces`,
`sumLED`, `ledConforme`.
- `sommerCellulesParAdresse` rejoint M1 (décision IZANAMI) : le harnais l'extrait avec les 5 autres →
  `test-batiments.mjs` lit UN fichier et n'est retouché qu'UNE fois, **dans le même commit**.
- `escapeHtml` (l.1487) **ne bouge pas** (décision IZANAMI) : couche affichage, ses 24 sinks restent
  tous dans index.html.

**M2 — `regroupement.js`** (5 fonctions) :
`regrouperAttestationsParAdresse` (l.3720), `normalizeExtracted` (l.3926), `matchChantiers` (l.3984),
`getFirstAudit` (l.4025), `getFirstSynthese` (l.4029).
- `detectAdressesLocally` n'y entre PAS : code mort (unique appelante `autoDetectChantiers`, elle-même
  jamais appelée — vérifié par grep) ; le code mort reste en place (décision IZANAMI, sort réglé au #35).

**M3 — `detecteurs-alertes.js`** (9 fonctions) :
`checkMentionsAgricoles` (l.4034), `detectFautifsDimensionnement` (l.4144),
`detectFautifsAttestationNonAgricole` (l.4165), `parseDateFr` (l.4183 — cohésion : unique appelante
`verifierDelaisTravaux`, 4 appels l.4198-4201, bloc contigu), `verifierDelaisTravaux` (l.4197),
`detectAutresSecteurs` (l.4225), `detectResteAPayer` (l.4254), `detectProfessionnelMiseEnOeuvre`
(l.4269), `computeAvertissementsCEE` (l.7035 — vérifiée pure, n'appelle que les détecteurs ; son
consommateur `renderLigneAvertissementsCEE` reste dans index.html, sens sain rendu→détecteurs).

**M4 — `io.js`** (4 fonctions) :
`apiFetch` (l.1640), `compareWithGoogleSheet` (l.1768), `extractTextFromPDF` (l.2029),
`ensureCodeNafFromSiret` (l.2652). **Point d'insertion unique pour l'auth (K1) conservé.**
- `searchSiret` **reste dans index.html** : elle appelle `displaySearchResults` (rendu innerHTML) et
  son debounce (`searchTimeout` l.1827) est une closure du handler — la déplacer créerait un cycle
  io→rendu.
- La config `pdfjsLib.GlobalWorkerOptions.workerSrc` (l.1478) **reste dans index.html** (invariant 1 :
  zéro instruction exécutée au chargement dans les modules).

**M5 — `moteur-checks.js`** :
`generateChecks` **ENTIÈRE** (l.4280-5683 — ses 4 fonctions imbriquées `pushContactCheck`,
`nbCoChantiersS2`, `collisionAdresseS2`, `pushApparInfoS2` sont des closures sur des locales,
inextractibles : la règle « jamais scinder pendant l'extraction » est nécessaire ET suffisante),
`buildMessageAuditeur` (l.5686-5715, pure), **+ `const FICHES_TECHNIQUES`** (l.1497-1516 — unique
consommatrice : `generateChecks` l.5154, vérifié par grep ; l'embarquer rend le moteur autonome).
- `GROUPES_CONFIG` + `getGroupeForCheck` restent dans index.html : consommés UNIQUEMENT par le rendu
  accordéon legacy (`groupChecksByCategory`, l.6361-6371) — rien à voir avec le moteur.
- `recalculateSurfaceChecks`, `validateAndRecalculate`, `displayManualSurfaceInputs`,
  `refreshDisplayAfterRecalculation` restent dans index.html : sous-système UI « saisie manuelle »
  (DOM + `alert()` + écritures `state.analysisResult.checks` et `currentChecks`).

**M6 — le reste, dans index.html** : rendu complet, handlers géants, bloc SIRET, upload,
`confirmModal`, `state`/`elements`, IIFE `restoreSession` (l.1710), code mort en l'état,
**`getCheckProvenance` (l.7351) et `etatCellule` (l.6601) intactes et immobiles** (invariant ADR-014 ;
`resolveFamille` vit dans `familles-config.js`, non touché — vérifié : tous leurs appelants restent
dans index.html).

### 3. Invariants d'implémentation

1. **Modules = déclarations `function` + const littéraux purs uniquement.** Aucun effet de bord ni
   appel exécuté au chargement (au chargement des modules, `state`/`elements` n'existent pas encore).
2. **Globales intouchables d'index.html** (cibles d'appels remontants au call-time depuis M4) :
   `state`, `elements`, `showLogin`, `showLoginError` (`apiFetch` les appelle sur 401, l.1664-1665).
   Jamais renommées, jamais encapsulées.
3. **Contrats d'état inter-modules documentés** : `window.selectedCodeNaf` + clé localStorage
   `ceeVerifCodeNaf` (M4 `ensureCodeNafFromSiret` ↔ index.html `displaySearchResults` l.1881 /
   handler `btnAnalyze` l.2737, 3116 / `renderLigneAvertissementsCEE` — gate NAF évolution 1.3) ;
   `state` lu par `apiFetch`/`compareWithGoogleSheet`.
4. **Sens des dépendances** : M5→M3→M2→M1 (descendant, chargé avant) ; M4→index.html (cycle
   structurel accepté et documenté au point 2). Ordre des balises : pdf.js (head) → familles-config.js
   → M1 → M2 → M3 → M4 → M5 → script principal.
5. **Invariant ADR-014 réaffirmé** : `getCheckProvenance` / `etatCellule` / `resolveFamille` jamais
   modifiées ni déplacées ; **aucun id de check créé/renommé** par la modularisation ;
   `familles-config.js` et son harnais non touchés.
6. **Pièges phase A non réintroduits** (known-pitfalls §Leçons Audit phase A) : `escapeHtml` reste à
   l'affichage (ses 24 sinks restent dans index.html, aucun ré-échappement nécessaire — vérifié) ;
   `Promise.allSettled` + tri critique/secondaire intacts (handler `btnAnalyze`, non déplacé) ; filet
   `check_09d_miss` part ENTIER dans `generateChecks` (M5), routage famille 5 + provenance Méthode 0
   inchangés ; `compareStrings`/`ledConforme`/bannière page de garde déplacés byte-identiques (prouvé
   au banc, jamais réécrits).
7. **`api/analyze.js` jamais touché** pendant la phase B.
8. **CSP stricte** : APRÈS le retrait des 29 `onclick` générés — sujet dédié de fin de phase B, hors
   des commits d'extraction.

### 4. Plan d'implémentation (ordre verrouillé — 1 module = 1 commit)

Branche unique `feat/phase-b-modularisation` depuis `main`, commits empilés. Le merge sur `main`
reste un geste d'IZANAMI.

| # | Commit | Contenu | Particularité |
|---|--------|---------|---------------|
| 1 | M1 `utils-comparaison.js` | 21 fonctions + balise `<script src>` + **re-routage `test-batiments.mjs`** (chemin `./index.html` → `./utils-comparaison.js`, commentaires adaptés) | le harnais bouge dans le MÊME commit |
| 2 | M2 `regroupement.js` | 5 fonctions + balise | — |
| 3 | M3 `detecteurs-alertes.js` | 9 fonctions + balise | `computeAvertissementsCEE` vient de la zone rendu (l.7035) |
| 4 | M4 `io.js` | 4 fonctions + balise | point d'insertion auth K1 ; `searchSiret` et `workerSrc` ne bougent PAS |
| 5 | M5 `moteur-checks.js` | `generateChecks` ENTIÈRE + `buildMessageAuditeur` + `FICHES_TECHNIQUES` + balise | le plus gros déplacement (~1450 l.) ; jamais scindé |
| 6 | Encapsulation des 4 globales d'affichage (`currentChecks`, `currentExtractedData`, `activeFilter`, `activeView`) dans index.html | ⚠️ PAS byte-identique → **diagnostic dédié + validation avant code** | vérifié : aucune fonction M1-M5 ne les touche → encapsulation compatible |
| 7 (option) | Amincissement du handler `btnAnalyze` (orchestrateur mince) | ⚠️ refactor interne à index.html → **diagnostic dédié + validation avant code** | hors extraction pure ; peut être différé |

**Preuves exigées à CHAQUE commit (1 à 5)** :
1. **Banc d'identité byte-à-byte** (node jetable) : chaque fonction déplacée est extraite du nouveau
   fichier ET de `git show HEAD:index.html` (état avant commit), comparaison stricte des deux textes.
2. `node test-familles.mjs` (71/71) + `node test-batiments.mjs` (36/36).
3. Diff montré verbatim + STOP avant commit (validation IZANAMI).
4. Push branche → **vérifier que Vercel a déployé** (auto-deploy à la traîne le 08/07 : sinon
   `vercel deploy` manuel) → test preview par IZANAMI sur les 4 anchors : COPPIN, DES LAURIERS,
   LATRILLE, DELEFORTRIE.
5. Console F12 sans erreur rouge.

## Alternatives écartées

- **Modules ES6 directement (« B direct »)** : écarté — réécriture + déplacement simultanés = le
  scénario exact de l'échec des 26-27 mai (`generateChecks` tronquée) ; scope isolé → chaque
  exposition et chaque appel à réécrire (plus byte-identique) ; mode strict implicite sur un code
  non-strict. **B reste la cible**, atteinte APRÈS la phase A→B décrite en Décision §1.
- **Namespaces/IIFE (`window.CEE_UTILS = {...}`)** : écarté — réécriture de toutes les signatures et
  de tous les sites d'appel, risque maximal, aucun gain.
- **Big-bang en un commit** : écarté (précédent d'échec, ADR-015 §Alternatives).
- **Déplacer/supprimer le code mort pendant l'extraction** : écarté (décision IZANAMI) — on ne mélange
  pas « déplacer » et « supprimer » ; `autoDetectChantiers`+`detectAdressesLocally` et
  `groupSimilarErrors`+`createErrorGroupCard` (sink innerHTML non échappé, latent tant que jamais
  appelé — à traiter à la suppression #35) restent en place.
- **`searchSiret` en M4, `validateAndRecalculate`/`recalculateSurfaceChecks` en M5,
  `GROUPES_CONFIG` en M5** : écartés par la vérification des frontières (cycles io↔rendu et
  moteur↔UI, config de rendu sans lien avec le moteur).

## Conséquences

**Positives** : index.html passe de ~8204 à ~6100 lignes ; moteur (`generateChecks`) et utilitaires
testables hors navigateur sur leurs propres fichiers ; frontières 1-pour-1 avec les futurs modules
ES6 (cible B) ; point d'insertion auth unique (io.js) ; chaque étape réversible (`git revert` d'un
commit = retour arrière propre) ; prérequis posé pour le chantier « règles métier en configuration »
(objectif produit multi-clients).

**Négatives / vigilance** : les frontières ne sont pas imposées par le langage (discipline
documentaire jusqu'à la conversion B) ; cycle M4→index.html (`apiFetch`→`showLogin`) assumé jusqu'à B
(callback injectable à ce moment-là) ; 6-7 previews à tester par IZANAMI ; le banc d'identité ne
couvre pas les balises `<script>` ajoutées (relecture manuelle du diff index.html à chaque commit).

## Réalisation (08-09/07/2026)

Extraction réalisée sur `feat/phase-b-modularisation`, validée en preview à chaque commit
(anchors COPPIN / DES LAURIERS / LATRILLE / DELEFORTRIE, console F12 propre) :

| Commit | Module | Contenu | Preuve |
|--------|--------|---------|--------|
| `bdbff3a` | M1 `utils-comparaison.js` (532 l.) | 21 fonctions + re-routage `test-batiments.mjs` même commit | banc 21/21 |
| `bb24f75` | M2 `regroupement.js` (188 l.) | 5 fonctions | banc 5/5 |
| `449246c` | M3 `detecteurs-alertes.js` (245 l.) | 9 fonctions (3 blocs, `computeAvertissementsCEE` incluse) | banc 9/9 |
| `2f99ccb` | M4 `io.js` (163 l.) | 4 fonctions async ; `workerSrc` + `searchSiret` restés (gardes au banc) | banc 4/4 |
| `73b5566` | M5 `moteur-checks.js` (1472 l.) | `generateChecks` ENTIÈRE + `buildMessageAuditeur` + `FICHES_TECHNIQUES` | rejeu intégral |

`index.html` : **8204 → 5669 lignes**. Harnais 36/36 + 71/71 verts à chaque commit. Auto-deploy Vercel
re-fonctionnel sur toute la série.

**Décisions de clôture (IZANAMI, 09/07/2026)** :
- **Étape 6 (encapsulation des 4 globales d'affichage) : DIFFÉRÉE à la conversion ES6 (cible B).**
  Un `let` top-level devient automatiquement privé au module ES6 — l'encapsulation manuelle (~30 sites
  réécrits dans 13 fonctions, hors preuve byte-identique) n'apporte pas assez pour son risque.
- **Étape 7 (orchestrateur mince `btnAnalyze`) : DIFFÉRÉE** — sujet dédié futur (probablement avec la cible B).
- CSP stricte : inchangée (après retrait des `onclick` générés, sujet dédié).

**Leçons de banc (réutilisables — détail dans known-pitfalls §Leçons phase B)** : preuve d'extraction
pure = **rejeu de la transformation** (fichiers entiers byte-identiques), pas diff ligne-à-ligne
(ambigu aux bords de blocs) ; toujours vérifier l'absence de **copie résiduelle** dans index.html
(elle écraserait le module, chargé avant) ; extracteur d'accolades : apparier d'abord les parenthèses
de la signature (piège `options = {}`) et inclure le préfixe `async`.

## Sources

- Audit phase A (06-07/07/2026) — finding M8, `pending-todos.md` §TODO #3
- Diagnostic lecture seule 08/07/2026 : cartographie multi-agents (11 zones, ~100 fonctions,
  dépendances/globales/DOM) + 3 lentilles adversariales (ordre de chargement/TDZ, cycles-frontières,
  invariants métier), re-vérifiées sur le code
- Décisions IZANAMI du 08/07/2026 (technique A + cible B, sommerCellulesParAdresse→M1, escapeHtml
  immobile, code mort intact)
- ADR-001 (modularisation prévue dès l'origine), ADR-014 (invariant 3 surfaces), ADR-015
  (précédent d'échec big-bang, méthode 1 sujet = 1 commit)
- `docs/known-pitfalls.md` §Leçons Audit phase A (pièges a-d)
- `test-batiments.mjs` l.14-15/36-41 (couplage harnais→index.html)
