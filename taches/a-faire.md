# Plan de développement — Phase 1 : Interface CEE Vérif

**Dernière mise à jour** : 05/05/2026  
**Statut global** : 🔴 Pas démarré

---

## 📋 ÉTAPE 1 : Structure du projet

**Objectif** : Créer tous les fichiers et dossiers nécessaires avec leur configuration de base.

### Tâches
- [ ] **1.1** Créer `vercel.json` avec configuration des routes et timeout 60s
- [ ] **1.2** Créer `.env.example` avec `ANTHROPIC_API_KEY` et `APP_PASSWORD`
- [ ] **1.3** Créer le dossier `api/` 
- [ ] **1.4** Créer `README.md` avec guide d'installation Vercel
- [ ] **1.5** Créer `.gitignore` (ignorer `.env`, `.vercel`, `node_modules`)

### Critère de validation
✅ Tous les fichiers de structure existent et sont correctement configurés  
✅ `vercel.json` configure bien le timeout et les routes  
✅ `.env.example` documente les 2 variables requises

---

## 🔌 ÉTAPE 2 : Routes API serverless

**Objectif** : Implémenter et tester les deux fonctions serverless Vercel.

### 2.A — Route `/api/analyze` (POST)

#### Tâches
- [ ] **2.1** Créer `api/analyze.js` avec squelette de base
- [ ] **2.2** Implémenter la vérification du mot de passe (`APP_PASSWORD`)
- [ ] **2.3** Implémenter l'appel à l'API Anthropic avec le prompt métier
- [ ] **2.4** Construire le prompt système avec TOUTES les règles métier (bloquantes + majeures)
- [ ] **2.5** Parser la réponse JSON de Claude et la retourner au client
- [ ] **2.6** Gérer les erreurs (timeout, mauvais JSON, erreur API)
- [ ] **2.7** Configurer `maxDuration: 60` dans l'export config

#### Tests à faire (avec curl)
```bash
# Test avec bon mot de passe
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"MON_MDP","messages":[{"role":"user","content":"test"}],"system":"Réponds OK"}'

# Test avec mauvais mot de passe (doit retourner 401)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"mauvais","messages":[],"system":""}'
```

#### Critère de validation
✅ Mauvais mot de passe → 401  
✅ Bon mot de passe → appel réussi à Claude  
✅ JSON retourné correspond au format attendu  
✅ Timeout configuré à 60s

---

### 2.B — Route `/api/search` (GET)

#### Tâches
- [ ] **2.8** Créer `api/search.js` avec squelette de base
- [ ] **2.9** Vérifier le mot de passe (query param `?password=`)
- [ ] **2.10** Relayer la requête vers `recherche-entreprises.api.gouv.fr`
- [ ] **2.11** Parser la réponse et retourner les infos utiles (nom, SIRET, adresse)
- [ ] **2.12** Gérer les erreurs (API gouv indisponible, résultats vides)

#### Test à faire
```bash
curl "http://localhost:3000/api/search?q=SCEA+TROIS&password=MON_MDP"
```

#### Critère de validation
✅ Recherche SIRET retourne des résultats  
✅ Mauvais mot de passe → 401  
✅ Gestion propre des erreurs API

---

## 🎨 ÉTAPE 3 : Frontend HTML (fichier unique)

**Objectif** : Construire l'interface complète dans `index.html` avec HTML/CSS/JS vanilla.

### 3.A — Structure HTML de base

#### Tâches
- [ ] **3.1** Créer `index.html` avec structure de base
- [ ] **3.2** Intégrer les polices Google Fonts (DM Sans, Syne, DM Mono)
- [ ] **3.3** Intégrer pdf.js depuis cdnjs.cloudflare.com
- [ ] **3.4** Créer la structure layout : écran login + layout 2 colonnes (sidebar + main)

#### Critère de validation
✅ Page HTML valide qui charge dans le navigateur  
✅ Polices chargées correctement  
✅ pdf.js disponible

---

### 3.B — Écran de login

#### Tâches
- [ ] **3.5** Créer le formulaire de login (champ mot de passe + bouton)
- [ ] **3.6** Implémenter la validation côté client (stockage en `sessionStorage`)
- [ ] **3.7** Afficher message d'erreur si mauvais mot de passe
- [ ] **3.8** Masquer le login et afficher l'app après connexion réussie

