# CLAUDE.md — CEE Vérif

## Vue d'ensemble du projet

**Application web interne** de vérification des dossiers CEE LED (opération BAT-EQ-127).

- **Client final** : Entreprises tertiaires (entrepôts, logistique)
- **Délégataire** : Total Energies
- **Bureau d'études** : Prime Evolution (OPQIBI)
- **Utilisateurs** : Collaborateurs internes Prime Evolution
- **Objectif Phase 1** : Importer des PDFs et obtenir un rapport d'incohérences automatique

**Historique** :
- **Démarrage** : 5 mai 2026
- **Commits** : 128 en 6 jours
- **Version actuelle** : Phase 1 complète + Google Sheets + Support NAF

---

## Stack et architecture

### Technologies

```
Frontend : HTML/CSS/JS vanilla (~6000 lignes dans index.html)
Backend  : Node.js 20.x + Vercel Serverless Functions
APIs     : Claude Sonnet 4 (via OpenRouter)
         : API Gouvernementale SIRET
         : Google Sheets API (googleapis v171.4.0)
PDF      : pdf.js (client-side)
Fonts    : Google Fonts (DM Sans, Syne, DM Mono)
Deploy   : Vercel (auto-deploy sur push)
```

### Structure des fichiers

```
cee-verif/
├── index.html                    ← Interface complète (5908 lignes)
├── api/
│   ├── analyze.js                ← Extraction PDF via Claude (396 lignes)
│   ├── search.js                 ← Recherche SIRET gouvernementale (90 lignes)
│   ├── compareSheet.js           ← Comparaison Google Sheets (340 lignes)
│   ├── fetchSheet.js             ← Lecture Google Sheets (92 lignes)
│   └── extract-cee.js            ← Extraction CEE (149 lignes, legacy?)
├── docs/
│   ├── decisions/                ← ADRs (Architecture Decision Records)
│   ├── business-rules.md         ← Règles métier critiques
│   ├── known-pitfalls.md         ← Bugs résolus et pièges connus
│   └── pending-todos.md          ← Modifications planifiées
├── taches/
│   ├── a-faire.md                ← Planification des tâches
│   └── points-controle.md        ← Points de contrôle détaillés
├── CHECKLIST_COMPLETE.md         ← 40 points de vérification
├── CHECKLIST_MANUELLE.md         ← Checks manuels utilisateur
├── CLAUDE.md                     ← Ce fichier
├── README.md                     ← Installation et déploiement
├── vercel.json                   ← Configuration Vercel
└── .env.example                  ← Modèle variables d'environnement
```

### Variables d'environnement (jamais dans le code!)

```bash
ANTHROPIC_API_KEY=sk-ant-...     # API Claude via OpenRouter
APP_PASSWORD=...                  # Mot de passe application (legacy?)
GOOGLE_SHEET_ID=...              # ID Google Sheet feedback
GOOGLE_SERVICE_ACCOUNT_EMAIL=... # Service account Google
GOOGLE_PRIVATE_KEY=...           # Clé privée service account
```

Définies dans **Vercel Dashboard** → Project → Settings → Environment Variables.

---

## Conventions de code

### Nommage

- **Variables/fonctions** : `camelCase` en anglais (`extractData`, `normalizeAddress`)
- **Constantes** : `UPPER_SNAKE_CASE` (`MAX_RETRIES`, `API_ENDPOINT`)
- **Commentaires** : En français pour la logique métier
- **UI** : Tous les textes en français
- **Commits** : Format conventionnel (`feat:`, `fix:`, `docs:`, `refactor:`)

### Structure du code

- **Frontend** : Vanilla JS uniquement (pas de framework)
- **Fonctions** : Maximum 50 lignes (refactoriser si plus long)
- **Commentaires** : Uniquement pour le "pourquoi", pas le "quoi"
- **Logs** : `console.log()` avec emojis pour la lisibilité (✅ ❌ ⚠️ 🔍)

