⚠️ OBSOLÈTE — règles dépassées. Voir docs/SOURCE_DE_VERITE_CHECKS.md qui fait foi.

# Points de contrôle — CEE Vérif

**Dernière mise à jour** : 06/05/2026

---

## ✅ POINTS DE CONTRÔLE ACTUELLEMENT IMPLÉMENTÉS

### 🔴 BLOQUANTS (Page de garde)

| # | Champ | Document | Règle | Statut |
|---|-------|----------|-------|--------|
| 1 | Nom société | Audit page 1 + CEE + Registres officiels | Identique partout (tolérance casse) — vérifier aussi sur Infogreffe | ✅ Implémenté |
| 2 | Adresse chantier | Audit page 1 | Identique à la référence | ✅ Implémenté |
| 3 | Date | Audit page 1 | Égale à la date d'envoi du devis | ✅ Implémenté |

### 🔴 BLOQUANTS (Contenu)

| # | Champ | Document | Règle | Statut |
|---|-------|----------|-------|--------|
| 4 | Mentions agricoles | Tous | JAMAIS de "agri/agricole/agriculteur" | ✅ Implémenté |
| 5 | Profil d'utilisation | Audit (chaque cellule) | "entrepôt", "logistique", "commerce" ou "locaux de vente" — jamais agricole | ✅ Implémenté |
| 6 | Secteur d'activité | Synthèse + CEE | "Entrepôts", "Commerce", "Locaux de vente" ou "AUTRES" — jamais agricole. Si CEE = "AUTRES", vérifier cohérence avec Synthèse | ✅ Implémenté |
| 7 | Activité par bâtiment | Synthèse (état projeté) | "Entrepôt", "Commerce" ou "Locaux de vente" pour chaque bâtiment | ✅ Implémenté |

### 🟡 MAJEURS

| # | Champ | Document | Règle | Statut |
|---|-------|----------|-------|--------|
| 8 | SIRET | Synthèse + CEE | 14 chiffres, cohérent partout | ✅ Implémenté |
| 9 | Adresse | Synthèse | Identique à la référence | ✅ Implémenté |
| 10 | Date | Synthèse | Égale à la date d'envoi du devis | ✅ Implémenté |
| 11 | THD | CEE + Synthèse (caractéristiques luminaires) | Exactement 3,7% — PAS dans l'Audit | ✅ Implémenté |
| 12 | Parcelles cadastrales | Synthèse + CEE | Présentes, format 000/0B/XXXX, cohérentes partout | ✅ Implémenté |
| 12b | **Cohérence secteur CEE → Synthèse** | CEE + Synthèse | Si CEE = "AUTRES", doit se retranscrire dans le secteur d'activité de la Synthèse | 🔴 À ajouter |
| 13 | Répartition LED par bâtiment | Audit + Synthèse + Betool | Cohérente partout (total et par bâtiment) | ✅ Implémenté |
| 14 | Référence produit | Audit + Synthèse | DAEWOO NES-HBL 250W (ou selon dossier) | ✅ Implémenté |
| 15 | Nombre de LED par cellule | Audit | Cohérent avec répartition du dossier CEE | ✅ Implémenté |
| 16 | Fiche technique | Synthèse (généralement page 14) | TOUJOURS présente, données doivent correspondre au THD 3,7% | ✅ Implémenté |
| 17 | **Superficie par bâtiment** | Audit + Synthèse + Betool | DOIT correspondre exactement entre les 3 documents | 🔴 À ajouter |
| 18 | **Superficie totale chantier** | Synthèse | Si mentionnée, doit correspondre à la somme des superficies par bâtiment | 🔴 À ajouter |

### 🟢 MINEURS / INFO

| # | Champ | Document | Règle | Statut |
|---|-------|----------|-------|--------|
| 19 | **Contact client complet** | CEE + Synthèse + Betool | Nom, Prénom, Poste, Téléphone, Email cohérents entre tous les documents | 🔴 À ajouter |
| 20 | Contacts secondaires | Synthèse | Si présents, format valide | ✅ Implémenté |

---

## ⚠️ POINTS À AJOUTER / AMÉLIORER

### 🔴 BLOQUANTS À AJOUTER

| # | Champ | Document | Règle | Priorité |
|---|-------|----------|-------|----------|
| A1 | Adresses multiples | Audit + Synthèse | Toutes les adresses du dossier CEE doivent apparaître | 🔥 Haute |
| A2 | Logo/En-tête | Audit page 1 | Pas de logo agricole ou mention non conforme | Moyenne |

### 🟡 MAJEURS À AJOUTER

| # | Champ | Document | Règle | Priorité |
|---|-------|----------|-------|----------|
| B1 | Puissance unitaire | Audit + Synthèse | 250W cohérent partout | Haute |
| B2 | Température de couleur | Fiche technique | 4000K ou selon spécifications | Moyenne |
| B3 | Facteur de puissance | Fiche technique | > 0,9 | Moyenne |
| B4 | Durée de vie | Fiche technique | ≥ 50 000h | Basse |
| B5 | Indice de protection | Fiche technique | IP65 minimum (entrepôt) | Moyenne |
| B6 | Nom bâtiment/cellule | Audit | Cohérent avec Synthèse et Dossier CEE | Haute |
| B7 | Surface par cellule | Audit | Cohérente avec Synthèse | Moyenne |
| B8 | Hauteur sous plafond | Audit | Présente et cohérente | Basse |

### 🟢 MINEURS À AJOUTER

