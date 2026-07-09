# MODIFICATIONS PLANIFIÉES ET EN COURS

**Document de suivi — ACTIF uniquement.** L'historique clos (TODO terminés, sessions mergées,
stats datées, sources ADR) est dans `pending-todos-archive.md` (consulté à la demande, pas lu d'office).

**Dernière mise à jour** : 6 juillet 2026

---

## TODOs actifs (index)

- 🔴 **Critiques** : checks LED hors-4b au mauvais grain (check_19/21/28/29/30) — **REPORTÉ derrière le chantier #3 audit + modularisation** (décision IZANAMI 06/07) · #27 (découpage 5→3 + 3 blocs LATRILLE ✅ **mergés sur main 06/07** ; check « attestation entrepôt manquante » toujours en attente) · #22 (modèle Chantier/Cellule, ADR-015 — **4b volet 1/2 ✅ validé run réel 06/07, mergé**) · #29 (alerte 1.4, logique 3 issues)
- 🟡 **Importantes** : **#3 (audit complet + modularisation) — 🟢 phase B extraction FAITE (ADR-016, 5 modules, branche `feat/phase-b-modularisation` à merger)** · #4 (tests auto) · #5 (learning auto)
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
| 4b | Reconstruire `ledTotal` chantier = Σ `ledCellule` (corrige check_09d « 52 vs 66 ») | ✅ volet 1/2 livré **+ validé run réel DELEFORTRIE complet 06/07/2026** (preview `lvae9o1nv` : 66 brut → 52 reconstruit, check_09d_audit/synthese conformes 52=52) ; volet 2/2 à cadrer | `1f7c663` + correctif β `f05f150` |
| 5 | Appariement non silencieux + re-câbler `attestations.length`-as-chantier-count (check_39) | ⏳ Commit 1 livré, reste Commit 2 | `f69d7db` (check_14/15/20/23 multi-chantier, collision/miss→`info` ; helpers S2 réappliqués **sans S1**) |
| 6 | Règle surface à comptage (S==C / S==A / S<A, cohérence Σ au bon grain) | ⬜ à venir | — |

> ℹ️ **Désambiguïsation « 52/66 »** : le « 52 vs 66 » de l'étape 4b est l'écart **check_09d** (ledTotal
> chantier reconstruit) — **éteint le 06/07/2026** (validation run réel). Le « **52/66 hors-4b** » (tracé via
> l'instrumentation `[66-diag]`, `eee731b`, logs retirés `65fa61f`) est désormais **identifié** :
> **check_19/21** (tableaux synthèse) et **check_28/29/30** (états initial/projeté + liste luminaires audit)
> comparent des valeurs PAR CHANTIER au **total du dossier** (66) au lieu du total du chantier (52) →
> 5 faux « majeur 66 vs 52 » par dossier multi-chantiers, libellés trompeurs (ressemblent aux checks 09).
> Promu **prochain sujet** : re-grainer par chantier (référence via le guichet, comme 09d) — diagnostic
> + 2-3 approches avant code.

**Ligne de commits (linéaire) — ✅ MERGÉE sur `main` le 06/07/2026** : les **35 commits** empilés depuis
l'ancien `main` (= `a9a74aa`, ADR-015) jusqu'au tip `fix/27-decoupage-parcelle` (= `5043ffa`) ont été mergés
en **fast-forward** (aucun commit divergent sur `main`, vérifié ; geste délégué par IZANAMI en séance).
Ce merge embarque 1a → 2 → 3 → 4a/4b → Commit 1 (étape 5) → S0/Blocs #27 → docs. Les jalons
`fix/a1-collision-check45`, `feat/s2-filet-surface-non-ventilable-sur-1a`, `feat/s3-grain-cellule-led-par-batiment`,
`fix/s4a-extraire-batiments-accents` sont tous des ancêtres de ce tip.
`feat/s4b-led-chantier-depuis-cellules` reste une branche **gelée/vide** distincte.
**Branches s1/s2 abandonnées** (hors ascendance de `fix/s4a-…`, prouvé ; S2 réappliqué sans S1 dans `f69d7db`) — détail en archive.
**Détail des étapes livrées (4a / 4a-bis / 4a-ter / 4b volet 1/2)** → voir archive.

**Dettes ouvertes (tracer, ne pas perdre)** :
- **Mono-MISS** : check_14/15/20/23 en MONO-chantier introuvable restent sur `references.*` (silencieux) — à décider si à signaler.
- **Commit 2 (étape 5), non commencé** : check_09d non silencieux + complétion `09d_audit` (le S2 d'origine ne pousse que `09d_synthese`). À re-prioriser vs le recadrage #27.
- **Volet 2/2 de 4b** : non défini → à cadrer. **Candidat identifié le 06/07** (vérif adversariale F3) : quand
  une adresse multi-bâtiments n'a pas de `cellules[]` extraites (LLM non déterministe), la substitution se tait
  et le brut agrégé l'emporte **sans signal** (le majeur 09d qui en résulte est visible, mais rien ne dit que la
  reconstruction n'a pas eu lieu) → signal « LED chantier non reconstruite, à vérifier » à étudier. Chantier
  connexe : export Google Sheet lit toujours le `ledTotal` brut.
- **Asymétrie de maille** (check_12/25) : **rétrogradée SECONDAIRE** par le recadrage #27.

#### ⭐ #27 — RECADRAGE (19/06) : le vrai défaut est en AMONT (dossier CEE incomplet)

Le bug #27 « l'outil confond les adresses » n'est **PAS** un défaut d'appariement à corriger dans
l'outil — c'est le **SYMPTÔME d'un dossier CEE INCOMPLET**. DELEFORTRIE = activité agricole, 3 chantiers
tous en secteur Entrepôts, mais **UNE SEULE attestation entrepôt** (« entrepôt de stockage non agricole »),
couvrant le seul 4 rue BAT 1. Il **MANQUE** les attestations de 4 rue BAT 2 et de 6 rue. L'outil, en
appariant 3 chantiers à 1 attestation, produit la confusion d'adresses. Le vrai check à valeur métier =
**SIGNALER le manque** (principe n°1). `compareAddress` est **CORRECT** (garde le n° de voie) ;
l'asymétrie de maille devient secondaire (ne se produit que sur dossiers déjà signalés défectueux).

**RÈGLE CIBLE (figée — sera reprise dans un futur ADR style ADR-014/015)** : par chantier,
**attestation entrepôt attendue ⟺ (secteur = Entrepôt) ET (NAF bénéficiaire = 01.xx/02.xx)**. Le NAF est un
**interrupteur GLOBAL** (1 bénéficiaire/SIRET → 1 NAF) ; le **secteur filtre PAR CHANTIER**. Donc : NAF agricole +
chantier Entrepôt sans son attestation → **signaler** ; chantier secteur « Autres » → **jamais** d'attestation
attendue (quel que soit le NAF) ; NAF non agricole → aucune attestation attendue, **aucun signal**.

**ÉTAT DU CHECK — diagnostic de faisabilité FAIT (22/06)** : le check est **partiellement déjà là**.
- **(i)** reconnaître l'attestation ENTREPÔT : ✅ DISPONIBLE — champ `attestationNonAgricole` ∈ {`'presente'`,`'non_detectee'`} par attestation (`api/analyze.js:263`).
- **(ii)** bénéficiaire agricole : la **gate NAF** est la seule brique (`isAgricole`, NAF 01./02. via `ensureCodeNafFromSiret` → `/api/search`). ⚠️ **Correction mémoire** : les « checks agricoles 31-34 » NE sont PAS la brique — `check_31` (`checkMentionsAgricoles`, `index.html:3842`) travaille sur le **texte Audit/Synthèse**, pas sur le NAF.
- **(iii)** secteur Entrepôts par chantier : ✅ DISPONIBLE mais **au grain des attestations présentes** (`attestations[].secteurActivite`, `detectAutresSecteurs` `index.html:4033`).

**ANGLE MORT prouvé en run** :
- **C3** (`index.html:2943-2992`, helper `detectFautifsAttestationNonAgricole` `index.html:3973`), gaté NAF, **n'itère que les attestations présentes** → **aveugle aux manquantes**. Sur DELEFORTRIE (1 attestation `presente` pour 3 chantiers), C3 est resté **silencieux** (aucune modale attestation — seule une modale « étude de dimensionnement »).
- **Filet `check_surface_non_ventilable`** (`index.html:5434-5454`, `info`, `global-cee`) compare `nbAttestationsSurface` (attestations à surface>0, **≠ « présentes »**) `<` `matchChantiers().length`. Se déclenche sur DELEFORTRIE (S=1<A=2, jaune à l'écran). MAIS vit dans `if(attestationsPresentes)` → **éteint si 0 attestation** → **trou : dossier agricole sans AUCUNE attestation entrepôt → ni C3 ni filet ne signalent**.

**Faits RUN (3 runs preview réels — preuve du verrou de grain ; faits d'EXÉCUTION, ≠ faits PDF)** :

| Dossier (NAF) | `adressesChantiers` | `cellules` | attestations entrepôt | audits/synth. | filet S<A | verdict |
|---|---|---|---|---|---|---|
| **DELEFORTRIE** (01.11Z) | **3** (LLM ne replie pas) | 2 (26+26 au « 4 rue » ; « 6 rue » sans cellule) | **1** (surface 2601 = somme, `presente`) | 2 | **fire** (S=1<A=2) | défectueux (manque des attestations) |
| **COPPIN** (01.50Z) | **1** (LLM replie les 2 bâtiments) | 2 (24+12) | **2** (836+441, `presente`) | 1 | **ne fire pas** (S=2, A=1 → 2<1 faux) | conforme — mais par **hasard arithmétique** (S>A), pas par vérification |

→ **Numérateur** (attestations présentes) = fidèle/stable. **Dénominateur** (nb bâtiments) = **aucune source fiable unique** : `adressesChantiers` vaut 3 sur l'un et 1 sur l'autre, `matchChantiers` 2 vs 1, `cellules` 2 partout (or DELEFORTRIE a **3** bâtiments). C'est le **repli non-déterministe du LLM** = cœur du #27 / Pivot B.

**DÉCISION DE CONCEPTION (arrêtée par IZANAMI)** :
- Check **pragmatique maintenant**, sans attendre le Pivot B, **limites tracées**.
- **Dénominateur retenu = Option 1 « borne haute »** : `Math.max(adressesChantiers.length, attestations.length, cellules.length, audits.length, syntheses.length)`. Rationale : **ne sous-compte jamais** les bâtiments → **ne tait jamais un manque** (faux négatif = pire péché ; sur-signalement jaune acceptable). Options 2 (union multi-sources) et 3 (`cellules.length` simple) **écartées** (trop fragiles/complexes).
- Niveau **`info`**, **message prudent non affirmatif** (« X attestations présentes pour Y bâtiments estimés — vérifier », **jamais** « il manque N »).
- **Point OUVERT (non tranché)** : co-déclenchement filet S<A + nouveau check sur DELEFORTRIE (dédup du message ou non) → à trancher au diagnostic d'implémentation.
- **Un ADR formel** (style ADR-014/015) sera rédigé **AVANT** le code du check.

**⛔ MAIS le check passe EN ATTENTE derrière le blocage LATRILLE** (voir TODO #27 ci-dessous) : tant que le découpage des chantiers est faux, le dénominateur (même Option 1) est cassé à la racine.

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

### TODO #27 : découpage des chantiers (LATRILLE) — ✅ 5→3 + 3 blocs RÉSOLUS (mergés 06/07) + facette `check_39`

**Statut** : 🟢 **Symptômes LATRILLE résolus** — `fix/27-decoupage-parcelle` **mergée sur `main` le 06/07/2026**.
LED DELEFORTRIE (4b) ✅ **validé le 06/07/2026**. Reste : facette `check_39`, dette adversariale tracée.

#### ✅ Découpage 5→3 + 3 blocs (01–03/07/2026)
**LATRILLE** (SIRET `89226144700015`) = **7 bâtiments sur 3 adresses réelles** (Lauriol ×3, 36 Grozeille ×3,
La Piotte ×1), dont **Lauriol BAT 2 en secteur « Autres »** (légitimement sans attestation entrepôt) — cas de
test mixte Entrepôts + Autres. L'outil détectait **5 chantiers au lieu de 3**.

**Question métier TRANCHÉE (IZANAMI)** : **1 adresse = 1 chantier** ; plusieurs bâtiments (cellules) à la même
adresse restent **1 chantier** (toujours 1 audit + 1 synthèse) ; la **parcelle** (Grozeille 0022/0023) et le
**secteur** n'entrent **PAS** dans le découpage.

Livrés (ordre `000dfb3` S0 → `499c3fe` → `09abffd` → `dd65b9d`) :
- **S0 (`000dfb3`)** : helper `retirerParcelle` partagé → parcelle retirée de **toutes** les normalisations
  d'adresse (regroupement, détection `state.chantiers`, `compareAddress`, 2 blocs surface inline) → **5→3**.
- **Bloc 1 (`499c3fe`)** : `check_25` (adresse Audit) apparié au chantier CEE **par adresse** (guichet
  `regrouperAttestationsParAdresse` + fallback `adressesChantiers`), plus par index brut sur `attestations[i]`
  (grain bâtiment) → fin du « Grozeille comparé à Lauriol BAT 2 ».
- **Bloc 2 (`09abffd`)** : `check_14_conflict` **majeur → info** (un chantier peut mélanger les secteurs ;
  `check_14/20/23` principal déjà OK via `compareSecteurEtude`/`isEntrepot`).
- **Bloc 3 (`dd65b9d`)** : `check_45_audit`/`check_45_synthese` **majeur → info « à vérifier »** quand le chantier
  contient un bâtiment « Autres » (détecté via `detectAutresSecteurs`, type métier ≠ libellés bruts) dont la
  surface est dans la synthèse/audit mais pas dans les attestations entrepôt → écart légitime. Vrai écart entre
  entrepôts reste majeur ; anti sur-signalement (mixte cohérent → ok).
- **Durcissement (`dd65b9d`, vérif adversariale 26 agents)** : `compareAddress` rejette les adresses vides/nulles
  (fin du faux match `'' === ''`) ; `check_25` `adresseMatch = refCEE !== undefined` + fallback filtre les vides.

Preuve : banc d'essai `#27` (jetable, `/tmp/scratch-27.mjs`) + harnais `test-batiments` 36/36 & `test-familles`
70/70. Preview testé OK (LATRILLE + anti-régression COPPIN/DELEFORTRIE/DES LAURIERS). **Mergé sur main
le 06/07/2026.**

**Dette adversariale tracée (rejetée/reportée — NE PAS perdre)** :
- `check_14/20/23` = `ok` en secteur mixte : **conforme** (le mélange surgit une fois via `check_14_conflict`
  info ; on N'ajoute PAS `check_20/23_conflict`, ce serait redondant). Rejet argumenté.
- Label `nbChantiers` (`index.html:5210` `attestations.length` vs recalcul `attestationsByChantier.size`) :
  cosmétique, aucun impact LATRILLE — à corriger un jour.
- `check_25` fallback `adressesChantiers` quand 0 attestation : préexistant, couvert par `check_43` /
  `check_attestation_manquante`.

#### ✅ LED DELEFORTRIE (étape 4b) — VALIDÉ (03–06/07/2026, aucun code modifié)
Diagnostic lecture seule + vérif adversariale (3 agents, arbitrée) + banc d'essai déterministe
(`/tmp/scratch-4b.mjs`, vrai code chargé via extractFn, 11/11) + **run réel complet** (preview `lvae9o1nv`,
2 audits + 2 synthèses + CEE) : la substitution `ledTotal = Σ ledCellule` **fonctionne** — attestation agrégée
66 → 52 reconstruit, `check_09d_audit` et `check_09d_synthese` **conformes 52=52** à l'écran, 09a/09b/09c verts.
Le run du 03/07 (27 majeurs) était pollué par un **import incomplet** (2 audits / 1 synthèse zippés par index —
leçon consignée dans known-pitfalls). Confirmés au passage : MISS 09d **silencieux** du « 6 rue » (seul
`console.warn`, dette Commit 2 étape 5) et les 5 faux « 66 vs 52 » hors-4b (voir Désambiguïsation, TODO #22).

#### Facette `check_39` (toujours ouverte)
Facette « découpage » d'un autre cas **corrigée** (`bd13444` : collapse des espaces, COPPIN « rien »+« BAT 2 »
→ 1 chantier). Facette **`check_39` NON corrigée** : `check_39` (`index.html:4994`) compare `attestations.length`
(=2 COPPIN) à `audits.length` (=1) → reste **MAJEUR** « 1 audit, 1 synthèse, 2 attestations » même après
`bd13444`. À traiter **au bon grain** (cellules / N bâtiments par chantier), **JAMAIS** en regroupant les
attestations avant de compter (= faux conforme silencieux, principe n°1). Anchors régression : COPPIN, DES
LAURIERS, **LATRILLE**. Autres bugs console tracés (réf produit `compareProductRef`, appariement adresse
« 4 » manquant) → voir archive (TODO #27 d'origine).

---

## 🟡 PRIORITÉ 2 — IMPORTANTES

### TODO #3 : Audit complet + modularisation de `index.html` — 🟢 PHASE B EXTRACTION FAITE (09/07/2026, reste merge)

**Phase B ✅ EXTRACTION FAITE (08-09/07/2026)** : ADR-016 validé puis réalisé sur `feat/phase-b-modularisation`
(`4fc6153` ADR → `bdbff3a` M1 `utils-comparaison.js` 21 fonctions + harnais re-routé → `bb24f75` M2
`regroupement.js` 5 fonctions → `449246c` M3 `detecteurs-alertes.js` 9 fonctions → `2f99ccb` M4 `io.js`
4 fonctions async → `73b5566` M5 `moteur-checks.js` avec `generateChecks` ENTIÈRE). **index.html
8204 → 5669 l.** Chaque commit : banc d'identité byte-à-byte (rejeu intégral pour M5) + harnais 36/36
& 71/71 + preview validée IZANAMI (anchors ; 1 écart DELEFORTRIE « nom Synthèse (vide) » = non-déterminisme
d'extraction prouvé par élimination — api/ intouché, JS byte-identique — géré correctement par le filet
LOT 2). Décisions IZANAMI 08-09/07 : technique A scripts classiques maintenant + **conversion ES6 = cible B**
(chantier futur, motivé par l'objectif produit « personnalisable/vendable » → passera aussi par un chantier
« règles métier en configuration ») ; **étapes 6 (encapsulation 4 globales) & 7 (orchestrateur mince)
DIFFÉRÉES à la cible B** ; escapeHtml immobile ; code mort intact (#35). **RESTE : merge (geste IZANAMI).**
Détail → ADR-016 §Réalisation.

*(Historique phase A + plan d'origine ci-dessous.)*
Tentative ES6 (26-27 mai) échouée (`generateChecks` tronquée) → big-bang écarté (ADR-015).
**Phase A ✅ FAITE (06-07/07/2026)** : audit complet lecture seule (6 axes) via 2 workflows multi-agents
(76 agents) + vérification adversariale arbitrée + re-lecture code des findings load-bearing. **0 finding
réfuté**. Rapport priorisé ci-dessous, validé par IZANAMI. **Phase B (ensuite)** : ADR de découpage (style
014/015) AVANT tout code, puis extraction **module par module** (1 module = 1 commit = extraction PURE,
fonctions byte-identiques, harnais verts + preview à chaque étape, app fonctionnelle à chaque commit), en
validant contre `SOURCE_DE_VERITE_CHECKS.md`. Anchors anti-régression : COPPIN, DES LAURIERS, LATRILLE,
DELEFORTRIE. Plan de découpage proposé (validé par l'axe archi, 6 modules `window.*` du plus pur au plus
couplé) : 1) `utils-comparaison.js` (compare*/normalize/parse*, déjà testé par `test-batiments.mjs`) →
2) `regroupement.js` → 3) `detecteurs-alertes.js` → 4) `io.js` (extractTextFromPDF + fetch, **point
d'insertion unique pour réintégrer l'auth K1**) → 5) `moteur-checks.js` (`generateChecks` entier, **ne pas
scinder pendant l'extraction**, invariant 3-surfaces ADR-014) → 6) reste (rendu + handler `btnAnalyze`
orchestrateur mince, encapsuler d'abord les 4 globales `currentChecks/currentExtractedData/activeFilter/activeView`).
Un `docs/architecture-actuelle.md` (26/05, obsolète : `generateChecks` y est à 1250 l., aujourd'hui 1390) porte un plan antérieur.

#### 📋 Findings de l'audit phase A — backlog priorisé (ordre de traitement choisi : sécurité d'abord)

> Provenance : ✔️ vérifié adversarialement · 🔍 re-vérifié sur le code par la session. ⚠️ **Les numéros de ligne des findings NON FAITS (M1, M4, M5, mineurs) sont ceux de `c28b323`, AVANT LOT 1 (+~78 l. auth) et LOT 2 (+~40 l.) → décalés d'environ +120 lignes sur `main` actuel. RE-GREP les fonctions/motifs, ne pas se fier aux numéros.**
> **✅ LOT 1 sécurité MERGÉ sur `main` le 07/07/2026 (`c197376`, fast-forward)** : K1 + K2 + M7 + suppression `extract-cee`. Validé preview (7 tests : login bloquant, mauvais/bon mdp, SIRET, analyse, session, `/api/fetchSheet` → 401 sans login). `APP_PASSWORD` configuré Vercel (Prod + Preview).
> **✅ LOT 2 faux-conforme MERGÉ sur `main` le 07/07/2026 (`41a8f48`, fast-forward)** : K3 + M2 + M3 + M6. Prouvés au banc d'essai sur le vrai code (K3 4/4, M2 13/13, M3 7/7) + harnais 70/70 & 36/36 + non-régression preview (COPPIN/DES LAURIERS/LATRILLE/DELEFORTRIE).
> **✅ LOT 3 faux-conforme/robustesse/XSS — LIVRÉ sur branche `fix/m4-led-miss-signal` (non mergé), validé preview le 08/07/2026** : M4 (`0e28ee2`) + M5 (`e5937be`) + M1 (`910d5bb`). Bancs `/tmp/scratch-m{4,5,1}.mjs` (6/6, 7/7, 10/10, vrai code) + harnais 71/71 & 36/36.
> **✅ LOT 4 durcissement — LIVRÉ sur la même branche, validé preview le 08/07/2026** : 4.1 erreurs internes non renvoyées au client (`424509d`, 7 sites api/) ; 4.2 timeout `AbortController` sur `apiFetch`/login (`351eb6f`, défaut 30 s, analyse 120 s ; banc 5/5 vrai `apiFetch`) ; 4.3 SRI pdf.js + 4 en-têtes HTTP `vercel.json` (`e6ab7ed`, hash officiel cdnjs vérifié ; CSP écartée — cf. note). **Prochain : merge de la branche (geste IZANAMI) → phase B (modularisation, ADR de découpage AVANT code).**
> ⚠️ **Auto-deploy Vercel à la traîne (08/07)** : les push git ne déclenchaient plus de déploiement → contourné par `vercel deploy` manuel (previews `ckj16mv80` puis `qse7zypb1`). **À vérifier avant le merge prod** (intégration Git / limite de déploiements) ; sinon `vercel deploy --prod` manuel après merge.
> ℹ️ **CSP écartée au LOT 4.3 (décision motivée)** : stricte = casserait l'app (29 `onclick` inline + 199 `style=` inline + script inline) ; permissive `'unsafe-inline'` = peu de gain (M1 couvre déjà le XSS à la source). **CSP stricte = candidate de la phase B** (quand on retirera les `onclick` inline). SRI + en-têtes faits (tout le gain sûr).

**🔴 CRITIQUES (3)**
- **K1 — Aucune auth sur les 5 routes API** ✔️ **✅ FAIT (LOT 1, `c197376`)** : `lib/auth.js` (`requireAuth`, header `Authorization` Bearer, fail-closed si `APP_PASSWORD` absent) + `/api/login` (validation sans appel LLM — fin du piège de l'ancien login) + `requireAuth` en premier sur les 5 routes ; login front restauré + `apiFetch` (header + 401→login). Le mdp vit uniquement dans la variable Vercel `APP_PASSWORD`.
- **K2 — `/api/fetchSheet` dump tout le Sheet à un GET anonyme** ✔️ **✅ FAIT (`c197376`)** : `requireAuth` sur `fetchSheet` ; 401 sans login prouvé en preview.
- **K3 — Bannière page de garde sur `checks.slice(0,3)`** ✔️ **✅ FAIT (LOT 2, `b55adb7`, mergé `41a8f48`)** : `filter(c => c.categorie === 'garde')` (tous chantiers, `check_01/02/03` par audit) + `length > 0` (exige ≥1 audit vérifié). Banc `/tmp/test-k3.mjs` 4/4 (ancienne = 3 feux verts faux). Non-régression preview OK.

**🟠 MAJEURS (8)**
- **M1 — XSS `innerHTML` sur données extraites** ✔️ (requalifié critique→majeur) **✅ FAIT (LOT 3, `910d5bb`)** : fonction `escapeHtml` top-level (échappe `& < > " '`, hoistée) appliquée aux 13 sinks tainted vivants (résultats SIRET data-*+texte, noms de fichiers, adresses de détection, `value` champ adresse, saisie manuelle, `createCheckCard` ×5, étiquettes des 2 grilles texte+title, titre vue « Tous »). Échappement à l'affichage seul (valeurs brutes conservées pour comparaisons/Map/console/userMessage LLM). `escAttr` inchangé. Banc `/tmp/scratch-m1.mjs` 10/10 (vrai code). Testé preview (A `<img onerror>` neutralisé / B accents / C SIRET). Code mort `createErrorGroupCard`/`autoDetectChantiers` tracé pour #35.
- **M2 — Comparateurs « 2 côtés vides = conforme »** 🔍 **✅ FAIT partiellement (LOT 2, `aa78333`)** : garde `if(!a||!b) return false` sur `compareStrings` + `compareSIRET` + `compareDate` (double-vide → check échoue à son niveau naturel : bloquant page de garde, majeur ailleurs). Banc `/tmp/test-m2.mjs` 13/13. **RESTE (reporté, sujets délicats)** : `compareParcelles` **exclu** (dossier sans parcelle = normal, ex. DELEFORTRIE → un guard le casserait) ; `compareSecteurEtude` **exclu** (logique #27 secteurs mixtes → re-test LATRILLE requis). À traiter dans une étape dédiée si besoin.
- **M3 — `parseFloat(...)||0` des 2 côtés LED** 🔍 **✅ FAIT (LOT 2, `0b44449`)** : helper top-level `ledConforme(a,b) = a>0 && b>0 && Math.abs(a-b)<0.1` remplace les 5 comparaisons LED (check_09a/09b/09c/09d audit+synthèse). Logique & tolérance inchangées pour toute valeur réelle ; seul 0 vs 0 surgit. Banc `/tmp/test-m3.mjs` 7/7. **Note** : tolérance `<0.1` conservée → l'anomalie A4 (règle zéro stricte) reste un mineur distinct.
- **M4 — MISS `check_09d` silencieux** ✔️ **✅ FAIT (LOT 3, `0e28ee2`)** : dans le `else` du guichet LED (`index.html`), quand aucune attestation CEE n'est appariée à un chantier, filet `info` `check_09d_miss_c${N}` « contrôle vs CEE impossible — à vérifier » (jamais majeur : absence peut être légitime). Symétrique côté LED de `check_surface_non_ventilable`. `getCheckProvenance` inchangé (Méthode 0) ; famille 5 via `familles-config.js` + cas harnais (70→71). Banc `/tmp/scratch-m4.mjs` 6/6 (vrai `compareAddress`/`getCheckProvenance`/`resolveFamille`). Testé preview DELEFORTRIE (« 6 rue »). Limite assumée : léger sur-signalement `info` possible sur un chantier « Autres » multi-chantiers (distinction fine = #27).
- **M5 — `Promise.all` extractions PDF** ✔️ **✅ FAIT (LOT 3, `e5937be`)** : `Promise.allSettled` + tâches étiquetées. Échec d'un document CRITIQUE (Dossier CEE = référence §0 ; Audit/Synthèse = leur absence décale l'appariement par index → faux résultats) → arrêt propre nommant le fichier. Échec SECONDAIRE (fiche technique) seul → l'analyse continue en le signalant. Effet de bord (peuplement `state`) inchangé ; aucun sink `innerHTML` (alert seul). Banc `/tmp/scratch-m5.mjs` 7/7 (`all` rejette vs `allSettled` survit + 5 décisions de tri).
- **M6 — `s.adresse.substring()` sans garde** ✔️ **✅ FAIT (LOT 2, `41a8f48`)** : fallback `(x.adresse || '')` sur l'alerte « Autres secteurs » (site fautif) + le `console.log` debug jumeau ; le 3ᵉ site était déjà un ternaire gardé. Fin de la TypeError qui avortait l'analyse.
- **M7 — CORS `*` + `Allow-Credentials:true` + 0 header sécurité** ✔️ (`vercel.json:12-18`). Aggrave K1/K2. **✅ FAIT (`c197376`)** : bloc CORS retiré (app same-origin).
- **M8 — `generateChecks` 1390 l. (`4100-5489`) + 20 fonctions >50 l. + 2 handlers inline géants** ✔️ = **le cœur de ce TODO #3 / phase B**. Ne pas scinder pendant l'extraction. Effort L.

**🔵 MINEURS** (dédupliqués ; beaucoup déjà tracés) : A4 tolérance LED `<0.1` (5 occ. `4268/4284/4307/4373/4391`) · 9 `alert()` (`2153…7854`) · fuite `state.chantiers` · `check_23` id nu (`4803-4828`) · label `nbChantiers` (`5228` vs `5686`) · A3 `check_47_global` fusionné mais SOURCE_DE_VERITE §6 périmé · routage `check_47_global` sans `portee` · `api/extract-cee.js` route morte **✅ SUPPRIMÉE (`c197376`)** · 5 normalisations d'adresse divergentes (dont `compareSheet.js:306`) · 2 systèmes de routage coexistants (`getGroupeForCheck` legacy vs `resolveFamille`) · code mort ~430 l. (dont `renderChecksByFamille` = filet #35) · ~122 `console.log` fuitant des données métier · erreurs internes relayées au client **✅ FAIT (LOT 4.1, `424509d`)** · `.env.example` désync · commentaire « vérifie le mot de passe » mensonger · CSP/SRI → **SRI + 4 en-têtes HTTP ✅ FAIT (LOT 4.3, `e6ab7ed`)** ; CSP stricte reportée phase B · fetch client sans timeout **✅ FAIT (LOT 4.2, `351eb6f`)** · `displayResults` dans `setTimeout` hors try/catch · CLAUDE.md désync (tailles fichiers, env vars).

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

## Processus de mise à jour
Mettre à jour ce fichier : en fin de session ; à chaque évolution proposée ; quand un TODO est complété
(déplacer vers `pending-todos-archive.md`) ou abandonné (tracer la raison en archive).

---

**Dernière révision** : 09/07/2026 — **TODO #3 : LOTs 1-4 MERGÉS sur `main` (tip `dda6670`) + phase B
extraction FAITE (ADR-016).** État complet pour reprise en nouvelle session :

**Fait & LIVRÉ sur `feat/phase-b-modularisation` (non mergée), validé preview le 09/07/2026** :
- **ADR-016** (`4fc6153`) + extraction PURE M1→M5 (`bdbff3a`, `bb24f75`, `449246c`, `2f99ccb`, `73b5566`)
  + doc de clôture. index.html 8204 → 5669 l. Voir bloc « Phase B ✅ » en tête du §TODO #3.
- **En attente : merge (geste IZANAMI).** Auto-deploy Vercel re-fonctionnel sur toute la série phase B
  (08-09/07) ; garder le réflexe de vérifier après chaque push.

**Antérieur — LOT 3 + LOT 4 mergés sur `main` le 08/07/2026 (tip `dda6670`)** :
- **LOT 3** : M4 (`0e28ee2`, filet `check_09d_miss`), M5 (`e5937be`, extraction résiliente), M1 (`910d5bb`, `escapeHtml` anti-XSS).
- **LOT 4 durcissement** : 4.1 erreurs non renvoyées au client (`424509d`), 4.2 timeout `AbortController` (`351eb6f`), 4.3 SRI pdf.js + en-têtes HTTP (`e6ab7ed`).

**Antérieur — Fait & mergé sur `main` (tip `41a8f48`)** :
- **Audit phase A** : 6 axes, 76 agents, 0 finding réfuté → backlog priorisé §TODO #3 ci-dessus.
- **LOT 1 sécurité** (`c197376`) : K1 auth (`lib/auth.js` `requireAuth` + `/api/login` + garde sur 5 routes + login front `apiFetch`), K2 (`fetchSheet` protégé), M7 (CORS `*` retiré), `extract-cee` supprimé. `APP_PASSWORD` dans Vercel (Prod+Preview).
- **LOT 2 faux-conforme** (`41a8f48`) : K3 (bannière page de garde tous chantiers + ≥1 audit), M2 (comparateurs nom/SIRET/date vide≠conforme), M3 (LED 0 vs 0 ≠ conforme, helper `ledConforme`), M6 (garde `substring`). Bancs `/tmp/test-{k3,m2,m3}.mjs` (jetables, à recréer si besoin — modèle `test-batiments.mjs` `extractFn`).

**RESTE À FAIRE (ordre proposé)** :
1. ~~**LOT 3**~~ **✅ FAIT** (M1/M4/M5, branche non mergée). ~~**Mineurs sécurité/robustesse (LOT 4)**~~ **✅ FAIT** (erreurs client, timeout, SRI+en-têtes).
2. **MERGE de la branche `fix/m4-led-miss-signal` vers `main`** (geste IZANAMI) + `vercel deploy --prod` manuel si l'auto-deploy est toujours à la traîne.
3. **Mineurs restants** (cosmétique/doc, faible valeur — beaucoup deviendront caducs avec la phase B) : A4 (tolérance LED stricte), 9 `alert()`, fuite `state.chantiers`, `check_23` id nu, label `nbChantiers`, A3 doc §6 périmée, routage `check_47_global` sans `portee`, 5 normalisations d'adresse, 2 systèmes de routage, code mort (`renderChecksByFamille`/`createErrorGroupCard`/`autoDetectChantiers` #35), ~122 `console.log`, `.env.example` désync, CLAUDE.md désync.
4. **Extensions M2 différées** : `compareParcelles` (attention DELEFORTRIE sans parcelle), `compareSecteurEtude` (#27).
5. ~~**Phase B modularisation**~~ **✅ EXTRACTION FAITE (ADR-016, 08-09/07/2026)** — reste : **MERGE de
   `feat/phase-b-modularisation`** (geste IZANAMI). Suites différées (chantiers futurs) : **conversion ES6
   (cible B)** — inclut l'encapsulation des 4 globales d'affichage (étape 6) + orchestrateur mince (étape 7) ;
   **CSP stricte** (après retrait des `onclick` générés) ; **« règles métier en configuration »** (objectif
   produit multi-clients).
6. **Re-grain check_19/21/28/29/30** (5 faux « 66 vs 52 » multi-chantiers, référence au total dossier au lieu du chantier) — **REPORTÉ derrière #3**, diagnostic + 2-3 approches avant code.

**Méthode de travail confirmée cette session** : diagnostic lecture seule cité `fichier:ligne` → 2-3 approches + reco → validation IZANAMI → banc d'essai node (charge le vrai code via `extractFn`) → diff verbatim + STOP → preview testé par IZANAMI → merge (geste délégué à Claude quand IZANAMI dit « merge »). ⚠️ **Modèle métier** : Dossier → Chantiers → Cellules(=bâtiments) ; une adresse peut regrouper plusieurs bâtiments comptés variablement (grain non fiable = cœur du #27/Pivot B). `api/analyze.js` = couche LLM, jamais touchée avec du JS dans le même commit.