### Sécurité (non négociable)

- ❌ Jamais de secrets dans le code source
- ✅ Vérifier mot de passe en PREMIER dans chaque route API
- ✅ Les PDFs ne sont jamais écrits sur disque côté serveur
- ✅ Headers CORS restreints au domaine Vercel en production

### Robustesse

- Si PDF échoue → erreur claire, continuer avec les autres
- Si API erreur → afficher message exact (aide debug)
- Si JSON invalide → afficher texte brut (pas de crash)
- Timeout Vercel : 60 secondes max (`export const config = { maxDuration: 60 }`)

---

## Règles métier critiques

⚠️ **IMPORTANT** : Ces règles sont EXHAUSTIVES dans `docs/business-rules.md`

### Niveaux de priorité

- **BLOQUANT** 🔴 : Empêche envoi signature client (page de garde Audit uniquement)
- **MAJEUR** 🟠 : À corriger avant envoi CEE complet (tout le reste)
- **INFO** 🔵 : À vérifier manuellement

### Règles BLOQUANTES (3)

1. **Mentions agricoles interdites** - Mots : "agri", "agricole", "agriculteur", "EARL", "SCEA"
2. **Page de garde Audit** - Nom, adresse, date = références exactes
3. **Profil utilisation** - "Entrepôt" ou "Logistique" uniquement (jamais agricole)

### Règles MAJEURES (10)

4. SIRET : 14 chiffres, cohérent, du CLIENT (pas Prime Evolution)
5. LED : Cohérence totale par chantier + total global (tolérance = 0)
6. THD : Exactement 3,7% (tolérance = 0)
7. Parcelles cadastrales : Format 000/0B/XXXX
8. Référence produit : DAEWOO NES-HBL 250W ou TECH LED 150W (extraction auto)
9. Surfaces : Tolérance ±1 m² (arrondis)
10. Date audit = date devis
11. Secteur d'activité : "Entrepôts" ou équivalent (par chantier, non global)
12. Code NAF : Secteur "Autres" ou NAF non agricole → saisie manuelle surfaces
13. Adresses : Normalisation (ignorer BAT/Bâtiment, parcelles cadastrales)

### Logique d'envoi

```
✅ Page de garde OK → Envoi signature client IMMÉDIAT possible
⏳ Corrections majeures en parallèle (client peut signer pendant qu'on corrige)
✅ Tout OK → Envoi CEE complet à Total Energies
```

**Détails complets** → `docs/business-rules.md`

---

## Décisions architecturales

Les décisions techniques majeures sont documentées dans `docs/decisions/` sous forme d'ADRs (Architecture Decision Records).

**Index des ADRs** :
- **001-architecture-mono-fichier.md** (5 mai) - HTML/CSS/JS vanilla + Vercel Serverless
- **002-claude-sonnet-4.md** (5-6 mai) - Choix du modèle IA et configuration
- **003-refonte-multi-chantiers.md** (7 mai) - Support des dossiers multi-chantiers
- **006-selecteur-led-fiches-techniques.md** (8 mai) - Extraction auto référence LED + fiches techniques
- **007-normalisation-adresses-batiments.md** (8 mai) - Ignorer mentions BAT/Bâtiment dans adresses
- **008-extraction-client-vs-bureau.md** (8 mai) - Clarification extraction SIRET/infos du CLIENT
- **009-refonte-ux-hierarchique.md** (9 mai) - Structure hiérarchique + regroupement sémantique
- **010-secteur-activite-par-chantier.md** (9 mai) - Extraction secteur par chantier (non global)
- **011-matching-index-chantiers.md** (9 mai) - Matching audits/synthèses par INDEX
- **004-google-sheets-feedback.md** (11 mai) - Persistence du feedback utilisateur
- **005-support-naf-surfaces-manuelles.md** (11 mai) - Gestion secteur "Autres"

Chaque ADR contient : Date, Statut, Contexte, Décision, Alternatives, Conséquences, Sources.

