# RÉSUMÉ EXÉCUTIF - ANALYSE TRANSCRIPTS CEE VÉRIF
## 5-11 mai 2026 (7 jours, 6290 messages)

---

## 🎯 DÉCISIONS TECHNIQUES MAJEURES

### 1. Architecture : Mono-fichier HTML + Serverless Vercel
**Date :** 5 mai 2026  
**Choix :** HTML/CSS/JS vanilla + Vercel Serverless Functions  
**Raison :** Simplicité maximale, déploiement instantané, pas de dépendances npm client

### 2. API IA : OpenRouter → Claude Sonnet 4
**Date :** 5-6 mai 2026  
**Évolution :**
- 5 mai : OpenRouter avec Sonnet 4
- 6 mai : Tentative Haiku 3.5 (échec - performances insuffisantes)
- 6 mai : Retour Sonnet 4 (configuration finale stable)

**Configuration finale :**
```javascript
model: 'anthropic/claude-sonnet-4'
max_tokens: 8000
temperature: 0.3
```

### 3. Refonte multi-chantiers (MAJEURE)
**Date :** 7 mai 2026  
**Impact :** Refactorisation complète de l'architecture et des 40 checks  
**Durée :** ~6 heures de travail intensif

**Changements :**
- Format JSON : `audits[]` et `syntheses[]` au lieu d'objets uniques
- Matching automatique par adresse (`normalizeAddress()` + `matchChantiers()`)
- Vérification à 2 niveaux : par chantier + total global
- Rétrocompatibilité totale avec dossiers mono-chantier

### 4. Architecture UX à 3 niveaux
**Date :** 9 mai 2026  
**Structure :**
```
📄 Dossier CEE [✅/❌]
   └─ Groupes sémantiques (10 groupes)
      └─ Checks individuels (40+)
```

### 5. Google Sheets pour feedback faux positifs
**Date :** 11 mai 2026  
**Raison :** Vercel Serverless = stateless, impossible de persister en fichier  
**Solution :** Google Sheets API avec service account

### 6. Support NAF/saisie manuelle surfaces
**Date :** 11 mai 2026  
**Fonctionnalité :** Saisie manuelle des surfaces pour secteurs "NAF"/"Autres"  
**Règle :** Tolérance ±1 m² pour compenser arrondis

---

## 🔴 RÈGLES MÉTIER CRITIQUES (à ne JAMAIS oublier)

### BLOQUANTES (empêchent envoi client)

1. **Mentions agricoles strictement interdites**
   - Mots interdits : "agri", "agricole", "agriculteur", "EARL", "SCEA"
   - Check ID : 21
   - Action si détecté : ❌ ARRÊT IMMÉDIAT

2. **Page de garde : correspondance exacte**
   - Nom client = Synthèse = CEE
   - Adresse siège = Synthèse = CEE
   - Date = Date audit
   - Check IDs : 12, 13, 14
   - Logique : ✅ Page de garde OK → envoi signature client possible

### MAJEURES (à corriger avant envoi CEE complet)

3. **SIRET : 14 chiffres, cohérent**
   - Format : exactement 14 chiffres
   - Cohérence : identique dans tous les documents
   - ⚠️ Attention : Client, PAS Prime Evolution

4. **LED : cohérence totale multi-chantiers**
   - Par chantier : Audit = Synthèse = CEE (exact au LED près)
   - Total global : Σ(chantiers) = Total CEE
   - Tolérance : AUCUNE

5. **THD : exactement 3,7%**
   - Valeur requise : 3,7% (pas 3,6% ou 3,8%)
   - Tolérance : AUCUNE

6. **Parcelles cadastrales : format 000/0B/XXXX**
   - ⚠️ NE JAMAIS utiliser `compareStrings()` → utiliser `compareParcelles()`

7. **Référence produit LED identique**
   - DAEWOO NES-HBL 250W (le plus courant)
   - ou TECH LED 150W

---

## 📖 PATTERNS OBLIGATOIRES

### À TOUJOURS SUIVRE

