# ADR 010 : Extraction secteur d'activité par chantier (non global)

**Date** : 9 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude
**Impact** : 🟠 MAJEUR - Correction métier importante

---

## Contexte

### Problème initial

**Version 1 (5-8 mai)** : Secteur d'activité global pour tout le dossier
```javascript
// Structure initiale
cee: {
  secteurActivite: "Entrepôts",  // ❌ UN SEUL secteur pour TOUS les chantiers
  attestations: [
    { adresse: "541 Rue Saint-Jean", ... },
    { adresse: "Route de la Raimbaudière", ... }
  ]
}
```

**Réalité terrain** : Un dossier multi-chantiers peut avoir **plusieurs secteurs** :
```
Chantier 1 : Entrepôts (code 13)
Chantier 2 : Logistique (code 13)
Chantier 3 : Autres secteurs d'activité (code 17)
```

**Conséquence** : Checks secteur échouent pour chantiers 2-3 → Faux positifs.

### Exemple concret

**Dossier réel (9 mai)** :
- **Chantier 1** : Attestation secteur "13 Entrepôts"
- **Chantier 2** : Attestation secteur "17 Autres secteurs d'activité"

Avec extraction globale :
```javascript
cee.secteurActivite = "Entrepôts"  // Pris du chantier 1
```
→ Check chantier 2 échoue (attend "Entrepôts", trouve "Autres") ❌

## Décision

### Solution : Secteur par attestation (par chantier)

**Nouvelle structure** :
```javascript
cee: {
  attestations: [
    {
      adresse: "541 Rue Saint-Jean",
      secteurActivite: "13 Entrepôts",  // ✅ Secteur SPÉCIFIQUE chantier 1
      ...
    },
    {
      adresse: "Route de la Raimbaudière",
      secteurActivite: "17 Autres secteurs d'activité",  // ✅ Secteur SPÉCIFIQUE chantier 2
      ...
    }
  ]
}
```

### Extraction côté API

**Modification prompt Claude** :
```javascript
// AVANT
"Extraire le secteur d'activité global du dossier CEE"

// APRÈS
"Pour CHAQUE attestation sur l'honneur, extraire SON propre secteur d'activité :
- Chaque attestation a une ligne 'Secteur d'activité' avec un code (ex: '13 Entrepôts')
- Ne PAS extraire un secteur global
- Structure : attestations[i].secteurActivite"
```

### Vérification côté frontend

**Modification checks** :
```javascript
// AVANT
const secteurCEE = extractedData.cee.secteurActivite;  // Global
if (!compareSecteurEtude(secteurAudit, secteurCEE)) {
  // Erreur
}

// APRÈS
const attestationCorrespondante = extractedData.cee.attestations[chantierIndex];
const secteurCEE = attestationCorrespondante.secteurActivite;  // Par chantier
if (!compareSecteurEtude(secteurAudit, secteurCEE)) {
  // Erreur
}
```

### Stockage utilisateur

Ajout d'une alerte si secteur "Autres" détecté :
```javascript
if (secteurActivite.toLowerCase().includes('autres')) {
  alert(`⚠️ Secteur "Autres" détecté pour le chantier ${i+1}.\n` +
        `Vérifiez que le code NAF correspond bien à un secteur tertiaire non agricole.`);
}

// Stocker dans localStorage pour référence
localStorage.setItem(`secteur_chantier_${i}`, secteurActivite);
```

## Alternatives envisagées

### Alternative 1 : Garder secteur global + mapping manuel
**Avantages** :
- Pas de modification structure

**Inconvénients** :
- Impossible si secteurs réellement différents
- Utilisateur doit corriger manuellement → perte de temps

**Verdict** : ❌ Rejeté (ne résout pas le problème)

### Alternative 2 : Secteur par chantier côté frontend uniquement
**Avantages** :
- Pas de modification API

**Inconvénients** :
- Claude extrait mal → correction manuelle côté frontend
- Complexité accrue côté frontend

**Verdict** : ❌ Rejeté (correction à la source > correction après coup)

### Alternative 3 : Secteur par chantier côté API + frontend (retenu)
**Avantages** :
- ✅ Extraction correcte dès la source
- ✅ Structure cohérente avec multi-chantiers
- ✅ Checks par chantier précis
- ✅ Alerte utilisateur si secteur "Autres"

**Inconvénients** :
- Modification prompt + structure + checks

**Verdict** : ✅ Accepté

## Conséquences

### Positives ✅
- Extraction correcte pour dossiers multi-chantiers avec secteurs différents
- Checks secteur précis (pas de faux positifs)
- Cohérence avec architecture multi-chantiers (ADR 003)
- Alerte utilisateur pour secteur "Autres" (nécessite vérification NAF)

### Négatives ❌
- Complexité structure accrue (mais nécessaire)
- Tous les checks secteur à modifier (~5 checks)

### Neutres ⚠️
- Si mono-chantier ou secteurs identiques → même résultat qu'avant

## Implémentation

### Fichiers modifiés
- `api/analyze.js` (lignes ~220-240) - Prompt extraction secteur par attestation
- `index.html` (lignes ~3800-3900) - Checks secteur par chantier
- `index.html` (lignes ~1650-1700) - Alerte secteur "Autres"

### Fonctions créées
```javascript
displaySecteurAlertIfNeeded(attestation, index)  // Alerte si secteur "Autres"
storeSecteurChantier(index, secteur)             // Stockage localStorage
```

### Checks modifiés
- **Check 14** : Secteur Audit = Secteur CEE (par chantier)
- **Check 18** : Secteur Synthèse = Secteur Audit (par chantier)
- **Check 20** : Secteur état initial = "Entrepôt" (par chantier)
- **Check 23** : Secteur état projeté = "Entrepôt" (par chantier)

### Commits principaux
- `6524840` - "Feature: Détection automatique du secteur d'activité dans le CEE"
- `435b846` - "API: Extraction secteur d'activité par chantier (au lieu de global)"
- `eac41e7` - "Frontend Partie 2: Alerte et stockage secteur par chantier"
- `371591f` - "Frontend Partie 3: Vérifications secteur par chantier"

## Retour d'expérience (11 mai 2026)

Après 2 jours d'utilisation :
- ✅ Fonctionne parfaitement sur dossiers multi-secteurs
- ✅ Alerte "Autres" utile (détecté 2 cas réels)
- ✅ Extraction Claude correcte dans 100% des cas testés
- ⚠️ Mapping secteur select UI nécessitait ajustement (corrigé commit e6e674e)

**Recommandation** : Solution robuste, à conserver. Lien fort avec ADR 005 (NAF + surfaces manuelles).

## Lien avec autres ADRs

- **ADR 003** (Multi-chantiers) : Extraction par chantier cohérente avec architecture
- **ADR 005** (NAF + surfaces) : Secteur "Autres" déclenche saisie manuelle surfaces
- **ADR 009** (UX hiérarchique) : Secteur affiché par chantier dans navigation

## Sources

- [Commit 6524840] - "Feature: Détection automatique du secteur d'activité dans le CEE"
- [Commit 435b846] - "API: Extraction secteur d'activité par chantier (au lieu de global)"
- [Commit eac41e7] - "Frontend Partie 2: Alerte et stockage secteur par chantier"
- [Commit 371591f] - "Frontend Partie 3: Vérifications secteur par chantier"
- [Commit e6e674e] - "Fix: Mapping secteur d'activité pour le select Type de local"
