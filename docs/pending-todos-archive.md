# Archive — pending-todos

> Historique de `pending-todos.md` — blocs clos et livrés. Consulté à la demande, non lu au rituel d'ouverture.

---

## ✅ BRANCHE MERGÉE — `feat/vue-par-chantier` (vue « Par chantier »)

**Statut** : ✅ **MERGÉE SUR `main`** (merge `ed85199`, 10/06/2026). Base = `f734f8d` (sommet de `feat/familles-grille-2d`, fix grille famille). **Sommet actuel : `ba04bee`** (réordonnancement des onglets — Par chantier / Tous les points / Par famille en tête ; validée en preview puis mergée en prod le 10/06/2026).

> Objectif : vue « Par chantier » en 2 blocs (Bloc 1 « Dossier global » CEE|Audit|Synthèse ; Bloc 2 « Chantiers » Audit|Synthèse), précédés d'une ligne d'avertissements CEE recalculés live (chips), EN PLUS de la vue « Par famille » qui reste intacte. Au merge final, l'ensemble (grille famille + vue chantier) part sur `main` d'un bloc — geste d'IZANAMI.

### Commits livrés (figés + poussés sur origin, validés en preview)

| Commit | Hash | Contenu |
|--------|------|---------|
| 1 — refactor | `ddae5e1` | Extraction de 3 helpers PURS partagés (`detectAutresSecteurs` / `detectResteAPayer` / `detectProfessionnelMiseEnOeuvre`) depuis le handler `btnAnalyze`. Comportement strictement identique. Prérequis anti-divergence du futur bloc CEE. |
| 2 — squelette | `8764041` | Onglet « Par chantier » (bouton + panneau `#tabChantier` + `renderChantierActiveTab` confiné TODO #31 + 2 branchements). |
| 3 — grille | `096ae77` | `renderChantierGrid` : lignes=chantiers + ligne « Dossier (global) », colonnes Audit\|Synthèse, `renderCelluleChantier` (badge `etatCellule` + compteur `N✓`), condensation D1, **bloc CEE PROVISOIRE** visible, seaux Sheet/non-rangés visibles. Critère bloc CEE = `type==='cee'` STRICT (`check_36` reste dans la grille). CSS `#chantier-grille-style` autosuffisant (option A, dette #36). `renderFamillesGrid` / `#familles-grille-style` NON touchés. Vérif adverse 3 angles OK. |
| consignation | `00525b1` | Doc : consignation de l'état (commits 1-3) + décisions actées du futur commit 5. |
| 4 — tri détail | `38f50ab` | Détail d'une cellule trié : gravité décroissante (bloquant>majeur>info>ok) puis ordre `CEE_FAMILLES.ORDRE` via `resolveFamille` ; famille `null` → **queue** de son groupe de gravité (jamais perdu). Pré-tri local des tableaux `lNode[col]` dans `renderChantierGrid`, tri stable. Vue chantier seule ; `renderDetailLigne` / « Par famille » non touchés. |
| 5 — bloc CEE | `3c16e43` | ZONE 1 = ligne compacte d'**AVERTISSEMENTS confirmables RECALCULÉS live** (chips + tooltip) via les 6 helpers purs (`detectAutresSecteurs`/`detectResteAPayer`/`detectProfessionnelMiseEnOeuvre`/`verifierDelaisTravaux`/`detectFautifsAttestationNonAgricole`/`detectFautifsDimensionnement`) sur `currentExtractedData.cee` + `window.selectedCodeNaf` (gate NAF 1.3 répliqué) — **jamais de capture d'état**. ZONE 2 (approche B initiale) = bloc « comparaisons transversales » montrant **toute** `ceeChecks`. |
| amendement A | `297e00c` | Fusion des checks `type='cee'` dans la ligne « Dossier (global) » (grille uniforme 3 col CEE\|Audit\|Synthèse) ; retrait du bloc transversal séparé ; repli conditionnel du détail global. |
| esthétique | `6761827` | CSS pur scopé `#checksListChantier` : démarcation entre zones + titre de zone marqué + libellés de colonne discrets. « Par famille » (`#checksListFamilles`) strictement intacte. |
| restructuration | `23ac9de` | Vue scindée en **2 blocs titrés** : Bloc 1 « Dossier global » (CEE\|Audit\|Synthèse) / Bloc 2 « Chantiers » (Audit\|Synthèse, sans CEE) + **filet `cee→global`** (`renderChantierGrid` : tout `type='cee'` forcé en ligne globale → jamais perdu, même un hypothétique cee+chantierIndex). |
| chips au clic | `c8af4c8` | feat(chantier) : détail des chips d'avertissement CEE accessible **AU CLIC** (panneau déplié `.collapsed`) au lieu du survol `title=`. Chip (pastille + libellé + compteur) toujours visible ; seul le détail par chantier passe au clic (1 chantier/ligne). Principe n°1 préservé. CSS scopé `#checksListChantier`. |
| align. « — » | `dabf1c8` | style(chantier) : « — » des cellules vides calé à gauche (à l'aplomb des badges). Règle CSS scopée `#checksListChantier` ; règle famille (`#familles-grille-style`) intacte ; aspect neutre/vide conservé (principe n°1). |
| accent panneau | `0d89623` | style(chantier) : accent d'état sur le panneau de détail des chips — barre latérale colorée via `couleur(c.etat)` (**MÊME source que la chip** → pas de divergence), titre conforme=texte vert / à_vérifier=badge jaune+texte `#1a1a1a`, **FOND du panneau neutre** (principe n°1 : pas de nappe colorée). Scopé `#checksListChantier`. |
| badges (line-height) | `bb71ff9` | style(chantier) : resserrage de la boîte des badges de cellule (`line-height: 1.2` ; sinon héritage 1.6 du body → boîte trop haute, « rectangle trop grand » sur CONFORME). Corrige Bloc 1 + Bloc 2. Contour `.marque` du « à vérifier » préservé. Scopé `#checksListChantier`. |
| défaut chantier | `9a5b880` | feat(chantier) : « Par chantier » devient la vue affichée **PAR DÉFAUT** au chargement (déplacement de la classe `active` du couple bouton+panneau familles → chantier dans le HTML statique ; zéro JS). « Par famille » reste accessible au clic. |
| ordre onglets | `ba04bee` | feat(chantier) : réordonnancement des onglets — ordre Par chantier, Tous les points, Par famille, puis Page de garde / Synthèse / Audit / Message auditeur (4 derniers inchangés). Déplacement de boutons uniquement (handler par `data-tab`, panneaux par classe `active`) ; aucun panneau/JS/CSS touché. |

> **Les 6 commits de session (`c8af4c8` → `ba04bee`) = AFFICHAGE / agencement UI** (chips au clic, alignement « — », accent d'état du panneau, resserrage badges, vue « Par chantier » par défaut, ordre des onglets) : **aucune règle métier touchée**, harnais `test-familles.mjs` resté **71/71**, **principe n°1 préservé à chaque étape** (chip toujours visible, « — » jamais vert, fond de panneau neutre, contour « à vérifier » conservé) → **aucune entrée `SOURCE_DE_VERITE_CHECKS.md` §7bis requise**.

### Décision majeure de la session (9 juin) — restructuration en 2 blocs (approche B re-choisie)

La vue « Par chantier » a été **restructurée en 2 blocs distincts** : Bloc 1 « Dossier global » (3 col CEE\|Audit\|Synthèse) / Bloc 2 « Chantiers » (2 col Audit\|Synthèse, **sans CEE**). C'est structurellement l'**« approche B »** d'abord écartée au profit de la grille uniforme (amendement A `297e00c`), **re-choisie en connaissance de cause** après preview (la grille uniforme à en-tête unique 3 col décrivait mal les lignes chantier qui n'ont jamais de CEE). Le **filet `cee→global`** (dans `renderChantierGrid`) garantit qu'**aucun check `type='cee'` ne disparaît**, même per-chantier : `getCheckProvenance` couple déjà `type='cee'` ⟹ `chantierIndex=null` (3 routes le posent, aucune route cee ne renvoie un index), et le filet force en plus tout `cee` vers le Bloc 1 — seul à porter une colonne CEE.

> Les anciennes « décisions actées pour le commit 5 » (bloc CEE = avertissements recalculés / comparaisons transversales en ligne Dossier / critère à trancher) sont désormais **RÉALISÉES** — commits `3c16e43` → `23ac9de`. Aucune règle métier touchée (affichage + filet de routage défensif) → pas d'entrée §7bis dans `SOURCE_DE_VERITE_CHECKS.md`.

### Sujets restants

- ✅ **TODO #32** (mentions agricoles 4→1) : **réalisé** le 10/06/2026, commit `e3dbd6d` — voir « COMPLÉTÉS RÉCEMMENT ». Le harnais est passé de 71 à 69 cas comme prévu (changement de forme attendu, pas une régression).
- **Commit 6 (non livré)** : bandeau pastilles familles à NOMS (`LIBELLES` au lieu des clés courtes), non cliquables, scroll horizontal déjà en place — planifié sur cette branche, **pas encore réalisé** *(statut à confirmer avec IZANAMI : garder ou abandonner)*.
- ⛔ **Commit 6 ABANDONNÉ le 19/06** — bandeau pastilles familles à noms, non retenu.

### Dettes / bugs liés à cette branche

- **TODO #36** (créé ce chantier) : extraire les styles de grille partagés dans un bloc neutre (supprime la duplication `#chantier-grille-style` / `#familles-grille-style` + la dépendance d'ordre). À traiter après merge (touche `renderFamillesGrid`).
- **TODO #35** (préexistant) : supprimer le corps mort `renderChecksByFamille` après validation prod de la grille famille.
- **9 `alert()` restants** (limite connue, cf. § « Harmonisation alert() → modale/toast » plus bas) : supprimables par le navigateur, mais **sans faux « conforme »** (ce ne sont pas des portes de décision, contrairement aux `confirm()`). Passe d'harmonisation modale/toast à prévoir. *(TODO #32 déplacé en « Sujets restants ».)*
- **Observation mineure (cosmétique, non bloquant)** : le sélecteur `.groupe-content.collapsed + .groupe-header .toggle-icon` (rotation de l'icône ▼) ne matche jamais (le `.groupe-header` précède le `.groupe-content` dans le markup) — quirk **préexistant** de la grille famille, recopié à l'identique dans `#chantier-grille-style`. Sans effet fonctionnel (le repli marche via `display:none`).

---

#### Étape 4a — `extraireNombreBatiments` : LIVRÉE (12/06/2026)

Branche `fix/s4a-extraire-batiments-accents` (empilée sur s3), commitée+poussée
(`219b024` v1 + `c8b1244` final). `extraireNombreBatiments` refondue :
- `normalize()` en amont (graphie « bât »/« BÂT » accentuée reconnue → divergence
  avec `normaliserAdresseSansBatiment` résolue) ;
- **neutralisation du code postal** AVANT analyse : `\d{5}` et forme découpée
  `\d{2}\s\d{3}` (avant OU après la ville) — un n° de bâtiment fait ≤ 2 chiffres,
  donc un nombre de 5 chiffres est forcément un CP, jamais avalé dans le compte ;
- **séparateurs ciblés** chacun suivi d'un nombre (pas de sur-capture d'un mot
  voisin) : virgule, « à »/« a » de plage, tiret, « et », espace-nu ;
- **gardes parcelle** sur tiret ET espace-nu (lookahead `(?!\d+\s*/)`, parcelles
  toujours en slashes).
Gère plages (`max−min+1`) et listes (comptage). **Prouvé par auto-test isolé
21/21** ; pas de preview (cosmétique : n'affecte qu'un libellé « (N bâtiments) »
sur check_09d, aucun `niveau` de check n'en dépend). Harnais 70/70. **Non mergée.**

#### Dette 4a-bis — séparateur « & » — ✅ LIVRÉE (16/06/2026, commit `a888308`)

Branche `fix/s4a-extraire-batiments-accents` (même branche que 4a, empilée sur s3),
commit `a888308` poussé, **non mergé**. `extraireNombreBatiments` reconnaît désormais
le séparateur « & » (« bat 1 & 2 » et « bat 1&2 » → 2). Branche `\s*&(?!\s*\d+\s*\/)\s*`
ajoutée à l'alternance de `pattern` : **espacement optionnel** (forme virgule/tiret,
PAS la forme « et » en `\s+` — couvre le « & » collé comme espacé) + **garde parcelle**
`(?!\s*\d+\s*\/)` répliquée comme sur le tiret et l'espace-nu. `estPlage` non touché
(« & » = séparateur de LISTE, pas de plage). Nouveau harnais versionné
`test-batiments.mjs` (lit le vrai code d'`index.html` par extraction d'accolades, pas
une copie) : **13/13**. Harnais `test-familles.mjs` : **70/70**.

#### Dette 4a-ter — séparateur « & » dans `normaliserAdresseSansBatiment` — ✅ LIVRÉE (18/06/2026, commit `281acac`)

ÉTAIT : `normaliserAdresseSansBatiment` (`index.html:3502`) nettoyait via la classe
`[\d,\-\sà]` qui ne contenait PAS « & » → « bat 1 & 2 » y laissait traîner « & 2 » après
nettoyage. **Corrigé** : la classe est désormais `[\d,\-\sà&]` (« & » ajouté) → clé de
regroupement symétrique avec `extraireNombreBatiments` (4a-bis). Signalée par le
diagnostic 4a-bis (16/06/2026), traitée dans le contexte 4b. Commit `281acac` poussé,
**non mergé**.

#### Étape 4b — reconstruire la LED chantier depuis `cellules[]` : ✅ VOLET 1/2 LIVRÉ (18/06/2026, commit `1f7c663`)

Objectif inchangé : faire tomber l'échec **« 52 vs 66 » de check_09d** sur
DELEFORTRIE, en reconstruisant `ledTotal` chantier = somme des `ledCellule` des
cellules d'une même adresse (26+26 → **52**).

✅ **Volet 1/2 LIVRÉ (18/06/2026, commit `1f7c663`)** : `ledTotal` chantier reconstruit
= Σ `ledCellule` par substitution sur adresse normalisée, DANS
`regrouperAttestationsParAdresse` (helper `sommerCellulesParAdresse`, `index.html:3523` ;
substitution `index.html:3599-3602` ; appel `index.html:4319` passant
`norm.cee?.cellules || []`). Correctif β `f05f150` : `cellule.adresse` complète (rue +
bâtiment + CP + ville, recopie du bloc facture) pour la symétrie cellules↔attestations.
Instrumentation diag posée puis **retirée après validation** (`142a353`/`eee731b` →
`65fa61f`). **Non mergé.** Le label « 1/2 » suppose un **volet 2/2** que ce doc ne
définit PAS → à cadrer (ne pas inventer).

**Débloquée par la révision étape 3 (`d589c69`).** Le blocage initial (asymétrie
`attestations[].adresse` AVEC ville/CP vs `cellules[].adresse` SANS) est **caduc** :
- depuis Philo 2, les cellules sont émises par bloc facture et leur `ledCellule`
  porte directement la quantité par bâtiment ; la reconstruction se fait en
  **groupant les cellules entre elles par adresse normalisée** (cellule vs cellule,
  même grain), PAS en appariant cellules ↔ attestations. L'asymétrie ville/CP ne se
  pose donc plus.

**Décisions ci-dessous APPLIQUÉES** dans le volet 1/2 (`1f7c663`) :
- reconstruire DANS `regrouperAttestationsParAdresse` (`index.html:3516`) → seul
  check_09d impacté (unique lecteur du `ledTotal` regroupé) ;
- `cellules[]` en 2ᵉ paramètre optionnel ; site d'appel `index.html:4290`, passer
  `norm.cee?.cellules || []` ;
- logique hybride : groupe avec ≥ 1 cellule → `ledTotal` = Σ `ledCellule` ; groupe
  sans cellule → `ledTotal` inchangé ;
- ne PAS toucher `attestations[].ledTotal` brut.
- ⚠️ Reconfirmer en Plan Mode la clé de regroupement des cellules entre elles avant
  d'écrire (la forme `cellules[].adresse` peut inclure ou non « BAT n » selon le
  bloc facture — cf. COPPIN « 541 » vs « 541 BAT 2 »).

**Dette 4a-ter liée** : ✅ **RÉSOLUE** (`281acac`) — `normaliserAdresseSansBatiment`
(`index.html:3502`) gère désormais « & » (classe `[\d,\-\sà&]`) ; la clé de regroupement
4b qui s'appuie sur cette fonction est donc symétrique.

---

#### A) État des branches (chaîne EMPILÉE depuis `main` = `279e0e1`)

> ⚠️ **PÉRIMÉ** (s1/s2 hors ascendance, prouvé 19/06) — conservé pour mémoire.

| Branche | Tip | État | Contenu |
|---------|-----|------|---------|
| (`main`) | `279e0e1` | ✅ **prod** | S4a mergé (`250ee02`, fusion `check_47_global`, fin du faux conforme silencieux) + ADR-014 (`9bae343`) |
| `feat/s1-cellules-regroupement` | **`38b0890`** | committé + **poussé**, **NON mergé** | **S1** : `regrouperAttestationsParAdresse` ré-expose `cellules[]` (copie superficielle des attestations brutes, 1 entrée = 1 cellule). Additif, ripple nul, harnais 69/69. |
| `feat/s2-appariement-non-silencieux` | **`208185c`** | committé + **poussé**, **NON mergé** | **S2** : **basé sur le tip de S1 → la chaîne est EMPILÉE (S2 contient S1+S2)**. Collision d'adresse (2+ chantiers même adresse) ou attestation introuvable → checks `09d/14/15/20/23` passent en `niveau:'info'` « ⚠️ À vérifier » au lieu de disparaître / fallback silencieux `references.*` / faux majeur. Mono-chantier inchangé. Aucun nouvel id, routage Méthode 0 intact, 69/69. |

> ⚠️ **Empilement** : au merge, ordre **S1 puis S2** (ou merge groupé de la chaîne) — geste d'IZANAMI.

> **Résidu S2 (micro-sujet futur, tracé)** : multi-chantier, attestation **appariée** mais champ comparé vide → fallback/silence subsistant. Cas distinct de collision/miss, hors périmètre S2.


---

### ✅ TODO #30 : [Moteur] checks globaux mal rattachés par getCheckProvenance — RÉSOLU

**Statut** : ✅ **RÉSOLU le 05/06/2026** (commit `3d4d75f`, mergé dans `main`). Branche `fix/provenance-global`.

**Bug (préexistant)** : `getCheckProvenance` (`index.html`) rattachait les checks « dossier » sans `chantierIndex` à **« chantier 1 »** au lieu de la provenance « Global » : `check_39` → `{audit,1}`, `check_36` → `{synthese,1}`, `check_31→34` instables — happés par le fallback texte (méthodes 2/4).

**Solution** : propriété **`portee`** posée à la création des checks dossier — `portee:'global-cee'` sur `check_39` + `check_31→34`, `portee:'global-synthese'` sur `check_36` — lue par une **branche prioritaire** de `getCheckProvenance` (« méthode 0bis ») → `chantierIndex:null` + **colonne portée par la valeur** (`global-cee` → CEE, `global-synthese` → Synthèse). **Pas de liste blanche d'ids** (patron en dur écarté). + ajustement de `groupChecksByHierarchy` (`chantierIndex===null` → bloc Dossier) anti « chantier null ».

**Garanties** : `getCheckProvenance` n'a **qu'un appelant** (vue hiérarchique legacy) → impact limité à cet onglet ; vue « Par famille » **non impactée** (`resolveFamille` ne lit pas `portee`, harnais **71/71**). Seau B mono (`14/19/20/21/23/28/29/30`) inchangé. Validé en preview sur **DES LAURIERS** (multi) + **DETRIVIERE** (mono), totaux inchangés.

**NB** : `check_39` porte aussi un **bug distinct** (faux positif multi-chantiers même adresse) tracé en **TODO #27**, non concerné par ce fix.

**Sources** : [Session 5 juin 2026 — chantier B, fix routage global]

**Suite** : patron `portee` **étendu aux 7 checks dossier restants** le 05/06 (`be607dc`) → voir **TODO #34**. Le prérequis d'assainissement avant la grille 2D est désormais **fait**, sauf `check_47_global` (dette, **TODO #27**).

---

### ✅ TODO #34 : [Moteur] routage Global des checks dossier restants via portee — RÉSOLU

**Statut** : ✅ **RÉSOLU le 05/06/2026** (commit `be607dc`, mergé dans `main` en fast-forward). Branche `fix/portee-global-restants`. Suite directe de **TODO #30**.

**Problème (préexistant, latent)** : 7 checks « dossier » atterrissaient en ligne Global **par accident** — non par `portee` mais par l'**heuristique de chaîne de la Méthode 3** de `getCheckProvenance` (le message contient `'somme'` / `'dossier cee'` / `'adresse siège'` / `'09a'` / `'09b'`). Fragile : réécrire un libellé les aurait fait basculer en **Méthode 4** → `{audit, chantier 1}` → mauvaise cellule (future grille 2D) + risque de **faux conforme silencieux** (donnée Dossier CEE affichée sous un chantier).

**Solution** : extension du patron #30 — `portee:'global-cee'` posée à la création des **7 checks** : `check_09a`, `check_09b`, `check_cee_incomplet`, `check_41`, `check_42`, `check_43` (dans `generateChecks`) + `check_attestation_non_agricole_naf_inconnu` (handler `btnAnalyze`, hors `generateChecks`). Lue par la **méthode 0bis** (branche prioritaire, avant la Méthode 3) → `{type:'cee', chantierIndex:null}`. **Aucune autre propriété touchée** (7 ajouts, 0 suppression). Après le fix, **plus aucun check dossier ne dépend de la Méthode 3** (sauf `check_47_global`, cf. NB).

**Piège `categorie` trompeuse** : `check_41`/`check_43` sont `categorie:'audit'` et `check_42`/`09a`/`09b` `categorie:'synthese'`, alors qu'ils portent une **donnée du Dossier CEE** (adresse siège, date d'engagement, attestation, totaux LED vs CEE) → **colonne CEE**. `portee:'global-cee'` rend ce routage **explicite et structurel**, au lieu de dépendre de la prose.

**Garanties** : harnais `test-familles.mjs` **71/71 inchangé** (`resolveFamille` ne lit pas `portee`) ; vue hiérarchique **byte-identique** (0bis renvoie le même `{type:'cee', chantierIndex:null}` que produisait la Méthode 3) → même bloc Dossier ; **aucun `niveau` ni règle métier modifié** ; **page de garde intacte** (`checks.slice(0,3)`, aucun des 7 n'y figure).

**NB — `check_47_global` exclu (dette, TODO #27)** : créé hors `generateChecks` (dans `recalculateSurfaceChecks`) et **empêtré dans la collision d'id tracée TODO #27** (double `push` du même id qui s'écrasent, données audits/synthèses différentes). Poser une `portee` unique aurait exigé de **trancher la collision** = hors périmètre. Il reste sur la Méthode 3 ; fragilité résiduelle **faible** (déclencheur `'somme'`, mot **structurel** du libellé, peu réécrit).

**Sources** : [Session 5 juin 2026 — chantier B, assainissement routage Global avant grille 2D]

---

### ✅ TODO #26 : Évolution 1.3 (attestation BAT-EQ-127) — COMPLÈTE et en prod

**Statut** : ✅ **TERMINÉE** (3 juin 2026) — C1 + maille + C2 + C3 en prod. Évolution 1.3 complète.

**Fait** :
- ✅ **C1** (branche `fix/naf-fiable-avant-alertes`, mergé `d499737` le 3 juin) : extraction du helper `ensureCodeNafFromSiret(extractedData)`, appelé AVANT la fenêtre d'alertes (après `generateChecks`) + conservé en filet tardif. → `window.selectedCodeNaf` / `isAgricole` fiables au moment des alertes (prérequis du gate NAF). Testé LES MOUETTES (NAF 01.11Z récupéré avant « ANALYSE SECTEURS »), anti-régression 1.4/1.5 OK, pas de double fetch.

**✅ 1.3 complète — 4 briques en prod** :
1. **C1** gate NAF (`d499737`) — `ensureCodeNafFromSiret` avant la fenêtre d'alertes.
2. **Maille stabilisée** (`af21eb8`) — désambiguïsation du prompt, 1 phrase de surface = 1 élément, surfaces mono-valeur (verrou numérique abandonné ; `ledTotal`/`parcelles` non touchés).
3. **C2** champ `attestationNonAgricole` (`0bef3d7`) — **2 états** `'presente'|'non_detectee'` (état `'absente'` abandonné : titre d'attestation fixe), seul `'presente'` = OK, ancré sur « entrepôt de stockage non agricole ».
4. **C3** (`5f1da89`) — `detectFautifsAttestationNonAgricole` (pure, index, attestations **originales**) + alerte confirmable gatée `isAgricole`, NAF inconnu → INFO non bloquant (categorie `cee`), message « présence non confirmée → vérifier BAT-EQ-127 » désambiguïsé surface+LED, jamais bloquant.
+ **C4** doc (ce commit).

**Limites actées (périmètre, PAS bugs)** : (a) couvre seulement les chantiers ayant un élément/attestation — attestation entièrement absente → `check_43` / TODO #27-#22 ; (b) champ lu sur les attestations **ORIGINALES** uniquement (`regrouperAttestationsParAdresse` ne recopie pas la clé).

**Sources** : [Sessions 2-3 juin 2026 — diagnostics 1.3 + implémentation C1]

---

### TODO #27 : Bugs préexistants repérés en console (session 1.3 — À INVESTIGUER, non traités)

Repérés en testant LES MOUETTES, **hors périmètre 1.3**, à traiter séparément :
- **`check_39` « cohérence nombre de chantiers » — faux positif** en multi-chantiers même adresse : 1 audit + 1 synthèse importés (zones dédupliquées par adresse) vs N attestations attendues → `nbAudits ≠ nbAttestations` signalé MAJEUR sur un dossier valide.
- **Appariement par adresse cassé** : un « 4 » initial manquant entre l'adresse Audit (« CHASSIFERT… ») et l'adresse CEE (« 4 CHASSIFERT… ») fait échouer `compareAddress` → check d'adresse en échec + log « Aucune attestation CEE trouvée pour l'adresse… ». Rattaché au sujet « adresses dupliquées » / modèle Chantier-Cellule (TODO #22).
- **Référence produit (`compareProductRef`)** : « NES LIGHT - HB250W » vs attendu « DAEWOO NES-HBL250W » → possible faux positif réf LED.
- **`adressesChantiers` indexée par bâtiment, pas par chantier** : confirmé en preview sur COPPIN (16/06/2026) — 1 chantier / 2 bâtiments à la même adresse (« 541 » + « 541 BAT 2 ») compté comme **2 chantiers** → oblige à importer audit + synthèse en double, et `compareAddress` échoue en boucle. Anchor de régression pour l'étape 5 (au même titre que DES LAURIERS). Le grain cellule (étape 3 révisée) est la brique qui permettra de distinguer « N bâtiments » de « N chantiers ».
  - ✅ **Facette « découpage » corrigée (18/06/2026, commit `bd13444`)** : le cleaner inline du découpage (`extracted.adresses`, `index.html:2052`) collapse désormais les espaces (`\s+→' '`) après retrait de « BAT n » → COPPIN « rien »+« BAT 2 » refusionne en **1 chantier** (1 zone d'import). Cause-racine du split = `3673109` (ère-main, 11/05, regex BAT passée à `[\d\-]+` sans `\s*` final → double espace si « BAT n » au milieu de l'adresse) ; `bd13444` neutralise le symptôme en aval (clé de dédup correcte).
  - ⏳ **Facette « `check_39` » NON corrigée** : `check_39` (`index.html:4994`) compare `attestations.length` (=2 pour COPPIN) à `audits.length` (=1) → reste **MAJEUR** « 1 audit, 1 synthèse, 2 attestations » **même après `bd13444`**. Source de « COPPIN = 2 » **distincte** du découpage. À traiter au bon grain (cellules / N bâtiments par chantier), JAMAIS en regroupant les attestations avant de compter (= faux conforme silencieux si une attestation manque vraiment, principe n°1).

---

### TODO #28 : Extraction section C (Professionnel ayant mis en œuvre) — VOLET EXTRACTION ✅ / logique à 3 issues ⏳

**Statut** : ✅ **EXTRACTION CORRIGÉE en prod** (3 juin 2026, merge `e456b70`) — ⏳ **volet logique métier restant** (voir TODO #29).

**Bug initial** : le champ global `cee.entrepriseMiseEnOeuvre` (section C de l'attestation sur l'honneur Total Énergies) était extrait de façon NON DÉTERMINISTE. Sur le même dossier (LES MOUETTES), il oscillait entre `null` (→ alerte « NON DÉTECTÉ ») et « Energie Responsable » (→ alerte exception), sans jamais atteindre la bonne valeur. Cause : l'IA confondait l'ÉMETTEUR de la facture (Energie Responsable, en-tête/pied de chaque page) avec le professionnel DÉCLARÉ en section C.

**Cause racine confirmée (diagnostic 3 juin)** :
- Prompt d'extraction trop faible (`api/analyze.js`) : aucun ancrage sur l'intitulé « Raison sociale » de la section C, piège « émetteur facture » jamais nommé.
- Exemple JSON piège (`api/analyze.js`) : `"entrepriseMiseEnOeuvre": "Energie Responsable"` = few-shot involontaire vers la valeur-piège.
- Température déjà à 0 → levier = prompt, pas sampling.

**Correctif livré (commit `e456b70`, patron `af21eb8`)** :
- Ancrage de la SOURCE sur le titre EXACT de la section C (« C/ Professionnel ayant mis en œuvre l'opération d'économies d'énergie ou assuré sa maîtrise d'œuvre ») + lecture en face de l'intitulé « Raison sociale » À L'INTÉRIEUR de cette section.
- Contre-exemple concret + piège (émetteur facture) nommé par sa SOURCE (en-tête/pied, R.C.S., Clichy), **jamais par la valeur** → la vraie détection État 2 (ER réellement sous-traitant en section C) est préservée.
- Exemple JSON neutralisé en placeholder générique.
- `api/analyze.js` uniquement. Champ inchangé (string global). `index.html` non touché.

**Testé en prod** : LES MOUETTES → « LES MOUETTES » stable sur plusieurs runs ; autres dossiers « client installe lui-même » → leur propre raison sociale ; cas « Energie Responsable sous-traitant » → alerte État 2 toujours déclenchée. Non-régression OK.

**⚠️ RESTE À FAIRE — bascule vers TODO #29** : pendant ce diagnostic, on a découvert que la logique aval (`index.html:2806-2847`) est trop permissive. Son État 3 (« ≠ Energie Responsable → silence ») avale TOUTE valeur autre qu'Energie Responsable → faux « conforme » silencieux possible si l'extraction renvoie un tiers parasite. Règle métier réelle (validée 3 juin) : `entrepriseMiseEnOeuvre` ne peut légitimement valoir QUE (a) la société cliente — cas normal, silence — ou (b) Energie Responsable — exception confirmable. Toute autre valeur doit produire un signalement visible. → logique à 3 issues, traitée séparément en TODO #29.

**Sources** : [Session 3 juin 2026 — diagnostic + correctif extraction #28]

---

### TODO #33 : [Mémo] fiche technique (check_36) en maille globale — rien à corriger

`check_36` (fiche technique) est **1 fiche unique pour tout le dossier** (celle du CEE) — légitimement **global**. La vérification **par chantier** de la RÉFÉRENCE produit existe déjà via `check_37` (par chantier) + `check_38` (durée de vie, par chantier). **Rien à corriger** ; noté pour mémoire.

**Sources** : [Session 5 juin 2026 — chantier B, fix routage global]

---

### TODO #31 : [UI/debug] confiner renderChecksByFamille à son onglet + nettoyer les console.log

**Statut** : ✅ **CONFINEMENT LIVRÉ le 08/06** (grille 2D, branche `feat/familles-grille-2d`) — `renderChecksByFamille` n'est **plus appelée** → son récap `🔎` ne s'exécute plus ; la nouvelle `renderFamillesGrid` ne se rend que quand l'onglet « Par famille » est actif. Les 5 `console.*` subsistent dans le **corps mort** (filet de revert, cf. **TODO #35**), inertes (jamais exécutés).

`renderChecksByFamille` et son récap console (`🔎 Vue famille — récap`) se déclenchent à **chaque onglet** et à chaque re-rendu (plusieurs logs par analyse). À **confiner à l'onglet « Par famille »** lors de la passe grille, et **nettoyer les `console.log` de debug avant prod**.

**Sources** : [Session 5 juin 2026 — chantier B]

- §9 SOURCE_DE_VERITE — retirer la mention "Prime Evolution" (1.5 livrée le 01/06, oubli de nettoyage)

---

### ✅ Bug « état dossier » volet 2/2 : champs ref* conditionnels

**Statut** : ✅ **COMPLÉTÉ** (2 juin 2026)

Bug « état dossier » entièrement clos (deux volets) :
- **Volet 1/2** (racine, déjà en prod) : le texte du CEE restait en cache entre analyses et le code NAF s'héritait d'un dossier à l'autre → données périmées. Corrigé par invalidation du cache texte CEE + reset NAF au changement de dossier (commits `86a5906` + `7f15377`).
- **Volet 2/2** (ce livrable) : les 13 champs ref* (12 ref* + refLed) remplis conditionnellement par « Extraire depuis le CEE » n'étaient jamais vidés (ni la classe `auto-filled`), et `resetApplication` ne les nettoyait pas → un champ absent du nouveau CEE conservait la valeur du dossier précédent. Corrigé par le helper `clearReferenceFields()` appelé en tête du bloc `if (extracted)` à l'extraction et dans `resetApplication` — jamais pendant l'analyse (ce sont les références des checks). Commit `1ec2c49`, mergé sur `main` (`6a38915`).

**Documenté** : §7 (BUGS MÉTIER) de `docs/SOURCE_DE_VERITE_CHECKS.md`.

---

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

## ✅ COMPLÉTÉS RÉCEMMENT

### ✅ TODO #32 : Fusion check_31→34 en un check global mentions agricoles

**Statut** : ✅ **COMPLÉTÉ** (10 juin 2026)

**Problème** : `checkMentionsAgricoles` est appelé **1× sur tout le dossier**, mais son résultat était recopié dans **4 checks identiques** (`check_31→34`, `categorie` alternée arbitraire `i === 32 ? 'audit' : 'synthese'`) → compteurs gonflés ×4 (MAJEUR comme ✓) et 4 lignes majeures dupliquées dans le message auditeur.

**Correctif appliqué** (décisions IZANAMI : survivant `check_31` / retrait des entrées de table mortes / `categorie:'synthese'`) :
- `index.html` : boucle `for (i=31..34)` remplacée par un push unique — `id:'check_31'`, `portee:'global-cee'` conservée (routage méthode 0bis vers Bloc 1 Dossier global / colonne CEE), `categorie:'synthese'`, champ « Mention agricole (Audit + Synthèse) » (le mot « agricole » maintient le groupe sémantique `'secteur'`)
- `familles-config.js` : retrait des 3 entrées mortes `/^check_32$/`, `/^check_33$/`, `/^check_34$/` (l'entrée `/^check_31$/ → '3'` reste) ; `resolveFamille` intouchée
- `test-familles.mjs` : **71 → 69 cas** (65 positifs + 4 négatifs) — retrait des 3 cas positifs, `check_32` converti en **contrôle négatif** (attendu `null` : non-régression active du dédoublonnage)
- Détection `checkMentionsAgricoles` strictement **inchangée** (périmètre Audit + Synthèse, fix B1 intact). L'onglet legacy Audit perd sa ligne (ex-`check_32`) — assumé, essence du dédoublonnage. Maille document × chantier toujours hors périmètre (**TODO #22**).

**Fichiers modifiés** : `index.html`, `familles-config.js`, `test-familles.mjs` (+15, −22)

**Commits** :
- `e3dbd6d` - "refactor(checks): fusionne check_31→34 en un check global mentions agricoles (TODO #32)"

**Sources** :
- [Session 10 juin 2026 — diagnostic (workflow 3 explorateurs + conception) puis implémentation validée]

---

### ✅ TODO #23 : Correction bug B1 — mentions agricoles

**Statut** : ✅ **COMPLÉTÉ** (27 mai 2026)

**Problème** (Règle B de la source de vérité) :
- `checkMentionsAgricoles` marquait les checks 31-34 en `'bloquant'` au lieu de `'majeur'`
- Cherchait aussi dans `extracted.cee.secteurActivite` au lieu de se limiter à Audit + Synthèse

**Correctif appliqué** :
- Niveau passé en `'majeur'` (`index.html:4288`)
- Bloc de recherche dans le CEE supprimé (`index.html:3444-3449`)

> Post-fusion **TODO #32** (10/06/2026, `e3dbd6d`) : les checks 31-34 n'existent plus — le fix B1 (niveau `majeur`, périmètre Audit + Synthèse) s'applique au check global unique `check_31`.

**Fichiers modifiés** :
- `index.html` (+1, -8)

**Commits** :
- `b3450c2` - "fix(B1): mentions agricoles en majeur + recherche limitée à Audit/Synthèse"
- `e90d14c` - "Merge branch 'fix/mentions-agricoles' into main"

**Sources** :
- [docs/SOURCE_DE_VERITE_CHECKS.md — Règle B / Bug B1]
- [Session 27 mai 2026]

---

### ✅ TODO #24 : Correction bug B2 — alerte secteur multi-chantiers

**Statut** : ✅ **COMPLÉTÉ** (28 mai 2026)

**Problème** (Règle A de la source de vérité) :
- L'alerte `confirm()` pour secteur « Autres » fonctionnait en mono-chantier mais pas en multi-chantiers
- Cause : le prompt d'extraction CEE demandait à Claude de chercher le secteur « SOUS l'adresse du chantier dans l'attestation », alors qu'il est en réalité dans le bloc facture du chantier (adresse + parcelles + secteur ensemble)
- Conséquence : `attestation.secteurActivite` était `undefined` en multi-chantiers → l'alerte ne se déclenchait jamais

**Correctif appliqué** :
- Reformulation de la section « CEE - SECTEUR D'ACTIVITÉ PAR CHANTIER » du prompt (`api/analyze.js:328-331`)
- Précision : chercher dans la FACTURE, dans le bloc associé à chaque chantier (identifié par adresse + parcelles cadastrales)
- Fallback explicite vers l'attestation sur l'honneur si non trouvé dans la facture

**Fichiers modifiés** :
- `api/analyze.js` (+3, -2)

**Commits** :
- `7242107` - "fix(B2): secteur d'activité extrait par chantier depuis la facture du CEE"
- `5556c29` - "Merge branch 'fix/alerte-secteur-multichantiers' into main"

**Sources** :
- [docs/SOURCE_DE_VERITE_CHECKS.md — Règle A / Bug B2]
- [Session 28 mai 2026]

---

### ✅ TODO #25 : Évolution 1.1 — alerte confirmable « reste à payer »

**Statut** : ✅ **COMPLÉTÉ** (28 mai 2026)

**Évolution** (ROADMAP 1.1) :
- `check_40` (reste à payer = 0€), codé en `bloquant` à tort, remplacé par une alerte de confirmation à 3 états
- Valeur absente / non interprétable → alerte « non détecté » ; valeur ≠ 0 → alerte « montant anormal, confirmer ou corriger » ; valeur = 0 → aucune alerte
- La distinction des 3 états comble un faux « conforme » : auparavant une valeur non extraite passait silencieusement pour 0 (`compareMoney(undefined, '0')` renvoyait `true`)
- Pattern repris de l'alerte secteur « Autres » ; `compareMoney` non modifiée (détection locale des états)

**Fichiers modifiés** :
- `index.html` (+41, -14)
- `docs/SOURCE_DE_VERITE_CHECKS.md`, `docs/ROADMAP_EVOLUTIONS.md`

**Commits** :
- `0aaf465` - "feat(reste-a-payer): remplace check_40 bloquant par alerte confirmable 3 états (absent/≠0/=0)"
- `87d24d5` - "docs: màj source de vérité + roadmap après implémentation 1.1"

**Sources** :
- [docs/SOURCE_DE_VERITE_CHECKS.md — §1 alerte de confirmation / §7bis]
- [docs/ROADMAP_EVOLUTIONS.md — Évolution 1.1]
- [Session 28 mai 2026]

---

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

### ✅ TODO #20 : Gestion attestations CEE manquantes

**Statut** : ✅ **COMPLÉTÉ** (25 mai 2026)

**Problème** :
- Confusion entre 2 types d'attestations (matériel vs entrepôt)
- Si attestation entrepôt absente : erreur MAJEUR "Attendu: = 0 m²"
- Pas de saisie manuelle déclenchée si NAF agricole

**Solution implémentée** :
1. **API - Distinction 2 attestations** (api/analyze.js lignes 221-253)
   - Instructions explicites : "ATTESTATION SUR L'HONNEUR" + "Existence d'un entrepôt"
   - Exclusion explicite attestation d'installation matériel

2. **Détection surfaces vides** (index.html lignes 2728-2753)
   - Si `surfaces: []` → `surfaceManuelle = true` (prioritaire)
   - Raison : "Attestation CEE non trouvée"

3. **Check INFO au lieu de MAJEUR** (index.html lignes 4540-4572)
   - Vérification avant génération checks 42, 45, 45b
   - Check INFO + `return` si attestations vides

4. **Check 45b protection défensive** (index.html lignes 4713-4727)
   - Vérification surfaces attestations avant comparaison

**Résultat** : Attestations manquantes détectées + saisie manuelle automatique ✅

**Fichiers modifiés** :
- `api/analyze.js` (+23 lignes)
- `index.html` (+68 lignes, -23 lignes)

**Commits** :
- `158e33b` - "fix: détection attestations CEE manquantes + distinction 2 types attestations"

**Sources** :
- [Session 25 mai 2026]
- [ADR 013]

---

### ✅ TODO #21 : Restructuration documentation et archivage

**Statut** : ✅ **COMPLÉTÉ** (27 mai 2026)

**Problème** :
- Règles métier dispersées dans 3 fichiers (CHECKLIST_COMPLETE.md, business-rules.md, points-controle.md)
- Redondances et incohérences entre sources
- Pas de vision claire des évolutions à venir

**Solution implémentée** :
1. **Nouvelle source de vérité unique** : `docs/SOURCE_DE_VERITE_CHECKS.md`
   - Checks détaillés par identifiant et logique, nombre variable selon le nombre de chantiers
   - Règles métier consolidées
   - Format structuré pour maintenance

2. **Roadmap des évolutions** : `docs/ROADMAP_EVOLUTIONS.md`
   - Vision claire Phase 2-3-4
   - Priorités documentées

3. **Archivage anciennes docs** : `docs/archive/`
   - CHECKLIST_COMPLETE.md (obsolète)
   - business-rules.md (obsolète)
   - points-controle.md (obsolète)
   - Avertissement ajouté en haut de chaque fichier

4. **Mise à jour CLAUDE.md** :
   - Section "RÉFÉRENCE MÉTIER" en haut
   - Pointe vers SOURCE_DE_VERITE_CHECKS.md comme référence unique

**Résultat** : Documentation consolidée, source de vérité unique, historique préservé ✅

**Fichiers modifiés** :
- `docs/SOURCE_DE_VERITE_CHECKS.md` (nouveau)
- `docs/ROADMAP_EVOLUTIONS.md` (nouveau)
- `docs/archive/CHECKLIST_COMPLETE.md` (déplacé + avertissement)
- `docs/archive/business-rules.md` (déplacé + avertissement)
- `docs/archive/points-controle.md` (déplacé + avertissement)
- `CLAUDE.md` (section RÉFÉRENCE MÉTIER ajoutée)

**Commits** :
- `afea612` - "docs: source de vérité métier + roadmap évolutions"
- `58cc177` - "docs: archivage anciennes docs obsolètes"
- `9ccf93c` - "docs: CLAUDE.md pointe vers la source de vérité"

**Sources** :
- [Session 27 mai 2026]

---

## 📊 STATISTIQUES

**TODOs actifs** : 8
- 🔴 Critiques : 2 (TODO #22 — modèle Chantier/Cellule, à cadrer ; TODO #29 — alerte 1.4 logique à 3 issues, faux « conforme » silencieux, à cadrer) — *(TODO #30 + #34 routage global : ✅ RÉSOLU 05/06 (`3d4d75f` + `be607dc`) ; TODO #26 / évolution 1.3 : ✅ TERMINÉE en prod)*
- 🟡 Importantes : 1 (TODO #3 reportée)
- 🟢 Nice to have : 5 (dont TODO #31 — confiner renderChecksByFamille + nettoyer console.log ; TODO #32 — checks 31-34 redondants) — *(TODO #33 fiche technique globale = mémo, rien à corriger)*
- 🔍 Bugs à investiguer (non comptés) : TODO #27 — `check_39` faux positif multi-chantiers même adresse ; appariement adresse « 4 » manquant ; réf produit `compareProductRef`
- ✅ TODO #28 (extraction section C) — **volet extraction corrigé en prod** (`e456b70`) ; volet logique aval → TODO #29

> ✅ Bug « état dossier » volet 2/2 (champs ref* conditionnels) **résolu le 2 juin 2026** (commit `1ec2c49`, mergé `6a38915`) — bug entièrement clos avec le volet 1/2 (commits `86a5906` + `7f15377`). Voir `SOURCE_DE_VERITE_CHECKS.md` §7.
> ✅ Bug prod (non numéroté) **résolu 29/05/2026** : crash `norm.cee` null dans `generateChecks` (commit `27e7918`). Anomalie A2 (check_41 majeur) résolue le même jour (commit `f976521`). Voir `SOURCE_DE_VERITE_CHECKS.md` §7/§6.

**TODOs complétés récemment** : 28 (7 mai - 10 juin 2026)
- 7 mai : Multi-chantiers (ADR 003)
- 8 mai : Sélecteur LED (ADR 006), Normalisation adresses (ADR 007), Extraction CLIENT (ADR 008)
- 9 mai : UX hiérarchique (ADR 009), Secteur par chantier (ADR 010), Matching INDEX (ADR 011)
- 11 mai : Google Sheets (ADR 004), Support NAF (ADR 005)
- 12 mai : Documentation Phase 1-2-3 (TODO #18), Checks 39-47 (TODO #1), Check 27 tolérance (TODO #2)
- 23 mai : Surfaces individuelles (ADR 012, TODO #19)
- 25 mai : Attestations manquantes (ADR 013, TODO #20)
- 27 mai : Documentation restructurée (TODO #21), Bug B1 mentions agricoles (TODO #23)
- 28 mai : Bug B2 alerte secteur multi-chantiers (TODO #24)
- 28 mai : Évolution 1.1 alerte confirmable reste à payer (TODO #25)
- 29 mai : Crash `norm.cee` null dans generateChecks corrigé (commit 27e7918)
- 29 mai : Anomalie A2 — check_41 adresse siège bloquant→majeur (commit f976521)
- 1er juin : Évolution 1.5 alerte confirmable étude de dimensionnement = Prime Evolution (commits a4130d6 extraction + ba1fcce alerte)
- 1er juin : Évolution 1.4 alerte confirmable professionnel = Energie Responsable (commits 91bf93d + 5392776)
- 2 juin : Bug état dossier volet 2/2, champs ref* conditionnels (commit 1ec2c49, mergé 6a38915)
- 3 juin : C1 — gate NAF fiable avant la fenêtre d'alertes (helper `ensureCodeNafFromSiret`, prérequis 1.3, merge `d499737`)
- 3 juin : Évolution 1.3 COMPLÈTE — maille stabilisée (`af21eb8`) + C2 champ `attestationNonAgricole` (`0bef3d7`) + C3 détection/alerte gatée NAF (`5f1da89`) + C4 doc (`b475ef9`)
- 3 juin : Évolution 1.2 — délais de travaux : 4 dates + 3 règles (R1 ≥ prévisite +14j / R2 fin>début strict / R3 facture>fin strict), alerte confirmable (`ab9242d`). **→ Phase 1 fonctionnelle (hors UI/UX) COMPLÈTE.**
- 3 juin : Correctif extraction section C — `entrepriseMiseEnOeuvre` fiabilisé (ancrage SOURCE sur le titre + « Raison sociale », fin du non-déterminisme émetteur facture ↔ section C), patron `af21eb8`, commit `e456b70`. Volet logique aval à 3 issues → **TODO #29 (à cadrer)**.
- 5 juin : 7 checks dossier restants routés par `portee:'global-cee'` (`be607dc`, suite TODO #30 → **TODO #34**) — fin de la dépendance à l'heuristique Méthode 3 ; `check_47_global` exclu (dette **TODO #27**).
- 10 juin : Fusion `check_31→34` en un check global mentions agricoles (TODO #32, commit `e3dbd6d`) — harnais 71→69 cas, `check_32` converti en contrôle négatif.

**TODOs reportés** : 1
- 27 mai : Modularisation index.html (TODO #3) - À refaire après cadrage modèle Chantier/Cellule (TODO #22)

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
