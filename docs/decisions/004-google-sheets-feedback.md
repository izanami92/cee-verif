# ADR 004 : Google Sheets pour feedback faux positifs

**Date** : 11 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude

---

## Contexte

### Problème
L'application détecte des incohérences, mais certaines sont des **faux positifs** :
- Audit dit "850 m²", CEE dit "850,5 m²" → Différence réelle : 0,5 m² (négligeable)
- Adresse "La Mazurie" vs "LA MAZURIE" → Même adresse, juste la casse
- Parcelle "129/YD/0203" vs "129 / YD / 0203" → Même parcelle, juste les espaces

**Besoin** : Permettre à l'utilisateur de signaler les faux positifs pour améliorer la détection.

**Contrainte** : Vercel Serverless Functions = **stateless** (pas de fichier local persistant)

### Solutions envisagées initialement
1. ❌ Fichier JSON local → Impossible (serverless = pas de filesystem persistant)
2. ❌ Base de données → Trop complexe pour Phase 1
3. ✅ Google Sheets → Simple, gratuit, accessible via API

## Décision

**Solution** : Google Sheets API avec Service Account

### Architecture
```
Frontend (index.html)
  ↓
api/fetchSheet.js     ← Récupère feedback existants
api/compareSheet.js   ← Compare check avec feedback et envoie nouveau
  ↓
Google Sheets API
  ↓
Feuille "Feedback Faux Positifs"
```

### Colonnes de la feuille
| Date | Check ID | Champ | Valeur attendue | Valeur trouvée | Statut | Notes |
|------|----------|-------|-----------------|----------------|--------|-------|
| 2026-05-11 | check_07 | Surface | 850 m² | 850,5 m² | Faux positif | Arrondi acceptable |

### Service Account Google
```bash
# Variables d'environnement Vercel
GOOGLE_SHEET_ID=1abc...xyz
GOOGLE_SERVICE_ACCOUNT_EMAIL=cee-verif@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
```

### Fichiers créés
- `api/fetchSheet.js` (92 lignes) - Lecture Google Sheet
- `api/compareSheet.js` (340 lignes) - Comparaison + écriture

## Alternatives envisagées

### Alternative 1 : Base de données PostgreSQL (Vercel Postgres)
**Avantages** :
- Structure relationnelle propre
- Requêtes SQL puissantes
- Scalable

**Inconvénients** :
- Setup plus complexe
- Coût mensuel (après free tier)
- Overkill pour Phase 1
- Nécessite migrations/schéma

**Verdict** : ❌ Trop complexe pour le besoin actuel

### Alternative 2 : Fichier JSON dans le repo Git
**Avantages** :
- Ultra simple
- Versionné avec le code

**Inconvénients** :
- Vercel Serverless = stateless (pas de write persistant)
- Commits automatiques = pollution historique Git
- Conflits Git potentiels

**Verdict** : ❌ Impossible techniquement avec Vercel Serverless

### Alternative 3 : Vercel KV (Redis)
**Avantages** :
- Rapide
- Intégration Vercel native

**Inconvénients** :
- Coût mensuel
- Interface CLI (pas visuelle)
- Structure key-value (pas idéale pour tableau)

**Verdict** : ❌ Coût + interface non adaptée

### Alternative 4 : Google Sheets (retenu)
**Avantages** :
- ✅ Gratuit (jusqu'à millions de lignes)
- ✅ Interface visuelle (utilisateur peut voir/éditer)
- ✅ API simple (googleapis npm package)
- ✅ Service Account = pas de OAuth

**Inconvénients** :
- Latence ~500ms par requête (acceptable)
- Quota 60 req/min (largement suffisant)
- Pas de transactions (mais pas critique ici)

**Verdict** : ✅ Solution optimale pour Phase 1

## Conséquences

### Positives ✅
- Feedback utilisateur persistent
- Interface visuelle pour analyser les faux positifs
- Gratuit et scalable
- Pas de base de données à gérer
- Utilisateur peut exporter en CSV/Excel facilement

### Négatives ❌
- Latence ~500ms par appel API
- Dépendance à Google (si Google Sheets down, feedback ne marche pas)
- Quota 60 req/min (mais largement suffisant)

### Neutres ⚠️
- Service Account = credentials à gérer dans Vercel
- Pas de versionning des feedbacks (mais pas nécessaire)

## Implémentation

### 1. Créer Service Account Google
```bash
# Google Cloud Console
1. Créer projet "cee-verif"
2. Activer Google Sheets API
3. Créer Service Account
4. Télécharger clé JSON
5. Partager la Google Sheet avec l'email du service account
```

### 2. Configurer Vercel
```bash
# Ajouter variables d'environnement
GOOGLE_SHEET_ID=...
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...  # Format: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### 3. Routes API créées
- `GET /api/fetchSheet` - Récupère tous les feedbacks
- `POST /api/compareSheet` - Compare check + envoie feedback si nouveau

## Retour d'expérience (11 mai 2026)

Implémenté et testé le jour même :
- ✅ Fonctionne parfaitement
- ✅ Latence acceptable (~300-500ms)
- ✅ Interface Google Sheets pratique pour analyser patterns
- ⚠️ Nécessite partage manuel de la Sheet avec Service Account (fait une fois)

**Recommandation** : Solution viable pour Phase 1-2-3. Envisager BDD si >1000 feedbacks/mois.

## Sources

- [Transcript 5c6b218b, 11 mai 2026] - Discussion + implémentation
- [Commit 7a5ff03] - "Feature: Vérification avec Google Sheet"
- [Commit e7504b6] - "Feature: Variable d'environnement pour onglet Google Sheet"
- `api/fetchSheet.js` - Code de lecture
- `api/compareSheet.js` - Code de comparaison + écriture
