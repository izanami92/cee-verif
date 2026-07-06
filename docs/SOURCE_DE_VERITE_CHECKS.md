# CEE Vérif — Source de vérité des règles métier et points de contrôle

> **Document de référence unique.** Établi par lecture directe du code (`index.html`, `generateChecks`) ET validation métier directe avec le responsable (27/05/2026).
> Il **remplace et corrige** `CHECKLIST_COMPLETE.md`, `points-controle.md` et la partie « niveaux de gravité » de `business-rules.md`, qui contenaient des règles erronées.
>
> **En cas de doute sur une règle, c'est CE fichier qui fait foi.**
>
> **Source code :** `index.html` — branche `main` (commit `e32653b`, MD5 `2916f528ddf38e43b24c67c0bf9cf97f`)

---

## 0. PRINCIPE FONDAMENTAL

**Le Dossier CEE est la référence absolue.**
Toutes les valeurs des autres documents (Audit Dialux, Synthèse) se comparent à ce qui figure sur le CEE. Les champs de référence de l'interface sont remplis via le bouton « Extraire depuis le CEE », donc *référence = CEE*.

> ⚠️ **Hypothèse de fonctionnement** : les champs de référence restent éditables à la main, mais en pratique ils ne sont PAS modifiés après extraction. La fiabilité des checks bloquants repose sur ce respect du flux « Extraire depuis le CEE ».

**Infos extraites automatiquement du CEE** : nom société, SIRET, date d'envoi du devis, date de signature, adresse siège social, nombre total de LED, type de local, référence LED, parcelles cadastrales, email, téléphone et contact du client, étude de dimensionnement (entreprise citée, par chantier).

---

## 1. NIVEAUX DE GRAVITÉ (règle réelle — corrigée)

### 🔴 BLOQUANT — uniquement la page de garde de l'Audit
**Définition** : empêche l'envoi du dossier en signature client.
**Périmètre STRICT** : les **3 champs de la page de garde de l'Audit**, comparés au CEE :
- Nom de la société cliente = CEE
- Adresse de chantier = CEE
- Date (page de garde) = **date de prévisite du CEE** (voir §2)

Si l'un de ces 3 ne correspond pas au CEE → 🔴 bloquant.

> **AUCUNE autre vérification n'est bloquante.** Tout le reste est au maximum majeur.

### 🟠 MAJEUR — tout le reste des erreurs
Synthèse, Audit (hors page de garde), cohérence multi-chantiers, vérifications techniques, mentions agricoles sur Audit/Synthèse, etc.

### 🔵 INFO — vérification manuelle ou optionnel
Cas nécessitant un jugement humain, ou champs optionnels (contacts).

### ⚠️ ALERTE DE CONFIRMATION (pendant l'analyse) — cas particulier (≠ erreur)
Mécanisme `confirm()` qui interrompt pendant la phase d'analyse (après generateChecks(), avant le calcul de la page de garde), pour demander une validation à l'utilisateur. L'utilisateur peut confirmer l'exception (et poursuivre) ou corriger son CEE et le réimporter. Ce n'est ni un check ni une erreur : c'est une question posée à l'utilisateur.

**Déclencheur existant** : Règle A (secteur ≠ entrepôt sur le CEE).

Déclencheur actif — Reste à payer ≠ 0€ (champ « Reste à payer » du CEE, valeur globale du dossier). Implémenté le 28/05/2026 (commit 0aaf465) sous forme d'alerte confirmable à trois états : valeur absente / non interprétable → alerte « non détecté » ; valeur ≠ 0 → alerte « montant anormal, confirmer ou corriger » ; valeur = 0 → aucune alerte. Remplace l'ancien check_40 (supprimé). La distinction des trois états comble un faux « conforme » : auparavant une valeur non extraite passait silencieusement pour 0.