✅ **P1. Diagnostic AVANT modification de code**
1. Diagnostiquer cause racine
2. Expliquer à l'utilisateur
3. Proposer solution(s)
4. **Attendre validation**
5. Modifier le code

✅ **P2. Commit + push APRÈS CHAQUE modification**
- Raison : Vercel déploie automatiquement
- Si oublié : utilisateur voit ancienne version en ligne

✅ **P3. Workflow Git : branche develop pour travail, main pour production**
```bash
git checkout develop        # Toujours
git push origin develop     # Après chaque commit
git merge develop → main    # Après validation utilisateur seulement
```

✅ **P4. Vérifier console JavaScript avant de valider**
- F12 → Console
- Aucune erreur rouge avant de dire "c'est terminé"

✅ **P5. Proposer 2-3 approches AVANT tâche non triviale**
- Option A : Simple/rapide
- Option B : Complète/robuste
- Avantages/inconvénients/estimation pour chaque

### À ÉVITER ABSOLUMENT

❌ **A1. NE JAMAIS utiliser compareStrings() pour parcelles cadastrales**
- Utiliser `compareParcelles()` (voir règle R16)

❌ **A2. NE JAMAIS extraire le SIRET de Prime Evolution**
- Toujours le client bénéficiaire

❌ **A3. NE JAMAIS skip les hooks Git (--no-verify)**

❌ **A4. NE JAMAIS commit sans message clair**
- Format : `feat:`, `fix:`, `docs:`, `refactor:`

❌ **A5. NE JAMAIS push --force sur main**

---

## 🐛 BUGS MAJEURS RÉSOLUS

### Bug #1 : "Chantier 3 fantôme" (8 mai)
**Symptôme :** Affichage "Chantier 3" alors que seulement 2 chantiers dans le CEE  
**Cause :** `matchChantiers()` utilisait l'index du tableau au lieu d'un compteur  
**Solution :** Compteur `chantierNumero` incrémenté seulement si attestation CEE trouvée  
**Commit :** `fix: Correct phantom site numbering in multi-site mode`

### Bug #2 : Matching par adresse échoue (7 mai)
**Symptôme :** Mêmes adresses créaient des chantiers séparés  
**Cause :** Normalisation insuffisante (casse, ponctuation, espaces)  
**Solution :** `normalizeAddress()` agressive + suppression mentions bâtiments  
**Commit :** `fix: Improve address normalization for better site matching`

### Bug #3 : Variables supprimées lors du refactoring (7 mai)
**Symptôme :** `Uncaught ReferenceError: surfacesAttestationGroupees is not defined`  
**Cause :** Renommage variable mais références anciennes restées  
**Solution :** Recherche globale + remplacement + vérification console  
**Commit :** `fix: Correct undefined variable after refactoring`

### Bug #4 : Nom du modèle Claude incorrect (6 mai)
**Symptôme :** `"anthropic/claude-haiku-3.5 is not a valid model ID"`  
**Cause :** Nom incorrect sur OpenRouter  
**Solution :** `anthropic/claude-3.5-haiku` (correct)  
**Leçon :** Toujours vérifier https://openrouter.ai/models avant déploiement

### Bug #5 : Haiku 3.5 rate des extractions (6 mai)
**Symptôme :** Champs manquants, valeurs "N/A"  
**Cause :** Haiku trop faible pour documents CEE complexes  
**Solution :** Retour Sonnet 4  
**Leçon :** Ne pas sacrifier qualité pour économiser centimes

---

## ✅ TODOs / FONCTIONNALITÉS PLANIFIÉES

### COMPLÉTÉES
- ✅ Système de feedback faux positifs (Google Sheets)
- ✅ Saisie manuelle surfaces NAF
- ✅ Regroupement sémantique des 40+ checks
- ✅ Architecture UX à 3 niveaux

### EN DISCUSSION
- ⚠️ Apprentissage automatique des patterns de faux positifs
- ⚠️ Suggestions automatiques de règles d'exception

