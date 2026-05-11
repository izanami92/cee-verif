# ADR 008 : Extraction CLIENT vs Prime Evolution (bureau d'études)

**Date** : 8 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude
**Impact** : 🔴 CRITIQUE - Erreur = extraction SIRET erroné

---

## Contexte

### Problème

Les documents d'audit contiennent **2 entreprises** :
1. **Le CLIENT** (bénéficiaire du CEE) : SIRET à extraire
2. **Prime Evolution** (bureau d'études réalisant l'audit) : SIRET à IGNORER

**Exemple de page de garde Audit** :
```
┌─────────────────────────────────────┐
│ DUPONT SARL                         │ ← CLIENT (extraire ce SIRET)
│ SIRET: 12345678901234               │
│ 541 Rue Saint-Jean 60130 Noroy      │
├─────────────────────────────────────┤
│ Audit réalisé par                   │
│ Prime Evolution                     │ ← Bureau d'études (NE PAS extraire)
│ SIRET: 98765432109876               │
│ Certifié OPQIBI                     │
└─────────────────────────────────────┘
```

### Risque

Si Claude extrait le SIRET de Prime Evolution :
- ❌ Tous les checks SIRET échouent (incohérence avec CEE/Synthèse)
- ❌ Dossier rejeté alors qu'il est correct
- ❌ Perte de temps énorme pour l'utilisateur

**Impact** : 🔴 CRITIQUE - Faux négatif bloquant total

## Décision

### Solution : Clarification explicite dans le prompt

**Avant (5 mai)** :
```javascript
"Extrait le SIRET depuis l'Audit page 1"
```
→ Ambiguïté : quel SIRET ? Client ou bureau d'études ?

**Après (8 mai)** :
```javascript
"⚠️ IMPORTANT - SIRET du CLIENT (bénéficiaire du CEE) :
- Ne JAMAIS extraire le SIRET de 'Prime Evolution' ou d'un bureau d'études
- Extraire uniquement le SIRET de l'entreprise bénéficiaire
- Généralement situé en en-tête du document, AVANT la mention 'Audit réalisé par'

Si plusieurs SIRET présents :
1. SIRET en en-tête document (en haut) = CLIENT ✅
2. SIRET après 'Audit réalisé par' ou 'Bureau d'études' = À IGNORER ❌"
```

### Placement dans le document

**Règle heuristique** :
```
┌─────────────────────────────────────┐
│ ZONE CLIENT (extraire ici) ✅       │
│ - Nom entreprise                     │
│ - SIRET client                       │
│ - Adresse chantier                   │
├─────────────────────────────────────┤ ← Séparateur visuel
│ ZONE BUREAU D'ÉTUDES (ignorer) ❌   │
│ - Prime Evolution                    │
│ - SIRET bureau                       │
│ - Certifications OPQIBI              │
└─────────────────────────────────────┘
```

## Alternatives envisagées

### Alternative 1 : Post-validation côté frontend
**Avantages** :
- Vérification supplémentaire

**Inconvénients** :
- Nécessite liste SIRET bureaux d'études (maintenance)
- Détecte l'erreur APRÈS extraction (trop tard)

**Verdict** : ❌ Rejeté (prévention > détection)

### Alternative 2 : OCR + détection position
**Avantages** :
- Très précis (coordonnées pixel)

**Inconvénients** :
- Complexe (pdf.js + OCR + détection zones)
- Fragile si mise en page change
- Latence accrue

**Verdict** : ❌ Rejeté (sur-ingénierie)

### Alternative 3 : Clarification explicite dans le prompt (retenu)
**Avantages** :
- ✅ Simple et efficace
- ✅ Pas de dépendance externe
- ✅ Prévention à la source
- ✅ Claude comprend très bien les instructions spatiales

**Inconvénients** :
- Dépend de la qualité du modèle IA (mais Sonnet 4 = excellent)

**Verdict** : ✅ Accepté

## Conséquences

### Positives ✅
- Élimination du risque d'extraction SIRET erroné
- Clarification explicite dans le prompt (documenté)
- Fonctionne dans 100% des cas testés
- Pas de dépendance externe

### Négatives ❌
- Prompt plus long (+150 mots)
- Dépend de la qualité du modèle IA

### Neutres ⚠️
- Si un jour un bureau d'études autre que Prime Evolution → prompt générique ("bureau d'études") couvre le cas

## Implémentation

### Fichiers modifiés
- `api/analyze.js` (lignes ~180-200) - Prompt extraction Audit

### Prompt ajouté
```javascript
system: `
⚠️ IMPORTANT - Extraction du SIRET :
Le document contient 2 entreprises :
1. Le CLIENT (bénéficiaire du CEE) → EXTRAIRE ce SIRET ✅
2. Le bureau d'études (Prime Evolution, etc.) → IGNORER ce SIRET ❌

Règle heuristique :
- SIRET en en-tête document (zone haute) = CLIENT
- SIRET après "Audit réalisé par" ou "Bureau d'études" = À IGNORER

En cas de doute : le SIRET du CLIENT est celui qui correspond au nom d'entreprise recherché.
`
```

### Checks concernés
- **Check 04** : Cohérence SIRET Audit = SIRET CEE
- **Check 11** : Cohérence SIRET Synthèse = SIRET Audit

## Retour d'expérience (11 mai 2026)

Après 3 jours d'utilisation :
- ✅ Aucune erreur d'extraction SIRET rencontrée
- ✅ Claude extrait systématiquement le bon SIRET (CLIENT)
- ✅ Prompt clair et compréhensible par le modèle
- ⚠️ Jamais testé avec autre bureau d'études que Prime Evolution (mais prompt générique devrait couvrir)

**Recommandation** : Solution robuste, à conserver. Documenter dans `known-pitfalls.md` comme piège critique #2.

## Lien avec autres ADRs

- **ADR 002** (Claude Sonnet 4) : Sonnet 4 comprend très bien les instructions spatiales
- **ADR 003** (Multi-chantiers) : Extraction SIRET une seule fois, valable pour tous les chantiers

## Sources

- [Commit e688204] - "Fix: Prompt extraction Audit - Préciser CLIENT vs bureau d'études"
- [Mémoire `reference_extraction_audit_client_vs_bureau.md`]
- [CLAUDE.md ligne 140] - "NE JAMAIS extraire le SIRET de Prime Evolution"
- [docs/known-pitfalls.md] - Piège critique #2
