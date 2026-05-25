# ADR 013 : Détection et gestion des attestations CEE manquantes

**Date** : 25 mai 2026

**Statut** : ✅ Accepté

**Contexte** : Session de correction bugs attestations CEE

**Tags** : `attestations`, `cee`, `saisie-manuelle`, `detection`, `validation`

---

## Contexte

### Problèmes identifiés

Lors des tests utilisateurs, deux problèmes critiques ont été découverts concernant les attestations CEE :

#### Problème 1 : Confusion entre 2 types d'attestations

Les dossiers CEE contiennent **deux attestations distinctes** avec des objectifs différents :

1. **"Attestation d'installation de matériel éligible au CEE par le service technique interne
   Dans le cadre de la fiche d'opération standardisée n° BAT-EQ-127"**
   - Concerne le MATÉRIEL/ÉQUIPEMENT installé (luminaires LED)
   - Confirme l'installation technique
   - NE contient PAS les surfaces des bâtiments

2. **"ATTESTATION SUR L'HONNEUR
   Existence d'un entrepôt de stockage non agricole – Fiche d'opération standardisée CEE BAT-EQ-127"**
   - Concerne l'ENTREPÔT (bâtiment)
   - Atteste de l'existence du bâtiment tertiaire non agricole
   - CONTIENT les surfaces réelles des entrepôts

**Symptôme** : Les instructions API demandaient simplement "ATTESTATION SUR L'HONNEUR" sans préciser laquelle, ce qui créait une ambiguïté. Claude pouvait extraire depuis la mauvaise attestation.

#### Problème 2 : Gestion inadéquate des attestations manquantes

Dans certains dossiers, l'attestation d'entrepôt (n°2) peut être absente ou non trouvée par Claude.

**Comportement observé** :
```javascript
// Claude retourne
attestations: [
  {
    adresse: "...",
    surfaces: [],  // ← Vide car attestation non trouvée
    secteurActivite: null
  }
]

// Code frontend calcule
sommeAttestationTotale = 0

// Génère check MAJEUR
"Somme Audit (2940 m²) différente de l'attestation (0 m²)"
"Attendu: = 0 m²"  // ← Message trompeur
"Trouvé: 2940 m²"
```

**Conséquences** :
- ❌ Message d'erreur trompeur ("Attendu: = 0 m²")
- ❌ Niveau MAJEUR alors que c'est un problème d'extraction, pas une incohérence
- ❌ Pas de saisie manuelle proposée
- ❌ Utilisateur bloqué sans solution

#### Problème 3 : Détection saisie manuelle incomplète

La logique de détection `surfaceManuelle = true` (lignes 2728-2748) vérifiait :
```javascript
if (isAutres || !isAgricole) {
  attestation.surfaceManuelle = true;
}
```

**Problème** : Ne vérifiait PAS explicitement `surfaces.length === 0`

**Conséquence** : Si attestation absente + NAF agricole → pas de saisie manuelle déclenchée

---

## Décision

### Solution 1 : Clarification API (api/analyze.js lignes 221-253)

Ajout d'instructions explicites pour distinguer les 2 attestations :

```javascript
⚠️ IMPORTANT - DISTINCTION ENTRE 2 TYPES D'ATTESTATIONS :
Le dossier CEE contient 2 attestations différentes. Tu dois extraire UNIQUEMENT depuis la bonne :

1️⃣ "Attestation d'installation de matériel éligible au CEE par le service technique interne
    Dans le cadre de la fiche d'opération standardisée n° BAT-EQ-127"
    → Concerne le MATÉRIEL/ÉQUIPEMENT installé
    → ⚠️ NE PAS extraire les surfaces depuis cette attestation

2️⃣ "ATTESTATION SUR L'HONNEUR
    Existence d'un entrepôt de stockage non agricole – Fiche d'opération standardisée CEE BAT-EQ-127"
    → Concerne l'ENTREPÔT (bâtiment)
    → ✅ EXTRAIRE les surfaces depuis CETTE attestation uniquement

RÈGLE D'EXTRACTION :
- Chercher la section avec "ATTESTATION SUR L'HONNEUR" ET "Existence d'un entrepôt"
- Dans cette section, extraire la phrase "La surface réelle de cet entrepôt... est de XXX m²"
- Si cette attestation n'existe PAS dans le document → surfaces: []
- Ne JAMAIS extraire les surfaces depuis l'attestation d'installation de matériel
```

**Avantages** :
- Clarté totale sur quelle attestation chercher
- Mots-clés discriminants : "Existence d'un entrepôt"
- Instructions négatives explicites (NE PAS extraire depuis attestation matériel)

