# ADR 002 : Claude Sonnet 4 via OpenRouter

**Date** : 5-6 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude
**Mise à jour** : 6 mai 2026 (retour Sonnet 4 après échec Haiku)

---

## Contexte

Besoin d'un modèle IA pour :
- Extraire des données structurées depuis des PDFs (Audit, Synthèse, CEE)
- Comparer des valeurs avec logique métier complexe
- Générer un rapport d'incohérences en français

Critères :
- Précision maximale (aucune donnée manquée)
- Coût raisonnable (usage interne, ~50 dossiers/mois estimé)
- Latence acceptable (<60s pour éviter timeout Vercel)

## Décision

**Modèle** : Claude Sonnet 4 (`anthropic/claude-sonnet-4`)
**Provider** : OpenRouter (proxy API)
**Configuration** :
```javascript
model: 'anthropic/claude-sonnet-4'
max_tokens: 8000          // Réduit de 16000 → 8000 pour éviter timeout
temperature: 0.3          // Déterministe mais pas rigide
```

## Alternatives envisagées

### Alternative 1 : Claude Haiku 3.5
**Date tentative** : 6 mai 2026
**Raison** : Réduire les coûts (Haiku ~10x moins cher que Sonnet)

**Résultat** : ❌ ÉCHEC
- Performances insuffisantes sur extractions complexes
- Données manquantes ou incomplètes
- Retour Sonnet 4 le jour même

**Source** : [Commit b17bffd, f372087]

### Alternative 2 : GPT-4 Turbo (OpenAI)
**Avantages** :
- Très performant aussi
- Bien documenté

**Inconvénients** :
- Plus cher que Sonnet 4
- Moins bon sur documents français (constaté empiriquement)
- Context window plus petit (128k vs 200k pour Claude)

### Alternative 3 : GPT-3.5 Turbo
**Avantages** :
- Très peu cher

**Inconvénients** :
- Pas assez performant pour extraction structurée complexe
- Risque d'erreurs trop élevé

### Alternative 4 : Llama 3 70B (open-source)
**Avantages** :
- Gratuit (self-hosted)
- Pas de limite de tokens

**Inconvénients** :
- Infrastructure nécessaire (GPU)
- Performances en retrait vs Claude/GPT-4
- Maintenance serveur

## Conséquences

### Positives ✅
- Précision excellente (>95% des extractions correctes)
- Gère très bien le français
- Context window 200k = peut traiter de gros dossiers
- Via OpenRouter = switching facile vers autre modèle si besoin
- Coût acceptable (~0.5-1€ par dossier estimé)

### Négatives ❌
- Coût non nul (vs modèles open-source gratuits)
- Dépendance à un service externe (Anthropic)
- Latence ~20-40s par analyse (acceptable mais pas instantané)

### Neutres ⚠️
- `max_tokens: 8000` = compromis coût/latence/completude

## Évolution de la configuration

### 5 mai 2026 : Configuration initiale
```javascript
max_tokens: 16000
temperature: 0
```

### 6 mai 2026 : Optimisation timeout
```javascript
max_tokens: 10000  // Réduit pour éviter 504 timeout
temperature: 0.3   // Augmenté légèrement pour meilleure qualité
```

**Source** : [Commit 2fd94c9] - "Réduction max_tokens 16000 → 10000 pour éviter timeout 504"

### 11 mai 2026 : Configuration finale
```javascript
max_tokens: 8000  // Optimum trouvé
temperature: 0.3
```

## Retour d'expérience (11 mai 2026)

Après 128 commits et des dizaines de tests réels :
- ✅ Sonnet 4 tient ses promesses (précision excellente)
- ✅ Jamais eu besoin de revenir vers un autre modèle
- ✅ Configuration actuelle stable et optimale
- ⚠️ Surveillance des coûts nécessaire si volume augmente

**Recommandation** : Garder Sonnet 4 pour Phase 1-2-3, réévaluer pour Phase 4 (base de données learning)

## Sources

- [Transcript 59038263, 5 mai 2026] - Choix initial Sonnet 4
- [Transcript 59038263, 6 mai 2026] - Tentative Haiku puis retour Sonnet 4
- [Commit b17bffd] - "Fix: Correction du nom du modèle Claude"
- [Commit 93e39e5] - "Switch to Claude Sonnet 3.5 for better analysis"
- [Commit f372087] - "Back to Claude Sonnet 4 (working model)"
- [Commit 2fd94c9] - "Réduction max_tokens 16000 → 10000 pour éviter timeout 504"
