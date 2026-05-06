# CEE Vérif — Phase 1

Application web interne de vérification des dossiers CEE LED (opération BAT-EQ-127).

## 🎯 Objectif

Permettre à un collaborateur de vérifier rapidement un dossier CEE en important les PDFs (Audit Dialux, Synthèse, Dossier CEE, Fiche technique) et d'obtenir un rapport d'incohérences complet avec un message prêt à envoyer à l'auditeur.

## 🏗️ Stack technique

- **Frontend** : HTML/CSS/JS vanilla + pdf.js
- **Backend** : Vercel Serverless Functions (Node.js)
- **IA** : Claude API (Anthropic)
- **Déploiement** : Vercel

## 📦 Installation

### Prérequis

- Compte GitHub
- Compte Vercel (gratuit)
- Clé API Anthropic (obtenir sur https://console.anthropic.com)

### Développement local

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd cee-verif
   ```

2. **Installer Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```
   Éditer `.env` et renseigner :
   - `ANTHROPIC_API_KEY` : votre clé API Claude
   - `APP_PASSWORD` : le mot de passe d'accès à l'application

4. **Lancer le serveur de développement**
   ```bash
   vercel dev
   ```
   L'application sera accessible sur http://localhost:3000

## 🚀 Déploiement sur Vercel

### Première fois

1. **Connecter le dépôt GitHub à Vercel**
   - Aller sur https://vercel.com
   - Cliquer sur "Add New Project"
   - Importer votre dépôt GitHub `cee-verif`

2. **Configurer les variables d'environnement**
   - Dans Vercel Dashboard : Project → Settings → Environment Variables
   - Ajouter `ANTHROPIC_API_KEY` (votre clé API)
   - Ajouter `APP_PASSWORD` (le mot de passe partagé)
   - Sauvegarder

3. **Déployer**
   - Vercel déploie automatiquement à chaque push sur la branche `main`
   - Récupérer l'URL de production (ex: `cee-verif.vercel.app`)

### Mises à jour

Chaque fois que vous pushez sur GitHub, Vercel redéploie automatiquement.

```bash
git add .
git commit -m "Description des changements"
git push origin main
```

## 🧪 Tests

### Tester les routes API en local

**Route analyze** (avec bon mot de passe) :
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"VotreMotDePasse","messages":[{"role":"user","content":"test"}],"system":"Réponds OK"}'
```

**Route analyze** (avec mauvais mot de passe - doit retourner 401) :
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"mauvais","messages":[],"system":""}'
```

**Route search** (recherche SIRET) :
```bash
curl "http://localhost:3000/api/search?q=SCEA+TROIS&password=VotreMotDePasse"
```

## 📁 Structure du projet

```
cee-verif/
├── index.html          # Interface complète (HTML/CSS/JS en un seul fichier)
├── api/
│   ├── analyze.js      # POST — vérifie mot de passe, appelle Claude, retourne JSON
│   └── search.js       # GET — vérifie mot de passe, relaie vers API SIRET
├── docs/               # Documents de référence et exemples
├── taches/             # Suivi du développement
├── vercel.json         # Configuration Vercel
├── .env.example        # Modèle des variables d'environnement
├── .gitignore          # Fichiers à ignorer par Git
├── CLAUDE.md           # Instructions et contexte pour Claude Code
└── README.md           # Ce fichier
```

## 🔒 Sécurité

- ✅ La clé API Anthropic et le mot de passe ne sont **JAMAIS** dans le code source
- ✅ Toutes les routes API vérifient le mot de passe avant tout traitement
- ✅ Les PDFs ne sont jamais écrits sur disque côté serveur (traités en mémoire)
- ✅ Headers CORS configurés pour autoriser uniquement le domaine Vercel

## 📖 Documentation

- **Cahier des charges Phase 1** : `docs/CDC_Phase1_Interface_CEE.docx`
- **Contexte pour Claude Code** : `CLAUDE.md`
- **Plan de développement** : `taches/a-faire.md`

## 🆘 Support

Pour toute question ou problème, consulter :
1. Le fichier `CLAUDE.md` (contexte métier et règles)
2. Le fichier `taches/a-faire.md` (plan détaillé)
3. Les exemples de PDFs dans `docs/`

## 📝 Licence

Usage interne — Total Energies / Prime Evolution
