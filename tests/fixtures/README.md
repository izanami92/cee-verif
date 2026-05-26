# Fixtures PDF pour tests e2e

Ce dossier contient les PDFs nécessaires pour exécuter les tests end-to-end.

## PDFs requis

### ✅ Cas nominal (dossier complet et valide)

- `audit-exemple.pdf` — Audit énergétique complet
- `synthese-exemple.pdf` — Synthèse de l'opération
- `cee-exemple.pdf` — Attestation(s) sur l'honneur complète(s)
- `fiche-led-exemple.pdf` — Fiche technique du luminaire LED

### 🏗️ Cas multi-chantiers (plusieurs attestations)

- `audit-multi-chantiers.pdf` — Audit avec plusieurs bâtiments/adresses
- `synthese-multi-chantiers.pdf` — Synthèse avec plusieurs chantiers
- `cee-multi-chantiers.pdf` — Plusieurs attestations sur l'honneur
- `fiche-led-exemple.pdf` — (même que cas nominal)

### ⚠️ Cas attestation(s) manquante(s)

- `audit-exemple.pdf` — (même que cas nominal)
- `synthese-exemple.pdf` — (même que cas nominal)
- `cee-attestation-manquante.pdf` — CEE avec une ou plusieurs attestations absentes
- `fiche-led-exemple.pdf` — (même que cas nominal)

### ⚠️ Cas secteur NAF "Autres"

- `audit-exemple.pdf` — (même que cas nominal)
- `synthese-exemple.pdf` — (même que cas nominal)
- `cee-naf-autres.pdf` — CEE avec secteur d'activité = "Autres" (nécessite saisie manuelle)
- `fiche-led-exemple.pdf` — (même que cas nominal)

### 🚫 Cas secteur agricole (BLOQUANT)

- `audit-agricole.pdf` — Audit avec profil "agricole" ou mention "agriculteur"
- `synthese-agricole.pdf` — Synthèse avec secteur "Agricole"
- `cee-agricole.pdf` — CEE avec secteur agricole
- `fiche-led-exemple.pdf` — (même que cas nominal)

### 🏗️ Cas multi-chantiers avec attestations manquantes

- `audit-multi-chantiers.pdf` — (même que multi-chantiers)
- `synthese-multi-chantiers.pdf` — (même que multi-chantiers)
- `cee-multi-attestations-manquantes.pdf` — Plusieurs chantiers, certaines attestations manquantes
- `fiche-led-exemple.pdf` — (même que cas nominal)

### 🏗️ Cas mixte (attestations présentes + manquantes)

- `audit-multi-chantiers.pdf` — (même que multi-chantiers)
- `synthese-multi-chantiers.pdf` — (même que multi-chantiers)
- `cee-mixte-attestations.pdf` — Certaines attestations présentes, d'autres manquantes
- `fiche-led-exemple.pdf` — (même que cas nominal)

## Organisation recommandée

Les PDFs peuvent être des copies/variations de vrais dossiers CEE anonymisés ou modifiés pour tester des cas spécifiques.

**Astuce** : Pour créer des variations (attestation manquante, secteur agricole, etc.), vous pouvez :
1. Partir d'un dossier réel
2. Éditer le PDF pour retirer une page (attestation)
3. Ou modifier le texte pour changer le secteur d'activité

## Note sur la confidentialité

⚠️ **Important** : Ces PDFs de test ne doivent PAS contenir de données réelles/sensibles.
- Anonymiser les noms de clients
- Modifier les SIRET/adresses
- Utiliser des données factices si possible

Ces fichiers sont dans `.gitignore` et ne seront **pas** commitgés dans le dépôt Git.
