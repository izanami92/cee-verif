# CHECKLIST EXHAUSTIVE - VÉRIFICATION CEE LED

**IMPORTANT** : TOUS ces points doivent être vérifiés à CHAQUE analyse, sans exception.

---

## 🔴 BLOQUANTS - AUDIT Page de garde (erreur = rejet immédiat)

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 1 | Nom entreprise | Audit page 1 | En-tête | = Nom entreprise CEE = Nom entreprise officiel gouv |
| 2 | Adresse chantier | Audit page 1 | En-tête | = Adresse chantier CEE (numéro + rue + CP + ville) EXACTEMENT |
| 3 | Date audit | Audit page 1 | En-tête | = Date proposition = Date prévisite CEE |

---

## 🟡 SYNTHÈSE - Page de garde

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 4 | Nom entreprise | Synthèse page 1 | En-tête | = Nom entreprise CEE = Nom entreprise officiel gouv |
| 5 | Date | Synthèse page 1 | En-tête | = Date proposition = Date prévisite CEE |
| 6 | Adresse mail | Synthèse page 1 | Contact client | = Adresse mail du CEE |
| 7 | Téléphone | Synthèse page 1 | Contact client | = Téléphone du dossier CEE |
| 8 | Contact (nom/prénom) | Synthèse page 1 | Contact client | = Représenté par sur le CEE |

---

## 🟡 SYNTHÈSE - Page inventaire du projet

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 9 | TOTAL luminaires | Synthèse | Inventaire projet | = Nombre LED chantier sur dossier CEE |

---

## 🟡 SYNTHÈSE - Page fiche identité du site

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 10 | Client | Synthèse | Fiche identité site | = Nom entreprise CEE = Nom entreprise officiel gouv |
| 11 | SIRET | Synthèse | Fiche identité site | = SIRET CEE = SIRET officiel gouv (14 chiffres) |
| 12 | Adresse chantier | Synthèse | Fiche identité site | = Adresse chantier dossier CEE |
| 13 | Surface éclairée | Synthèse | Fiche identité site | = Total surfaces bâtiments (si code NAF 01.xx ou 02.xx) OU check manuel |
| 14 | Secteur d'activité | Synthèse | Fiche identité site | = Bâtiment tertiaire / Secteur d'activité sur CEE |
| 15 | Numéro de parcelle | Synthèse | Fiche identité site | = Parcelles sur le CEE (format 000/0B/XXXX) |

---

## 🟡 SYNTHÈSE - Page périmètre de l'étude

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 16 | Nom du site | Synthèse | Périmètre étude | = Nom entreprise CEE = Nom entreprise officiel gouv |
| 17 | Nombre de bâtiments | Synthèse | Périmètre étude | Check manuel requis |

---

## 🟡 SYNTHÈSE - Page inventaire - état initial

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 18 | Répartition LED | Synthèse | Inventaire état initial | Vérification manuelle requise |
| 19 | TOTAL LED état initial | Synthèse | Inventaire état initial | = Nombre LED chantier sur dossier CEE |

---

## 🟡 SYNTHÈSE - INDICATEURS ECLAIRAGE INTERIEUR - ETAT INITIAL

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 20 | Secteur étude | Synthèse | Indicateurs éclairage initial | = Bâtiment tertiaire / Secteur d'activité sur CEE |

---

## 🟡 SYNTHÈSE - INVENTAIRE - ETAT PROJETE

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 21 | TOTAL LED état projeté | Synthèse | Inventaire état projeté | = Nombre LED chantier sur dossier CEE |
| 22 | Répartition LED projeté | Synthèse | Inventaire état projeté | Check manuel requis |
| 23 | Activité (2e tableau) | Synthèse | Inventaire état projeté | = Bâtiment tertiaire / Secteur d'activité sur CEE |

---

## 🟡 AUDIT - Page description

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 24 | Site | Audit | Description | = Client = Nom entreprise CEE = Nom entreprise officiel gouv |
| 25 | Adresse | Audit | Description | = Adresse chantier CEE |
| 26 | SIRET | Audit | Description | = SIRET CEE = SIRET officiel gouv |
| 27 | Surface | Audit | Description | = Surface éclairée fiche identité site Synthèse |
| 28 | Etat initial : nombre | Audit | Description | = Nombre LED chantier sur dossier CEE |
| 29 | Etat projeté : nombre | Audit | Description | = Etat initial = Nombre LED chantier sur dossier CEE |

---

## 🟡 AUDIT - Page liste des luminaires

| # | Point | Document | Localisation | Règle |
|---|-------|----------|--------------|-------|
| 30 | Pce (total) | Audit | Liste luminaires | = Nombre LED synthèse = Nombre LED CEE |

---

## 🔴 MENTIONS AGRICOLES (BLOQUANT)

| # | Point | Documents | Localisation | Règle |
|---|-------|-----------|--------------|-------|
| 31 | Secteur d'activité | Synthèse | Toutes pages | ≠ "agricole/agri/agriculture" |
| 32 | Profil d'utilisation | Audit | Toutes pages | ≠ "agricole/agri/agriculture" |
| 33 | Activité bâtiment | Synthèse | État projeté | ≠ "agricole/agri/agriculture" |

**Note** : Le NOM de société peut contenir "agricole" (c'est le vrai nom du client) - NE PAS signaler d'erreur.

---

## 🟡 AUTRES VÉRIFICATIONS MAJEURES

| # | Point | Documents | Localisation | Règle |
|---|-------|-----------|--------------|-------|
| 34 | THD | CEE + Synthèse | Caractéristiques luminaires | = 3,7% (PAS dans Audit) |
| 35 | Fiche technique LED | Synthèse | Page ~14 | Présente + THD 3,7% |
| 36 | Référence produit | Audit + Synthèse | Luminaires | = DAEWOO NES-HBL 250W (ou selon dossier) |

---

**TOTAL : 36 points de contrôle obligatoires**

Chaque analyse doit retourner **36 checks minimum** (un par point ci-dessus).
