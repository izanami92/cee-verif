// regroupement.js — Module 2 de la modularisation (ADR-016, phase B, TODO #3).
// « Regroupement » : 5 fonctions du passage attestations/cellules → chantiers (regroupement par
// adresse normalisée + reconstruction ledTotal 4b, normalisation multi-chantiers, matching
// audits/synthèses par INDEX — ADR-011, accès premier document), extraites BYTE-IDENTIQUES
// de index.html — aucune logique modifiée (preuve : banc d'identité au commit).
// Dépend AU CALL-TIME du module 1 (utils-comparaison.js, chargé avant) : sommerCellulesParAdresse,
// normaliserAdresseSansBatiment, extraireNombreBatiments.
// Script CLASSIQUE (non-module) : les déclarations `function` top-level restent des globales window.
// Interdits (ADR-016 §3) : aucune instruction exécutée au chargement, aucun accès
// state/elements/DOM, aucun appel réseau, aucun id de check.
// (Indentation d'origine du <script> d'index.html conservée — exigence byte-identique.)

    // Regrouper les attestations CEE qui ont la même adresse normalisée (= même chantier, plusieurs bâtiments)
    // 4b : si des cellules couvrent un groupe (même clé normalisée), son ledTotal chantier
    // est reconstruit = Σ ledCellule (substitution) ; sinon ledTotal brut inchangé.
    function regrouperAttestationsParAdresse(attestations, cellules = []) {
      if (!attestations || !Array.isArray(attestations)) return [];

      const sommesCellules = sommerCellulesParAdresse(cellules);
      const groupes = {};

      attestations.forEach((attestation, index) => {
        const adresseNormalisee = normaliserAdresseSansBatiment(attestation.adresse || '');

        if (!groupes[adresseNormalisee]) {
          groupes[adresseNormalisee] = {
            adresseOriginale: attestation.adresse, // Garder la première adresse comme référence
            adresseNormalisee: adresseNormalisee,
            attestations: [],
            ledTotal: 0,
            surfaces: [],
            parcelles: [],
            secteurs: [],
            nbBatiments: 0
          };
        }

        const groupe = groupes[adresseNormalisee];
        const nbBatiments = extraireNombreBatiments(attestation.adresse || '');

        groupe.attestations.push(attestation);
        groupe.ledTotal += parseInt(attestation.ledTotal || 0, 10);
        groupe.nbBatiments += nbBatiments;

        // Ajouter les surfaces (peut être un tableau ou une string)
        if (Array.isArray(attestation.surfaces)) {
          groupe.surfaces = groupe.surfaces.concat(attestation.surfaces);
        } else if (attestation.surfaces) {
          groupe.surfaces.push(attestation.surfaces);
        }

        // Ajouter les parcelles (concaténer avec tiret)
        if (attestation.parcelles) {
          groupe.parcelles.push(attestation.parcelles);
        }

        // Ajouter le secteur d'activité
        if (attestation.secteurActivite) {
          groupe.secteurs.push(attestation.secteurActivite);
        }
      });

      // Convertir l'objet groupes en tableau et finaliser les données
      return Object.values(groupes).map(groupe => {
        // Concaténer les parcelles avec un tiret
        const parcellesConcatenees = groupe.parcelles
          .filter(p => p)
          .join(' - ')
          .trim();

        // Vérifier si tous les secteurs sont identiques
        const secteursUniques = [...new Set(groupe.secteurs.filter(s => s))];
        const secteurUnique = secteursUniques.length === 1 ? secteursUniques[0] : null;
        const secteurConflict = secteursUniques.length > 1;

        // 4b : substitution hybride — si des cellules couvrent ce groupe (clé commune),
        // ledTotal = Σ ledCellule (NOMBRE) ; sinon ledTotal brut inchangé (NOMBRE).
        const ledTotalCellules = sommesCellules.get(groupe.adresseNormalisee);
        const ledTotalFinal = ledTotalCellules !== undefined ? ledTotalCellules : groupe.ledTotal;

        return {
          adresse: groupe.adresseOriginale,
          adresseNormalisee: groupe.adresseNormalisee,
          ledTotal: ledTotalFinal,
          surfaces: groupe.surfaces,
          parcelles: parcellesConcatenees,
          secteurActivite: secteurUnique || secteursUniques.join(' / '), // Si conflit, montrer tous
          secteurConflict: secteurConflict, // Flag pour détecter les conflits
          nbBatiments: groupe.nbBatiments,
          nbAttestations: groupe.attestations.length
        };
      });
    }

    // ========== FONCTIONS HELPER MULTI-CHANTIERS ==========

    // Normaliser extracted pour toujours retourner des tableaux (rétrocompatibilité)
    function normalizeExtracted(extracted) {
      const normalized = { ...extracted };

      // Audits : toujours un tableau
      if (!Array.isArray(normalized.audits)) {
        if (normalized.audit) {
          // Ancien format (objet) → convertir en tableau
          normalized.audits = [normalized.audit];
        } else {
          normalized.audits = [];
        }
      }

      // Synthèses : toujours un tableau
      if (!Array.isArray(normalized.syntheses)) {
        if (normalized.synthese) {
          // Ancien format (objet) → convertir en tableau
          normalized.syntheses = [normalized.synthese];
        } else {
          normalized.syntheses = [];
        }
      }

      // CEE : rétrocompatibilité ancien format
      if (normalized.cee) {
        // Adresses chantiers : ancien format (string) → nouveau format (array)
        if (!Array.isArray(normalized.cee.adressesChantiers)) {
          if (normalized.cee.adresseChantier) {
            // Ancien format : une seule adresse (string)
            normalized.cee.adressesChantiers = [normalized.cee.adresseChantier];
          } else {
            normalized.cee.adressesChantiers = [];
          }
        }

        // Attestations : ancien format (surfacesBatiments) → nouveau format (attestations avec adresses)
        if (!Array.isArray(normalized.cee.attestations)) {
          if (normalized.cee.surfacesBatiments && Array.isArray(normalized.cee.surfacesBatiments)) {
            // Ancien format : juste les surfaces, sans adresse
            // Utiliser la première adresse de chantier comme fallback
            const adresseFallback = normalized.cee.adressesChantiers?.[0] || '';
            normalized.cee.attestations = [{
              adresse: adresseFallback,
              surfaces: normalized.cee.surfacesBatiments
            }];
          } else if (normalized.cee.attestationHonneurPresente === true) {
            // Ancien format avec attestationHonneurPresente mais sans surfaces
            normalized.cee.attestations = [];
          } else {
            normalized.cee.attestations = [];
          }
        }
      }

      return normalized;
    }

    // Matcher audits et synthèses par adresse (même adresse = même chantier)
    function matchChantiers(audits, syntheses) {
      const chantiers = [];
      const maxLength = Math.max(audits.length, syntheses.length);

      // NOUVEAU : Matcher par INDEX au lieu de par adresse
      // Raison : Les fichiers sont importés dans l'ordre (Audit 1 = Synthèse 1, Audit 2 = Synthèse 2)
      // Matcher par adresse est fragile car sensible aux fautes de frappe dans les PDFs
      for (let i = 0; i < maxLength; i++) {
        const audit = audits[i] || null;
        const synthese = syntheses[i] || null;

        // Déterminer l'adresse du chantier (préférer audit, sinon synthèse)
        const adresse = audit?.adresse || synthese?.adresse || '';

        chantiers.push({
          index: i + 1,
          audit,
          synthese,
          adresse
        });
      }

      return chantiers;
    }

    // Helpers pour compatibilité : accès au premier document (pour checks non-multi-chantiers)
    function getFirstAudit(norm) {
      return norm.audits[0] || {};
    }

    function getFirstSynthese(norm) {
      return norm.syntheses[0] || {};
    }
