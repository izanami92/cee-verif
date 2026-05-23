# ADR 012 : Parsing JavaScript côté client pour surfaces détaillées

**Date** : 23 mai 2026

**Statut** : ✅ Accepté

**Contexte** : Session de résolution bug extraction surfaces

**Tags** : `parsing`, `javascript`, `surfaces`, `regex`, `client-side`

---

## Contexte

### Problème identifié

Lors de l'extraction des données PDF via Claude Sonnet 4, le champ `surfacesDetaillees` devait contenir les surfaces **individuelles par bâtiment** extraites depuis le **tableau section 5.1 de la Synthèse**.

**Comportement observé** : Claude copiait systématiquement les surfaces depuis les **attestations CEE** (qui sont la référence/vérité) au lieu d'extraire depuis le tableau Synthèse.

**Exemple concret** :
- Attestation CEE bâtiment 3 : `703 m²` (référence correcte)
- Tableau Synthèse section 5.1 bâtiment 3 : `7.23 m²` (erreur de saisie à détecter)
- Claude extrayait : `surfacesDetaillees: ["879", "876", "703"]` ❌
- Attendu : `surfacesDetaillees: ["879", "876", "7.23"]` ✅

**Conséquence** : Impossibilité de détecter les erreurs de saisie individuelles dans le tableau Synthèse.

### Tentatives d'amélioration instructions

**6 itérations d'instructions** progressivement plus explicites :

1. Instructions basiques contextuelles
2. Avertissements avec émojis 🔴 ⚠️
3. Instructions ULTRA explicites (lignes 356-400 api/analyze.js)
4. Étapes numérotées (ÉTAPE 1, 2, 3)
5. Exemples concrets avec valeur 7.23
6. Répétition des interdictions ("NE PAS copier depuis attestations")

**Résultat** : Échec systématique après les 6 tentatives. Claude continuait à copier depuis les attestations.

### Format du texte extrait

Exemple de texte brut section 5.1 :
```
5.1 INVENTAIRE DES BÂTIMENTS OU ZONES À ÉCLAIRER

Bâtiment  s   /  Zones  Activité   Surface   ...
1   Entrepôt   879   2 19   24   30   7. 97   ...
2   Entrepôt   876   2 19   24   30   7. 97   ...
3   Entrepôt   7.23   2 10   18   30   7.23   ...
```

**Observation** : Formatage variable (espaces bizarres, colonnes mal alignées) mais structure prévisible :
- Ligne commence par numéro de bâtiment
- Suivi de l'activité (1 mot)
- Suivi de la surface (chiffres avec point décimal optionnel)

---

## Décision

### Solution retenue : Parser JavaScript côté client

**Implémentation** : Fonction `parseSurfacesFromSynthese()` dans index.html (lignes 2794-2831)

```javascript
function parseSurfacesFromSynthese(syntheseText) {
  try {
    // 1. Trouver section 5.1
    const section51Match = syntheseText.match(/5\.1[\s\S]{0,10000}/);
    if (!section51Match) {
      console.warn('⚠️ Section 5.1 introuvable dans le texte de la Synthèse');
      return null;
    }
    
    const section51 = section51Match[0];
    const surfaces = [];
    
    // 2. Regex : ligne numéro + activité + surface
    const regex = /^(\d+)\s+\S+\s+(\d+(?:\.\d+)?)/gm;
    
    let match;
    while ((match = regex.exec(section51)) !== null) {
      surfaces.push(match[2]); // match[2] = la surface
    }
    
    if (surfaces.length > 0) {
      console.log(`✅ Parser JS: ${surfaces.length} surface(s) trouvée(s):`, surfaces);
    }
    
    return surfaces.length > 0 ? surfaces : null;
  } catch (error) {
    console.error('❌ Erreur lors du parsing des surfaces:', error);
    return null;
  }
}
```

**Application** : Après extraction Claude, remplacement de `surfacesDetaillees` (index.html lignes 2493-2515)

```javascript
// PARSER LES SURFACES DÉTAILLÉES depuis le texte brut
if (extractedData.syntheses && state.chantiers) {
  extractedData.syntheses.forEach((synthese, index) => {
    const chantier = state.chantiers[index];
    if (chantier && chantier.syntheseText) {
      const surfacesParsees = parseSurfacesFromSynthese(chantier.syntheseText);
      if (surfacesParsees && surfacesParsees.length > 0) {
        synthese.surfacesDetaillees = surfacesParsees; // ✅ Remplace extraction Claude
      }
    }
  });
}
```

**Check 45b** : Comparaison surfaces individuelles (index.html lignes 4610-4664)

```javascript
// Check 45b : Surfaces individuelles par bâtiment
if (synthese.surfacesDetaillees && synthese.surfacesDetaillees.length > 0) {
  synthese.surfacesDetaillees.forEach((surfaceSynthese, i) => {
    const surfaceAttestation = ceeAttestation.surfaces[i];
    if (surfaceAttestation && surfaceSynthese !== surfaceAttestation) {
      checks.push({
        id: `45b_${i}`,
        category: 'surfaces',
        niveau: 'majeur',
        statut: false,
        titre: `Surface bâtiment ${i + 1} différente`,
        details: `${surfaceSynthese} m² (Synthèse) vs ${surfaceAttestation} m² (Attestation)`
      });
    }
  });
}
```