### Solution 2 : Détection surfaces vides (index.html lignes 2728-2753)

Ajout d'une vérification explicite **avant** la vérification secteur/NAF :

```javascript
// CAS 1 : Surfaces vides ou nulles → saisie manuelle (attestation CEE non trouvée)
if (!attestation.surfaces || attestation.surfaces.length === 0 || sumSurfaces(attestation.surfaces) === 0) {
  attestation.surfaceManuelle = true;
  attestation.surfaceManuelleSaisie = null;
  attestation.raisonManuelle = 'Attestation CEE non trouvée ou surfaces non extraites';
  console.log(`⚠️ Chantier ${index + 1}: Saisie manuelle requise - Attestation CEE manquante`);
}
// CAS 2 : Surfaces présentes MAIS secteur "Autres" OU NAF non agricole
else if (isAutres || !isAgricole) {
  attestation.surfaceManuelle = true;
  // ... logique existante
}
```

**Logique** :
- **CAS 1 (prioritaire)** : Surfaces vides → saisie manuelle (raison : "Attestation non trouvée")
- **CAS 2 (fallback)** : Surfaces présentes MAIS secteur "Autres" OU NAF non agricole

**Avantages** :
- Indépendant du secteur/NAF (détection pure de l'absence d'attestation)
- Message clair pour l'utilisateur
- Fallback vers logique existante si surfaces présentes

### Solution 3 : Check INFO au lieu de MAJEUR (index.html lignes 4540-4572)

Vérification **avant** de générer les checks 42, 45, 45b :