#### Critère de validation
✅ Mauvais mot de passe bloqué  
✅ Bon mot de passe donne accès  
✅ Session expire à la fermeture de l'onglet

---

### 3.C — Sidebar (références et import)

#### Tâches
- [ ] **3.9** Créer le champ de recherche SIRET avec liste déroulante de résultats
- [ ] **3.10** Connecter la recherche à `/api/search`
- [ ] **3.11** Implémenter le remplissage automatique des champs (nom, SIRET, adresse)
- [ ] **3.12** Créer les champs de référence (date devis, nb LED, type local)
- [ ] **3.13** Créer les 4 zones d'import PDF (Audit, Synthèse, Dossier CEE, Fiche technique)
- [ ] **3.14** Implémenter le clic ET le glisser-déposer pour chaque zone
- [ ] **3.15** Afficher le nom du fichier + changement visuel après import
- [ ] **3.16** Marquer Audit et Synthèse comme "Requis"

#### Critère de validation
✅ Recherche SIRET fonctionne et remplit les champs  
✅ Champs remplis automatiquement sont colorés en vert  
✅ Import PDF fonctionne par clic ET glisser-déposer  
✅ Nom du fichier affiché après chargement

---

### 3.D — Extraction PDF (pdf.js)

#### Tâches
- [ ] **3.17** Implémenter la fonction d'extraction de texte avec pdf.js
- [ ] **3.18** Gérer les erreurs d'extraction (PDF corrompu, trop gros)
- [ ] **3.19** Afficher une barre de progression pendant l'extraction
- [ ] **3.20** Tester avec Audit-exemple.pdf et Synthèse-exemple.pdf

#### Critère de validation
✅ Texte correctement extrait (vérifiable en console)  
✅ Extraction < 5 secondes pour un PDF de 40 pages  
✅ Gestion propre des erreurs

---

### 3.E — Bouton Analyser et appel API

#### Tâches
- [ ] **3.21** Créer le bouton "Analyser" (activé seulement si au moins 1 PDF chargé)
- [ ] **3.22** Implémenter l'appel à `/api/analyze` avec les textes extraits + références
- [ ] **3.23** Construire les messages pour Claude (user content = textes PDFs + références)
- [ ] **3.24** Afficher une barre de progression avec étapes (extraction / analyse)
- [ ] **3.25** Gérer les erreurs (timeout, erreur API, JSON invalide)

#### Critère de validation
✅ Bouton désactivé si aucun PDF  
✅ Appel API réussi avec les bons paramètres  
✅ Barre de progression affichée  
✅ Erreurs affichées clairement

---

### 3.F — Affichage des résultats

#### Tâches
- [ ] **3.26** Créer la bannière page de garde (verte si OK, rouge si KO)
- [ ] **3.27** Créer les compteurs de synthèse (bloquants / majeurs / conformes)
- [ ] **3.28** Créer les onglets de navigation (Tous / Page de garde / Synthèse / Audit / Message)
- [ ] **3.29** Implémenter l'affichage des cartes de vérification (niveau + champ + détail + chips)
- [ ] **3.30** Implémenter le tri par gravité décroissante (bloquant > majeur > conforme > info)
- [ ] **3.31** Créer l'onglet "Message auditeur" avec bouton Copier
- [ ] **3.32** Implémenter la copie dans le presse-papier avec retour visuel

#### Critère de validation
✅ Bannière page de garde affichée correctement  
✅ Compteurs exacts  
✅ Cartes de vérification lisibles avec code couleur correct  
✅ Message auditeur copiable en 1 clic  
✅ Navigation entre onglets fluide

---

### 3.G — Styles CSS

#### Tâches
- [ ] **3.33** Implémenter le layout 2 colonnes (sidebar dark green + main clair)
- [ ] **3.34** Styliser les zones d'import (états vide / survol / chargé)
- [ ] **3.35** Styliser les cartes de vérification (badges + chips)
- [ ] **3.36** Styliser la bannière page de garde (verte/rouge)
- [ ] **3.37** Styliser les onglets et la navigation
- [ ] **3.38** Vérifier la lisibilité et les contrastes (DM Sans / Syne / DM Mono)