Déclencheur actif — Étude de dimensionnement ≠ « PRIME EVOLUTION » (mention « Etude de dimensionnement réalisée par l'entreprise … » de la facture CEE, par chantier). Implémenté le 01/06/2026 (commits `a4130d6` extraction + `ba1fcce` alerte) sous forme d'alerte confirmable agrégée multi-chantiers à 3 états : présent et contient « PRIME EVOLUTION » → aucune alerte ; présent mais autre entreprise → fautif « étude réalisée par X » ; absent / non extrait → fautif « non détectée — à vérifier » (jamais conforme silencieux). Anti-régression B2. Jamais bloquant.

Déclencheur actif — Professionnel ayant mis en œuvre = « Energie Responsable » (section C « Professionnel ayant mis en œuvre l'opération … » de l'attestation sur l'honneur Total Énergies ; champ global `cee.entrepriseMiseEnOeuvre` = raison sociale). Implémenté le 01/06/2026 (commits `91bf93d` extraction + `5392776` alerte) sous forme d'alerte confirmable globale (pas par chantier — patron « reste à payer ») à 3 états : absent / illisible → alerte « non détecté — à vérifier » ; présent et contenant « Energie Responsable » (sous-traitant) → alerte « exception confirmable (rare installation par équipe interne) » ; présent et autre → aucune alerte. Test `.includes('energie responsable')` normalisé (couvre casse / accents / ponctuation / suffixe juridique ; ne couvre pas le pluriel « energies responsables » ni les fautes de frappe — lacune assumée). Jamais bloquant.

Déclencheur actif — Attestation « entrepôt de stockage non agricole » (BAT-EQ-127) **non confirmée** pour une entreprise agricole. Implémenté le 03/06/2026 (commits `0bef3d7` extraction du champ `attestations[].attestationNonAgricole` + `5f1da89` détection/alerte). Champ à **2 états** (`'presente'` = seul OK / `'non_detectee'` = défaut sûr), ancré sur la phrase « entrepôt de stockage non agricole » (discrimine de l'attestation « installation de matériel », pas du code BAT-EQ-127 présent sur les deux). Alerte **confirmable, gatée `isAgricole`** (NAF 01./02.) : `detectFautifsAttestationNonAgricole` (itération brute par index sur les attestations originales) signale chaque chantier non confirmé, message « présence non confirmée → vérifier l'attestation BAT-EQ-127 » (jamais « manquante ») désambiguïsé surface+LED. NAF non agricole → aucune alerte ; NAF inconnu → INFO non bloquant (`check_attestation_non_agricole_naf_inconnu`). Jamais bloquant. Prérequis : maille des attestations stabilisée (`af21eb8`, voir §5) + gate NAF C1 (`d499737`).

Déclencheur actif — Délais de travaux (dates du dossier CEE). Implémenté le 03/06/2026 (commit `ab9242d`). 4 dates extraites depuis la page 1 (encadré haut-gauche) : `datePrevisite`, `dateDebutTravaux`, `dateFinTravaux`, `dateFacture` (libellés exacts, format JJ/MM/AAAA, `null` si absent). 3 règles : **R1** début ≥ prévisite + 14 j calendaires (écart de 14 j accepté) ; **R2** fin > début (strict) ; **R3** facture > fin (strict). Alerte **confirmable agrégée** (helpers `parseDateFr` + `verifierDelaisTravaux`, `index.html`), valeur globale du dossier, jamais bloquante. Date manquante sur une règle → statut `'non_verifiable'` (jamais OK, jamais silencieux).

> Tous les déclencheurs de ce mécanisme identifiés au cadrage Phase 1 (secteur, reste à payer, étude de dimensionnement, professionnel, attestation non agricole, délais de travaux) sont désormais **implémentés**. Les déclencheurs restants (croisements API dirigeants / adresse officielle, etc.) relèvent des **Phases 2-3** — voir `ROADMAP_EVOLUTIONS.md`.

---

## 2. VOCABULAIRE / ÉQUIVALENCES À CONNAÎTRE

| Terme interface / code | Terme métier / CEE | Note |
|------------------------|--------------------|------|
| `refDateDevis` « Date d'envoi du devis » | **Date de prévisite** du CEE | **Même date**, noms différents. C'est elle que la page de garde Audit doit matcher (check bloquant). |
| `refDateSignature` | Date de signature / d'engagement | Check majeur. |
| `typeLocal` | Secteur d'activité (Entrepôt / Autres) | Voir Règle A. |

---

## 3. RÈGLE A — Secteur d'activité sur le CEE

**Document concerné** : Dossier CEE uniquement.
**Champ** : « Bâtiment tertiaire / Secteur d'activité : … »

**Règle** :
- La valeur attendue est **« entrepôts »** (ou équivalent : logistique, stockage).
- Si la valeur est **« Autres »** (ou ≠ entrepôts) → **ALERTE DE CONFIRMATION** (pas une erreur automatique) :
  - L'utilisateur confirme que c'est normal → l'analyse continue avec les autres documents.
  - L'utilisateur considère que c'est une erreur → il refait le CEE avec les bonnes mentions et le réimporte.

**Comparaison** : `compareSecteurEtude()` (équivalences Entrepôt/Logistique/Stockage).

> 🐞 **BUG CONFIRMÉ (à corriger)** : cette alerte **ne se déclenche pas en multi-chantiers**. En mono-chantier elle fonctionne. La cause probable est dans le bloc qui parcourt `extractedData.cee.attestations` : le secteur n'est pas détecté/mappé correctement pour chaque attestation au-delà de la première. À diagnostiquer précisément avant correction.

---

## 4. RÈGLE B — Mentions agricoles (Audit + Synthèse uniquement)

**Documents concernés** : **Audit et Synthèse UNIQUEMENT**. Jamais le CEE (le CEE est couvert par la Règle A).

**Mots interdits** : « agri », « agricole », « agriculture », « agriculteur ».

**NE comptent PAS** : les formes juridiques **EARL**, **SCEA**, etc. (ce sont des statuts, pas des mentions d'activité).

**Exception** : le **nom de la société cliente** peut contenir « agricole » (ex. « Coopérative Agricole de Bretagne ») sans déclencher d'erreur.

**Niveau** : 🟠 **MAJEUR** (jamais bloquant).

**Raison métier** : CEE LED (BAT-EQ-127) = bâtiments tertiaires entrepôts. L'agriculture relève d'une autre opération CEE.

> ✅ **Bug B1 résolu (27/05/2026)** — commit `b3450c2`. La fonction `checkMentionsAgricoles` marque désormais les mentions en `'majeur'` et ne cherche plus que dans Audit + Synthèse.

---

## 5. INVENTAIRE DES CHECKS (par lecture du code)

> ⚠️ **Le nombre de checks n'est PAS fixe** : il dépend du nombre de chantiers (beaucoup de checks sont en boucle `forEach`). Mono-chantier ≈ 42 checks ; multi-chantiers : 80-100+. Documenter la **logique**, pas un nombre figé.

**Légende portée** : `UNIQUE` (1×) · `× CHANTIER` (1 par chantier) · `MONO` (si 1 seul chantier) · `SI ATTEST.` (si attestations/surfaces présentes).

### Page de garde AUDIT — 🔴 BLOQUANT (vs CEE)
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_01` | Nom entreprise = CEE | 🔴 | × CHANTIER |
| `check_02` | Adresse chantier = CEE | 🔴 | × CHANTIER |
| `check_03` | Date audit = date prévisite CEE (format JJ/MM/AAAA) | 🔴 | × CHANTIER |

### Page de garde SYNTHÈSE
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_04` | Nom = CEE | 🟠 | × CHANTIER |
| `check_05` | Date = date prévisite | 🟠 | × CHANTIER |
| `check_06/07/08` | Email / Téléphone / Contact = CEE | 🟢/🟠/🔵 | × CHANTIER |

> ℹ️ check_06/07/08 (page de garde Synthèse) : **comparaison réelle** Synthèse vs référence CEE (depuis le 29/05/2026, commit `e47cfe3`), à trois états — présent des deux côtés + conforme → 🟢 ; présent + **différent du CEE** → 🟠 majeur ; **absent** côté Synthèse ou **pas de référence** CEE → 🔵 info (jamais de faux « conforme »). Fonctions : `compareStrings` (email, contact) ; `comparePhone` (téléphone — normalisation chiffres, +33/0033 → 0).
> 📌 Historique : **pas une régression**. Depuis leur toute première version (confirmé par git), ces checks ne faisaient qu'un **test de présence** (`synthese.X ? 'ok' : 'info'`), sans aucune comparaison → faux « conforme » présent **dès l'origine**, corrigé le 29/05/2026.

### Total LED
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_09a` | Somme LED audits = Total CEE | 🟠 | UNIQUE |
| `check_09b` | Somme LED synthèses = Total CEE | 🟠 | UNIQUE |
| `check_09c_chN` | LED Audit = LED Synthèse | 🟠 | × CHANTIER (multi) |
| `check_09d_*` | LED Audit/Synthèse = LED attestation CEE | 🟠 | SI ATTEST. |

### Fiche identité / périmètre SYNTHÈSE
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_10` | Nom client = CEE | 🟠 | × CHANTIER |
| `check_11` | SIRET (14 ch.) = CEE | 🟠 | × CHANTIER |
| `check_12` | Adresse = CEE | 🟠 | × CHANTIER |
| `check_13` | Surface éclairée (manuel) | 🔵 | × CHANTIER |
| `check_14` | Secteur = secteur CEE | 🟠 | × CHANTIER |
| `check_15` | Parcelles = CEE (compareParcelles) | 🟠 | × CHANTIER |
| `check_16` | Nom du site = CEE | 🟠 | × CHANTIER |
| `check_17` | Nombre de bâtiments (manuel) | 🔵 | × CHANTIER |
| `check_18` | Répartition LED initial (manuel) | 🔵 | × CHANTIER |
| `check_19` | Total LED initial = CEE | 🟠 | MONO |
| `check_20` | Secteur étude = CEE | 🟠 | × CHANTIER |
| `check_21` | Total LED projeté = CEE | 🟠 | MONO |
| `check_22` | Répartition LED projeté (manuel) | 🔵 | × CHANTIER |
| `check_23` | Activité bâtiment = CEE | 🟠 | × CHANTIER |

### Description AUDIT
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_24` | Site = client | 🟠 | × CHANTIER |
| `check_25` | Adresse = CEE | 🟠 | × CHANTIER |
| `check_26` | SIRET = CEE | 🟠 | × CHANTIER |
| `check_27` | Surface audit = surface synthèse (±1 m²) | 🔵 | × CHANTIER |
| `check_28/29/30` | LED initial / projeté / pce luminaires = CEE | 🟠 | MONO |

### Mentions agricoles (Règle B)
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_31` | Aucune mention agricole (Audit + Synthèse) | 🟠 | UNIQUE |

> ✅ **Fusion TODO #32 (10/06/2026)** — commit `e3dbd6d` : les 4 checks redondants `check_31→34` (même détection recopiée ×4) sont fusionnés en un check global unique `check_31`. Détection `checkMentionsAgricoles` inchangée (périmètre Audit + Synthèse, fix B1 intact).

### Spécifications LED
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_35` | THD = 3,7% (DAEWOO) / N/A (TECH) | 🟠 | × CHANTIER |
| `check_36` | Fiche technique présente + THD | 🟠 | UNIQUE |
| `check_37` | Référence produit conforme | 🟠 | × CHANTIER |
| `check_38_duree_vie` | Durée de vie = fiche | 🟠 | × CHANTIER |

### Cohérence & administratif
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_39` | Nb audits = synthèses = attestations | 🟠 | UNIQUE |
| `check_41` | Adresse siège = CEE | 🟠 | UNIQUE |
| `check_42` | Date de signature = CEE | 🟠 | UNIQUE |
| `check_cee_incomplet` | Émis si extraction CEE sans objet `cee` (remplace 41/42) | 🟠 | UNIQUE (si `cee` absent) |

> ✅ Note : check_41 (adresse siège) est désormais **majeur** (corrigé le 29/05/2026, commit `f976521` — anomalie A2). Il ne bloque pas, car il ne fait pas partie de la page de garde Audit (§1). (check_40 a été supprimé le 28/05 — voir §1, désormais une alerte de confirmation.)
>
> ℹ️ `check_cee_incomplet` (categorie `cee`, niveau majeur) : signal unique poussé par `generateChecks` quand l'extraction `/api/analyze` ne renvoie aucun objet `cee`. Il remplace alors les checks 41/42 (qui n'auraient rien à comparer) plutôt que d'afficher de faux échecs/conformes. Ajouté le 29/05/2026 (commit `27e7918`).

### Attestations & surfaces (par chantier)
| ID | Vérifie | Niveau | Portée |
|----|---------|--------|--------|
| `check_43` | Attestation(s) sur l'honneur présente(s) | 🔵 | UNIQUE |
| `check_attestation_manquante_N` | Attestation absente → saisie manuelle | 🔵 | × CHANTIER |
| `check_45_N` (audit) | Somme surfaces Audit = Somme attestation | 🟠 | SI ATTEST. |
| `check_45_N` (synthèse) | Surface Synthèse = Somme attestation | 🟠 | SI ATTEST. |
| `check_45b_N` | Surfaces par bâtiment (1 à 1) | 🟠 | SI SURFACES DÉTAILLÉES |
| `attestationNonAgricole` (alerte conf.) | Entrepôt déclaré « non agricole » (BAT-EQ-127) — gatée NAF agricole | ⚠️ conf. | × CHANTIER |

> ℹ️ **Maille d'extraction des attestations** : le prompt `api/analyze.js` force « **1 occurrence de la phrase "La surface réelle de cet entrepôt…" = 1 élément `cee.attestations`, surface mono-valeur** » (commit `af21eb8`, 03/06/2026). Plusieurs surfaces → plusieurs éléments distincts, jamais empilés, même à adresse partagée. `ledTotal` et `parcelles` restent par chantier (facture). Pas de verrou numérique `length == N` (abandonné : pas d'ancrage fiable + casserait la détection d'attestation absente).

> ℹ️ **Champ `attestationNonAgricole` (évolution 1.3, en prod)** : 2 états — `'presente'` (seul OK) / `'non_detectee'` (défaut sûr) — ancré sur la phrase « entrepôt de stockage non agricole » (commit `0bef3d7`). Alimente l'**alerte confirmable gatée `isAgricole`** (voir §1 ; NAF inconnu → INFO non bloquant ; jamais bloquant ; commit `5f1da89`). Lu sur les attestations **originales** uniquement (le regroupement par adresse ne recopie pas la clé).

> ⚠️ **Angle mort prouvé en run (22/06/2026) — futur check « attestation entrepôt manquante », NON implémenté** : le C3 (`detectFautifsAttestationNonAgricole`) **n'itère que les attestations présentes** → **aveugle aux manquantes** ; le filet `check_surface_non_ventilable` (§7bis) vit dans `if(attestationsPresentes)` → **éteint si 0 attestation**. ⇒ **trou** : dossier **agricole sans AUCUNE attestation entrepôt** → ni C3 ni filet ne signalent. Règle métier **figée** du futur check (par chantier) : *attestation entrepôt attendue ⟺ secteur Entrepôt **ET** NAF 01.xx/02.xx*. Décision (dénominateur « Option 1 borne haute », niveau `info`, message prudent) + blocage découpage LATRILLE : `pending-todos.md` §TODO #27. **Cette note n'altère AUCUNE gravité/règle existante.**

> ✅ **#27 LATRILLE — 1 adresse = 1 chantier + appariement au grain chantier (01–03/07/2026, branche `fix/27-decoupage-parcelle`, mergée sur `main` le 06/07/2026)**. Règle métier **tranchée** : **1 adresse = 1 chantier** ; plusieurs bâtiments/cellules à une même adresse = toujours **1 audit + 1 synthèse** ; **parcelle ET secteur hors découpage**. Changements de comportement (les seuls de ce chantier qui touchent une gravité) :
> - **`check_25`** (adresse Audit) : apparié au chantier CEE **par adresse** (guichet `regrouperAttestationsParAdresse` + fallback `adressesChantiers`), plus par index brut sur `attestations[i]` (grain bâtiment) — commit `499c3fe`.
> - **`check_14_conflict`** : **majeur → `info`** « Secteurs multiples à la même adresse » (un chantier peut légitimement mélanger les secteurs) — commit `09abffd`. `check_14/20/23` principal **inchangés** (restent OK via `compareSecteurEtude`/`isEntrepot` ; le mélange surgit une seule fois via `check_14_conflict`).
> - **`check_45_audit` / `check_45_synthese`** : **majeur → `info` « à vérifier »** quand le chantier contient un bâtiment « Autres » (détecté via `detectAutresSecteurs`, **type métier ≠ libellés bruts**) dont la surface est dans la synthèse/audit mais pas dans les attestations entrepôt → écart légitime, **jamais vert**. Vrai écart entre entrepôts reste **majeur** — commit `dd65b9d`.
> - **`compareAddress`** : rejette désormais les adresses **vides/nulles** (`if (!addr1 || !addr2) return false`) — fin d'un faux match `'' === ''` (durcissement issu de la vérif adversariale, `dd65b9d`).
> Preuve : banc d'essai `#27` + harnais `test-batiments` 36/36 & `test-familles` 70/70, preview OK. **LED DELEFORTRIE (étape 4b) : ✅ validé le 06/07/2026 — voir §7bis.**

---

## 6. ANOMALIES TECHNIQUES À CORRIGER (ne cassent pas l'app)

### A1 — Collisions d'identifiants check_45_N
Plusieurs checks différents (audit / synthèse / info) partagent le même id `check_45_${chantierIndex}`.
➡️ Risque au recalcul (saisie manuelle) : `findIndex(id)` écrase le mauvais check.
➡️ Correctif : préfixer par type → `check_45_audit_N`, `check_45_synthese_N`.

### A2 — check_41 : niveau bloquant à tort  ✅ RÉSOLU
check_41 (adresse siège) est codé en bloquant alors que seule la page de garde Audit doit bloquer (§1) → il devrait être majeur.
➡️ ✅ **Résolu 29/05/2026** — commit `f976521` : check_41 repassé en `majeur`.
*(Note historique : l'ancien doublon d'id entre check_40 et la date de signature était déjà résolu — la date de signature est check_42. Et check_40 lui-même a été supprimé le 28/05, remplacé par l'alerte de confirmation « reste à payer ». A2 ne concerne donc plus que le niveau de check_41.)*

### A3 — check_47_global utilisé deux fois
Deux checks globaux (manuelles=audits / manuelles=synthèses) portent le même id `check_47_global`.
➡️ Correctif : `check_47_global_audit`, `check_47_global_synthese`.

### A4 — Tolérance LED ≠ règle
Règle R05 = tolérance ZÉRO (1 LED d'écart = erreur). Code = `Math.abs(...) < 0.1`.
➡️ Effet pratique quasi nul (LED entières) mais non conforme à l'intention. Correctif : comparaison entière stricte.

---

## 7. BUGS MÉTIER — historique des corrections

| # | Bug | Règle violée | Correctif appliqué | Statut |
|---|-----|--------------|--------------------|--------|
| B1 | `checkMentionsAgricoles` en `bloquant` + cherche dans le CEE | Règle B | Passé en `majeur` ; recherche limitée à Audit + Synthèse | ✅ **Résolu 27/05/2026** — commit `b3450c2` |
| B2 | Alerte secteur « Autres » non déclenchée en multi-chantiers | Règle A | Prompt d'extraction reformulé : secteur cherché dans la facture, par bloc chantier (adresse + parcelles), fallback attestation | ✅ **Résolu 28/05/2026** — commit `7242107` |
| Crash | `generateChecks` lève TypeError sur `norm.cee.adresseSiege` quand l'extraction omet l'objet `cee` (checks 41/42) | — *(bug technique de robustesse, pas une règle métier)* | Garde `if (!norm.cee)` → signal majeur `check_cee_incomplet` à la place de 41/42 ; `?.` sur les 5 accès | ✅ **Résolu 29/05/2026** — commit `27e7918` |
| État dossier | Données d'un dossier précédent persistant dans une nouvelle analyse sans reset → comparaisons sur données périmées / faux « conforme » (deux causes : texte CEE gardé en cache + champs ref* conditionnels jamais vidés) | §0 — les références doivent être celles du CEE du dossier courant | **Volet 1/2** (racine) : invalidation du cache texte CEE + reset NAF au changement de dossier — commits `86a5906` + `7f15377`. **Volet 2/2** : helper `clearReferenceFields()` vidant les 13 champs ref* (+ retrait `auto-filled`) au chargement CEE et dans `resetApplication`, jamais à l'analyse (ce sont les références des checks) — commit `1ec2c49` | ✅ **Résolu 02/06/2026** — bug entièrement clos (volets 1/2 + 2/2) |
| Modale custom | Chez certains utilisateurs (navigateur supprimant les boîtes de dialogue natives — option « empêcher d'autres dialogues », politiques d'entreprise), les 6 alertes confirmables ne s'affichaient pas : `window.confirm()` renvoyait `false` **instantanément** → « Analyse annulée par l'utilisateur » s'affichait **sans qu'aucune popup n'apparaisse ni qu'aucun clic ne soit fait** → outil inutilisable pour ces utilisateurs. *(Cause : dépendance aux boîtes de dialogue natives `confirm()`, supprimables par le navigateur.)* | — *(dette technique d'UX, pas une règle métier)* | Remplacement des 6 `confirm()` par un helper async `confirmModal(message)` → `Promise<boolean>` (modale DOM custom, **non supprimable** par le navigateur). **Comportement identique** : mêmes messages, mêmes niveaux, même flux, même branche d'annulation — OK → poursuit ; Annuler / Échap / clic backdrop → arrête. Aucune règle métier modifiée ; aucune alerte rendue bloquante (page de garde Audit `checks.slice(0,3)` inchangée). `index.html` | ✅ **Résolu 04/06/2026** — commit `8ce56bf` |

---

## 7bis. ÉVOLUTIONS IMPLÉMENTÉES — journal des livraisons

Évolutions de la roadmap implémentées et testées. Toutes sont désormais **mergées sur main** : les entrées du chantier ADR-015 (« Collision A1 levée », « Filet anti-faux-conforme : surface non ventilable », « Grain cellule LED », « Bâtiments par adresse fiabilisés »), livrées sur branches empilées, ont été mergées le **06/07/2026** (fast-forward du tip `fix/27-decoupage-parcelle`, cf. `pending-todos.md` §TODO #22). L'étape 4b volet 1/2 (LED chantier depuis `cellules[]`, commits `1f7c663` + `f05f150`) est **livrée et validée sur run réel** (06/07/2026 — voir ligne dédiée). Distinct du §7 (corrections de bugs).

| Évolution | Description | Implémenté le | Commit |
|-----------|-------------|---------------|--------|
| 1.1 | Alerte confirmable « Reste à payer » (3 états : absent / ≠0 / =0) remplaçant l'ancien check_40 | 28/05/2026 | 0aaf465 |
| 1.5 | Alerte confirmable « Étude de dimensionnement = PRIME EVOLUTION » par chantier (3 états : conforme / autre / non détectée), agrégée multi-chantiers, fin de message dynamique, jamais bloquant | 01/06/2026 | a4130d6 (extraction) + ba1fcce (alerte) |
| 1.4 | Alerte confirmable « Professionnel ayant mis en œuvre = Energie Responsable » (3 états : non détecté / Energie Responsable → exception / autre → silence), valeur globale du dossier (patron reste à payer), jamais bloquant | 01/06/2026 | 91bf93d (extraction) + 5392776 (alerte) |
| Chantier B | Vue « Par famille » — rapport de résultats groupé par famille de donnée métier. Fichier `familles-config.js` (`window.CEE_FAMILLES` = 10 familles + `ORDRE`/`LIBELLES` ; `window.resolveFamille(check)` → clé famille ou `null`) + harnais `test-familles.mjs` (71/71). Onglet « Par famille » (1er/actif) via `renderChecksByFamille` dans `index.html`. Accordéon livré ; grille 2D à venir (roadmap). | 05/06/2026 | 94aa7a1 (table + harnais) + ebb496d (vue) |
| Fix provenance | Routage des checks « dossier » via propriété `portee` (`global-cee` / `global-synthese`) lue par `getCheckProvenance` (méthode 0bis → `chantierIndex:null`, colonne portée par la valeur) + anti « chantier null » dans `groupChecksByHierarchy`. `check_39`/`36`/`31→34` → bloc Dossier. Prérequis de la future grille 2D. | 05/06/2026 | `3d4d75f` |
| TODO #32 | Fusion des 4 checks « mentions agricoles » (check_31→34) en un check global unique check_31 (portee:'global-cee', categorie:'synthese', champ « Mention agricole (Audit + Synthèse) ») — détection checkMentionsAgricoles strictement inchangée (fix B1 intact), compteurs et message auditeur dédoublonnés, harnais 71→69 (65 positifs + 4 négatifs, cas négatif check_32) | 10/06/2026 | e3dbd6d |
| Collision A1 levée (check_45) | L'id `check_45_${i}` était partagé par 4 formes (audit / synthèse-surface / surface-éclairée-manquante / synthèse-manquante) routées vers 2 familles → collision au recalcul + routage par fragment de texte. Préfixage par type : `check_45_audit_${i}` / `check_45_synthese_${i}` (surfaces, famille 7) ; la forme « synthèse manquante » migre vers `check_synthese_manquante_${i}` (complétude, famille 9, table ancrée). Recalcul réaligné (corrige le bug `check_44_${i}` no-op → cible désormais `check_45_audit_${i}`). Routage `familles-config.js` adapté a minima (résolveur `/^check_45_(audit|synthese)_\d+$/` → 7 ; entrée ancrée `check_synthese_manquante` → 9). Harnais 70/70. Non-régression preview OK. (ADR-015 étape 1a) | 11/06/2026 | `a61d343` |
| Filet anti-faux-conforme : surface non ventilable | Signal DOSSIER `check_surface_non_ventilable` (portee `global-cee`, niveau `info` → « à vérifier » jaune, jamais vert) émis quand `S < A` (S = attestations porteuses de surface ; A = chantiers attendus via `matchChantiers`), garde `S > 0` (sinon cas « attestation manquante » déjà géré). Fin du faux conforme silencieux sur dossiers à attestation surface repliée (1 attestation pour N chantiers, ex. DELEFORTRIE). Message PRUDENT (constat de comptage, jamais « globale »/« manquante » affirmé : peut être légitime OU extraction incomplète). Validé preview double sens : DELEFORTRIE (S=1<A=2 → signal présent) ; DES LAURIERS (S=2=A=2 → pas de signal). Routage famille 7. Harnais 70/70. Niveau chantier NON implémenté (asymétrie de maille du #27, secondaire — symptôme d'un dossier incomplet, pas un défaut de `compareAddress` qui est correct) ; discriminant `C > A` reporté (grain cellule absent avant étape 3). (ADR-015 étape 2) | 11/06/2026 | `de0f36d` |
| Grain cellule LED (étape 3, révisée Philo 2) | Tableau `cellules[]` (LED par bâtiment) extrait À CÔTÉ de `attestations[]` (strictement inchangé) dans `api/analyze.js`. Émission gouvernée par la RÉPÉTITION DE L'ADRESSE SUR LA FACTURE (analyse INTER-chantiers : ≥ 2 blocs facture à la même adresse normalisée → 1 cellule par bloc ; adresse dans 1 seul bloc → `cellules: []`). Indépendant du numéro de bâtiment : 2 blocs même adresse SANS « BAT n » comptent quand même (cas COPPIN). `ledCellule` = quantité du bloc FACTURE (colonne Quantité), source = `"facture"`, règle anti-invention (jamais de total chantier réparti/sommé). Champs : `adresse` (verbatim, bâtiment inclus si présent), `ledCellule` (string, non sommé), `source`. Additif, contrat de sortie inchangé. Validé preview DELEFORTRIE (→ [26, 26], 6 rue sans cellule) / COPPIN (→ [24, 12], dont 24 sans BAT) / DES LAURIERS (→ []). Détail : ADR-015 §Réalisation étape 3. Harnais 70/70. (ADR-015 étape 3 révisée) | 16/06/2026 | `d589c69` |
| Bâtiments par adresse fiabilisés (étape 4a) | `extraireNombreBatiments` (`index.html`) refondue : `normalize()` en amont (graphie « bât » accentuée reconnue), neutralisation du code postal (`\d{5}` et forme découpée `\d{2}\s\d{3}`, avant/après la ville), séparateurs ciblés (virgule, « à »/« a » de plage, tiret, « et », espace-nu), gardes parcelle (tiret ET espace-nu, lookahead `(?!\d+\s*/)`). Plages → `max−min+1` ; listes → comptage. Auto-test isolé 21/21 ; cosmétique (n'affecte que le libellé « (N bâtiments) » sur check_09d, aucun `niveau` impacté). Harnais 70/70. (ADR-015 étape 4a) | 12/06/2026 | `219b024` + `c8b1244` |
| Reconstruction LED chantier (étape 4b volet 1/2) | `ledTotal` chantier = Σ `ledCellule` par substitution sur adresse normalisée dans `regrouperAttestationsParAdresse` (`cellules[]` extraites de la facture, étape 3). **Validée sur run réel DELEFORTRIE complet (06/07/2026, preview)** : attestation agrégée 66 → 52 reconstruit, `check_09d_audit`/`check_09d_synthese` conformes 52=52. Limites tracées : sans `cellules[]` extraites (LLM non déterministe) le brut agrégé l'emporte **sans signal** (candidat volet 2/2, TODO #22) ; les « 66 vs 52 » restants à l'écran = check_19/21/28/29/30 (référence au total dossier, mauvais grain hérité mono-chantier — hors-4b, prochain sujet). | 12/06/2026 (code) · 06/07/2026 (validation) | `1f7c663` + `f05f150` |

**Chantier B — 10 familles** (ordre `CEE_FAMILLES.ORDRE`) : 1a Identité société · 1b Coordonnées client · 2 Dates · 3 Type de local + mention agricole · 4 Adresses chantier · 5 Nb LED total + répartition · 6 Parcelles · 7 Surface + superficies · 8 Fiche technique · 9 Complétude.

**Routage** (`resolveFamille`) : résolution par **id ancré** (`^check_NN(_c\d+)?$`) ; **fragment de texte** pour 2 collisions seulement (`check_42_N`, `check_45_N`, désambiguïsées par le `champ`) ; **filet `null` strict des deux côtés** (id non reconnu OU libellé de collision inattendu → `null` = seau « Non classés » visible, jamais masqué) ; checks Google Sheet `sheet_*` **hors périmètre** via `startsWith('sheet_')` (seau séparé). Bug moteur `check_47_global` signalé (mention famille 7), non corrigé.

---

## 8. RÈGLES MÉTIER CRITIQUES — toutes présentes dans le code

| Règle | Présente | Où |
|-------|----------|-----|
| Page de garde Audit = seul bloquant | OUI | `check_01/02/03` |
| THD 3,7% (DAEWOO) | OUI | `check_35` |
| Parcelles cadastrales | OUI | `check_15`, `compareParcelles()` |
| SIRET 14 ch. (du CLIENT, pas Prime Evolution) | OUI | `check_11/26`, `compareSIRET()` |
| Reste à payer = 0€ | OUI | Alerte de confirmation (§1) — ex-check_40 |
| Cohérence LED total + par chantier | OUI | `check_09a/b/c/d` |
| Cohérence nb chantiers | OUI | `check_39` |
| Adresses : ignorer bâtiments/parcelles | OUI | `compareAddress()` |
| Surfaces tolérance ±1 m² | OUI | `sumSurfaces` + comparaisons |

**Aucune règle métier perdue.** La modularisation annulée n'a laissé aucune séquelle sur `main`.

---

## 9. LIEN AVEC LA ROADMAP

Ce document décrit **l'existant** (ce que l'outil fait aujourd'hui). Les évolutions du process métier non encore codées (délais de travaux, attestation agricole bloquante, Prime Evolution, croisement dirigeants API, justificatifs, Betool/xls) sont décrites dans **`ROADMAP_EVOLUTIONS.md`**.

Quand une évolution de la roadmap est implémentée et testée, elle est déplacée ici.

---

*Établi le 27/05/2026 — par lecture du code + validation métier directe.*
*À mettre à jour à chaque évolution d'une règle métier.*
