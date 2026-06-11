# ADR 015 — Modèle de grains Cellule / Chantier / Dossier pour LED et surfaces

## Date
11/06/2026

## Statut
✅ Accepté — cadrage. Suit l'ADR-014 (dont le déclencheur de réouverture de
l'« approche B » est désormais atteint). Implémentation séquencée en commits
indépendants (voir Décision §4). Aucune ligne de code écrite à la date de cet ADR.

## Contexte

### Le déclencheur (dossier réel DELEFORTRIE FRÈRES)
Dossier à **3 cellules (bâtiments) / 2 adresses (chantiers)** :
- `4 RUE DE FEUILLERES BAT 1` — 26 LED
- `4 RUE DE FEUILLERES BAT 2` — 26 LED   } même adresse → 1 chantier
- `6 RUE DE FEUILLERES`       — 14 LED   → 1 chantier
- 2 audits, 2 synthèses (un couple par adresse/chantier).
- LED par adresse : `4 rue` = 52, `6 rue` = 14.

Le CEE porte ces données à **plusieurs grains hétérogènes dans la source** :
- LED : grain **ligne de facture** (26/26/14) ET grain **attestation BAT-EQ-127**
  (une attestation par bâtiment, « Nombre de luminaires » = 26/26/14).
- Surface : grain **attestation entrepôt non agricole**. Sur ce dossier, **une
  seule** attestation entrepôt pour les 3 bâtiments (surface totale « 2601 »,
  une adresse). Le grain surface par cellule **n'existe pas dans la source**.

### Le diagnostic (lecture seule, 11/06/2026)
Établi verbatim contre le code (api/analyze.js + index.html) :
- **Aucune agrégation JS fautive.** `ledTotal:"66"` est posé par le LLM, pas
  calculé en JS. Le seul `+=` candidat (`regrouperAttestationsParAdresse`,
  index.html:3526) est un no-op quand il n'y a qu'une attestation.
- **Cause structurelle = la maille `af21eb8`** (api/analyze.js:246-250, 326) :
  « 1 occurrence de la phrase "La surface réelle de cet entrepôt…" = 1 élément
  attestations[] ». Le nombre d'entrées est gouverné par le nombre de **phrases
  de surface**, pas par les bâtiments ni les chantiers. Avec 1 phrase de surface,
  le LLM replie LED (66) et surface (2601) dans un élément unique. Le prompt
  interdit en plus explicitement le regroupement par adresse (api/analyze.js:250).
- **Violation du principe n°1 prouvée par le code** (faux conforme silencieux) :
  - bâtiments sans attestation propre → jamais itérés (index.html:5065) → aucun
    check de surface émis → **disparition silencieuse** ;
  - `check_45` compare le **total replié** 2601 → passe **vert** si audit/synthèse
    rapportent aussi 2601, le grain bâtiment n'est jamais testé
    (index.html:5167-5181, 5231-5245) ;
  - `check_45b` (1-à-1 par bâtiment) se **neutralise** : 1 surface attestation ≠ N
    surfaces synthèse → bascule en INFO « check manuel » (index.html:5272-5305).
- **`regrouperAttestationsParAdresse` existe déjà** (index.html:3501) et fait le
  passage cellule→chantier (somme LED par adresse) — mais le prompt lui refuse la
  matière première (grain cellule).
- **Couplage `attestations.length` == « nombre de chantiers »** lu par : check_39
  (index.html:4947), export Sheet (1647), `nbChantiers` (4051), indexation directe
  `attestations[auditIndex]` (4718). → tout passage au grain cellule désaligne ces
  consommateurs (3 cellules face à 2 audits).
- **Dette A1** (anomalie connue, §6 SOURCE_DE_VERITE) : `check_45_${i}` partagé
  audit/synthèse/info → `findIndex` écrase le mauvais check ; **s'aggrave** dès
  qu'on multiplie les grains.

## Décision

### 1. Modèle à trois niveaux (hiérarchie TODO #22)
Adopter explicitement : **Dossier → Chantier → Cellule**.
- **Cellule** (= bâtiment) : clé = adresse **+ bâtiment** ; porte sa LED propre.
- **Chantier** : clé = **adresse normalisée** ; porte 1 audit + 1 synthèse ;
  LED chantier = Σ LED de ses cellules.
- **Dossier** : totaux globaux.

