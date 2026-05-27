⚠️ OBSOLÈTE — règles dépassées. Voir docs/SOURCE_DE_VERITE_CHECKS.md qui fait foi.

# RÈGLES MÉTIER - CEE LED (BAT-EQ-127)

**Document de référence exhaustif** pour toutes les règles de vérification des dossiers CEE LED.

**Dernière mise à jour** : 12 mai 2026

---

## ⚠️ IMPORTANT : Niveaux de priorité

### 🔴 BLOQUANT
**Définition** : Empêche l'envoi du dossier en signature client.

**Scope** : **PAGE DE GARDE DE L'AUDIT UNIQUEMENT**
- Nom client
- Adresse chantier
- Date audit

**Logique métier** : Si page de garde OK → client peut signer pendant qu'on corrige le reste.

### 🟠 MAJEUR
**Définition** : À corriger avant envoi CEE complet à Total Energies.

**Scope** : **TOUT LE RESTE**
- Synthèse
- Dossier CEE
- Cohérence multi-chantiers
- Vérifications techniques

**Logique métier** : Corrections faites en parallèle de la signature client.

### 🔵 INFO
**Définition** : À vérifier manuellement, pas d'automatisation possible.

**Scope** : Cas ambigus ou nécessitant jugement humain.

---

## RÈGLES BLOQUANTES (3)

### R01 : Mentions agricoles strictement interdites

**Niveau** : 🔴 BLOQUANT
**Check ID** : 21, 37, 38

**Règle** : Aucune mention "agri", "agricole", "agriculteur", "EARL", "SCEA" dans AUCUN document.

**Exception** : Nom de la société peut contenir "agricole" (ex: "Coopérative Agricole de Bretagne").

**Détection** :
```javascript
// Mots interdits
const keywords = ['agri', 'agricole', 'agriculteur', 'EARL', 'SCEA'];

// Chercher PARTOUT sauf nom société
const found = searchInDocuments(keywords, excludeCompanyName: true);

if (found) {
  return { niveau: 'bloquant', action: '❌ ARRÊT IMMÉDIAT' };
}
```

**Raison** : CEE LED (BAT-EQ-127) = Bâtiments TERTIAIRES uniquement. Agriculture = autre opération CEE.

**Sources** :
- [CLAUDE.md ligne 13]
- [Mémoire `reference_regles_validation_cee.md`]

---

### R02 : Page de garde Audit - Correspondance exacte

**Niveau** : 🔴 BLOQUANT
**Check IDs** : 01, 02, 03

**Règle** : 3 champs de la page de garde doivent correspondre EXACTEMENT aux références :

| Champ | Audit page 1 | Référence |
|-------|--------------|-----------|
| **Nom client** | En-tête | = Nom entreprise CEE = Nom officiel gouvernemental |
| **Adresse chantier** | En-tête | = Adresse chantier CEE (numéro + rue + CP + ville) EXACTEMENT |
| **Date audit** | En-tête | = Date proposition = Date prévisite CEE |

**Tolérance** :
- Casse : "DUPONT" = "Dupont" ✅
- Accents : "éèê" = "eee" ✅
- Espaces multiples : "Rue  de  Paris" = "Rue de Paris" ✅
- **AUCUNE tolérance** sur les chiffres/valeurs

**Comparaison** : Utiliser `compareStrings()` pour nom, `compareAddress()` pour adresse, `compareDate()` pour date.

**Raison** : Page de garde = document signé par le client. Si erreur → refus de signature → blocage total du dossier.

**Sources** :
- [CLAUDE.md lignes 15]
- [Transcript 5c6b218b] - "Page de garde seule chose bloquante"

---

### R03 : Profil d'utilisation - Entrepôt/Logistique uniquement

**Niveau** : 🔴 BLOQUANT
**Check ID** : 10

**Règle** : Le profil d'utilisation dans l'Audit doit être :
- ✅ "Entrepôt"
- ✅ "Logistique"
- ❌ JAMAIS "Agricole" ou variantes

