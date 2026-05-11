# ADR 001 : Architecture mono-fichier HTML + Vercel Serverless

**Date** : 5 mai 2026
**Statut** : ✅ Accepté
**Décideurs** : Utilisateur + Claude

---

## Contexte

Besoin d'une application web interne pour vérifier les dossiers CEE LED. Contraintes :
- Utilisateur non-technique (doit pouvoir déployer facilement)
- Pas d'équipe de développement (maintenance minimale)
- Déploiement rapide (quelques jours pour Phase 1)
- Pas de backend complexe nécessaire initialement

## Décision

Architecture choisie :
- **Frontend** : Mono-fichier HTML/CSS/JS vanilla (~6000 lignes dans index.html)
- **Backend** : Vercel Serverless Functions (Node.js)
- **Déploiement** : Vercel (auto-deploy sur git push)
- **Aucune dépendance npm côté client**

## Alternatives envisagées

### Alternative 1 : Framework React + Node.js Express
**Avantages** :
- Code mieux structuré (composants)
- Écosystème riche
- Plus facile à faire évoluer (en théorie)

**Inconvénients** :
- Setup complexe (webpack, babel, etc.)
- `node_modules` lourds
- Build step nécessaire
- Courbe d'apprentissage pour utilisateur non-tech

### Alternative 2 : No-code (Bubble, Webflow, etc.)
**Avantages** :
- Pas de code du tout
- Interface visuelle

**Inconvénients** :
- Pas de contrôle total sur la logique
- Coût mensuel
- Dépendance à une plateforme externe
- Limitations pour appels API complexes (Claude)

### Alternative 3 : Backend Python Flask/Django
**Avantages** :
- Python connu par beaucoup de data scientists
- Bon pour ML futur

**Inconvénients** :
- Hébergement plus complexe que Vercel
- Setup serveur nécessaire
- Pas de serverless natif

## Conséquences

### Positives ✅
- Déploiement ultra-rapide (git push = déploiement auto)
- Aucune dépendance npm côté client (pas de `npm install` pour développer)
- Tout le code visible dans un seul fichier (débogage facile)
- Coût quasi-nul (Vercel gratuit pour usage interne)
- Maintenance minimale

### Négatives ❌
- Fichier index.html devient volumineux (~6000 lignes actuellement)
- Pas de hot-reload natif (F5 manuel)
- Pas de TypeScript (risque d'erreurs runtime)
- Difficile de réutiliser des composants

### Neutres ⚠️
- Vanilla JS = pas de magie, tout est explicite
- Modularisation future possible si nécessaire (passage à modules ES6)

## Retour d'expérience (11 mai 2026)

Après 6 jours de développement intensif :
- ✅ Architecture tient très bien pour Phase 1
- ✅ Déploiement Vercel impeccable (auto-deploy en <2min)
- ⚠️ index.html atteint 6000 lignes (commence à être difficile à naviguer)
- ⚠️ Envisager modularisation future (modules ES6) si Phase 2-3-4

**Recommandation** : Garder cette architecture pour Phase 1, réévaluer pour Phase 2+

## Sources

- [Transcript 59038263, 5 mai 2026 19:23] - Discussion initiale architecture
- [Commit 70f0a25] - Premier commit avec cette architecture
- [CLAUDE.md original] - Documentation de l'architecture choisie
