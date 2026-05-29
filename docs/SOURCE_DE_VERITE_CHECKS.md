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

**Infos extraites automatiquement du CEE** : nom société, SIRET, date d'envoi du devis, date de signature, adresse siège social, nombre total de LED, type de local, référence LED, parcelles cadastrales, email, téléphone et contact du client.

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

> Les autres déclencheurs de ce mécanisme (délais de travaux, attestation agricole BAT-EQ-127, Clichy, Prime Evolution) sont des **évolutions à venir** — voir `ROADMAP_EVOLUTIONS.md`, Phase 1.

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
| `check_31`→`check_34` | Aucune mention agricole (Audit + Synthèse) | 🟠 | UNIQUE (×4) |

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

---

## 7bis. ÉVOLUTIONS IMPLÉMENTÉES — journal des livraisons

Évolutions de la roadmap implémentées, testées et mergées sur main. Distinct du §7 (corrections de bugs).

| Évolution | Description | Implémenté le | Commit |
|-----------|-------------|---------------|--------|
| 1.1 | Alerte confirmable « Reste à payer » (3 états : absent / ≠0 / =0) remplaçant l'ancien check_40 | 28/05/2026 | 0aaf465 |

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

Ce document décrit **l'existant** (ce que l'outil fait aujourd'hui). Les évolutions du process métier non encore codées (délais de travaux, attestation agricole bloquante, vérif Clichy, Prime Evolution, croisement dirigeants API, justificatifs, Betool/xls) sont décrites dans **`ROADMAP_EVOLUTIONS.md`**.

Quand une évolution de la roadmap est implémentée et testée, elle est déplacée ici.

---

*Établi le 27/05/2026 — par lecture du code + validation métier directe.*
*À mettre à jour à chaque évolution d'une règle métier.*