#### Critère de validation
✅ Interface sobre et professionnelle  
✅ Code couleur cohérent (rouge/amber/vert/gris)  
✅ Lisibilité optimale pour usage quotidien intensif

---

## ✅ ÉTAPE 4 : Tests finaux

**Objectif** : Valider le fonctionnement end-to-end avant déploiement.

### Tâches
- [ ] **4.1** Tester le login (bon/mauvais mot de passe)
- [ ] **4.2** Tester la recherche SIRET (plusieurs requêtes)
- [ ] **4.3** Tester l'import PDF (clic + glisser-déposer sur les 4 zones)
- [ ] **4.4** Tester l'extraction avec Audit-exemple.pdf et Synthèse-exemple.pdf
- [ ] **4.5** Tester l'analyse complète avec les 2 PDFs d'exemple
- [ ] **4.6** Vérifier l'affichage de tous les niveaux (bloquant / majeur / conforme)
- [ ] **4.7** Vérifier la bannière page de garde (cas OK et KO)
- [ ] **4.8** Vérifier la copie du message auditeur
- [ ] **4.9** Tester sur Chrome, Firefox et Safari
- [ ] **4.10** Vérifier que les mauvais mots de passe API retournent bien 401

### Checklist Definition of Done (du CDC)
- [ ] Login : mauvais mot de passe bloqué (401), bon mot de passe donne accès
- [ ] Recherche SIRET : résultats affichés, clic remplit les champs (colorés en vert)
- [ ] Import PDF : fonctionne par clic ET par glisser-déposer sur les 4 zones
- [ ] Extraction PDF : le texte est correctement extrait (vérifier en console)
- [ ] Analyse : JSON valide retourné, affichage correct pour les 3 niveaux
- [ ] Bannière page de garde : verte si OK, rouge si KO
- [ ] Message auditeur : affiché et copiable en un clic
- [ ] Mauvais mot de passe API : retourne 401 (pas 500)
- [ ] Testé avec Audit-exemple.pdf et Synthèse-exemple.pdf fournis
- [ ] Fonctionne sur Chrome, Firefox, Safari
- [ ] Déployé sur Vercel avec les 2 variables d'environnement configurées
- [ ] URL partageable communiquée à l'équipe

---

## 🚀 ÉTAPE 5 : Déploiement Vercel

**Objectif** : Mettre l'application en production.

### Tâches
- [ ] **5.1** Créer un dépôt GitHub avec le projet
- [ ] **5.2** Connecter le dépôt à Vercel
- [ ] **5.3** Configurer les 2 variables d'environnement dans Vercel Dashboard
- [ ] **5.4** Déclencher le déploiement
- [ ] **5.5** Tester l'URL de production
- [ ] **5.6** Partager l'URL avec l'équipe

### Critère de validation
✅ Application déployée et accessible  
✅ Variables d'environnement configurées  
✅ Tous les tests passent en production

---

## 📝 Notes importantes

### Ordre de validation obligatoire
1. **Valider le plan** avant de commencer quoi que ce soit
2. **Terminer l'étape 1** (structure) avant l'étape 2
3. **Tester chaque route API avec curl** avant de connecter le frontend
4. **Terminer l'étape 3** (frontend) avant l'étape 4
5. **Ne jamais marquer une tâche comme terminée sans l'avoir testée**

### Règles de sécurité (non négociables)
- ❌ Jamais `APP_PASSWORD` ou `ANTHROPIC_API_KEY` dans le code source
- ✅ Vérification du mot de passe EN PREMIER dans chaque route API
- ✅ PDFs jamais écrits sur disque côté serveur
- ✅ Headers CORS restreints au domaine Vercel en production

### Règles métier critiques
- 🔴 **BLOQUANT** : mentions "agri/agricole/agriculteur" interdites
- 🔴 **BLOQUANT** : profil d'utilisation = "entrepôt" ou "logistique" uniquement
- 🔴 **BLOQUANT** : page de garde (nom, adresse, date) = correspondance exacte
- 🟡 **MAJEUR** : THD = exactement 3,7%
- 🟡 **MAJEUR** : SIRET = 14 chiffres, cohérent partout

---

**Prochaine étape** : Valider ce plan avec l'utilisateur avant de commencer l'implémentation.
