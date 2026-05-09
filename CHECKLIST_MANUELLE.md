# Checklist de vérification manuelle

Cette checklist complète les vérifications automatiques de l'outil. Certains éléments ne peuvent pas être vérifiés automatiquement et nécessitent une inspection visuelle des documents.

## Points de vérification manuelle

### 1. Fiche technique LED (image non-extractible)

**Pourquoi :** Si la fiche technique est insérée comme une image PNG/JPG dans le PDF Synthèse, l'outil ne peut pas extraire le texte. L'OCR automatique n'est pas encore implémenté.

**Comment vérifier :**
- Ouvrir la Synthèse page ~14 (ou dernière page)
- Vérifier visuellement la présence de la fiche technique du fabricant
- Vérifier que les caractéristiques correspondent à la référence choisie :
  - **DAEWOO NES-HBL250W** : THD 3,7%, durée de vie 54000h, efficacité 185 lm/W
  - **TECH HIGH BAY TECH-03 250W** : durée de vie 50000h, efficacité 185 lm/W

**Niveau :** MAJEUR si la fiche est absente ou ne correspond pas

---

## Notes techniques

### Amélioration future : OCR automatique

**Fonctionnalité planifiée** : Extraction d'images depuis PDF + lecture OCR via Claude Vision API

**Avantages :**
- Lecture automatique des fiches techniques en image
- Vérification complète sans intervention manuelle
- Applicable à d'autres documents scannés

**Coût :** Tokens vision API + complexité code supplémentaire

**Statut :** Non prioritaire pour l'instant, mais utile pour l'évolution du projet
