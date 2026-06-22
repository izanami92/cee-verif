# MODIFICATIONS PLANIFIÉES ET EN COURS

**Document de suivi — ACTIF uniquement.** L'historique clos (TODO terminés, sessions mergées,
stats datées, sources ADR) est dans `pending-todos-archive.md` (consulté à la demande, pas lu d'office).

**Dernière mise à jour** : 22 juin 2026

---

## TODOs actifs (index)

- 🔴 **Critiques** : **diagnostic découpage chantiers 5≠3 (LATRILLE) — prérequis #27, PRIORITÉ COURANTE** · #27 (check « attestation entrepôt manquante » : règle figée + Option 1 décidées, **en attente derrière le découpage**) · #22 (modèle Chantier/Cellule, ADR-015) · #29 (alerte 1.4, logique 3 issues)
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

### TODO #27 : découpage des chantiers (⛔ facette LATRILLE 5≠3, PRIORITÉ) + facette `check_39`

**Statut** : 🔴 **PRIORITÉ COURANTE — diagnostic du découpage 5≠3 (LATRILLE)**, prérequis du check « attestation entrepôt manquante ».

#### ⛔ Blocage LATRILLE (run 22/06) — le découpage des chantiers est faux à la racine
**LATRILLE** (SIRET `89226144700015`) = **7 bâtiments sur 3 adresses réelles** (Lauriol ×3, 36 Grozeille ×3,
La Piotte ×1), **6 attestations entrepôt présentes** + **1 chantier secteur « Autres »** (Lauriol BAT 2,
légitimement sans attestation) — c'était le **cas de test mixte (Entrepôts + Autres)** qui manquait.
**MAIS en run réel l'outil détecte 5 chantiers au lieu de 3** : le **1er bâtiment de chaque groupe n'a pas de
mention « BAT »** (« À Lauriol », « 36 À Grozeille ») et porte des **variations de graphie** (virgule traînante
« À Lauriol, », parcelles différentes 0022 vs 0023 sur Grozeille) que le **dédoublonnage d'adresses**
(`index.html:2049-2074` + `normaliserAdresseSansBatiment` `index.html:3497`) **ne neutralise pas**. C'est le
**Bug #27 dans sa forme pure**, démontré en conditions réelles.
**Conséquence** : tant que le découpage est faux, le **dénominateur du check #27 est cassé à la racine** —
l'**Option 1 elle-même est compromise** (le `max` inclurait le 5 erroné).
**Décision IZANAMI** : **diagnostiquer d'abord le découpage 5≠3** (prérequis prioritaire) ; le check
« attestation entrepôt manquante » **passe en attente derrière**.
**Question métier OUVERTE (appartient à IZANAMI — NE PAS trancher)** : deux bâtiments à **parcelles différentes**
mais **même adresse postale** (Grozeille 0022/0023) = **un chantier ou deux** ? Ça change le résultat attendu
(3 si la parcelle est ignorée).

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

## Processus de mise à jour
Mettre à jour ce fichier : en fin de session ; à chaque évolution proposée ; quand un TODO est complété
(déplacer vers `pending-todos-archive.md`) ou abandonné (tracer la raison en archive).

---

**Dernière révision** : 22/06/2026 — diagnostic de faisabilité du check « attestation entrepôt manquante »
**FAIT** (3 runs DELEFORTRIE/COPPIN ; angle mort C3 + filet prouvé ; **Option 1 « borne haute »** retenue ;
règle figée *secteur Entrepôt ET NAF 01/02* ; ADR à venir) ; ⛔ **blocage LATRILLE** (découpage 5≠3) découvert
→ **réordonne les priorités** : diagnostic découpage d'abord, check #27 en attente. Commits doc **poussés sur
`fix/s4a`, non mergés sur `main`** : housekeeping `a159163`, recalage `compareAddress` `f3bc540`.
**Prochaine session** : diagnostic du **découpage des chantiers 5≠3** (cas LATRILLE) — prérequis du check #27.
