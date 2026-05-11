# ADR 003 : Refonte architecture multi-chantiers

**Date** : 7 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude
**Impact** : 🔴 MAJEUR - Refactorisation complète (6h de travail intensif)

---

## Contexte

### Problème initial
L'application gérait **1 seul chantier par dossier** :
```javascript
// Format initial (mono-chantier)
{
  audit: {...},      // Un seul objet
  synthese: {...},   // Un seul objet
  cee: {
    attestations: [...]  // Mais plusieurs attestations!
  }
}
```

**Réalité terrain** : 60-70% des dossiers ont **plusieurs chantiers** (2-5 en moyenne).

**Conséquence** : Impossible d'analyser correctement ces dossiers → Utilisateur devait tout vérifier manuellement.

### Exemple concret
Un client a 3 entrepôts :
- Chantier 1 : Entrepôt A (1500 m², 120 LED)
- Chantier 2 : Entrepôt B (850 m², 75 LED)
- Chantier 3 : Entrepôt C (2000 m², 150 LED)

→ 1 Audit + 1 Synthèse + 1 Dossier CEE avec 3 attestations sur l'honneur

Avant refonte : L'app ne gérait que le chantier 1, ignorait les 2 autres ❌

## Décision

Refactorisation complète vers architecture **multi-chantiers** :

### Nouveau format JSON
```javascript
{
  audits: [{...}, {...}, {...}],      // Tableau d'audits
  syntheses: [{...}, {...}, {...}],   // Tableau de synthèses
  cee: {
    attestations: [{...}, {...}, {...}]  // Tableau d'attestations
  }
}
```

### Matching automatique par adresse
```javascript
// Nouvelle fonction
function matchChantiers(audits, syntheses, attestations) {
  // 1. Normaliser toutes les adresses
  // 2. Grouper par adresse normalisée
  // 3. Matcher audits/synthèses/attestations par INDEX
  // 4. Retourner structure alignée
}
```

### Vérification à 2 niveaux
1. **Par chantier** : Audit[i] = Synthèse[i] = Attestation[i]
2. **Total global** : Σ(chantiers) = Total CEE

### Rétrocompatibilité totale
```javascript
// Si mono-chantier détecté
if (!Array.isArray(extracted.audits)) {
  extracted.audits = [extracted.audit];
  extracted.syntheses = [extracted.synthese];
}
```

## Alternatives envisagées

### Alternative 1 : Garder mono-chantier + analyse manuelle multi-chantiers
**Avantages** :
- Pas de refactorisation nécessaire
- Code simple

**Inconvénients** :
- Inutilisable pour 60-70% des dossiers réels
- Utilisateur doit tout vérifier manuellement = perte de temps énorme
- Ne répond pas au besoin métier

**Verdict** : ❌ Rejeté (ne résout pas le problème)

### Alternative 2 : Analyses séparées par chantier
**Avantages** :
- Code simple (réutilise l'existant)
- Pas de refactorisation

**Inconvénients** :
- Utilisateur doit importer 3x les mêmes fichiers
- Pas de vérification du total global
- Expérience utilisateur dégradée

**Verdict** : ❌ Rejeté (UX inacceptable)

### Alternative 3 : Refonte complète (retenu)
**Avantages** :
- Gère tous les cas (mono ET multi-chantiers)
- Vérification complète (par chantier + total)
- Rétrocompatibilité totale
- Expérience utilisateur optimale

**Inconvénients** :
- Refactorisation lourde (~6h de travail)
- Risque de régressions
- 40 checks à adapter

**Verdict** : ✅ Accepté (seule solution viable)

## Conséquences

### Positives ✅
- Application utilisable sur 100% des dossiers réels
- Détection automatique mono/multi-chantiers
- Vérification exhaustive à 2 niveaux
- Rétrocompatibilité parfaite
- Gain de temps énorme pour l'utilisateur

### Négatives ❌
- Complexité du code accrue
- 40 checks à dupliquer/adapter
- Risque de bugs lors de la refactorisation (tous résolus le jour même)
- Logs plus verbeux

### Neutres ⚠️
- Nouveau format JSON (mais rétrocompatible)
- Nécessite normalisation agressive des adresses

## Bugs rencontrés et résolus (7 mai 2026)

### Bug #1 : Adresses collées
**Problème** : `"adresse1 adresse2 adresse3"` au lieu de `["adresse1", "adresse2", "adresse3"]`
**Cause** : Concaténation au lieu de tableau
**Solution** : Instructions claires dans le prompt
**Source** : [Commit bf8ebe3]

### Bug #2 : Matching par adresse échoue
**Problème** : "541 RUE SAINT-JEAN" ≠ "541 Rue Saint-jean"
**Cause** : Comparaison sensible à la casse
**Solution** : Normalisation agressive (minuscules, sans accents, sans espaces multiples)
**Source** : [Commit 1ee7664]

### Bug #3 : Variables avant déclaration
**Problème** : `nbChantiers` utilisé avant d'être déclaré
**Cause** : Ordre des déclarations après refactorisation
**Solution** : Déplacer déclaration en haut
**Source** : [Commit 9c21e61]

### Bug #4 : Chantier 3 fantôme (résolu le 8 mai)
**Problème** : Détection de 3 chantiers au lieu de 2
**Cause** : Compteur au lieu d'index
**Solution** : Utiliser `chantierIndex` basé sur ordre d'apparition
**Source** : [Commit 7ee508b] - "CORRECTIONS CRITIQUES : détection chantiers + couleurs boutons"

## Travaux effectués (7 mai 2026)

- ✅ Refactorisation format JSON (audits[] + syntheses[])
- ✅ Fonction `matchChantiers()` avec normalisation agressive
- ✅ Adaptation des 40 checks pour multi-chantiers
- ✅ Logs détaillés par chantier
- ✅ Tests avec dossiers réels mono ET multi-chantiers
- ✅ Documentation dans mémoire (`project_multi_chantiers_led.md`)

**Commits principaux** :
- `dbad29f` - "feat: refonte architecture multi-chantiers avec détection auto"
- `6aced95` - "feat: adapter logique analyse pour architecture par chantier"
- `1a4fb32` - "Fix: Matcher audits/synthèses par INDEX au lieu de par adresse"

## Retour d'expérience (11 mai 2026)

Après 4 jours d'utilisation intensive :
- ✅ Fonctionne parfaitement sur mono ET multi-chantiers
- ✅ Aucune régression majeure détectée
- ✅ Utilisateur peut analyser 100% des dossiers réels
- ⚠️ Quelques faux positifs sur normalisation d'adresses (résolus au cas par cas)

**Recommandation** : Architecture solide, à conserver pour toutes les phases suivantes

## Sources

- [Transcript 5c6b218b, 7 mai 2026] - Discussion + implémentation complète
- [Commit dbad29f] - "feat: refonte architecture multi-chantiers avec détection auto"
- [Commit 6aced95] - "feat: adapter logique analyse pour architecture par chantier"
- [Commit 1a4fb32] - "Fix: Matcher audits/synthèses par INDEX au lieu de par adresse"
- [Commit 7ee508b] - "CORRECTIONS CRITIQUES : détection chantiers + couleurs boutons"
- Mémoire `project_multi_chantiers_led.md` - Documentation complète de la logique
