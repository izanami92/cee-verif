# MODIFICATIONS PLANIFIÉES ET EN COURS

**Document de suivi — ACTIF uniquement.** L'historique clos (TODO terminés, sessions mergées,
stats datées, sources ADR) est dans `pending-todos-archive.md` (consulté à la demande, pas lu d'office).

**Dernière mise à jour** : 19 juin 2026

---

## TODOs actifs (index)

- 🔴 **Critiques** : #22 (modèle Chantier/Cellule + chantier ADR-015 en cours) · #29 (alerte 1.4, logique 3 issues) · #27 (facette `check_39`, recadré « attestation entrepôt manquante »)
- 🟡 **Importantes** : #3 (modularisation, reportée) · #4 (tests auto) · #5 (learning auto)
- 🟢 **Nice to have** : #35 (corps mort + reliquat #31) · #36 (styles grille) · #6/#7/#8 · limite `alert()` · suivi `state.chantiers`

> TODO clos & évolutions livrées-mergées → `pending-todos-archive.md`.

---

## 🔴 PRIORITÉ 1 — CRITIQUES

### TODO #22 : Modèle de données Chantier / Cellule

**Statut** : 🟠 **EN COURS** (chantier ADR-015) — à cadrer + implémenter.

**Pourquoi** : l'outil repose sur l'hypothèse « 1 chantier = 1 adresse » et utilise l'adresse comme clé
de regroupement → faux « conforme » silencieux sur parcelles/surfaces. Structure réelle (validée métier
28/05) : **Dossier → Chantiers → Cellules**. Détail : `ROADMAP_EVOLUTIONS.md` §CHANTIER MAJEUR.
Amorces à compléter (ne pas dupliquer) : `extraireNombreBatiments`, `normaliserAdresseSansBatiment`,
`regrouperAttestationsParAdresse`, `matchChantiers`.

**Réf** : ADR-014 (`9bae343`, « A retenu, B différé ») · ADR-015 (grains Cellule/Chantier/Dossier,
séquencement 1a→6). ⭐ **B (extraction par bâtiment) promu priorité n°1** : le déclencheur prévu par
l'ADR-014 est atteint (preuve dossier réel DELEFORTRIE — voir Pivot B).

**Séquence en 6 étapes** (branches **EMPILÉES**, chacune part du tip de la précédente) :

| Étape | Objet | Statut | Branche / commit(s) |
|-------|-------|--------|---------------------|
| 1a | Collision A1 levée (`check_45_audit/synthese` + `check_synthese_manquante`) | ✅ livrée, non mergée | `fix/a1-collision-check45` — `a61d343` (harnais 70/70) |
| 2 | Filet `check_surface_non_ventilable` (signal dossier `S < A`) | ✅ livrée, non mergée | `feat/s2-filet-surface-non-ventilable-sur-1a` — `de0f36d` |
| 3 | Grain cellule (révisée Philo 2 : déclencheur = répétition adresse facture, `source="facture"`) | ✅ livrée, non mergée | **version vivante** = `d589c69` (sur `fix/s4a-…`) ; `feat/s3-grain-cellule-led-par-batiment` (tip `c8a61f1`) porte une version **antérieure** (pré-Philo 2, à ignorer). Anchors : DELEFORTRIE→[26,26], COPPIN→[24,12], DES LAURIERS→[] |
| 4a | `extraireNombreBatiments` refondue (+4a-bis « & », +4a-ter `normaliserAdresseSansBatiment` « & ») | ✅ livrées, non mergées | `fix/s4a-extraire-batiments-accents` — `219b024`,`c8b1244`,`a888308`,`281acac` (auto-test 21/21, `test-batiments.mjs` 13/13) |
| 4b | Reconstruire `ledTotal` chantier = Σ `ledCellule` (corrige check_09d « 52 vs 66 ») | ✅ volet 1/2 livré ; volet 2/2 à cadrer | `1f7c663` + correctif β `f05f150` |
| 5 | Appariement non silencieux + re-câbler `attestations.length`-as-chantier-count (check_39) | ⏳ Commit 1 livré, reste Commit 2 | `f69d7db` (check_14/15/20/23 multi-chantier, collision/miss→`info` ; helpers S2 réappliqués **sans S1**) |
| 6 | Règle surface à comptage (S==C / S==A / S<A, cohérence Σ au bon grain) | ⬜ à venir | — |

> ℹ️ **Désambiguïsation « 52/66 »** : le « 52 vs 66 » de l'étape 4b est l'écart **check_09d** (ledTotal
> chantier reconstruit). Un autre « **compareStrings 52/66 hors-4b** » a été tracé via l'instrumentation
> `[66-diag]` (`eee731b`, logs retirés `65fa61f`) à 4 checks pré-existants sans rapport avec 4b, classés
> hors périmètre — pas une dette 4b.

**Ligne de commits (linéaire, non mergée)** : depuis `main` (= `a9a74aa`, ADR-015), **24 commits** mènent
au tip `fix/s4a-extraire-batiments-accents` (= `b76cd30`). Les noms `fix/a1-collision-check45` (= `a61d343`),
`feat/s2-filet-surface-non-ventilable-sur-1a` (= `39464d2`), `feat/s3-grain-cellule-led-par-batiment`
(= `c8a61f1`) sont des **jalons sur cette même ligne** (tous ancêtres de `fix/s4a-…`, vérifié) — **PAS des
branches à merger une par une** : merger le tip `fix/s4a-…` embarque déjà 1a → 2 → 3 → 4a/4b → Commit 1
(étape 5). `feat/s4b-led-chantier-depuis-cellules` reste une branche **gelée/vide** distincte. Merge sur
`main` quand le chantier est présentable — geste d'IZANAMI.
**Branches s1/s2 abandonnées** (hors ascendance de `fix/s4a-…`, prouvé ; S2 réappliqué sans S1 dans `f69d7db`) — détail en archive.
**Détail des étapes livrées (4a / 4a-bis / 4a-ter / 4b volet 1/2)** → voir archive.

**Dettes ouvertes (tracer, ne pas perdre)** :
- **Mono-MISS** : check_14/15/20/23 en MONO-chantier introuvable restent sur `references.*` (silencieux) — à décider si à signaler.
- **Commit 2 (étape 5), non commencé** : check_09d non silencieux + complétion `09d_audit` (le S2 d'origine ne pousse que `09d_synthese`). À re-prioriser vs le recadrage #27.
- **Volet 2/2 de 4b** : le label « 1/2 » suppose un volet 2/2 non défini → à cadrer (ne pas inventer).
- **Asymétrie de maille** (check_12/25) : **rétrogradée SECONDAIRE** par le recadrage #27.

#### ⭐ #27 — RECADRAGE (19/06) : le vrai défaut est en AMONT (dossier CEE incomplet)

Le bug #27 « l'outil confond les adresses » n'est **PAS** un défaut d'appariement à corriger dans
l'outil — c'est le **SYMPTÔME d'un dossier CEE INCOMPLET**. DELEFORTRIE = activité agricole, 3 chantiers
tous en secteur Entrepôts, mais **UNE SEULE attestation entrepôt** (« entrepôt de stockage non agricole »),
couvrant le seul 4 rue BAT 1. Il **MANQUE** les attestations de 4 rue BAT 2 et de 6 rue. L'outil, en
appariant 3 chantiers à 1 attestation, produit la confusion d'adresses. Le vrai check à valeur métier =
**SIGNALER le manque** (principe n°1). `compareAddress` est **CORRECT** (garde le n° de voie) ;
l'asymétrie de maille devient secondaire (ne se produit que sur dossiers déjà signalés défectueux).

**RÈGLE CIBLE (figée)** : si le code NAF du bénéficiaire commence par **01.xx ou 02.xx** (agricole), alors
CHAQUE chantier en secteur « Entrepôts » doit avoir SA PROPRE attestation entrepôt. Manquante → **signaler**
(ex. « 3 chantiers entrepôts, 1 seule attestation, manquantes : … »). Hors NAF agricole, ou hors secteur
entrepôt → aucune attestation attendue, donc **aucun signal**.

**POINT DE REPRISE (PAS de code avant)** : diagnostic lecture seule de faisabilité du check
« attestation entrepôt manquante ». 3 ingrédients à confirmer **DISPONIBLE / À EXTRAIRE / INCERTAIN** :
(i) reconnaître une attestation **ENTREPÔT** parmi les autres types (le PDF a « service technique interne »
×3 + « entrepôt non agricole » ×1 — l'extraction les distingue-t-elle ?) ; (ii) le **code NAF** du
bénéficiaire (extrait ? réutiliser les checks agricoles 31-34 ?) ; (iii) le **secteur Entrepôts PAR
CHANTIER**. Une part ne sera tranchable qu'en **RUN** (preview DELEFORTRIE : nb/types d'attestations, NAF).

#### Pivot B (extraction par bâtiment) + méthodo reprise

**Preuve (DELEFORTRIE)** : l'extraction CEE produit **UNE attestation agrégée** (`ledTotal=66`,
`surfaces=["2601"]`) alors que le dossier a 3 bâtiments / 2 adresses (26/26/14 LED ; 1130/884/587 m²
fondus). Le grain par-cellule **n'existe pas dans la donnée extraite** → A ne peut rien ré-exposer.
**Objectif B** : faire produire `attestations[]` à raison d'**1 entrée/bâtiment** (adresse + surface + LED
propres), **sans casser** les dossiers déjà bien extraits. ⚠️ **B touche `api/analyze.js`** (couche LLM
non-déterministe) → **diagnostic + ADR AVANT tout code**. S1+S2 restent corrects, se construiront PAR-DESSUS B.
**Première action prochaine session** : diagnostic SOURCE de B (lecture seule) — confirmer dans le PDF CEE
que l'attestation liste surface + LED **par bâtiment** ; localiser le prompt d'extraction qui agrège ;
MAJ ADR-014. **Méthodo** : ré-uploader CLAUDE.md + les 3 docs, re-valider l'archi contre le code réel
avant d'écrire tout prompt.