```javascript
// ⚠️ VÉRIFICATION CRITIQUE : Attestations vides → Saisie manuelle requise
if (toutesLesSurfaces.length === 0 || sommeAttestationTotale === 0) {
  console.warn(`⚠️ Chantier ${chantierIndex + 1}: Aucune surface d'attestation trouvée → Saisie manuelle requise`);

  checks.push({
    id: `check_attestation_manquante_${chantierIndex}`,
    categorie: 'cee',
    niveau: 'info',  // ← INFO, pas MAJEUR
    champ: `Attestation CEE manquante${chantierLabel}`,
    localisation: `Dossier CEE - Chantier ${chantierIndex + 1} : ${chantierAdresse}`,
    detail: '⚠️ Saisie manuelle requise : Aucune attestation sur l\'honneur trouvée (CEE BAT-EQ-127 "Existence d\'un entrepôt") ou surfaces non extraites. Veuillez saisir la surface totale manuellement ci-dessous.',
    valeur_attendue: 'Saisie manuelle',
    valeur_trouvee: 'Attestation non trouvée',
    chantierIndex: chantierIndex + 1
  });

  // Passer au chantier suivant sans générer les checks 42, 45, 45b
  chantierIndex++;
  return;
}
```

**Avantages** :
- UN seul check INFO clair
- Pas de checks invalides (42, 45, 45b avec "= 0 m²")
- Message explicite avec solution (saisie manuelle)

### Solution 4 : Check 45b protection défensive (index.html lignes 4713-4727)

Vérification avant comparaison individuelle :

```javascript
// ⚠️ Vérifier que les attestations ont des surfaces
if (!surfacesAttestation || surfacesAttestation.length === 0) {
  checks.push({
    niveau: 'info',
    detail: 'Surfaces détaillées trouvées dans la Synthèse mais pas d\'attestation de référence. Saisie manuelle requise.'
  });
} else {
  // Logique existante (comparaison individuelle)
}
```

**Note** : Normalement inaccessible grâce au `return` de la Solution 3, mais ajouté par défense en profondeur.

---

## Alternatives considérées

### Alternative A : Améliorer encore les instructions Claude

**Description** : Ajouter encore plus de détails, exemples, répétitions dans les instructions API.

**Avantages** :
- Pas de changement de logique frontend

**Inconvénients** :
- ❌ Déjà tenté plusieurs fois (ADR 012 : 6 itérations d'instructions)
- ❌ IA reste non-déterministe
- ❌ Ne résout pas le problème si attestation réellement absente

**Décision** : Rejetée (solution nécessaire côté frontend)

### Alternative B : Générer checks MAJEUR avec "= 0 m²"

**Description** : Garder le comportement existant mais améliorer le message.

**Avantages** :
- Pas de changement de logique

**Inconvénients** :
- ❌ Message trompeur ("Attendu: = 0 m²" n'est pas la vérité)
- ❌ Niveau MAJEUR inapproprié (c'est un problème d'extraction, pas d'incohérence)
- ❌ Pas de solution proposée à l'utilisateur

**Décision** : Rejetée (mauvaise UX)

### Alternative C : Demander systématiquement saisie manuelle

**Description** : Toujours demander la saisie manuelle, même si Claude extrait les surfaces.

**Avantages** :
- Utilisateur vérifie toujours

**Inconvénients** :
- ❌ Friction UX excessive (90% des cas ont des attestations valides)
- ❌ Perte du bénéfice de l'automatisation

**Décision** : Rejetée (sur-engineering)

---

## Conséquences

### Positives

1. **Clarté extraction** : Claude sait exactement quelle attestation chercher
   - Mots-clés discriminants : "Existence d'un entrepôt"
   - Instructions négatives explicites

2. **Détection robuste** : Attestations manquantes détectées automatiquement
   - Indépendant du secteur/NAF
   - Prioritaire sur autres critères

3. **UX améliorée** : Message clair + solution proposée
   - Check INFO au lieu de MAJEUR
   - "Saisie manuelle requise" au lieu de "Attendu: = 0 m²"
   - Interface de saisie s'affiche automatiquement

4. **Protection en profondeur** : Vérifications multiples
   - Détection dans la logique de saisie manuelle
   - Vérification avant génération des checks
   - Protection défensive dans check 45b

### Négatives

1. **Complexité logique** : Cascade de conditions
   - CAS 1 : surfaces vides
   - CAS 2 : secteur "Autres"
   - CAS 3 : NAF non agricole
   - **Mitigation** : Commentaires explicites, ordre logique

2. **Possible duplication** : Vérification `surfaces.length === 0` en 2 endroits
   - Ligne 2728 (détection `surfaceManuelle`)
   - Ligne 4540 (génération check INFO)
   - **Mitigation** : Défense en profondeur justifiée (sécurité)

### Migration et compatibilité

- ✅ Rétrocompatible : Dossiers avec attestations valides → aucun changement
- ✅ Amélioration progressive : Détection uniquement si attestation manquante
- ✅ Pas d'impact sur les autres checks

---

## Implémentation

### Fichiers modifiés

1. **api/analyze.js** (+23 lignes)
   - Lignes 221-253 : Instructions explicites distinction 2 attestations

2. **index.html** (+68 lignes, -23 lignes)
   - Lignes 2728-2753 : Détection surfaces vides → `surfaceManuelle = true`
   - Lignes 4540-4572 : Check INFO + return si attestations vides
   - Lignes 4713-4727 : Check 45b protection défensive

### Commits

```
158e33b - fix: détection attestations CEE manquantes + distinction 2 types attestations
```

### Tests validés

✅ **Cas 1** : Dossier SANS attestation CEE BAT-EQ-127
- Check INFO "Attestation CEE manquante" généré (pas MAJEUR)
- Interface saisie manuelle s'affiche
- Après saisie : checks recalculés correctement

✅ **Cas 2** : Dossier AVEC attestation CEE BAT-EQ-127
- Surfaces extraites normalement
- Pas de saisie manuelle demandée
- Checks fonctionnent normalement

✅ **Cas 3** : Dossier avec secteur "Autres" + attestation présente
- Saisie manuelle déclenchée (logique existante)
- Raison correcte : "Secteur Autres"

---

## Évolutions futures possibles

### Court terme

- Ajouter un compteur "X attestations manquantes sur Y chantiers" dans l'interface
- Log détaillé des tentatives d'extraction (debug)

### Long terme

- Machine learning : apprendre les variantes de format d'attestations
- OCR amélioré : si pdf.js échoue, fallback vers extraction manuelle guidée
- Validation croisée : comparer surfaces audit + synthèse + devis pour détecter incohérences

---

## Sources

### Conversations et diagnostic

- **Session 25 mai 2026** - Diagnostic complet + corrections
- **Transcript** : "Diagnostique complètement d'abord" → 5 problèmes identifiés

### Règles métier

- **R09** - Surfaces (tolérance ±1 m²)
- Attestation CEE BAT-EQ-127 = référence officielle

### Documentation

- `CLAUDE.md` - Règles métier
- `docs/business-rules.md` - Validation surfaces
- `docs/pending-todos.md` - TODO #20

### Code

- `api/analyze.js` lignes 221-253
- `index.html` lignes 2728-2753, 4540-4572, 4713-4727

---

## Validation

**Décision validée par** : Utilisateur (tests OK)

**Date d'acceptation** : 25 mai 2026

**Statut** : ✅ Implémenté et testé avec succès