---

## Alternatives considérées

### Alternative A : Continuer à améliorer les instructions Claude

**Avantages** :
- Pas de code supplémentaire
- Extraction centralisée dans l'API

**Inconvénients** :
- ❌ Échec après 6 tentatives progressives
- ❌ Non déterministe (variance IA)
- ❌ Coût temps de debug élevé

**Décision** : Abandonnée après constat d'échec répété

### Alternative B : Appel API séparé dédié aux surfaces

**Avantages** :
- Prompt spécialisé uniquement pour ce champ
- Isolation du problème

**Inconvénients** :
- ❌ Coût x2 (2 appels API par document)
- ❌ Complexité architecture
- ❌ Latence doublée

**Décision** : Rejetée (coût/bénéfice défavorable)

### Alternative C : Parser JavaScript côté client ✅

**Avantages** :
- ✅ Déterministe (même document = même résultat)
- ✅ Gratuit (pas d'appel API supplémentaire)
- ✅ Rapide (exécution locale)
- ✅ Indépendant du formatage exact (regex flexible)
- ✅ Traçabilité (logs de debug)

**Inconvénients** :
- ⚠️ Dépendant de la structure section 5.1 (numérotation "5.1")
- ⚠️ Nécessite que le texte soit correctement extrait par pdf.js
- ⚠️ Code frontend plus complexe

**Décision** : ✅ **Retenue** - Rapport coût/bénéfice optimal

---

## Conséquences

### Positives

1. **Détection erreurs de saisie** : Check 45b détecte maintenant les différences individuelles entre Synthèse et Attestations
   - Exemple : `7.23 m² (Synthèse) vs 703 m² (Attestation)` → Erreur MAJEUR détectée ✅

2. **Déterminisme** : Même PDF → même résultat à chaque analyse

3. **Performance** : Pas de coût API supplémentaire, exécution instantanée

4. **Robustesse** : Regex flexible s'adapte aux variations de formatage (espaces, alignement)

### Négatives

1. **Dépendance structure document** : Si la section 5.1 change de numérotation, le parser échoue
   - **Mitigation** : Log d'avertissement si section introuvable

2. **Maintenance** : Parser côté client + extraction Claude = 2 logiques parallèles
   - **Mitigation** : Parser simple (35 lignes), facile à débugger

3. **Cas edge non testés** : Tableaux avec structures inhabituelles
   - **Mitigation** : Retour null si échec → pas de crash, juste absence de check 45b

### Migration et compatibilité

- ✅ Rétrocompatible : Si parser échoue, extraction Claude utilisée (comportement antérieur)
- ✅ Pas d'impact sur les autres checks
- ✅ Pas de changement API côté serveur

---

## Implémentation

### Fichiers modifiés

1. **index.html** (+82 lignes, -16 lignes)
   - Lignes 2794-2831 : Fonction `parseSurfacesFromSynthese()`
   - Lignes 2493-2515 : Application du parser après extraction Claude
   - Lignes 4610-4664 : Check 45b (comparaison surfaces individuelles)

2. **api/analyze.js** (+47 lignes)
   - Lignes 356-400 : Instructions extraction surfacesDetaillees (gardées pour fallback)

### Commits

```
448195a - feat: ajout vérification individuelle surfaces par bâtiment
ea96555 - feat: parsing JavaScript surfaces détaillées tableau Synthèse
d8df027 - refactor: retrait log temporaire debug surfaces
```

### Tests validés

✅ Dossier avec erreur saisie bâtiment 3 : `7.23 m²` vs `703 m²`
- Check 45b déclenché correctement (niveau MAJEUR)
- Message clair : "Surface bâtiment 3 différente : 7.23 m² (Synthèse) vs 703 m² (Attestation)"

✅ Dossiers multi-chantiers : Parsing correct pour chaque chantier individuellement

✅ Logs de debug : Traçabilité complète (avant/après parsing)

---

## Évolutions futures possibles

### Court terme (Phase 2)

- Ajouter tolérance ±0.5 m² dans check 45b si arrondis acceptables
- Améliorer regex pour supporter formats de tableaux alternatifs

### Long terme (Phase 3-4)

- Machine learning : Apprendre les patterns de tableaux depuis feedback utilisateur
- OCR amélioré : Si pdf.js échoue, fallback vers Tesseract.js
- Validation croisée : Comparer parser JS + extraction Claude, alerter si divergence

---

## Sources

### Conversations et transcripts

- **Session 23 mai 2026** - Résolution bug extraction surfaces
- **Transcript** : Continuation session après compaction contexte

### Règles métier

- **R09** - Surfaces (tolérance ±1 m²)
- **Check 45a** - Sommes totales surfaces par chantier
- **Check 45b** - Surfaces individuelles par bâtiment (nouveau)

### Documentation

- `CLAUDE.md` - Règles métier ligne 132
- `docs/business-rules.md` - R09 Surfaces
- `docs/pending-todos.md` - TODO #19

### Code

- `index.html` lignes 2794-2831, 2493-2515, 4610-4664
- `api/analyze.js` lignes 356-400

---

## Validation

**Décision validée par** : Utilisateur (retour "OUI ENFIN !!")

**Date d'acceptation** : 23 mai 2026

**Statut** : ✅ Implémenté et testé avec succès
