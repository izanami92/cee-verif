# CLAUDE.md — CEE Vérif · Phase 1

## Contexte du projet

Application web interne de vérification des dossiers CEE LED (opération BAT-EQ-127).
Délégataire : Total Energies. Bureau d'études : Prime Evolution (OPQIBI).
Stack : HTML/CSS/JS vanilla + Vercel Serverless Functions (Node.js).
Objectif Phase 1 : permettre à un collaborateur d'importer des PDFs et d'obtenir un rapport d'incohérences via Claude.

## Domaine métier — règles à ne jamais oublier

### Règles BLOQUANTES (empêchent tout envoi client)
- La mention "agri", "agricole", "agriculteur" ne doit JAMAIS apparaître dans un document CEE LED
- Le profil d'utilisation dans l'audit doit être "entrepôt" ou "logistique" — jamais agricole
- La page de garde de l'Audit (nom, adresse, date) doit correspondre exactement aux références
- Le secteur d'activité dans la Synthèse doit être "Entrepôts" — jamais agricole
- L'activité par bâtiment dans l'état projeté doit être "Entrepôt" — jamais agricole

### Règles MAJEURES (à corriger, non bloquantes pour la page de garde)
- Taux de distorsion harmonique (THD) : exactement 3,7% dans les caractéristiques luminaires
- SIRET : 14 chiffres, cohérent entre tous les documents
- Parcelles cadastrales : format 000/0B/XXXX, doivent être présentes
- Répartition LED par bâtiment/cellule : cohérente avec le total de référence
- Référence produit : DAEWOO NES-HBL 250W (ou selon le dossier)
- Date d'audit = date d'envoi du devis

### Logique d'envoi
- Page de garde OK → envoi immédiat en signature client possible
- CEE complet → tous les bloquants et majeurs doivent être résolus

## Architecture du projet

```
cee-verif/
├── index.html          ← interface complète (HTML/CSS/JS en un seul fichier)
├── api/
│   ├── analyze.js      ← POST — vérifie mot de passe, appelle Anthropic, retourne JSON
│   └── search.js       ← GET  — vérifie mot de passe, relaie vers API gouvernementale SIRET
├── vercel.json         ← config Vercel
├── .env.example        ← modèle des variables d'environnement
├── CLAUDE.md           ← ce fichier
└── README.md           ← guide installation/déploiement
```

## Variables d'environnement (jamais dans le code)

```
ANTHROPIC_API_KEY=sk-ant-...
APP_PASSWORD=...
```

Définies dans Vercel Dashboard → Project → Settings → Environment Variables.

## Format de réponse attendu de Claude (API analyze)

```json
{
  "checks": [
    {
      "id": "string_unique",
      "categorie": "garde | synthese | audit",
      "niveau": "bloquant | majeur | ok | info",
      "champ": "Nom du champ vérifié",
      "detail": "Explication précise de l'écart ou de la conformité",
      "valeur_attendue": "Valeur de référence ou règle",
      "valeur_trouvee": "Valeur constatée dans le document"
    }
  ],
  "page_garde_ok": true,
  "message_auditeur": "Message complet et professionnel en français listant toutes les corrections nécessaires"
}
```

## Workflow de développement obligatoire

### Avant chaque tâche non triviale
1. Écrire un plan dans `taches/a-faire.md` avec des étapes vérifiables
2. Valider le plan avant de commencer l'implémentation
3. Ne jamais commencer à coder sans avoir réfléchi à l'approche complète

### Pendant le développement
- Tester chaque route API avec curl avant de connecter le frontend
- Vérifier dans le navigateur après chaque changement majeur
- Un ingénieur senior validerait-il ce code ? Sinon, refaire.
- Ne jamais marquer une tâche comme terminée sans avoir prouvé qu'elle fonctionne

### Après chaque correction signalée
- Mettre à jour `taches/lecons.md` avec la leçon apprise
- Écrire une règle pour éviter de refaire la même erreur
- Relire les leçons au début de chaque session

### Correction autonome des bugs
- Lorsqu'un bug est signalé : le corriger directement
- Pointer vers les logs, erreurs, et les résoudre
- Ne pas demander à l'utilisateur de changer de contexte

## Standards de code

### Sécurité (non négociable)
- `APP_PASSWORD` et `ANTHROPIC_API_KEY` : jamais dans index.html, jamais dans le code source
- Chaque route API vérifie le mot de passe en PREMIER, avant tout traitement
- Les PDFs ne sont jamais écrits sur disque côté serveur
- Headers CORS : restreints au domaine Vercel du projet en production

### Robustesse
- Si un PDF échoue à l'extraction : erreur claire, continuer avec les autres
- Si l'API retourne une erreur : afficher le message exact (aide au debug)
- Si le JSON Claude ne parse pas : afficher le texte brut plutôt que planter
- Timeout Vercel : 60 secondes (`export const config = { maxDuration: 60 }`)

### Frontend
- Pas de framework JS — vanilla uniquement
- pdf.js depuis cdnjs.cloudflare.com
- Polices Google Fonts : DM Sans + Syne + DM Mono
- Aucune dépendance npm côté client

### Nommage et structure
- Réponses en français dans l'UI
- Variables et fonctions en anglais camelCase dans le code
- Commentaires en français pour la logique métier

## Tests obligatoires avant de valider

```bash
# Tester la route analyze (avec un vrai mot de passe)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"MON_MDP","messages":[{"role":"user","content":"test"}],"system":"Réponds OK"}'

# Tester la route search
curl "http://localhost:3000/api/search?q=SCEA+TROIS&password=MON_MDP"

# Tester le rejet de mauvais mot de passe (doit retourner 401)
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"password":"mauvais","messages":[],"system":""}'
```

## Checklist Definition of Done — Phase 1

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

## Documents de référence disponibles

Les fichiers suivants sont dans le dossier `docs/` du projet :
- `Audit-exemple.pdf` — exemple d'audit Dialux pour tester
- `Synthèse-exemple.pdf` — exemple de synthèse pour tester
- `CDC_Automatisation_CEE_LED.docx` — cahier des charges général (4 phases)
- `CDC_Phase1_Interface_CEE.docx` — ce CDC de Phase 1

## Contexte utilisateur

L'utilisateur est non-technique. Chaque explication doit être en français simple.
Il travaille sur macOS avec Safari et Chrome.
Il a un compte GitHub et un compte Vercel.
Priorité absolue : que l'outil soit fonctionnel et fiable avant d'être beau.