---

## Pièges connus

⚠️ **Liste exhaustive** dans `docs/known-pitfalls.md`

### Top 3 pièges à éviter

1. **NE JAMAIS utiliser `compareStrings()` pour les parcelles cadastrales**
   → Utiliser `compareParcelles()` (gère ordre, espaces, séparateurs)

2. **NE JAMAIS extraire le SIRET de Prime Evolution**
   → Toujours celui du client bénéficiaire

3. **NE JAMAIS oublier commit + push après modification**
   → Vercel déploie automatiquement, sinon l'utilisateur voit l'ancienne version

**Bugs résolus** → `docs/known-pitfalls.md` section "Historique des bugs"

---

## Rituel de session

### 🚀 En début de session

1. **Lire la documentation** :
   ```bash
   cat CLAUDE.md
   cat docs/business-rules.md
   cat docs/pending-todos.md
   ls docs/decisions/
   ```

2. **Vérifier l'état récent du projet** :
   ```bash
   git log -20 --oneline
   git status
   git branch -a
   ```

3. **Résumer à l'utilisateur** où on en est avant de commencer

### 🔍 Avant toute modification non-triviale

1. **Diagnostiquer** : Identifier le problème exact (fichier, ligne, cause)
2. **Expliquer** : Présenter le diagnostic à l'utilisateur
3. **Proposer** : 2-3 approches avec avantages/inconvénients
4. **Attendre validation** : Ne JAMAIS coder sans validation
5. **Vérifier** : Aucune règle de `docs/business-rules.md` n'est violée

### ✅ Après chaque modification

1. **Tester** : Vérifier console JavaScript (F12) - aucune erreur rouge
2. **Commit** : Message clair format conventionnel
3. **Push** : Immédiatement (Vercel déploie automatiquement)
4. **Documenter** : Mettre à jour les fichiers concernés

### 📝 En fin de session

1. **Lister** les modifications faites (récapitulatif concis)
2. **Proposer mises à jour** : CLAUDE.md, ADR, business-rules si besoin
3. **Mettre à jour** `docs/pending-todos.md` avec l'état actuel
4. **Faire spontanément** sans attendre qu'on me le demande

---

## Préférences de travail de l'utilisateur

### Communication

- 🇫🇷 **Toujours répondre en français**
- 🎓 **Me parler comme à un débutant** qui a besoin d'être guidé
- 📝 **Réponses concises**, pas de sur-explication
- 💡 **Proposer des idées** quand pertinent, clairement marquées comme suggestions

### Workflow

- 🔍 **Diagnostic AVANT modification** - Expliquer le problème et la solution
- ✋ **Attendre validation** avant changements d'architecture/suppressions/dépendances
- 🎯 **Proposer 2-3 approches** avec avantages/inconvénients pour tâches non triviales
- ⚠️ **Signaler proactivement** les risques ou problèmes identifiés
- 🚫 **Pas de refacto structurelle** sans validation préalable

### Style de code

- 🎯 **Fonctionnel et fiable** avant d'être beau
- 🧪 **Prouver que ça fonctionne** avant de dire "c'est terminé"
- 📋 **Un ingénieur senior validerait-il ce code ?** Sinon, refaire

---

## Tests obligatoires avant validation

### Routes API (avec curl)

```bash
# Tester analyze
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"MON_MDP","messages":[{"role":"user","content":"test"}],"system":"Réponds OK"}'

# Tester search
curl "http://localhost:3000/api/search?q=SCEA+TROIS&password=MON_MDP"

# Tester rejet mauvais mot de passe (doit retourner 401)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"mauvais","messages":[],"system":""}'
```

### Checklist frontend

- [ ] Login fonctionne (bon/mauvais mot de passe)
- [ ] Recherche SIRET affiche résultats et remplit champs
- [ ] Import PDF par clic ET glisser-déposer sur les 4 zones
- [ ] Extraction PDF correcte (vérifier console)
- [ ] Analyse retourne JSON valide
- [ ] Bannière page de garde verte si OK, rouge si KO
- [ ] Message auditeur affiché et copiable
- [ ] Aucune erreur rouge dans la console JavaScript (F12)

