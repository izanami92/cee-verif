# ADR 014 : Modèle Chantier / Cellule — approche A (« re-exposer, sans toucher l'extraction »)

**Date** : 10/06/2026
**Statut** : ✅ Accepté — décision prise ; implémentation séquencée
**TODO lié** : #22 (priorité n°1 roadmap) ; englobe les symptômes d'adresse de #27
**Principe directeur** : jamais de faux conforme silencieux

---

## Contexte
L'outil regroupe par adresse en supposant « 1 chantier = 1 adresse ». C'est faux : la structure
métier réelle (validée 28/05/2026) est **Dossier → Chantiers → Cellules** — le chantier est l'unité
documentaire (1 audit + 1 synthèse + 1 adresse + 1 secteur), la cellule (« bâtiment ») est l'unité
physique (sa surface, sa parcelle, son LED).

Un diagnostic lecture seule (10/06/2026, synthétisé ci-dessous) a établi :
- `matchChantiers` (audit↔synthèse) zippe **par index** → immunisé aux collisions d'adresse.
- La collision est à l'appariement **attestation↔chantier par adresse** : `compareAddress` + `.find()`
  (sites `check_09d`, `check_23`) → `.find()` rend la **première** → 2 chantiers même adresse pointent
  sur la même attestation, la 2ᵉ jamais appariée → check manquant **silencieux**.
- `regrouperAttestationsParAdresse` **aplatit** l'identité cellule et **abandonne**
  `attestationNonAgricole` et `etudeDimensionnement` → anomalie cellule avalée. *(Les attestations
  brutes survivent dans `groupe.attestations` → récupérable sans ré-extraire.)*
- `check_39` compte les attestations **brutes** vs audits/synthèses **regroupés** → faux positif de maille.
- Sommes de surfaces (`check_45_{i}`, tol. 1 m²) → un écart cellule qui se compense est avalé ; seul
  `check_45b…bat{n}` descend à la cellule, et seulement si les cardinalités coïncident.
- `check_47_global` : deux comparaisons globales (manuelles vs audits / vs synthèses) **partagent le
  même id** en `findIndex+replace` → la synthèse **écrase** l'audit → **faux conforme vivant non redondant**.
- Maille la plus fine **existante** = l'attestation brute. **Hauteur** non extraite ; **points
  lumineux** scalaires par document. *(Le vrai contrôle parcelles est `check_15`.)*

Deux formes possibles : **A** (re-exposer la maille existante, sans toucher l'extraction) vs **B**
(entité Cellule explicite + identité bâtiment extraite → touche `api/analyze.js`, maillon LLM non déterministe).

## Décision
**On retient A. B est différé.**

1. **Cellule ≈ attestation brute** (maille la plus fine déjà extraite).
2. **A fait surgir l'incertitude, il ne la résout pas.** Deux chantiers **distincts à la même adresse**
   ne sont **pas auto-désambiguïsés** → ils sont **signalés ambigus**, jamais mal-appariés en silence.
3. **Mécanisme principe-n°1 préféré :** faire surgir l'incertitude via un **état non-ok sur un check
   existant** (`non_verifiable` / signal manuel *info* — patrons en place en 1.2 et `check_45b`),
   **plutôt que** par de nouveaux id de checks.
4. **Cas parcelles tranché (métier) :** les parcelles d'une attestation forment un **jeu attaché au
   chantier** ; le jeu du CEE doit se retrouver à l'identique dans l'audit/synthèse du même chantier,
   et un écart se lit en comparant les deux jeux. La conformité **ne se joue pas parcelle par parcelle**
   → l'argument qui aurait justifié B (éclatement automatique par parcelle) **tombe**.

Pourquoi A plutôt que B : toutes les fautes silencieuses sont **en aval** de l'extraction (du JS qui
jette une granularité déjà reçue) ; B fiabiliserait le maillon le **moins déterministe** (LLM) pour un
grain inutile maintenant ; A est **testable en déterministe**, **se découpe en sujets indépendants**
principe-n°1-positifs, et **fonde** B sans le fermer (A→B = sens des dépendances).