### NON PLANIFIÉES (idées mentionnées)
- Export PDF du rapport d'analyse
- Historique des analyses par dossier
- Tests automatisés
- Migration TypeScript

---

## 👤 PRÉFÉRENCES UTILISATEUR (CLAUDE.md)

### Langue et communication
- 🇫🇷 Toujours répondre en français
- 👶 Parler comme à un débutant pour le technique
- 📝 Réponses concises, pas de sur-explication

### Workflow et validation
- 🔍 Diagnostic avant modification
- 💡 Proposer 2-3 approches avant d'implémenter
- ⚠️ Signaler proactivement les risques
- 🚫 Ne jamais faire de refacto structurelle sans validation

### Gestion du code
- 📤 Commit + push après chaque modification
- 🌿 Workflow Git : branche develop (travail) + main (production)

---

## 📊 STATISTIQUES

**Période :** 5-11 mai 2026 (7 jours)  
**Messages analysés :** 6290
- Transcript 1 (59038263) : 1225 messages (5-7 mai)
- Transcript 2 (5c6b218b) : 5065 messages (7-11 mai)

**Décisions techniques majeures :** 20+  
**Bugs résolus :** 7 majeurs documentés  
**Commits :** ~50+ (estimation)  
**Lignes de code index.html :** ~3000+ (estimation)

**Jour le plus actif :** 7 mai 2026 (refonte multi-chantiers)

---

## 📁 FICHIERS CLÉS

### Code
- `/index.html` (~3000+ lignes) - Interface complète mono-fichier
- `/api/analyze.js` - Extraction PDF via Claude Sonnet 4
- `/api/feedback.js` - Enregistrement feedback Google Sheets
- `/api/search.js` - API SIRET gouvernementale

### Documentation
- `/CLAUDE.md` - Documentation projet + règles métier
- `/README.md` - Guide installation/déploiement

### Mémoire (/.claude/projects/-Users-mac/memory/)
- `reference_regles_validation_cee.md` (158 lignes) - 40 checks détaillés
- `reference_adresses_batiments_cee.md` - Ignorer "BAT X", "Bâtiment X"
- `reference_extraction_audit_client_vs_bureau.md` - Client vs Prime Evolution
- `reference_saisie_surfaces_manuelles.md` - Saisie NAF + tolérance ±1m²
- `feedback_vercel_deployment.md` - Commit+push obligatoire
- `feedback_diagnostic_avant_modification.md` - Diagnostic avant code
- `feedback_workflow_git_develop.md` - Branche develop
- `project_multi_chantiers_led.md` - Comparaison LED par chantier

---

## 🎯 RECOMMANDATIONS

### Court terme (1-2 semaines)
1. ✅ Tests utilisateurs intensifs sur dossiers réels variés
2. ✅ Affiner règles de validation selon feedback terrain
3. ✅ Optimiser système feedback Google Sheets

### Moyen terme (1-2 mois)
1. Ajouter tests automatisés pour fonctions critiques
2. Modulariser index.html (séparation en fichiers JS)
3. Implémenter système de cache pour analyses

### Long terme (3-6 mois)
1. Phase 2 du CDC : Base de données de dossiers
2. Phase 3 : Tableau de bord statistiques
3. Phase 4 : Automatisation complète avec envoi email

---

## ⚠️ POINTS D'ATTENTION

1. **Complexité croissante de index.html** (~3000 lignes)
   - Risque de régression
   - Recommandation : Modularisation

2. **Tests automatisés manquants**
   - Validation manuelle uniquement
   - Recommandation : Tests unitaires fonctions critiques

3. **Dépendance à Claude Sonnet 4**
   - Coût ~0.50-1€ par dossier
   - Pas de fallback si API down
   - Recommandation : Système de cache

---

**FIN DU RÉSUMÉ EXÉCUTIF**

📄 **Rapport complet :** `RAPPORT_ANALYSE_TRANSCRIPTS_COMPLET.md` (~1600 lignes)  
📅 **Date :** 11 mai 2026  
🔍 **Sources :** 6290 messages analysés sur 7 jours
