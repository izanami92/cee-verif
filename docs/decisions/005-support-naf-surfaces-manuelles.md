# ADR 005 : Support NAF et saisie manuelle des surfaces

**Date** : 11 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude

---

## Contexte

### Problème métier

Les attestations sur l'honneur CEE contiennent la **surface du bâtiment**, mais uniquement si :
- ✅ Code NAF **01.xx** (agriculture) ou **02.xx** (sylviculture)

Pour les autres secteurs (ex: "Autres", tertiaire non agricole) :
- ❌ Pas de surface dans l'attestation CEE
- ❌ Claude ne peut pas extraire ce qui n'existe pas
- ❌ Check surfaces bloqué → Faux négatif systématique

### Exemple concret

**Dossier CEE secteur "Autres" (NAF 46.73Z - Commerce de gros de bois)** :
- Audit dit : 850 m²
- Synthèse dit : 850 m²
- CEE dit : *[pas de surface dans l'attestation]*

→ Check 43 "Surface Audit = Surface CEE" : ❌ ERREUR (alors que c'est cohérent)

**Impact** : ~30% des dossiers réels sont faussement signalés comme incohérents.

## Décision

**Solution** : Détection automatique + saisie manuelle + recalcul instantané

### Architecture

#### 1. Détection automatique
```javascript
// Conditions pour afficher saisie manuelle
const secteur = attestation.secteurActivite || '';
const codeNaf = window.selectedCodeNaf || '';

const isAutres = secteur.toLowerCase().includes('autres');
const isAgricole = codeNaf.startsWith('01.') || codeNaf.startsWith('02.');

if (isAutres || !isAgricole) {
  // Afficher interface de saisie manuelle
  displayManualSurfaceInputs(extractedData);
}
```

#### 2. Interface de saisie
```
⚠️ Saisie manuelle requise

Secteur d'activité détecté : "Autres secteurs d'activité"
OU Code NAF non agricole : 46.73Z

📍 Chantier 1 : 541 RUE SAINT-JEAN 60130 NOROY
Surface (m²) : [        ] Ex: 850

✓ Valider et recalculer
```

#### 3. Recalcul instantané
```javascript
// Après saisie utilisateur
function recalculateSurfaceChecks(extractedData) {
  // 1. Stocker surfaces manuelles
  attestation.surfaceManuelleSaisie = parseFloat(value);
  attestation.surfaces = [parseFloat(value)];

  // 2. Recalculer checks 43-46
  // Check 43 : Somme Audit = Somme attestation (par chantier)
  // Check 44 : Surface Synthèse = Somme attestation (par chantier)
  // Check 45 : Somme manuelles = Somme audits (global)
  // Check 46 : Somme manuelles = Somme synthèses (global)

  // 3. Rafraîchir affichage
  refreshDisplayAfterRecalculation();
}
```

#### 4. Tolérance ±1 m²
```javascript
// Accepter arrondis (850.5 m² ≈ 850 m²)
const isOk = Math.abs(surface1 - surface2) < 1;
```

## Alternatives envisagées

### Alternative 1 : Ignorer les checks surfaces pour secteur "Autres"
**Avantages** :
- Pas de saisie manuelle nécessaire
- Simplifie le workflow

**Inconvénients** :
- Perte de vérification (incohérences réelles non détectées)
- Utilisateur doit vérifier manuellement → pas d'automatisation

**Verdict** : ❌ Ne résout pas le problème métier

### Alternative 2 : Extraction OCR des surfaces depuis le PDF CEE
**Avantages** :
- Automatique (pas de saisie manuelle)

**Inconvénients** :
- Surfaces PAS dans le PDF pour secteur "Autres" (c'est le problème!)
- OCR = complexe et pas toujours fiable

**Verdict** : ❌ Impossible (les données n'existent pas dans le PDF)

### Alternative 3 : Saisie manuelle + recalcul (retenu)
**Avantages** :
- ✅ Résout le problème réel
- ✅ Utilisateur a le contrôle
- ✅ Recalcul instantané (pas besoin de renvoyer à Claude)
- ✅ Tolérance ±1 m² évite faux positifs sur arrondis

**Inconvénients** :
- Nécessite action utilisateur (mais inévitable)
- Complexité code (+400 lignes)

**Verdict** : ✅ Seule solution viable

## Conséquences

### Positives ✅
- Application utilisable sur 100% des dossiers (agricoles ET non-agricoles)
- Détection automatique (utilisateur n'a rien à configurer)
- Recalcul instantané (économie temps + coût API)
- Tolérance ±1 m² évite faux positifs
- Code NAF extrait automatiquement depuis API gouvernementale

### Négatives ❌
- Nécessite saisie manuelle pour ~30% des dossiers
- Complexité code accrue (+400 lignes dans index.html)
- Dépendance à l'API gouvernementale pour le code NAF

### Neutres ⚠️
- Workflow en 2 étapes pour dossiers non-agricoles (extraction → saisie → recalcul)

## Implémentation

### Fichiers modifiés
- `api/search.js` (ligne 52) - Ajout extraction `codeNaf`
- `index.html` (lignes ~1620-4750) - Détection + UI + recalcul

### Fonctions créées
```javascript
displayManualSurfaceInputs(extractedData)      // Afficher interface saisie
validateAndRecalculate(extractedData)          // Valider + stocker surfaces
recalculateSurfaceChecks(extractedData)        // Recalculer checks 43-46
refreshDisplayAfterRecalculation()             // Rafraîchir UI
```

### Checks créés/modifiés
- **Check 43** : Somme surfaces Audit = Somme attestation (par chantier, tolérance ±1 m²)
- **Check 44** : Surface Synthèse = Somme attestation (par chantier, tolérance ±1 m²)
- **Check 45** : Somme surfaces manuelles = Somme audits (global, tolérance ±1 m²)
- **Check 46** : Somme surfaces manuelles = Somme synthèses (global, tolérance ±1 m²)

### Code NAF
**Source** : API gouvernementale `recherche-entreprises.api.gouv.fr`
```javascript
// Extraction depuis API recherche SIRET
const codeNaf = entreprise.activite_principale; // Ex: "01.21Z", "46.73Z"

// Stockage
window.selectedCodeNaf = codeNaf;

// Détection agricole
const isAgricole = codeNaf.startsWith('01.') || codeNaf.startsWith('02.');
```

## Retour d'expérience (11 mai 2026)

Implémenté et testé le jour même avec plusieurs dossiers réels :
- ✅ Détection automatique fonctionne parfaitement
- ✅ Interface de saisie claire et intuitive
- ✅ Recalcul instantané (< 1s)
- ✅ Tolérance ±1 m² évite faux positifs sur arrondis
- ⚠️ Utilisateur doit saisir manuellement (mais inévitable)

**Recommandation** : Solution robuste, à conserver pour toutes les phases

## Documentation créée

- Mémoire `reference_saisie_surfaces_manuelles.md` (228 lignes)
  - Points 1-7 complets
  - Détection conditions
  - UI saisie
  - Stockage valeurs
  - Recalcul instantané
  - Vérifications globales
  - Règles anti-régression

## Sources

- [Transcript 5c6b218b, 11 mai 2026] - Discussion + implémentation Points 1-7
- [Commit f87b1ef] - "WIP: Détection attestations manquantes (secteur Autres + NAF non agricole)"
- [Commit ae01be7] - "feat: ajout saisie manuelle des surfaces et recalcul instantané"
- [Commit 6fd0757] - "feat: ajout vérification globale des surfaces manuelles (Point 7)"
- [Commit 36e3ed6] - "fix: amélioration détection surfaces + logs NAF détaillés"
- Mémoire `reference_saisie_surfaces_manuelles.md` - Documentation exhaustive
