# Guide : Dupliquer l'outil pour une nouvelle fiche d'opération standardisée CEE

**Date** : 26 mai 2026

**Contexte** : L'outil actuel est spécialisé pour BAT-EQ-127 (LED). Ce guide explique comment le dupliquer/adapter pour une autre fiche CEE (ex: BAT-TH-116 chaudières, BAT-EN-102 isolation, etc.).

---

## Vue d'ensemble

### Ce qui reste identique (70-80%)
- ✅ Architecture upload → API Claude → extraction → affichage
- ✅ Système de checks (id, niveau, catégorie, détail, attendu/trouvé)
- ✅ Interface résultats (accordéons, filtres, export PDF)
- ✅ Structure documentaire (Audit, Synthèse, Attestations)
- ✅ Logique de validation croisée entre documents
- ✅ Règles communes (adresses, surfaces, identité client, secteur NAF)
- ✅ Système saisie manuelle avec recalcul

### Ce qui change (20-30%)
- 🔄 Champs techniques à extraire (LED vs chaudière vs isolation)
- 🔄 Instructions d'extraction Claude (spécifiques à chaque équipement)
- 🔄 Règles de calcul (pceLuminaires vs autre formule)
- 🔄 Fiche technique produit (format et données différentes)
- 🔄 Checks métier spécifiques à l'opération

---

## Checklist de duplication

### 1️⃣ Préparation (30 min)

**Créer une copie du projet** :
```bash
cp -r cee-verif/ cee-verif-BAT-TH-116/
cd cee-verif-BAT-TH-116/
```

**Identifier les documents types** du nouveau dossier :
- [ ] Audit énergétique (format identique ?)
- [ ] Synthèse de l'opération (format identique ?)
- [ ] Attestations sur l'honneur (quelles attestations ?)
- [ ] Fiche technique produit (quel équipement ?)
- [ ] Autres documents spécifiques

**Lister les champs à extraire** :
- [ ] Champs communs : client, adresse, surfaces, secteur, SIRET, dates
- [ ] Champs spécifiques équipement : ??? (à définir selon la fiche)

---

### 2️⃣ Adaptation API extraction (4-6h)

**Fichier** : `api/analyze.js`

**Sections à modifier** :

#### A) Instructions générales (lignes 37-70)
```javascript
IMPORTANT : Voici les documents du dossier :
1. [NOM_OPERATION] - Audit énergétique
2. [NOM_OPERATION] - Synthèse de l'opération
3. [NOM_OPERATION] - Attestation(s) sur l'honneur
4. [NOM_OPERATION] - Fiche technique [EQUIPEMENT]
```

**Actions** :
- [ ] Remplacer "BAT-EQ-127" par le nouveau numéro de fiche
- [ ] Adapter la description de l'opération
- [ ] Lister les documents spécifiques

#### B) Section Audit (lignes 71-115)
```javascript
### 1️⃣ AUDIT ÉNERGÉTIQUE

**À extraire** :
- ... [champs communs restent]
- [NOUVEAU] équipements installés : [décrire]
- [NOUVEAU] caractéristiques techniques : [décrire]
```

**Actions** :
- [ ] Garder les champs communs (client, adresse, surfaces, secteur)
- [ ] Remplacer les champs LED par les nouveaux champs équipement
- [ ] Adapter les exemples

#### C) Section Synthèse (lignes 116-180)
**Actions** :
- [ ] Même logique que pour l'Audit
- [ ] Adapter les caractéristiques techniques de l'équipement
- [ ] Modifier les tableaux/sections à chercher

#### D) Section Attestations (lignes 221-253)
**⚠️ POINT D'ATTENTION** : Bien identifier les différents types d'attestations

**Questions à se poser** :
- [ ] Combien d'attestations différentes dans le dossier ?
- [ ] Quelle attestation contient les surfaces ?
- [ ] Y a-t-il des attestations spécifiques à l'équipement ?
- [ ] Quels sont les mots-clés discriminants pour chaque attestation ?

**Actions** :
- [ ] Adapter les instructions de distinction entre attestations
- [ ] Mettre les mots-clés exacts (titres complets)
- [ ] Préciser quelle attestation extraire pour quelles données

#### E) Section Fiche technique (lignes 181-220)
**Exemple actuel (LED)** :
```javascript
THD (Taux de distorsion harmonique) : X.X%
Durée de vie : XXXXX heures
Puissance : XX W
```

**Actions pour nouvelle fiche** :
- [ ] Identifier les caractéristiques techniques du nouvel équipement
- [ ] Lister les champs obligatoires de la fiche technique
- [ ] Adapter les formats attendus (% vs W vs lambda vs rendement...)

**Exemples selon équipement** :
- **Chaudière** : rendement saisonnier, puissance nominale, type combustible
- **Isolation** : lambda, épaisseur, résistance thermique R
- **Ventilation** : débit, puissance, classe filtre

#### F) Structure de réponse JSON (lignes 254-350)
**Actions** :
- [ ] Remplacer les champs `led` par les nouveaux champs équipement
- [ ] Adapter la structure `cee.equipements` ou équivalent
- [ ] Modifier les exemples de réponse

