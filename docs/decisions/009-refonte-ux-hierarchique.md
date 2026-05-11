# ADR 009 : Refonte UX - Structure hiérarchique et regroupement sémantique

**Date** : 9 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude
**Impact** : 🟠 MAJEUR - Amélioration UX significative

---

## Contexte

### Problème initial

**Version 1 (5-8 mai)** : Liste plate de 40+ checks
```
❌ Check 01 : Nom client page de garde incorrect
❌ Check 02 : Adresse page de garde incorrecte
❌ Check 03 : Date page de garde incorrecte
❌ Check 04 : SIRET Audit ≠ SIRET CEE
❌ Check 05 : LED Audit ≠ LED CEE
...
❌ Check 40 : Reste à payer manquant
```

**Problèmes** :
1. **Illisible** : Scroll infini, difficile de trouver une info spécifique
2. **Pas de priorisation visuelle** : Bloquant = Majeur = OK au même niveau
3. **Pas de contexte** : "Check 12b" ne dit pas de quel document il s'agit
4. **Redondance** : Checks multi-chantiers dupliqués (Check 9a, 9b, 9c...)

### Besoin utilisateur

> "Je veux voir rapidement :
> 1. Est-ce que la page de garde est OK ? (bloquant)
> 2. Quels sont les problèmes par chantier ?
> 3. Y a-t-il des incohérences globales ?"

## Décision

### Architecture UX à 3 niveaux

```
┌─────────────────────────────────────────────────────┐
│ NIVEAU 1 : PAGE DE GARDE (Bloquant)                │ ← Toujours visible
│ ✅ Nom, adresse, date OK                            │
├─────────────────────────────────────────────────────┤
│ NIVEAU 2 : PAR CHANTIER (Majeur)                   │ ← Navigation par boutons
│ ┌─────────────────────────────────────────────────┐│
│ │ [Chantier 1] [Chantier 2] [Chantier 3]         ││
│ │                                                 ││
│ │ Chantier sélectionné : 541 Rue Saint-Jean      ││
│ │                                                 ││
│ │ ❌ LED Audit (120) ≠ LED CEE (119)             ││
│ │ ✅ Surface cohérente (850 m²)                  ││
│ │ ❌ Parcelle manquante                          ││
│ └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│ NIVEAU 3 : VÉRIFICATIONS GLOBALES (Majeur/Info)    │ ← Toujours visible
│ ✅ Total LED global cohérent                        │
│ ⚠️ Reste à payer à vérifier manuellement           │
└─────────────────────────────────────────────────────┘
```

### Regroupement sémantique

**Avant** : Checks groupés par ID (1, 2, 3...)
```javascript
checks.filter(c => c.id.startsWith('check_01'))
```

**Après** : Checks groupés par CONTENU sémantique
```javascript
// Groupe "Page de garde"
checks.filter(c =>
  c.detail.toLowerCase().includes('page de garde') ||
  c.categorie === 'garde'
)

// Groupe "LED par chantier"
checks.filter(c =>
  c.detail.includes('LED') &&
  c.chantierIndex === selectedChantierIndex
)
```

**Avantage** : Robuste face aux changements de numérotation des checks

### Navigation par boutons

```html
<!-- Génération dynamique selon nombre de chantiers -->
<div class="chantiers-navigation">
  <button onclick="showChantier(0)">Chantier 1</button>
  <button onclick="showChantier(1)">Chantier 2</button>
  <button onclick="showChantier(2)">Chantier 3</button>
</div>

<!-- Affichage conditionnel -->
<div id="chantier-0" class="chantier-view" style="display:block">
  <!-- Checks du chantier 1 -->
</div>
<div id="chantier-1" class="chantier-view" style="display:none">
  <!-- Checks du chantier 2 -->
</div>
```

## Alternatives envisagées

### Alternative 1 : Accordéons (collapse/expand)
**Avantages** :
- Tout visible sur une page (pas de navigation)

**Inconvénients** :
- Scroll infini si plusieurs chantiers
- Difficile de comparer 2 chantiers côte à côte

**Verdict** : ❌ Rejeté (pas adapté à la comparaison)

### Alternative 2 : Tabs (onglets)
**Avantages** :
- Standard UI (Bootstrap tabs, etc.)

**Inconvénients** :
- Nécessite framework CSS (ou CSS custom complexe)
- Pas de priorisation visuelle claire

**Verdict** : ❌ Rejeté (sur-ingénierie)

### Alternative 3 : Structure hiérarchique + boutons (retenu)
**Avantages** :
- ✅ Priorisation visuelle claire (Page de garde en haut)
- ✅ Navigation simple (boutons)
- ✅ Pas de framework CSS nécessaire
- ✅ Extensible (ajout niveau 4 si besoin)

**Inconvénients** :
- Code JavaScript plus complexe (~200 lignes)

**Verdict** : ✅ Accepté

## Conséquences

### Positives ✅
- UX considérablement améliorée (feedback utilisateur positif)
- Priorisation visuelle claire (bloquant vs majeur)
- Navigation rapide entre chantiers
- Regroupement sémantique robuste (insensible aux changements d'ID)
- Extensible (ajout de niveaux facile)

### Négatives ❌
- Complexité code frontend accrue (~200 lignes JS)
- Nécessite `chantierIndex` dans chaque check (mais déjà implémenté)

### Neutres ⚠️
- Si mono-chantier → navigation masquée automatiquement (pas de boutons inutiles)

## Implémentation

### Fichiers modifiés
- `index.html` (lignes ~2500-2800) - Structure hiérarchique HTML
- `index.html` (lignes ~4800-5000) - Logique navigation JS

### Fonctions créées
```javascript
displayResultsHierarchical(checks)     // Affichage structure à 3 niveaux
showChantier(index)                     // Navigation entre chantiers
groupChecksBySemantic(checks)           // Regroupement sémantique
```

### Commits principaux
- `2bd2af6` - "Implémentation structure hiérarchique UX (develop-ux)"
- `b9447d0` - "Correction structure hiérarchique : navigation par boutons"
- `abcc680` - "Implémentation regroupement sémantique des checks"
- `ee113c7` - "Fix regroupement checks : analyse contenu au lieu d'ID"

## Retour d'expérience (11 mai 2026)

Après 2 jours d'utilisation :
- ✅ Feedback utilisateur très positif
- ✅ Navigation rapide et intuitive
- ✅ Aucun bug de navigation détecté
- ✅ Regroupement sémantique robuste (pas de check "perdu")
- ⚠️ Couleurs boutons nécessitaient ajustement (corrigé dans commit 7ee508b)

**Recommandation** : UX finale validée, à conserver pour toutes les phases

## Lien avec autres ADRs

- **ADR 003** (Multi-chantiers) : Structure UX adaptée à l'architecture multi-chantiers
- **ADR 010** (Secteur par chantier) : Navigation par chantier permet affichage secteur spécifique

## Sources

- [Commit 2bd2af6] - "Implémentation structure hiérarchique UX (develop-ux)"
- [Commit b9447d0] - "Correction structure hiérarchique : navigation par boutons"
- [Commit abcc680] - "Implémentation regroupement sémantique des checks"
- [Commit ee113c7] - "Fix regroupement checks : analyse contenu au lieu d'ID"
- [Commit 7ee508b] - "CORRECTIONS CRITIQUES : détection chantiers + couleurs boutons"
