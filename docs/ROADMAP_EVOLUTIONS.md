# CEE Vérif — Roadmap des évolutions

> **Feuille de route des fonctionnalités à développer.** Distincte de la source de vérité (qui décrit l'existant).
> Établie le 27/05/2026 par cadrage métier détaillé avec le responsable, à partir du document de process réel et d'un dossier exemple (EARL REMY).
>
> ⚠️ **Ce document décrit ce qui N'EST PAS ENCORE codé.** Quand une évolution est implémentée, elle est déplacée vers `SOURCE_DE_VERITE_CHECKS.md`.
>
> **Règle d'or de réalisation** : développer une évolution à la fois, par petits incréments vérifiés (leçon de la modularisation ratée). Compter les lignes, tester sur dossier réel mono ET multi-chantiers, commit + push avant de dire « c'est fait ».

---

## CHANTIER MAJEUR — Modèle de données Chantier / Cellule (PRIORITÉ N°1)

### Le problème
L'outil repose sur l'hypothèse « 1 chantier = 1 adresse » et utilise l'adresse comme clé de regroupement. C'est faux dans beaucoup de cas réels et cause des erreurs silencieuses (faux « conforme » sur parcelles/surfaces).

### La structure réelle (validée métier 28/05/2026)
**Hiérarchie : Dossier → Chantiers → Cellules.**

- **Chantier** = unité documentaire : 1 audit + 1 synthèse + 1 adresse + 1 type de local/secteur d'activité (le secteur est UN par chantier, jamais par cellule).
- **Cellule** (appelée aussi « bâtiment » dans les documents) = unité physique : porte sa propre surface, sa propre parcelle cadastrale, sa hauteur sous plafond, son nombre de points lumineux, ses caractéristiques.
- **Surface du chantier** = somme des surfaces de ses cellules.
- Un chantier peut avoir 1 ou plusieurs cellules. Les parcelles peuvent être identiques entre cellules ou différentes selon les dossiers.

### La difficulté
Les nomenclatures varient d'un dossier à l'autre : les cellules sont identifiées par des mentions « bat / bât / batiment / bâtiment » (singulier ou pluriel, toutes orthographes), avec des numéros en notations variées (« 1,2,3 », « 1 à 3 », « 1-3 », « bât 1 »). Configurations possibles : 1 adresse / 1 cellule, 1 adresse / plusieurs cellules / 1 chantier, parfois 1 parcelle pour plusieurs cellules, parfois 1 parcelle par cellule.

### Ce qu'il faut faire (à cadrer techniquement en session dédiée)
Introduire le niveau « cellule » dans le modèle de données :
- **Extraction** : repérer les cellules et leurs attributs propres.
- **Regroupement** : associer les bonnes cellules au bon chantier, sans se fier uniquement à l'adresse.
- **Vérification** : comparer surfaces et parcelles au niveau cellule, pas au niveau adresse.

### Amorces existantes dans le code (à auditer avant de coder)
`extraireNombreBatiments`, `normaliserAdresseSansBatiment`, `regrouperAttestationsParAdresse`, et le matching par index (`matchChantiers`, ADR 011). Ne pas dupliquer — compléter l'existant.

### Lien avec d'autres sujets
Le bug « matching adresses dupliquées » est probablement une manifestation de ce problème. La cohérence facture ↔ case cochée (évolution notée) devra tenir compte de ce modèle.

---

## ARCHITECTURE CIBLE : 3 temps de vérification

Le cadrage a fait émerger une structure naturelle, fidèle au principe « le CEE est la base, on le valide d'abord » :

1. **PHASE PRÉ-VÉRIFICATION CEE** (au stade « Extraire depuis le CEE », AVANT l'analyse) — alertes confirmables.
2. **ANALYSE DES DOCUMENTS** (Audit + Synthèse vs CEE) — checks existants + à venir.
3. **RAPPELS / AIDE-MÉMOIRE** (affichés dans le rapport) — actions manuelles à ne pas oublier.

Évolutions UX de la pré-vérification (todos futurs, non prioritaires) :

- Groupage des alertes : à mesure que les alertes Phase 1 s'accumulent (1.1 à 1.5), empiler des confirm() natifs successifs devient pénible. Cible : une alerte unique agrégeant toutes les anomalies détectées, avec une seule validation. Constaté dès 2 alertes (secteur + reste à payer) le 28/05.
- Modale custom : remplacer les confirm() natifs (UX brute) par une modale soignée — se fera naturellement avec le groupage.
- Déplacement au stade extraction : faire déclencher ces vérifications au moment de l'import du CEE (« Extraire depuis le CEE »), avant l'analyse complète, conformément au principe « le CEE est le dossier référent ». Aujourd'hui le mécanisme vit dans l'analyse (après generateChecks). Ces trois todos convergent vers un écran unique de pré-vérification CEE.

---

## PHASE 1 — PRÉ-VÉRIFICATION DU CEE (priorité haute)

> **Mécanisme commun** : « alerte bloquante confirmable » au stade extraction. Si la condition n'est pas remplie → l'outil interrompt et prévient l'utilisateur, qui peut soit confirmer l'exception (et poursuivre), soit corriger son CEE et le réimporter.
> C'est le **même mécanisme `confirm()`** que l'alerte secteur « Autres » déjà existante. Toutes ces vérifications doivent fonctionner en **mono ET multi-chantiers** (voir bug B2 à corriger en prérequis).

### 1.1 — Reste à payer ≠ 0€  ✅ IMPLÉMENTÉ
Implémenté le 28/05/2026 (commit 0aaf465) — voir SOURCE_DE_VERITE_CHECKS.md §1 (alerte de confirmation) et §7bis. Alerte confirmable à 3 états (absent / ≠0 / =0) remplaçant l'ancien check_40.

### 1.2 — Délais de travaux  *(non codé — extraction des dates à ajouter)*
- **Source** : Dossier CEE, champs « Date de début des travaux » et « Date de fin des travaux ».
- **Règle 1** : date de début des travaux ≥ date de prévisite + **14 jours calendaires**.
- **Règle 2** : date de fin des travaux ≥ date de début des travaux + **7 jours calendaires**.
- **Niveau** : alerte confirmable au stade extraction.
- **Prérequis** : ces deux dates ne sont pas extraites aujourd'hui → ajouter leur extraction dans le prompt `api/analyze.js`.

### 1.3 — Attestation agricole BAT-EQ-127  *(amorce présente dans le code — à compléter)*
- **Source** : Dossier CEE, page(s) « ATTESTATION SUR L'HONNEUR — Existence d'un entrepôt de stockage non agricole — BAT-EQ-127 ».
- **Règle** : si code NAF agricole (**01.xxx ou 02.xxx**), cette attestation est **obligatoire pour CHAQUE chantier** (elle contient aussi les superficies par chantier). Si elle manque pour au moins un chantier → alerte confirmable au stade extraction.
- **Cohérence** : une entreprise agricole déclare un usage NON-agricole de l'entrepôt → les Règles A (secteur entrepôts) et B (pas de mention agricole sur Audit/Synthèse) restent **inchangées**.
- **Note code** : la logique `isAgricole` (NAF 01./02.) et la détection des attestations + extraction surfaces existent déjà partiellement. NE PAS dupliquer — compléter l'existant.

### 1.4 — Professionnel ayant mis en œuvre = Energie Responsable  ✅ IMPLÉMENTÉ
Implémenté le 01/06/2026 — voir SOURCE_DE_VERITE_CHECKS.md §1 (alerte de confirmation) et §7bis. Extraction du champ global `cee.entrepriseMiseEnOeuvre` (section C « Professionnel ayant mis en œuvre l'opération… » de l'attestation sur l'honneur Total Énergies — raison sociale, commit `91bf93d`) + alerte confirmable globale à 3 états (non détecté / « Energie Responsable » → exception confirmable / autre → aucune alerte), valeur globale du dossier (patron « reste à payer »), jamais bloquant (commit `5392776`). Cible recentrée en cours de réalisation : raison sociale « Energie Responsable » plutôt que ville « Clichy » (ambiguë : Clichy-sous-Bois…).

### 1.5 — Étude de dimensionnement = Prime Evolution  ✅ IMPLÉMENTÉ
Implémenté le 01/06/2026 — voir SOURCE_DE_VERITE_CHECKS.md §1 (alerte de confirmation) et §7bis. Extraction par chantier du champ `attestations[].etudeDimensionnement` (commit `a4130d6`) + alerte confirmable agrégée multi-chantiers à 3 états (conforme / autre entreprise / non détectée), fin de message dynamique selon les types de fautifs présents, jamais bloquant (commit `ba1fcce`).

---

## PHASE 2 — CROISEMENT API GOUVERNEMENTALE (priorité moyenne)

### 2.1 — Récupération des dirigeants  *(prérequis technique — non codé)*
- **Action** : étendre `api/search.js` pour récupérer, depuis recherche-entreprises.api.gouv.fr, les **dirigeants** et leur **fonction** (en plus des SIRET / nom / NAF déjà récupérés).
- **Bloque** : l'évolution 2.2 en dépend.

### 2.2 — Vérification signataire + fonction  *(non codé — dépend de 2.1)*
- **Source** : Dossier CEE, champ « Représenté par : [Nom], [Fonction] ».
- **Règle 1** : si le **nom** du signataire diffère des dirigeants Infogreffe/API → rappel « demander une attestation de délégation de signature ».
- **Règle 2** : si la **fonction** (Gérant, Président…) diffère de l'API → signaler.
- **Niveau** : signalement / rappel (à préciser à l'implémentation).

### 2.3 — Nom de la société cliente vs source officielle  *(non codé — croisement externe)*
- **Source** : Dossier CEE (nom du bénéficiaire) vs recherche-entreprises.api.gouv.fr / Greffe.
- **Règle** : si le nom du CEE diffère de la raison sociale officielle → alerte confirmable / rappel.
- **Niveau** : à préciser à l'implémentation (rappel ou alerte confirmable) — **JAMAIS bloquant** (§1).
- **Dépend de** : 2.1 (API étendue).

### 2.4 — Adresse siège vs source officielle  *(non codé — croisement externe)*
- **Source** : Dossier CEE (adresse siège) vs adresse officielle recherche-entreprises / Greffe.
- **Règle** : si l'adresse siège du CEE diffère de l'adresse officielle → alerte confirmable / rappel.
- **Niveau** : à préciser à l'implémentation (rappel ou alerte confirmable) — **JAMAIS bloquant** (§1).
- **Dépend de** : 2.1 (API étendue).
- **Distinct de check_41** : check_41 compare l'adresse siège du CEE à la référence **saisie** (interne, majeur) ; ici on croise avec la source **officielle externe**.

> **Note de contexte (volet pré-vérification CEE)** : ces deux croisements, comme toutes les vérifications du CEE, ont vocation à terme à se déclencher **au stade extraction** (« Extraire depuis le CEE », avant l'import Audit/Synthèse), conformément au principe « le CEE est la référence, on le valide d'abord ». Dans un premier temps, ils seront implémentés **pendant l'analyse** (comme les alertes actuelles). Le portail à 2 étapes / écran unique de pré-vérification reste une **cible UX future, non prioritaire** (cf. note Phase 1 « Déplacement au stade extraction »).

---

## PHASE 3 — RAPPELS / AIDE-MÉMOIRE (priorité basse, simples)

### 3.1 — Justificatifs d'adresse  *(non codé)*
- **Règle** : afficher un rappel « pense à demander X justificatif(s) d'adresse », X = nombre d'adresses de chantier **différentes du siège social**.
- **Exemple** : 3 chantiers, dont 1 = siège → 2 justificatifs à demander.
- **Niveau** : simple rappel affiché (non bloquant).

### 3.2 — Attestation de signature *(= conséquence de 2.2, même nature de rappel)*
- Voir 2.2 : si signataire ≠ dirigeant → rappel d'attestation de délégation.

---

## PHASE 4 — DÉPEND DE BRIQUES FUTURES (lointain)

### 4.1 — Cohérence Betool vs fichier xls  *(non codé — dépend connexion Sheet/Betool)*
- **Règle métier** : comparer date d'envoi et date de signature entre Betool et le fichier xls. Si différentes → le devis doit être refait signer (« AH recensement »).
- **Blocage actuel** : vérification 100% manuelle aujourd'hui. Tentative de connexion Google Sheet échouée, mise de côté.
- **Dépend de** : phases ultérieures du projet (intégration Betool / Google Sheets, cf. CDC général).

---

## VÉRIFICATIONS TECHNIQUES LED — déjà partiellement codées (Catégorie 2)

Le code a les valeurs dans `FICHES_TECHNIQUES` mais ne compare activement que THD et durée de vie. Le process métier vérifie davantage. Caractéristiques à comparer pour DAEWOO (selon fiche) :

| Caractéristique | Valeur attendue | Vérifié aujourd'hui ? |
|-----------------|-----------------|----------------------|
| THD | 3,7% | ✅ Oui (`check_35`) |
| Durée de vie | 54000h | ✅ Oui (`check_38`) |
| Rendement lumineux | 185 lm/W | ❌ Non |
| Facteur de puissance | 0,99 | ❌ Non |
| IK (résistance chocs) | 9 | ❌ Non |
| IRC (rendu couleurs) | 71 | ❌ Non |

> Évolution possible : étendre les checks aux 4 caractéristiques non vérifiées. À prioriser selon utilité réelle (sont-elles souvent sources d'erreur ?).

---

## BUGS À INVESTIGUER

### Matching de chantiers par adresse dupliquée
- **Problème** : quand deux chantiers ont la même adresse (souvent par erreur de saisie sur Synthèse/Audit), l'outil les confond via le matching par adresse (`compareAddress` / `matchChantiers`) et compare les données au mauvais chantier, produisant un faux « conforme ».
- **Exemple** : chantier 3 avec adresse Synthèse erronée (identique au chantier 1) → parcelle comparée à celle du chantier 1 → faux OK.
- **À investiguer** : détecter les doublons d'adresse comme anomalie au lieu de fusionner silencieusement.

### Crash norm.cee null dans generateChecks  ✅ RÉSOLU
✅ **Corrigé le 29/05/2026** (commit `27e7918`) — garde `if (!norm.cee)` + signal majeur `check_cee_incomplet` à la place des checks 41/42 + `?.` sur les 5 accès non gardés. Détail complet : `SOURCE_DE_VERITE_CHECKS.md` §7.

### Étiquette de catégorie de check_41 (adresse siège) — à investiguer
- **Constat** : `check_41` porte une donnée du **CEE** (adresse siège) mais est rangé en `categorie: 'audit'` dans index.html.
- **Effet** : la vue hiérarchique le classe correctement « Dossier CEE » (via `getCheckProvenance`, qui détecte « adresse siège »), mais les onglets legacy filtrent par `categorie` → il apparaît dans l'onglet « Audit ». Probable **bug d'étiquette d'affichage**, **sans effet sur le résultat** du check (la comparaison reste correcte).
- **Distinct de A2** (qui ne concernait que le niveau, désormais résolu). À investiguer plus tard.

---

## PRÉREQUIS TRANSVERSAL — résolu

La Phase 1 repose sur le mécanisme d'alerte confirmable par chantier. Ce mécanisme ne fonctionnait pas en multi-chantiers (bug B2 de la source de vérité).

✅ **B2 corrigé le 28/05/2026** (commit `7242107`) — Phase 1 débloquée.

---

*Établi le 27/05/2026 — cadrage métier détaillé.*
*Ordre de réalisation suggéré : B2 ✓ → 1.1 ✓ → crash norm.cee null (prod) ✓ → 1.5 ✓ → 1.4 ✓ → reste Phase 1 (1.2, 1.3) → Phase 2 → Phase 3 → Phase 4.*