**Chantier connexe** : export Google Sheet (`compareWithGoogleSheet`, `index.html:1649`) lit le `ledTotal`
**brut** → devra suivre la reconstruction 4b, mais chantier séparé.

---

### TODO #29 : Alerte 1.4 — logique à 3 issues (client / Energie Responsable / autre→signalement)

**Statut** : 🔴 **À CADRER** — dépend de #28 (extraction fiabilisée) ✅ fait.

Logique actuelle (`index.html:2806-2847`) : `null`→« non détecté » ; « energie responsable »→exception ;
**tout le reste→silence**. L'État 3 est trop permissif : il avale un tiers parasite mal extrait
(fournisseur, luminaire…) → faux « conforme » silencieux. Règle métier (validée 3 juin) :
`entrepriseMiseEnOeuvre` ne vaut légitimement QUE (a) la société cliente → silence, ou (b) Energie
Responsable → exception confirmable. **Cible = 3 issues par COMPARAISON** : client→silence ; ER→alerte
exception (inchangé) ; autre/illisible/null→**signalement « valeur inattendue, à vérifier », jamais
bloquant**. Prérequis à cadrer (plan mode) : identifier le champ portant le nom du client (= SIRET / page
de garde), normalisation de comparaison (helpers `normalize` ; « LES MOUETTES » vs « SARL LES MOUETTES »…),
sort de l'État 1 (`null`). Branche `feat/*` propre, 1 commit, touche `index.html` (pas `api/analyze.js`).
Issu du diagnostic #28 (voir archive).