| # | Champ | Document | Règle | Priorité |
|---|-------|----------|-------|----------|
| C1 | Nom auditeur | Audit page 1 | Présent et professionnel | Basse |
| C2 | Certification auditeur | Audit | OPQIBI ou équivalent mentionné | Moyenne |
| C3 | Version logiciel Dialux | Audit | Version récente | Basse |
| C4 | Cohérence des dates | Tous | Dates logiques (pas de document antérieur au devis) | Moyenne |

### 🎨 AMÉLIORATIONS DE CONTRÔLE

| # | Amélioration | Description | Priorité |
|---|--------------|-------------|----------|
| D1 | Vérification croisée LED | Comparer TOTAL des cellules dans Audit = Total Synthèse = Total Dossier CEE | 🔥 Haute |
| D2 | Détection doublons | Détecter si plusieurs cellules ont exactement les mêmes caractéristiques (copier-coller) | Moyenne |
| D3 | Cohérence unités | Vérifier m², W, lux dans les bonnes unités | Moyenne |
| D4 | Format dates | Toutes les dates au même format (DD/MM/YYYY) | Basse |

---

## 📋 POINTS SPÉCIFIQUES MÉTIER À CLARIFIER

Ces points nécessitent ta validation :

1. **Tolérance sur le THD** : Exactement 3,7% ou une plage acceptable (ex: 3,5%-3,9%) ?
2. **Référence produit variable** : Toujours DAEWOO NES-HBL 250W ou peut varier selon le projet ?
3. **Parcelles cadastrales** : Toutes doivent être présentes ou seulement celles du chantier principal ?
4. **Adresses multiples** : Format attendu dans les documents ? Séparées comment ?
5. ~~**Fiche technique** : Toujours page 14 de l'Audit ou peut varier ?~~ ✅ **CLARIFIÉ** : Toujours dans la Synthèse (généralement page 14)
6. **LED par cellule** : Tolérance acceptable ou doit être exacte à l'unité près ?

---

## 🎯 RECOMMANDATIONS DE PRIORISATION

### Phase 1 - Urgent (à implémenter maintenant)
1. ✅ **Adresses multiples** - Tu l'as demandé, c'est critique
2. ⭐ **Vérification croisée LED** (D1) - Souvent source d'erreur
3. ⭐ **Nom bâtiment/cellule** (B6) - Cohérence documentaire importante

### Phase 2 - Important (dans 1-2 semaines)
4. **Puissance unitaire** (B1) - Détecte les erreurs de saisie
5. **Indice de protection** (B5) - Norme obligatoire
6. **Cohérence des dates** (C4) - Détecte les documents recyclés

### Phase 3 - Nice to have (plus tard)
7. Logo/En-tête (A2)
8. Caractéristiques techniques détaillées (B2, B3, B4)
9. Informations auditeur (C1, C2, C3)

---

## ❓ QUESTIONS POUR TOI

1. **Adresses multiples** : Comment sont-elles présentées dans le Dossier CEE ? (une par ligne, séparées par virgule, etc.)
2. Quels sont les **3 points de contrôle** qui te font le plus perdre du temps actuellement ?
3. Y a-t-il des **erreurs fréquentes** des auditeurs que tu aimerais détecter automatiquement ?
4. Des **champs spécifiques** que j'ai oubliés ?

---

## ✅ CHECKLIST MANUELLE (Vérifications humaines obligatoires)

Ces vérifications ne peuvent PAS être faites par l'IA et nécessitent une validation manuelle de l'utilisateur :

### 🔴 Vérifications cadastrales et géographiques

| # | Vérification | Outil / Source | Comment vérifier |
|---|--------------|----------------|------------------|
| M1 | **Parcelles cadastrales** | Géoportail / Cadastre.gouv.fr | Vérifier que les parcelles mentionnées correspondent bien au terrain du client |
| M2 | **Adresses de chantier** | Géoportail / Google Maps | Vérifier que les adresses existent et correspondent à des bâtiments réels |
| M3 | **Localisation GPS** | Géoportail | Si coordonnées GPS dans les documents, vérifier la cohérence |

### 🟡 Vérifications administratives

| # | Vérification | Outil / Source | Comment vérifier |
|---|--------------|----------------|------------------|
| M4 | **Siège social** | Infogreffe / Societe.com | Vérifier que l'adresse du siège social est bien celle déclarée officiellement |
| M5 | **SIRET actif** | INSEE / Infogreffe | Vérifier que le SIRET est actif et non radié |
| M6 | **Raison sociale exacte** | Kbis / Infogreffe | Vérifier l'orthographe exacte de la raison sociale |

### 🟢 Vérifications de cohérence métier

| # | Vérification | Outil / Source | Comment vérifier |
|---|--------------|----------------|------------------|
| M7 | **Prime CEE éligible** | Betool / Calcul interne | Vérifier que le montant de la prime CEE est cohérent avec le nombre de LED |
| M8 | **Répartition LED vs liste** | Betool + Documents | Vérifier que la répartition LED par bâtiment correspond à ce qui a été saisi dans Betool |
| M9 | **Superficies vs Betool** | Betool + Audit/Synthèse | Vérifier que les superficies par bâtiment correspondent à Betool |
| M10 | **Contact client joignable** | Téléphone / Email | Si possible, valider que les coordonnées du contact sont correctes |

### 📋 Format de la checklist dans l'interface

```
☐ Parcelles cadastrales vérifiées sur Géoportail
☐ Adresses de chantier validées (existence réelle)
☐ Siège social vérifié sur Infogreffe
☐ SIRET actif (non radié)
☐ Prime CEE cohérente avec le nombre de LED
☐ Répartition LED conforme à Betool
☐ Superficies par bâtiment conformes à Betool
☐ Coordonnées contact client validées
```

---

**Prochaine étape** : Implémenter cette checklist manuelle dans l'interface + les nouveaux points de contrôle automatiques !