### Navigateurs

- [ ] Chrome (prioritaire)
- [ ] Safari (macOS)
- [ ] Firefox

---

## Checklist Definition of Done - Phase 1

- [x] Login : mauvais mot de passe bloqué (401), bon mot de passe donne accès
- [x] Recherche SIRET : résultats affichés, clic remplit les champs (colorés en vert)
- [x] Import PDF : fonctionne par clic ET par glisser-déposer sur les 4 zones
- [x] Extraction PDF : le texte est correctement extrait (vérifier en console)
- [x] Analyse : JSON valide retourné, affichage correct pour les 3 niveaux
- [x] Bannière page de garde : verte si OK, rouge si KO
- [x] Message auditeur : affiché et copiable en un clic
- [x] Mauvais mot de passe API : retourne 401 (pas 500)
- [x] Testé avec Audit-exemple.pdf et Synthèse-exemple.pdf fournis
- [x] Fonctionne sur Chrome, Firefox, Safari
- [x] Déployé sur Vercel avec les variables d'environnement configurées
- [x] URL partageable communiquée à l'équipe
- [x] Support multi-chantiers (détection automatique)
- [x] Google Sheets pour feedback faux positifs
- [x] Support NAF et saisie manuelle surfaces

---

## Documents de référence

### Dans le projet

- `CHECKLIST_COMPLETE.md` — 40 points de vérification exhaustifs
- `CHECKLIST_MANUELLE.md` — Vérifications manuelles utilisateur
- `RESUME_EXECUTIF.md` — Synthèse transcripts 5-11 mai
- `RAPPORT_ANALYSE_TRANSCRIPTS_COMPLET.md` — Analyse complète des décisions
- `docs/business-rules.md` — Règles métier détaillées
- `docs/decisions/` — ADRs des décisions architecturales
- `docs/known-pitfalls.md` — Bugs résolus et pièges à éviter
- `docs/pending-todos.md` — Modifications planifiées
- `taches/a-faire.md` — Planification des tâches
- `taches/points-controle.md` — Points de contrôle détaillés

### Externes (dossier local - non versionné)

- `Audit-exemple.pdf` — Exemple d'audit Dialux pour tester
- `Synthèse-exemple.pdf` — Exemple de synthèse pour tester
- `CDC_Automatisation_CEE_LED.docx` — Cahier des charges général (4 phases)
- `CDC_Phase1_Interface_CEE.docx` — CDC de Phase 1

---

## Contexte utilisateur

- **Profil** : Non-technique, entrepreneur
- **Environnement** : macOS avec Safari et Chrome
- **Comptes** : GitHub, Vercel
- **Priorité absolue** : Fonctionnel et fiable > Esthétique
- **Style de communication** : Français, clair, concis, pédagogique

---

## Workflow Git

```bash
# Toujours travailler sur develop
git checkout develop

# Après chaque modification
git add <fichiers-modifiés>
git commit -m "type: description claire"
git push origin develop

# Merge vers main après validation utilisateur UNIQUEMENT
git checkout main
git merge develop
git push origin main
```

**Branches** :
- `main` : Production stable
- `develop` : Travail en cours
- `feature/*` : Nouvelles fonctionnalités (merger dans develop)

**⚠️ Ne JAMAIS** :
- Push --force sur main
- Skip hooks (--no-verify)
- Commit sans message clair
- Oublier de pusher (Vercel ne déploie pas!)

---

## Contact et support

- **Issues** : https://github.com/izanami92/cee-verif/issues
- **Email** : izanami975@gmail.com
- **Feedback** : Google Sheet (ID dans variables d'environnement)

---

**Dernière mise à jour** : 11 mai 2026
**Version** : Phase 1 complète + Google Sheets + Support NAF