---

### TODO #27 : facette `check_39` ouverte (multi-chantiers même adresse)

**Statut** : 🔍 **BUG OUVERT**. Facette « découpage » **corrigée** (`bd13444` : collapse des espaces dans
la clé de découpage chantiers, COPPIN « rien »+« BAT 2 » → 1 chantier). Facette **`check_39` NON corrigée** :
`check_39` (`index.html:4994`) compare `attestations.length` (=2 pour COPPIN) à `audits.length` (=1) →
reste **MAJEUR** « 1 audit, 1 synthèse, 2 attestations » même après `bd13444`. À traiter **au bon grain**
(cellules / N bâtiments par chantier), **JAMAIS** en regroupant les attestations avant de compter (= faux
conforme silencieux si une attestation manque vraiment, principe n°1). Anchors régression : COPPIN, DES
LAURIERS. Autres bugs console tracés (réf produit `compareProductRef`, appariement adresse « 4 » manquant)
→ voir archive (TODO #27 d'origine).

---

## 🟡 PRIORITÉ 2 — IMPORTANTES

### TODO #3 : Modularisation de `index.html` — ⏸️ REPORTÉE
Tentative ES6 (26-27 mai) échouée (`generateChecks` tronquée). À refaire **module par module**, **APRÈS**
le cadrage du modèle Chantier/Cellule (#22), en validant contre `SOURCE_DE_VERITE_CHECKS.md`.

### TODO #4 : Tests automatisés — 💭 EN DISCUSSION
Pas de tests auto hors harnais `test-familles.mjs` / `test-batiments.mjs`. Cibles prioritaires :
`compareParcelles`, `compareSecteurEtude`, `compareAddress`, `normalizeAddress`, `matchChantiers`.
Framework : Jest ou Vitest. ROI à trancher.

### TODO #5 : Base de données pour learning automatique — 💭 EN DISCUSSION
Apprendre des corrections utilisateur (Google Sheets) → règles appliquées à l'analyse. Branche
`feature/auto-learning`. Probablement Phase 4.

---

## 🟢 PRIORITÉ 3 — NICE TO HAVE

### TODO #35 : supprimer le corps mort `renderChecksByFamille` (après validation prod grille 2D) + reliquat #31
La grille 2D (`renderFamillesGrid`, `feat/familles-grille-2d`) remplace l'accordéon `renderChecksByFamille`
au point d'appel (`refreshDisplay`). Le corps de `renderChecksByFamille` est **conservé intact mais non
référencé** = filet de revert. **Action après validation prod** : supprimer le corps mort (≈ L6017-6164)
+ ses 5 `console.*`. **Reliquat intégré depuis #31** (confinement livré 08/06, archivé) : nettoyer les
`console.log` de debug + retirer la mention « Prime Evolution » de §9 `SOURCE_DE_VERITE` (1.5 livrée, oubli
de nettoyage). **NE PAS supprimer** tant que la grille n'est pas validée en prod (sécurité revert).

### TODO #36 : extraire les styles de grille partagés (après merge)
`renderChantierGrid` et `renderFamillesGrid` dupliquent les classes de rendu (`#chantier-grille-style` /
`#familles-grille-style`) → dépendance d'ordre. Extraire dans une fonction d'injection neutre unique
(ex. `injectGrilleStyles()`). Touche `renderFamillesGrid` (hors périmètre du commit qui l'a créée).

### Limite connue : `alert()` → modale/toast custom
`confirmModal` (`8ce56bf`) ne traite que les **6 `confirm()`**. Les **9 `alert()`** restants sont
supprimables par le navigateur, mais **sans faux « conforme »** (pas des portes de décision) ; en revanche
une notification peut passer inaperçue. Emplacements indicatifs (`index.html`) : extraction `2132`/`2141`,
détection chantiers `2204`, validation nb chantiers `2279`/`2332`, erreur analyse `3173`, surfaces manuelles
`5403`/`5420`, erreur copie `6736`. Passe dédiée non prioritaire.

### TODO #6 / #7 / #8 — 💭 EN DISCUSSION
- **#6** Export des résultats en PDF (jsPDF client-side ou Puppeteer server-side).
- **#7** Mode « batch » multi-dossiers (queue async — contrainte timeout Vercel 60 s).
- **#8** Historique des analyses (BDD externe — Vercel stateless).
Besoins métier à confirmer.

### Suivi : fuite `state.chantiers` entre dossiers
`state.chantiers` n'est pas reconstruit dans le chemin mono `else if (extracted.adresse)` ni quand
l'extraction CEE ne renvoie aucune adresse → pourrait conserver les chantiers du dossier précédent.
À rattacher au **#22**. Le bouton « Réinitialiser » (`resetApplication`) couvre déjà ce cas.

---

## Dettes doc à recaler (commit séparé — NE PAS corriger ici)
3 mentions attribuent à tort le défaut à `compareAddress` (qui est **CORRECT** — garde le n° de voie ;
vrai défaut = asymétrie de maille) : `pending-todos.md` ~L103, ~L202, et `SOURCE_DE_VERITE_CHECKS.md:254`.
À lisser dans un commit doc dédié.

---

## Processus de mise à jour
Mettre à jour ce fichier : en fin de session ; à chaque évolution proposée ; quand un TODO est complété
(déplacer vers `pending-todos-archive.md`) ou abandonné (tracer la raison en archive).

---

**Dernière révision** : 19/06/2026 — clôture #27 : Commit 1 appariement non silencieux (`f69d7db`,
multi-chantier, validé preview) ; ⭐ recadrage #27 vers « attestation entrepôt manquante » ; règle NAF
01/02 figée ; housekeeping `pending-todos.md` scindé actif/archive.
**Prochaine session** : diagnostic lecture seule de faisabilité du check « attestation entrepôt manquante »
(#27 recadré) — voir POINT DE REPRISE (TODO #22).