**Exemple** :
```javascript
// Actuel (LED)
"led": {
  "quantiteTotal": 147,
  "puissanceTotal": 7056,
  "THD": "3.7%",
  "dureeVie": "50000 heures"
}

// Nouveau (exemple chaudière)
"chaudiere": {
  "quantite": 2,
  "puissanceNominale": 150,
  "rendementSaisonnier": "92%",
  "typeCombustible": "Gaz naturel"
}
```

---

### 3️⃣ Adaptation des checks (1-2 jours)

**Fichier** : `index.html`

**Sections à modifier** :

#### A) Checks communs (à conserver tel quel)
Ces checks restent identiques quelle que soit l'opération :
- ✅ check_01-02 : Page de garde (nom, adresse, date)
- ✅ check_03-09 : Identité client (nom, SIRET, adresse, secteur)
- ✅ check_42-46 : Surfaces (Audit vs Synthèse vs Attestation)
- ✅ Checks adresses croisées
- ✅ Checks dates (audit, devis, signature)

**Aucune modification nécessaire** pour ces checks.

#### B) Checks spécifiques équipement (à refaire complètement)
**Lignes concernées** : 4100-4400 (checks LED actuels)

**Étapes** :

1. **Supprimer les checks LED** (lignes ~4100-4400) :
   - check_10 : Référence produit
   - check_11 : Fiche technique LED trouvée
   - check_12 : Quantité LED Audit vs Synthèse
   - check_13 : Puissance LED Audit vs Synthèse
   - check_14 : THD Audit vs Synthèse vs Fiche
   - check_15 : Durée de vie
   - check_16 : pceLuminaires (calcul spécifique)

2. **Créer les nouveaux checks équipement** selon la fiche :

**Template générique** :
```javascript
// CHECK XX : [Nom du check équipement]
if (chantier.equipement && chantier.equipement.champA) {
  const valeurAudit = chantier.audit.equipement.champA;
  const valeurSynthese = chantier.synthese.equipement.champA;
  const valeurFiche = chantier.ficheTechnique.champA;

  if (valeurAudit !== valeurSynthese) {
    checks.push({
      id: `check_equipement_XX_${chantierIndex}`,
      categorie: 'equipement',
      niveau: 'majeur',
      champ: `[Champ A équipement]${chantierLabel}`,
      localisation: `Audit vs Synthèse - Chantier ${chantierIndex + 1}`,
      detail: `Le [champ A] diffère entre Audit et Synthèse`,
      valeur_attendue: valeurAudit,
      valeur_trouvee: valeurSynthese,
      chantierIndex: chantierIndex + 1
    });
  }
}
```

**Questions à se poser pour chaque nouveau check** :
- [ ] Quel champ comparer ?
- [ ] Entre quels documents ? (Audit vs Synthèse ? vs Fiche technique ?)
- [ ] Quelle règle de comparaison ? (égalité stricte ? tolérance ? calcul ?)
- [ ] Quel niveau d'erreur ? (BLOQUANT / MAJEUR / INFO)
- [ ] Localisation claire ?

#### C) Calculs spécifiques (lignes ~4380-4400)
**Exemple actuel (LED)** :
```javascript
// Calcul pceLuminaires = puissance × quantité × 0.026
const pceCalcule = puissanceTotale * quantiteTotale * 0.026;
```

**Actions** :
- [ ] Identifier la formule de calcul spécifique à la nouvelle fiche
- [ ] Implémenter la fonction de calcul
- [ ] Créer le check de validation du calcul

**Exemples selon fiche** :
- **Isolation** : R = épaisseur / lambda
- **Ventilation** : kWh économisés = débit × heures × facteur
- **Chaudière** : kWh cumac = puissance × rendement × facteur

---

### 4️⃣ Adaptation interface utilisateur (2-3h)

**Fichier** : `index.html`

#### A) Titres et labels (lignes 1-100)
**Actions** :
- [ ] Modifier `<title>` et `<h1>` (remplacer "BAT-EQ-127" et "LED")
- [ ] Adapter les instructions d'upload
- [ ] Modifier les tooltips/descriptions

#### B) Affichage des données extraites (lignes 2500-2700)
**Section concernée** : Affichage colonne gauche après extraction

**Actions** :
- [ ] Remplacer l'affichage LED par le nouvel équipement
- [ ] Adapter les icônes (💡 → autre icône selon équipement)
- [ ] Modifier les unités (W → kW, m² → m³, etc.)

**Exemple** :
```javascript
// Actuel (LED)
💡 LED : 147 luminaires | 7056 W total

// Nouveau (exemple chaudière)
🔥 Chaudières : 2 unités | 150 kW nominal | Rendement 92%
```

#### C) Interface saisie manuelle (lignes 2728-2800)
**Actions** :
- [ ] Vérifier si la logique de saisie manuelle s'applique (secteur "Autres", NAF agricole)
- [ ] Adapter les messages si nécessaire
- [ ] Conserver la détection automatique attestations manquantes

