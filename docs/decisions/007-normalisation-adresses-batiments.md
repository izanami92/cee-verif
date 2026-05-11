# ADR 007 : Normalisation adresses - Ignorer mentions bâtiments

**Date** : 8 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude

---

## Contexte

### Problème

Les adresses dans les documents contiennent souvent des **mentions de bâtiments** qui ne font pas partie de l'adresse géographique :

**Exemple réel** :
```
Audit    : 541 Rue Saint-jean - BAT 2 60130 Noroy
Synthèse : 541 RUE SAINT-JEAN 60130 NOROY
CEE      : 541 rue Saint-Jean - Bâtiment 2 - 60130 Noroy
```

→ Comparaison stricte échoue (`"BAT 2"` ≠ `"Bâtiment 2"` ≠ sans mention)

**Conséquence** : Faux positifs massifs sur les checks d'adresses.

### Distinction importante

**Mentions de bâtiments ≠ Adresse géographique**
- ❌ "BAT 2" = référence interne (numéro de cellule/entrepôt)
- ✅ "541 Rue Saint-Jean 60130 Noroy" = adresse postale géographique

**Règle métier** : Seule l'adresse géographique compte pour la cohérence multi-documents.

## Décision

### Solution : Nettoyage systématique avant comparaison

```javascript
function compareAddress(addr1, addr2) {
  // 1. Supprimer mentions bâtiments avec regex
  const cleaned1 = addr1.replace(/\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment|batiments|Batiments)\s*[\d\-]+/gi, ' ');
  const cleaned2 = addr2.replace(/\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment|batiments|Batiments)\s*[\d\-]+/gi, ' ');

  // 2. Normaliser (minuscules, sans accents, sans espaces multiples)
  const normalized1 = normalize(cleaned1);
  const normalized2 = normalize(cleaned2);

  // 3. Comparaison par inclusion bidirectionnelle
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}
```

### Pattern regex détaillé

**Version initiale (8 mai matin)** :
```javascript
/\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment)\s*\d+/gi
```
→ Matcher "BAT 2", "Bâtiment 3", etc.

**Version corrigée (11 mai)** :
```javascript
/\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment|batiments|Batiments)\s*[\d\-]+/gi
```
→ Matcher aussi "batiments 1-2-3-4" (pluriel + tirets)

### Exemples de nettoyage

```javascript
// Avant nettoyage
"541 Rue Saint-jean - BAT 2 60130 Noroy"
"La Mazurie - Bâtiment 5 - B5190"
"route de la raimbaudière - batiments 1-2-3-4 49380"

// Après nettoyage
"541 Rue Saint-jean 60130 Noroy"
"La Mazurie B5190"
"route de la raimbaudière 49380"
```

## Alternatives envisagées

### Alternative 1 : Garder mentions bâtiments + comparaison stricte
**Avantages** :
- Simple (pas de regex)

**Inconvénients** :
- Faux positifs massifs ("BAT 2" ≠ "Bâtiment 2")
- Inutilisable en production

**Verdict** : ❌ Rejeté

### Alternative 2 : Liste exhaustive de variantes dans le prompt Claude
**Avantages** :
- Normalisation côté extraction

**Inconvénients** :
- Impossible de lister toutes les variantes ("BAT", "Bat", "bât", "Bâtiment", etc.)
- Claude pas toujours cohérent
- Pollution du prompt

**Verdict** : ❌ Rejeté (trop fragile)

### Alternative 3 : Nettoyage systématique côté frontend (retenu)
**Avantages** :
- ✅ Robuste (regex couvre toutes les variantes)
- ✅ Indépendant de l'extraction Claude
- ✅ Facilement testable
- ✅ Un seul endroit à maintenir

**Inconvénients** :
- Regex complexe (mais bien documentée)

**Verdict** : ✅ Accepté

## Conséquences

### Positives ✅
- Élimination des faux positifs sur adresses avec mentions bâtiments
- Robuste face aux variantes (BAT/Bat/bât/Bâtiment/batiments)
- Support pluriel et tirets (batiments 1-2-3-4)
- Indépendant de la qualité d'extraction de Claude

### Négatives ❌
- Regex complexe à maintenir (mais bien documentée dans `known-pitfalls.md`)

### Neutres ⚠️
- Si un jour une adresse contient légitimement "BAT" (ex: rue du Bataillon), elle serait nettoyée
  - Mais en pratique : jamais rencontré ce cas

## Implémentation

### Fichiers modifiés
- `index.html` (ligne ~1895) - Fonction `compareAddress()` avec regex nettoyage

### Checks concernés
- **Check 02** : Adresse page de garde Audit
- **Check 09** : Adresse Synthèse
- **Check 12** : Adresse CEE
- **Check 25, 32** : Cohérence adresses multi-chantiers

### Évolution de la regex

**8 mai 2026 (commit 080f407)** :
```javascript
\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment)\s*\d+
```

**11 mai 2026 (commit 3673109)** :
```javascript
\s*-?\s*(BAT|Bat|bât|bat|BATIMENT|Batiment|Bâtiment|bâtiment|batiments|Batiments)\s*[\d\-]+
```
→ Ajout support pluriel + tirets

## Retour d'expérience (11 mai 2026)

Après 3 jours d'utilisation :
- ✅ Faux positifs sur adresses réduits de ~80%
- ✅ Regex robuste face aux variantes
- ✅ Support batiments multi-chiffres validé (cas réel rencontré)
- ⚠️ Une régression détectée le 11 mai (pluriel oublié) → corrigée immédiatement

**Recommandation** : Solution robuste, à conserver. Documenter dans `known-pitfalls.md`.

## Sources

- [Commit 080f407] - "Fix: Ignorer mentions BAT/Bâtiment dans adresses de chantiers"
- [Commit 1ee7664] - "Fix: Déduplication insensible à la casse pour adresses"
- [Commit 3673109] - "Fix: Support batiments multi-chiffres (1-2-3-4)" (11 mai)
- [Mémoire `reference_adresses_batiments_cee.md`]
- [Transcript 5c6b218b] - Discussion normalisation adresses