## Contrainte transverse (invariant d'implémentation)
Tout **ajout / scission / renommage d'id de check** se répercute sur **`getCheckProvenance`** (routage —
**jamais modifié**), **`familles-config.js`** (mapping id→famille — **protégé**) et le **harnais 69/69**.
Donc : on touche les **logiques** et les **états** tant qu'on peut ; on **évite** de créer/renommer des
id ; **tout** changement d'id devient un sous-sujet qui **vérifie explicitement** ces trois surfaces.

Fonctions protégées concernées (chacune n'est touchée que par son sujet dédié) :
`regrouperAttestationsParAdresse` (S1), zone `generateChecks` (S2/S3), `recalculateSurfaceChecks`
(S4a/S4b). `getCheckProvenance` / `etatCellule` / `resolveFamille` **jamais modifiés**.

## Plan d'implémentation (ordre verrouillé)
Chaque S = **1 sujet = 1 commit**, branche dédiée depuis `main`, **diagnostic Plan Mode** préalable,
**diff verbatim** avant commit, **preview Vercel**, puis merge — **git piloté par IZANAMI**.

| #  | Sujet | Nature | Dépend | Ripple id |
|----|-------|--------|--------|-----------|
| 0  | **ADR** (ce doc) | doc | — | — |
| 1  | **S4a** — fusionner les 2 comparaisons `check_47_global` en un check échouant si audit **ou** synthèse diverge (nommer lequel) ; id + categorie inchangés ; champ garde « somme » | logique | — | **nul** |
| 2  | **S1** — re-exposer l'identité cellule dans `regrouperAttestationsParAdresse` (préserver grain {surface, parcelle, LED, secteur} + **propager** `attestationNonAgricole`/`etudeDimensionnement`), agrégats chantier conservés en plus | données | — | aucun |
| 3  | **S2** — appariement attestation↔chantier non silencieux (remplacer `compareAddress.find` ; best-effort ordre/cardinalité + **signal « ambigu »** sur collision/multiple, via états sur checks existants) | logique + états | S1 | aucun |
| 4  | **S3** — `check_39` recompté au grain chantier (fin du faux positif, sans masquer une vraie incohérence) | logique | S1, S2 | aucun |
| 5  | **S4b** — hygiène d'id (`check_45_{i}` dupliqué, `check_44_{i}` recalc mort) | id | — | **oui** → vérifier les 3 surfaces |
| —  | **S5** (confort) — `check_15` parcelles comparées **en jeu** (insensible à l'ordre) + delta nommé | logique | — | aucun |
| —  | **S0** (hygiène) — unifier les ≥4 normalisations d'adresse + dédupliquer le double regroupement | refactor | — | aucun |

**Ordre :** ADR → S4a → S1 → S2 → S3 → S4b ; S5/S0 hors chemin critique. S4a avancé car faux conforme
**vivant** réparable à ripple nul ; S4b en fin pour concentrer le **seul** événement de ripple sur un
code stabilisé.

## Conséquences
**Gains principe n°1 :** fin de la fuite de champs cellule, fin de la collision silencieuse d'appariement,
fin de l'écrasement `check_47_global`, `check_39` exact.

**Limites assumées (toutes rendues visibles, jamais conformes en silence) :**
- A ne désambiguïse pas deux chantiers à la même adresse → **signal**, pas résolution.
- Parcelle reste une string par attestation → un écart intra-attestation multi-parcelles **surgit** (signal).
- **Hauteur** non extraite ; points lumineux scalaires par document.

**Ce qui rouvrirait B :** besoin avéré de comparer **chaque parcelle séparément**, ou d'attribuer
surface/parcelle à un **bâtiment nommé**, ou d'introduire la **hauteur**. Tranché aujourd'hui comme non
nécessaire (parcelles = jeu). On rejugera **à l'usage**.

## Références
TODO #22, #27 ; diagnostic lecture seule du 10/06/2026 (de session, non archivé au dépôt) ; ROADMAP_EVOLUTIONS.md
§« CHANTIER MAJEUR » ; ADR 011 (matching par index `matchChantiers`).