### 2. LED — deux grains simultanés
- Grain natif **cellule** : 26 / 26 / 14 (comparaison au détail bâtiment).
- Grain **chantier** (agrégé par adresse) : 52 / 14 (comparaison aux audits/
  synthèses, qui sont par chantier — check_09c/09d).
- Source LED : la **facture** (déjà en place, déjà par adresse, api/analyze.js:
  222-225). **Question ouverte d'implémentation** : l'attestation BAT-EQ-127
  (champ nommé, titre répété par bâtiment) est peut-être un ancrage plus robuste
  que la colonne d'un tableau de facture — à mini-tester au moment de l'extraction,
  pas tranché ici.

### 3. Surface — grain déterminé par comptage
Soit **C** = nb cellules (lignes LED / bâtiments), **A** = nb chantiers
(adresses normalisées), **S** = nb attestations entrepôt (surfaces) :
- **S == C** → attestation **par cellule** : vérif `surface_attestation[i] ==
  surface_cellule[i]`, puis Σ par adresse pour le grain chantier.
- **S == A** → attestation **par adresse (chantier)** : vérif `surface_attestation
  [adr] == Σ surfaces cellules de adr`.
- **S < A** → attestation **globale (dossier)** : surface = Σ toutes cellules,
  **non ventilable** → signal visible, aucune comparaison fine.

LED et surface suivent la **même logique de comparaison de comptes** ; chaque
grandeur a son compteur de référence (LED : grain cellule fixe ; surface : grain
variable C/A/dossier).

### 4. Principe directeur — message toujours prudent (jamais d'affirmation)
Le comptage **ne permet pas** de distinguer à coup sûr « surface légitimement
globale » d'« extraction qui a raté des attestations existantes ». En conséquence,
aucun message ne doit **affirmer** un grain : le signal constate les faits
(« S attestation(s) pour A chantiers / C cellules → non ventilable au grain
attendu, à vérifier manuellement ») — visible, non bloquant, jamais un vert
silencieux, jamais une affirmation non vérifiée. (Principe n°1, qui prime sur tout.)

### 5. Séquencement en commits indépendants (un sujet = un commit)
Ce chantier touche la zone la plus fragile (extraction LLM + moteur de checks +
18 consommateurs). Il est découpé en étapes **livrables et testables seules**,
dans un ordre qui **assainit avant de construire** et **laisse l'app fonctionnelle
à chaque étape**. Chaque étape fera l'objet de son propre diagnostic Plan Mode,
relecture diff verbatim et validation preview avant commit. Le merge sur `main`
reste un geste d'IZANAMI, en fin de chantier présentable.

| # | Sujet | Touche | Raison de la place |
|---|-------|--------|--------------------|
| 1a | **Lever la collision A1** : préfixer `check_45_audit_N` / `check_45_synthese_N` + réaligner les `findIndex` du recalcul (`check_44_${i}`→`check_45_${i}`, index.html:5527/5557) + adapter `familles-config.js` **a minima** (les nouveaux ids doivent rester routés en famille 7) + harnais au vert | index.html, familles-config.js, test-familles.mjs | assainir avant de multiplier les grains ; **zéro régression** (sinon famille 7 « Surface » tombe en « Non classés ») |
| 1b | **Convertir le routage famille 7** du fragment-de-texte vers l'**id ancré** (collision levée → fragment devenu inutile) + nettoyer le harnais | familles-config.js, test-familles.mjs | amélioration opportuniste, distincte de la dette ; non prérequis des étapes 2-6 |
| 2 | **Filet anti-faux-conforme** : `C>A` ou `S<A` → signal visible « données possiblement repliées, à vérifier » | index.html | neutralise le danger n°1 tout de suite ; ne dépend que des comptages |
| 3 | **Extraction grain cellule** : le prompt cesse de replier, produit C entrées LED/cellule, **regroupées en sortie** | api/analyze.js | fournit la matière première ; aval non désaligné car regroupé en sortie |
| 4 | **Niveau chantier** : `regrouperAttestationsParAdresse` = source structurelle, LED agrégée par adresse | index.html | exploite le grain de l'étape 3, pose le niveau intermédiaire |
| 5 | **Re-câbler `attestations.length`-as-chantier-count** : check_39, export, `nbChantiers`, `[auditIndex]` comptent les chantiers | index.html | corrige le désalignement 3-cellules/2-audits ; suppose 3-4 faits |
| 6 | **Règle surface à comptage** : grain S==C / S==A / S<A, cohérence Σ au bon grain, message prudent | index.html | logique la plus fine, sur terrain stabilisé |