**Détection** :
```javascript
const profil = audit.profilUtilisation || '';
const isAgricole = profil.toLowerCase().includes('agri');

if (isAgricole) {
  return { niveau: 'bloquant', action: '❌ ARRÊT IMMÉDIAT' };
}
```

**Raison** : Cohérence avec R01 (pas d'agriculture).

**Sources** :
- [CLAUDE.md ligne 14]

---

## RÈGLES MAJEURES (10)

### R04 : SIRET - 14 chiffres, cohérent, du CLIENT

**Niveau** : 🟠 MAJEUR
**Check IDs** : 04, 11

**Règle** :
1. **Format** : Exactement 14 chiffres
2. **Cohérence** : Identique dans TOUS les documents (Audit, Synthèse, CEE)
3. **Source** : **TOUJOURS celui du client bénéficiaire**, JAMAIS celui de Prime Evolution

**⚠️ PIÈGE CRITIQUE** :
```
❌ FAUX : Extraire le SIRET de "Prime Evolution" (bureau d'études)
✅ VRAI : Extraire le SIRET du client (en-tête du document)
```

**Extraction** :
```javascript
// Dans l'Audit page 1 : SIRET du CLIENT (pas de Prime Evolution!)
// Exemple :
// ┌─────────────────────────┐
// │ DUPONT SARL             │ ← Client (extraire ce SIRET)
// │ SIRET: 12345678901234   │
// ├─────────────────────────┤
// │ Audit réalisé par       │
// │ Prime Evolution         │ ← Bureau d'études (NE PAS extraire ce SIRET)
// │ SIRET: 98765432109876   │
// └─────────────────────────┘
```

**Comparaison** : Stricte (pas de tolérance, chiffres exacts).

**Source API gouvernementale** : Vérification via `api/search.js` avec API `recherche-entreprises.api.gouv.fr`.

**Raison** : SIRET identifie légalement l'entreprise bénéficiaire du CEE. Erreur = fraude potentielle.

**Sources** :
- [ADR 008] - Extraction CLIENT vs Prime Evolution (8 mai 2026)
- [CLAUDE.md ligne 21]
- [Mémoire `reference_extraction_audit_client_vs_bureau.md`]

---

### R05 : LED - Cohérence totale multi-chantiers

**Niveau** : 🟠 MAJEUR
**Check IDs** : 9a, 9b, 9c, 9d (par chantier + global)

**Règle** : Vérification à **2 niveaux** :

#### Niveau 1 : Par chantier (tolérance = 0)
```
Audit[i].ledTotal === Synthèse[i].ledTotal === CEE.attestations[i].ledTotal
```

Exemple :
```
Chantier 1 : Audit = 120 LED, Synthèse = 120 LED, CEE = 120 LED ✅
Chantier 2 : Audit = 75 LED, Synthèse = 75 LED, CEE = 76 LED ❌ (différence de 1)
```

#### Niveau 2 : Total global (tolérance = 0)
```
Σ(Audit[i].ledTotal) === Σ(Synthèse[i].ledTotal) === CEE.totalLed
```

**Tolérance** : **AUCUNE** (même 1 LED de différence = erreur).

**Comparaison** : Numérique stricte (pas de string).
```javascript
const isOk = parseInt(led1) === parseInt(led2);  // Pas de ===
```

**Raison** : Le montant du CEE est calculé sur le nombre de LED. 1 LED de différence = montant financier erroné.

**Sources** :
- [Mémoire `project_multi_chantiers_led.md`]
- [ADR 003] - Refonte multi-chantiers

---

### R06 : THD - Exactement 3,7%

**Niveau** : 🟠 MAJEUR
**Check ID** : 35

**Règle** : Taux de distorsion harmonique (THD) doit être **exactement 3,7%**.

**Tolérance** : **AUCUNE**
- ❌ 3,6% → erreur
- ❌ 3,8% → erreur
- ✅ 3,7% uniquement

**Formats acceptés** :
- "3,7%"
- "3.7%"
- "3,7 %"
- "3.70%" (comparaison numérique)

**Comparaison** :
```javascript
function compareTHD(val1, val2) {
  // Nettoyer : supprimer %, espaces, convertir virgule → point
  const num1 = parseFloat(val1.replace(/[%\s]/g, '').replace(',', '.'));
  const num2 = parseFloat(val2.replace(/[%\s]/g, '').replace(',', '.'));

  return num1 === num2;  // 3.7 === 3.7 ✅, 3.7 === 3.70 ✅
}
```

**Raison** : Caractéristique technique normée des luminaires DAEWOO/TECH. Autre valeur = mauvais produit.

**Sources** :
- [CLAUDE.md ligne 20]
- [Mémoire `reference_regles_validation_cee.md` ligne 108]

---

### R07 : Parcelles cadastrales - Format 000/0B/XXXX

**Niveau** : 🟠 MAJEUR
**Check IDs** : 15, 28, 29

**Règle** : Format `000/0B/XXXX` où :
- `000` = Code commune (3 chiffres)
- `0B` = Section cadastrale (1-2 caractères alphanumériques)
- `XXXX` = Numéro parcelle (1-4 chiffres)

**Exemples valides** :
- `129/YD/0203`
- `541/B/0012`
- `066/ZA/0006`

**⚠️ PIÈGE CRITIQUE** :
```javascript
// ❌ FAUX : Utiliser compareStrings()
const ok = compareStrings("129/YD/0203", "129 / YD / 0203");  // false (espaces)

// ✅ VRAI : Utiliser compareParcelles()
const ok = compareParcelles("129/YD/0203", "129 / YD / 0203");  // true
```

**Fonction spécialisée** : `compareParcelles(val1, val2)`
```javascript
function compareParcelles(val1, val2) {
  // 1. Supprimer TOUS les espaces
  // 2. Séparer par virgule OU tiret
  // 3. Trier (ordre n'a pas d'importance)
  // 4. Comparer

  // "129/YD/0203, 129/YD/0151" = "129/YD/0151, 129/YD/0203" ✅
}
```

**Raison** : Identification cadastrale légale du terrain. Erreur = incohérence administrative.

**Sources** :
- [CLAUDE.md ligne 22]
- [Mémoire `reference_regles_validation_cee.md` lignes 11-20]
- [RESUME_EXECUTIF.md] - Pattern obligatoire P1

---

### R08 : Référence produit LED identique

**Niveau** : 🟠 MAJEUR
**Check ID** : 36

**Règle** : La référence des luminaires LED doit être identique dans TOUS les documents.

**Références acceptées** :
- **DAEWOO NES-HBL 250W** (le plus courant)
- **TECH LED 150W**

**Détection automatique** :
```javascript
// Depuis la FACTURE CEE, colonne "Référence"
if (ref.includes('DAEWOO') || ref.includes('NES-HBL')) {
  referenceLed = 'DAEWOO';
} else if (ref.includes('TECH') || ref.includes('HIGH BAY')) {
  referenceLed = 'TECH';
}
```

**Comparaison** : `compareStrings()` suffit (normalisation standard).

**Raison** : Caractéristiques techniques (THD, durée de vie, puissance) dépendent du modèle. Incohérence = erreur de devis.

**Sources** :
- [ADR 006] - Sélecteur référence LED et fiches techniques (8 mai 2026)
- [CLAUDE.md ligne 24]
- [Mémoire `reference_regles_validation_cee.md` lignes 100-105]

---

### R09 : Surfaces - Tolérance ±1 m²

**Niveau** : 🟠 MAJEUR
**Check IDs** : 07, 08, 17, 34, 43, 44, 45, 46

**Règle** : Comparaison des surfaces avec **tolérance ±1 m²** pour compenser les arrondis.

**Exemples** :
```
850 m² vs 850,5 m² → Δ = 0,5 m² < 1 m² ✅ OK
850 m² vs 852 m² → Δ = 2 m² > 1 m² ❌ ERREUR
```

**Comparaison** :
```javascript
function compareSurfaces(surf1, surf2) {
  const num1 = parseFloat(surf1);
  const num2 = parseFloat(surf2);

  return Math.abs(num1 - num2) < 1;  // Tolérance ±1 m²
}
```

**⚠️ PIÈGE** : Ne JAMAIS utiliser `===` pour les surfaces !
```javascript
// ❌ FAUX
const ok = (850 === 850.5);  // false → faux positif

// ✅ VRAI
const ok = Math.abs(850 - 850.5) < 1;  // true
```

**Raison** : Arrondis différents entre documents (ex: Audit calcule 850,3 → affiché "850", CEE calcule 850,7 → affiché "851").

**Sources** :
- [ADR 005] - Support NAF et surfaces manuelles
- [Mémoire `reference_saisie_surfaces_manuelles.md`]

---

### R10 : Date audit = Date devis

**Niveau** : 🟠 MAJEUR
**Check IDs** : 03, 13, 27

**Règle** : La date de l'audit doit correspondre à la date d'envoi du devis (date de proposition).

**Format accepté** : **JJ/MM/AAAA uniquement**
- ✅ "08/05/2026"
- ❌ "2026-05-08" (format ISO non accepté)
- ❌ "05/08/2026" (format américain MM/JJ/AAAA non accepté)

**Comparaison** : `compareDate(date1, date2)`
```javascript
function compareDate(date1, date2) {
  // 1. Vérifier format JJ/MM/AAAA
  // 2. Normaliser (supprimer espaces si "08 / 05 / 2026")
  // 3. Comparer string exact

  return normalizedDate1 === normalizedDate2;
}
```

**Raison** : Traçabilité administrative. Date erronée = incohérence contractuelle.

**Sources** :
- [CLAUDE.md ligne 25]
- [Commit b6709b5] - "Règle stricte dates : format JJ/MM/AAAA obligatoire"

---

### R11 : Secteur d'activité - Entrepôts

**Niveau** : 🟠 MAJEUR
**Check IDs** : 14, 18, 20, 23

**Règle** : Le secteur d'activité doit être "Entrepôts" ou équivalent.

**Valeurs acceptées** :
- "Entrepôts"
- "Logistique"
- "Stockage"
- "Entrepôt et logistique"
- "Zone de stockage"

**⚠️ PIÈGE** : Utiliser `compareSecteurEtude()`, PAS `compareStrings()`
```javascript
function compareSecteurEtude(val1, val2) {
  // 1. Supprimer chiffres au début ("13 Logistique" → "Logistique")
  // 2. Détecter équivalences (Entrepôt = Logistique = Stockage)

  // "Entrepôt" = "13 Logistique et entrepôt" ✅
}
```

**Extraction par chantier** : Chaque attestation CEE a SON propre secteur.
```javascript
// ❌ FAUX : Un seul secteur global
cee.secteurActivite = "Entrepôts";

// ✅ VRAI : Un secteur PAR attestation
cee.attestations[0].secteurActivite = "Entrepôts";
cee.attestations[1].secteurActivite = "Logistique";
```

**Raison** : CEE LED (BAT-EQ-127) = tertiaire entrepôts uniquement.

**Sources** :
- [ADR 010] - Extraction secteur d'activité par chantier (9 mai 2026)
- [CLAUDE.md ligne 16]
- [Mémoire `reference_regles_validation_cee.md` lignes 21-28]
- [Commit 435b846] - "API: Extraction secteur d'activité par chantier"

---

### R12 : Code NAF et surfaces manuelles

**Niveau** : 🟠 MAJEUR (si applicable)
**Check IDs** : 43, 44, 45, 46

**Règle** : Pour les secteurs "Autres" OU code NAF non agricole (≠ 01.xx, 02.xx) :
- L'attestation CEE ne contient PAS de surface
- → Saisie manuelle requise
- → Recalcul instantané des checks surfaces

**Détection** :
```javascript
const secteur = attestation.secteurActivite || '';
const codeNaf = window.selectedCodeNaf || '';

const isAutres = secteur.toLowerCase().includes('autres');
const isAgricole = codeNaf.startsWith('01.') || codeNaf.startsWith('02.');

if (isAutres || !isAgricole) {
  // Afficher interface saisie manuelle
}
```

**Code NAF source** : API gouvernementale `recherche-entreprises.api.gouv.fr`
```javascript
// api/search.js ligne 52
codeNaf: entreprise.activite_principale  // Ex: "46.73Z", "01.21Z"
```

**Workflow** :
1. Utilisateur recherche SIRET → Code NAF extrait automatiquement
2. Import dossier CEE → Détection secteur "Autres" OU NAF non agricole
3. Interface saisie manuelle affichée
4. Utilisateur saisit surfaces par chantier
5. Recalcul instantané checks 43-46

**Raison** : Attestations CEE secteur "Autres" ne contiennent pas de surface → vérification impossible sans saisie manuelle.

**Sources** :
- [ADR 005] - Support NAF et surfaces manuelles
- [Mémoire `reference_saisie_surfaces_manuelles.md`]

---

### R13 : Adresses - Normalisation et comparaison

**Niveau** : 🟠 MAJEUR
**Check IDs** : 02, 09, 12, 25, 32

**Règle** : Comparaison d'adresses avec normalisation agressive.

**⚠️ EXCLUSIONS CRITIQUES** :
```javascript
// NE JAMAIS inclure dans l'adresse :
// 1. Mentions de bâtiments : "BAT 2", "Bâtiment 1", "batiments 1-2-3-4"
// 2. Parcelles cadastrales : "129/YD/0203", format XXX/XX/XXXX
```

**Fonction spécialisée** : `compareAddress(addr1, addr2)`
```javascript
function compareAddress(addr1, addr2) {
  // 1. Supprimer mentions bâtiments
  addr = addr.replace(/\b(bat|batiment|bâtiment|batiments)\s*[\d\-]+/gi, '');

  // 2. Supprimer parcelles cadastrales (format XXX/XX/XXXX)
  addr = addr.replace(/\d{3}\/[A-Z]{1,2}\/\d{1,4}/g, '');

  // 3. Normaliser (minuscules, sans accents, sans espaces multiples)
  addr = normalize(addr);

  // 4. Vérifier inclusion bidirectionnelle
  return addr1.includes(addr2) || addr2.includes(addr1);
}
```

**Exemples** :
```
"La Mazurie _ B5190" = "LA MAZURIE B5190" ✅
"541 Rue Saint-jean - BAT 2 60130 Noroy" = "541 RUE SAINT-JEAN 60130 NOROY" ✅
"route de la raimbaudière - 066/ZA/0006 49380" = "route de la raimbaudière 49380" ✅
```

**Raison** : Mentions bâtiments/parcelles = références, pas adresse géographique.

**Sources** :
- [ADR 007] - Normalisation adresses - Ignorer mentions bâtiments (8 mai 2026)
- [Mémoire `reference_adresses_batiments_cee.md`]
- [Commit 080f407] - "Fix: Ignorer mentions BAT/Bâtiment dans adresses"
- [Commit 3673109] - "Fix: Support batiments multi-chiffres (1-2-3-4)"

---

---

### R16 : Cohérence structurelle multi-chantiers

**Niveau** : 🟠 MAJEUR
**Check ID** : 39

**Règle** : Le nombre de chantiers doit être cohérent entre tous les documents.

**Vérification** :
```javascript
const nbAudits = audits.length;
const nbSyntheses = syntheses.length;
const nbAttestations = attestationsCEE.length;

// Tous doivent être égaux
const coherent = (nbAudits === nbSyntheses) && (nbSyntheses === nbAttestations);
```

**Exemples** :
```
✅ OK : 2 audits, 2 synthèses, 2 attestations
❌ ERREUR : 2 audits, 2 synthèses, 3 attestations (incohérence)
❌ ERREUR : 1 audit, 2 synthèses, 2 attestations (incohérence)
```

**Raison** : Un dossier incohérent indique une erreur de saisie ou d'extraction. Chaque chantier doit avoir son audit + synthèse + attestation CEE.

**Sources** :
- [Commit 7036e54] - "feat: ajout check 39 cohérence chantiers"
- [TODO #1] - Implémentation checks conformes documentation

---

## RÈGLES INFORMATIONNELLES (2)

### R14 : Contacts Synthèse optionnels

**Niveau** : 🔵 INFO
**Check IDs** : 06, 07, 08

**Règle** : Email, téléphone, nom du contact dans la Synthèse sont **optionnels** (pas bloquants si manquants).

**Raison** : Ces informations ne sont pas toujours disponibles à la phase de prévisite.

**Sources** :
- [Commit e45b456] - "Corrections règles de comparaison + contacts Synthèse optionnels"

---

### R15 : Vérifications manuelles

**Niveau** : 🔵 INFO
**Check IDs** : 41

**Règle** : Certaines vérifications nécessitent jugement humain et ne peuvent être automatisées.

**Exemples** :
- Qualité des photos dans l'audit
- Pertinence des recommandations
- Cohérence globale du dossier

**Raison** : Impossible à automatiser via extraction de texte.

**Sources** :
- [CHECKLIST_MANUELLE.md]

---

## RÉSUMÉ DES FONCTIONS DE COMPARAISON

| Fonction | Usage | Spécificités |
|----------|-------|--------------|
| `compareStrings(str1, str2)` | Comparaison standard | Normalisation : minuscules, sans accents, espaces simples |
| `compareParcelles(val1, val2)` | Parcelles cadastrales | Supprime espaces, ignore ordre, accepte virgules/tirets |
| `compareSecteurEtude(val1, val2)` | Secteurs d'étude | Supprime chiffres début, détecte équivalences Entrepôt/Logistique |
| `compareAddress(addr1, addr2)` | Adresses | Supprime bâtiments/parcelles, inclusion bidirectionnelle |
| `compareNumber(val1, val2)` | Nombres/pourcentages | Comparaison numérique (pas string), supprime %, virgules |
| `compareDate(date1, date2)` | Dates | Format JJ/MM/AAAA obligatoire |
| `compareSurfaces(surf1, surf2)` | Surfaces | Tolérance ±1 m² |
| `compareTHD(val1, val2)` | THD | Exactement 3,7% (comparaison numérique) |

**⚠️ RÈGLE D'OR** : TOUJOURS utiliser la fonction spécialisée appropriée, JAMAIS `compareStrings()` par défaut.

---

## SOURCES

### ADRs (Architecture Decision Records)
- [ADR 003] - Refonte multi-chantiers (7 mai) → R05
- [ADR 005] - Support NAF et surfaces manuelles (11 mai) → R09, R12
- [ADR 006] - Sélecteur LED et fiches techniques (8 mai) → R08
- [ADR 007] - Normalisation adresses - Ignorer bâtiments (8 mai) → R13
- [ADR 008] - Extraction CLIENT vs Prime Evolution (8 mai) → R04
- [ADR 010] - Secteur d'activité par chantier (9 mai) → R11

### Documentation principale
- [CLAUDE.md] - Document principal du projet
- [CHECKLIST_COMPLETE.md] - 40 points de vérification exhaustifs
- [RESUME_EXECUTIF.md] - Synthèse des décisions et règles métier

### Mémoires auto
- `reference_regles_validation_cee.md`
- `reference_adresses_batiments_cee.md`
- `reference_extraction_audit_client_vs_bureau.md`
- `reference_saisie_surfaces_manuelles.md`
- `project_multi_chantiers_led.md`

### Transcripts
- `59038263-1388-4384-b0be-616ffcc10f6d.jsonl` (5-7 mai)
- `5c6b218b-4d73-46b1-8de4-f78188895c46.jsonl` (7-11 mai)

### Autres
- [Commits Git] - Historique des corrections et évolutions

---

**Dernière révision** : 12 mai 2026
**Responsable** : Prime Evolution