**Note** : Normalement cette partie reste identique si la nouvelle fiche utilise aussi des attestations de surfaces.

---

### 5️⃣ Tests et validation (1 jour)

#### Tests à effectuer :

**Test 1 : Extraction complète**
- [ ] Uploader un dossier complet de la nouvelle fiche
- [ ] Vérifier que tous les champs sont extraits correctement
- [ ] Vérifier la console pour les erreurs/warnings

**Test 2 : Checks fonctionnels**
- [ ] Tester chaque check avec un dossier contenant des incohérences
- [ ] Vérifier les niveaux d'erreur (BLOQUANT / MAJEUR / INFO)
- [ ] Vérifier les messages (attendu vs trouvé)

**Test 3 : Cas limites**
- [ ] Dossier avec attestation manquante → saisie manuelle ?
- [ ] Dossier avec secteur "Autres" → saisie manuelle ?
- [ ] Dossier multi-chantiers → tous les chantiers détectés ?
- [ ] Dossier avec fichier manquant → erreur claire ?

**Test 4 : Export PDF**
- [ ] Exporter un résultat en PDF
- [ ] Vérifier que les nouveaux champs s'affichent correctement

**Test 5 : Déploiement Vercel**
- [ ] Commit et push sur nouvelle branche
- [ ] Vérifier le déploiement Vercel
- [ ] Tester en production

---

## Points d'attention critiques

### ⚠️ 1. Distinction des attestations
**Problème fréquent** : Confusion entre plusieurs attestations dans le dossier CEE

**Solution** :
- Lire TOUS les types d'attestations du nouveau dossier
- Identifier les mots-clés discriminants (titres exacts)
- Mettre des instructions très explicites dans `api/analyze.js` (lignes 221-253)
- Voir ADR 013 pour référence

### ⚠️ 2. Calculs spécifiques
**Problème** : Chaque fiche CEE a sa propre formule de calcul

**Solution** :
- Bien comprendre la règle métier avant de coder
- Documenter la formule dans un commentaire
- Créer un check dédié pour valider le calcul
- Prévoir une tolérance si nécessaire (ex: ±0.5% pour les rendements)

### ⚠️ 3. Unités et formats
**Problème** : Mélange kW/W, m²/m³, pourcentages, etc.

**Solution** :
- Normaliser les unités dès l'extraction (tout en W, pas de mix W/kW)
- Utiliser les fonctions de comparaison existantes (`compareNumeric`, `compareSurfaces`)
- Afficher les bonnes unités dans l'interface

### ⚠️ 4. Gestion multi-chantiers
**Problème** : Certaines fiches peuvent avoir une logique différente

**Solution** :
- Vérifier si la nouvelle fiche supporte multi-chantiers
- Adapter la logique de détection si nécessaire
- Tester avec un dossier réel multi-chantiers

---

## Estimation temps total

| Étape | Temps estimé |
|-------|--------------|
| 1️⃣ Préparation | 30 min |
| 2️⃣ API extraction | 4-6h |
| 3️⃣ Checks | 1-2 jours |
| 4️⃣ Interface | 2-3h |
| 5️⃣ Tests | 1 jour |
| **TOTAL** | **2-3 jours** |

**Note** : Temps pour quelqu'un qui connaît déjà le code actuel.

---

## Alternative : Refacto architecture modulaire

Si tu dois dupliquer pour **3+ fiches différentes**, il devient rentable de refactoriser vers une **architecture modulaire** avec config JSON.

**Avantages** :
- Nouveau client = nouveau fichier JSON (quelques heures au lieu de 2-3 jours)
- Maintenance centralisée (bug fix bénéficie à tous)
- Évolutions communes (ex: regroupement erreurs)

**Investissement initial** : 3-4 semaines de refacto

**Voir** : `docs/architecture-modulaire-cee.md` (à créer quand pertinent)

---

## Ressources

### Documentation existante
- `CLAUDE.md` - Règles métier BAT-EQ-127 actuelles
- `docs/business-rules.md` - Règles de validation
- `docs/decisions/013-detection-attestations-manquantes.md` - Gestion attestations manquantes

### Code clé à comprendre
- `api/analyze.js` lignes 37-350 : Instructions extraction
- `index.html` lignes 2728-2800 : Détection saisie manuelle
- `index.html` lignes 3800-6500 : Génération des checks
- `index.html` lignes 6500-7000 : Affichage résultats

### Questions fréquentes

**Q : Puis-je garder le même repo Vercel ?**
R : Oui, mais crée une nouvelle branche. Ou crée un nouveau projet Vercel si tu veux séparer complètement.

**Q : Dois-je changer l'API OpenRouter ?**
R : Non, la même clé fonctionne pour toutes les fiches (c'est Claude qui extrait).

**Q : Comment gérer plusieurs clients sur la même fiche ?**
R : Actuellement pas prévu. Soit dupliquer le projet par client, soit ajouter un système de multi-tenant (plus complexe).

---

**Dernière mise à jour** : 26 mai 2026
**Auteur** : Documentation générée suite à discussion architecture
**Statut** : Guide de référence pour duplication future