**Réserve** : l'étape 6 est la plus lourde et pourra se sous-diviser (cohérence
surface vs message) ; sa granularité sera arrêtée à son propre diagnostic, pas
promise ici. **Étape 1 scindée en 1a/1b** (un sujet = un commit) : 1a lève la
dette d'id (prérequis du multi-grain) ; 1b nettoie le routage que la collision
imposait (opportuniste, peut suivre). Le périmètre réel de l'étape 1 — élargi à
`familles-config.js` + `test-familles.mjs` — a été établi par vérification du
code le 11/06/2026 (résolveur de collision `familles-config.js:113-124` +
assertions `test-familles.mjs:92-96/113/120`), non par le diagnostic initial
(qui portait sur les consommateurs de `attestations[]`, pas sur le routage des
ids de checks).

## Alternatives écartées

- **Correctif JS de l'agrégation LED** : écarté — le diagnostic prouve qu'il
  n'existe aucune agrégation JS à corriger (66 est posé par le LLM). Inopérant.
- **« 1 entrée par bâtiment » naïf au prompt (approche B brute du handoff)** :
  écarté en l'état — bute sur la surface non ventilable (S < A) et désaligne en
  bloc les consommateurs `attestations.length`-as-chantier (check_39, export,
  indexation) + réplique A1. Repris proprement via le séquencement §5 (grain
  cellule extrait MAIS regroupé en sortie tant que l'aval n'est pas recâblé).
- **Big-bang en un seul commit** : écarté — touche LLM + moteur + 18
  consommateurs ; précédent d'échec en un coup (TODO #3, generateChecks tronquée).
- **Répartir un total global sur les cellules** : interdit — inventerait des
  chiffres absents de la source (faux conforme, contraire au principe n°1).
- **Voie « signal-visible seul, sans modèle »** : écartée comme finalité — le
  modèle 3 niveaux est nécessaire pour les comparaisons justes. Son bénéfice
  (danger neutralisé tôt) est néanmoins capturé **dans** ce chantier via l'étape 2.

## Conséquences

- **Positives** : fin du faux conforme silencieux dès l'étape 2 ; LED juste aux
  deux grains ; surface traitée selon son grain réel sans invention ; A1 résorbée ;
  `regrouperAttestationsParAdresse` enfin alimentée ; chaque étape testable et
  réversible ; le cas général (1 attestation par cellule, S==C) continue de
  fonctionner sans régression.
- **Négatives / vigilance** : chantier long (6 étapes) ; l'étape 3 touche la
  couche LLM non déterministe (ancrage sur titres/labels exacts, test avant/après
  obligatoire) ; harnais `test-familles.mjs` à garder vert à chaque étape ;
  questions ouvertes à trancher en implémentation (source LED la plus robuste ;
  source de comptage fiable de C ; granularité finale de l'étape 6).
- **Bug préexistant capté** : `recalculateSurfaceChecks` cherche `check_44_${i}`
  (index.html:5527) alors que la génération crée `check_45_${i}` → recalcul de
  surface manuelle no-op. Corrigé dans l'étape 1a (réalignement des `findIndex`).
- **Liens** : réalise le TODO #22 (modèle Chantier/Cellule, priorité n°1) ;
  S1/S2 (branches non mergées) se reconstruisent par-dessus ce modèle ; S3
  (recompter check_39 au bon grain) devient l'étape 5 ; bug #27 (adressesChantiers
  indexé par bâtiment) assaini par le terrain de ce chantier.

## Sources
- ADR-014 — `docs/decisions/014-modele-chantier-cellule.md` (déclencheur B atteint)
- Diagnostic lecture seule du 11/06/2026 (extraction attestations CEE — verbatim)
- PDF CEE DELEFORTRIE FRÈRES (3 cellules / 2 adresses, 1 attestation entrepôt)
- `docs/pending-todos.md` §TODO #22 ; `docs/ROADMAP_EVOLUTIONS.md` § CHANTIER MAJEUR
- `docs/SOURCE_DE_VERITE_CHECKS.md` §5 (maille af21eb8), §6 (anomalie A1)
