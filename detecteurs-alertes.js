// detecteurs-alertes.js — Module 3 de la modularisation (ADR-016, phase B, TODO #3).
// « Détecteurs / alertes confirmables » : 9 fonctions PURES de détection métier — mentions
// agricoles (Règle B), étude de dimensionnement (1.5), attestation non agricole (1.3),
// parseDateFr + délais de travaux (1.2), secteurs « Autres » (Règle A), reste à payer (1.1),
// professionnel mise en œuvre (1.4), avertissements CEE agrégés (grille chantier) —
// extraites BYTE-IDENTIQUES de index.html, aucune logique modifiée (preuve : banc au commit).
// Dépend AU CALL-TIME des modules 1 et 2 (chargés avant) : normalize, compareStrings, normalizeExtracted.
// Script CLASSIQUE (non-module) : les déclarations `function` top-level restent des globales window.
// Interdits (ADR-016 §3) : aucune instruction exécutée au chargement, aucun accès
// state/elements/DOM, aucun appel réseau, aucun id de check.
// (Indentation d'origine du <script> d'index.html conservée — exigence byte-identique.)

    // Chercher mentions agricoles (sauf dans nom société)
    function checkMentionsAgricoles(extracted, nomSociete) {
      const regex = /\b(agri|agricole|agriculture|agriculteur)\b/gi;
      const norm = normalizeExtracted(extracted);

      // Vérifier dans TOUS les Audits
      for (let i = 0; i < norm.audits.length; i++) {
        const audit = norm.audits[i];
        if (audit.profilUtilisation && regex.test(audit.profilUtilisation)) {
          if (!compareStrings(audit.profilUtilisation, nomSociete)) {
            const suffix = norm.audits.length > 1 ? ` #${i + 1}` : '';
            return { found: true, location: `Audit${suffix} - Profil utilisation` };
          }
        }
      }

      // Vérifier dans TOUTES les Synthèses
      for (let i = 0; i < norm.syntheses.length; i++) {
        const synthese = norm.syntheses[i];
        const suffix = norm.syntheses.length > 1 ? ` #${i + 1}` : '';

        if (synthese.secteurActivite && regex.test(synthese.secteurActivite)) {
          if (!compareStrings(synthese.secteurActivite, nomSociete)) {
            return { found: true, location: `Synthèse${suffix} - Secteur activité` };
          }
        }
        if (synthese.activiteBatiment && regex.test(synthese.activiteBatiment)) {
          if (!compareStrings(synthese.activiteBatiment, nomSociete)) {
            return { found: true, location: `Synthèse${suffix} - Activité bâtiment` };
          }
        }
        if (synthese.profilUtilisation && regex.test(synthese.profilUtilisation)) {
          if (!compareStrings(synthese.profilUtilisation, nomSociete)) {
            return { found: true, location: `Synthèse${suffix} - Profil` };
          }
        }
      }

      return { found: false, location: null };
    }

    // Détection des chantiers fautifs pour l'évolution 1.5 (étude de dimensionnement = Prime Evolution).
    // Pure (utilise normalize global). Retourne [{index, adresse, type, valeur}] avec type ∈ {'autre','absent'}.
    //   type 'autre'  → mention présente mais ≠ Prime Evolution
    //   type 'absent' → mention absente / non extraite (jamais un conforme silencieux)
    // Robuste à la ponctuation (tirets, points) : "PRIME-EVOLUTION" / "PRIME.EVOLUTION" passent OK.
    function detectFautifsDimensionnement(attestations) {
      const fautifs = [];
      (attestations || []).forEach((att, i) => {
        const brut = att && att.etudeDimensionnement;
        const norm = normalize(brut); // normalize('') = normalize(null) = normalize(undefined) = ''
        // Ramener la ponctuation à des espaces avant le .includes (robustesse "PRIME-EVOLUTION" etc.)
        const normForCheck = norm.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (!brut) {
          fautifs.push({ index: i + 1, adresse: (att && att.adresse) || '', type: 'absent', valeur: null });
        } else if (!normForCheck.includes('prime evolution')) {
          fautifs.push({ index: i + 1, adresse: (att && att.adresse) || '', type: 'autre', valeur: brut });
        }
        // sinon → contient "prime evolution" normalisé → OK, pas de fautif
      });
      return fautifs;
    }

    // Détection des chantiers fautifs pour l'évolution 1.3 / C3 (attestation « entrepôt de stockage non agricole »).
    // Pure (aucun effet de bord). Itération brute par index sur les attestations ORIGINALES (PAS de regroupement).
    // Fautif = attestationNonAgricole !== 'presente' ('non_detectee', null, undefined, autre → fautif ; défaut sûr).
    // surface/ledTotal INDIVIDUELS (pour distinguer des chantiers à même adresse, ex. LES MOUETTES).
    function detectFautifsAttestationNonAgricole(attestations) {
      if (!Array.isArray(attestations)) return [];
      const fautifs = [];
      attestations.forEach((att, i) => {
        const statut = att && att.attestationNonAgricole;
        if (statut !== 'presente') {
          fautifs.push({
            index: i + 1,
            adresse: (att && att.adresse) || '',
            surface: sumSurfaces(att && att.surfaces),
            ledTotal: parseFloat(String((att && att.ledTotal) || '0').replace(/[^\d.]/g, ''))
          });
        }
      });
      return fautifs;
    }

    // Parse une date française "JJ/MM/AAAA" (espaces tolérés) → objet Date à MINUIT (mois 0-indexé). null si vide/illisible.
    function parseDateFr(str) {
      if (!str) return null;
      const m = String(str).replace(/\s+/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!m) return null;
      const jj = parseInt(m[1], 10), mm = parseInt(m[2], 10), aaaa = parseInt(m[3], 10);
      const d = new Date(aaaa, mm - 1, jj); // minuit local
      // Rejeter les dates impossibles (ex. 31/02 que Date "corrigerait" silencieusement)
      if (d.getFullYear() !== aaaa || d.getMonth() !== mm - 1 || d.getDate() !== jj) return null;
      return d;
    }

    // Vérifie les 3 règles de délais de travaux (évolution 1.2). Pur. Statut ∈ {'ok','fautif','non_verifiable'}.
    // R1 début ≥ prévisite + 14 j calendaires ; R2 fin > début (strict) ; R3 facture > fin (strict).
    // Date manquante/illisible sur une règle → 'non_verifiable' (jamais 'ok', jamais silencieux).
    function verifierDelaisTravaux(cee) {
      const previsite = parseDateFr(cee && cee.datePrevisite);
      const debut     = parseDateFr(cee && cee.dateDebutTravaux);
      const fin       = parseDateFr(cee && cee.dateFinTravaux);
      const facture   = parseDateFr(cee && cee.dateFacture);
      const JOUR = 86400000;

      let r1;
      if (!previsite || !debut) r1 = { statut: 'non_verifiable' };
      else { const ecart = Math.round((debut - previsite) / JOUR); r1 = { statut: ecart >= 14 ? 'ok' : 'fautif', ecart }; }

      let r2;
      if (!debut || !fin) r2 = { statut: 'non_verifiable' };
      else r2 = { statut: fin.getTime() > debut.getTime() ? 'ok' : 'fautif' };

      let r3;
      if (!fin || !facture) r3 = { statut: 'non_verifiable' };
      else r3 = { statut: facture.getTime() > fin.getTime() ? 'ok' : 'fautif' };

      return { r1, r2, r3 };
    }

    // ===== Helpers de DÉTECTION PURS pour les alertes confirmables du CEE (Règle A / 1.1 / 1.4) =====
    // Extraits du handler btnAnalyze pour être PARTAGÉS avec le futur bloc CEE de la vue « Par chantier ».
    // Style calqué sur detectFautifsDimensionnement / detectFautifsAttestationNonAgricole / verifierDelaisTravaux :
    // PURS (aucun effet de bord, aucun confirmModal, aucun accès à un global muté) — ils DÉTECTENT, le handler DÉCLENCHE.

    // Règle A — secteur d'activité par chantier (entrepôt attendu). Retourne le mapping par chantier + les chantiers « Autres ».
    function detectAutresSecteurs(attestations) {
      const mapSecteurActivite = (secteur) => {
        if (!secteur) return null;
        const secteurNormalized = secteur.toLowerCase().trim();
        const entrepotKeywords = [
          'entrepôt', 'entrepot', 'entrepôts', 'entrepots',
          'logistique', 'logistiques',
          'commerce', 'commerces', 'commercial',
          'vente', 'ventes', 'locaux de vente'
        ];
        return entrepotKeywords.some(keyword => secteurNormalized.includes(keyword))
          ? 'Entrepôt'
          : 'Autres secteurs';
      };
      const secteursByChantier = [];
      const autresSecteurs = [];
      (attestations || []).forEach((attestation, index) => {
        const secteurBrut = attestation.secteurActivite || null;
        const secteurMapped = mapSecteurActivite(secteurBrut);
        secteursByChantier.push({ index: index + 1, adresse: attestation.adresse, secteurBrut, secteurMapped });
        if (secteurMapped === 'Autres secteurs') {
          autresSecteurs.push({ index: index + 1, adresse: attestation.adresse, secteur: secteurBrut });
        }
      });
      return { secteursByChantier, autresSecteurs };
    }

    // Évolution 1.1 — reste à payer (valeur globale du dossier). 3 états : 'absent' | 'non_nul' | 'ok' (=0).
    // Nettoyage local identique à compareMoney (espaces/NBSP, €, virgule décimale) — NE PAS changer la normalisation.
    function detectResteAPayer(cee) {
      const rawReste = cee && cee.resteAPayer;
      const resteStr = (rawReste == null) ? '' : String(rawReste).trim();
      const resteNum = parseFloat(resteStr.replace(/\s+/g, '').replace(/€/g, '').replace(',', '.'));
      let statut;
      if (isNaN(resteNum)) statut = 'absent';        // État 1 : absent / vide / non interprétable
      else if (resteNum !== 0) statut = 'non_nul';   // État 2 : valeur ≠ 0 (anormal)
      else statut = 'ok';                            // État 3 : = 0 → aucune alerte
      return { statut, rawReste, resteStr, resteNum };
    }

    // Évolution 1.4 — professionnel ayant mis en œuvre (section C, valeur globale). 3 états : 'absent' | 'energie_responsable' | 'ok'.
    // Normalisation identique au test "prime evolution" de 1.5 : normalize() (casse + accents) puis ponctuation→espaces.
    // .includes('energie responsable') couvre casse / accents / ponctuation / suffixe juridique (SAS, SARL),
    // mais PAS le pluriel "energies responsables" ni les fautes de frappe (lacune assumée).
    function detectProfessionnelMiseEnOeuvre(cee) {
      const rawEntreprise = cee && cee.entrepriseMiseEnOeuvre;
      const entrepriseStr = (rawEntreprise == null) ? '' : String(rawEntreprise).trim();
      const entrepriseNorm = normalize(entrepriseStr).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
      let statut;
      if (!entrepriseStr) statut = 'absent';                                        // État 1 : absente / illisible / null
      else if (entrepriseNorm.includes('energie responsable')) statut = 'energie_responsable'; // État 2
      else statut = 'ok';                                                           // État 3 : présente et ≠ ER
      return { statut, rawEntreprise, entrepriseStr, entrepriseNorm };
    }

    // ===== ZONE 1 du bloc CEE « Par chantier » (commit 5) : avertissements confirmables, RECALCULÉS LIVE =====
    // Appelle les 6 helpers PURS en LECTURE SEULE sur currentExtractedData.cee (RAW, comme les call sites du
    // handler) + window.selectedCodeNaf. JAMAIS une capture d'état « OK déjà cliqué ». Sorties HÉTÉROGÈNES
    // (liste de fautifs / statut 3 états / objet 3 sous-règles) → descripteur {label, etat, n, title}.
    // Principe n°1 : donnée ABSENTE → 'a_verifier' (JAUNE), jamais 'conforme' (vert). 1.3 inclus si isAgricole seulement.
    function computeAvertissementsCEE(cee, isAgricole) {
      const attestations = Array.isArray(cee.attestations) ? cee.attestations : [];
      const aData = attestations.length > 0; // données par chantier présentes ?
      const out = [];
      const add = (label, etat, n, title) => out.push({ label, etat, n, title });

      // 1.A secteur — sortie {secteursByChantier, autresSecteurs} ; les fautifs = autresSecteurs (liste)
      const sect = detectAutresSecteurs(attestations).autresSecteurs || [];
      if (!aData) add('Secteur', 'a_verifier', 0, 'Aucune attestation extraite — secteur à vérifier');
      else if (sect.length) add('Secteur', 'a_verifier', sect.length, sect.map(f => `Chantier ${f.index} : ${f.secteur || '—'}`).join(' | '));
      else add('Secteur', 'conforme', 0, 'Tous les secteurs reconnus « entrepôt »');

      // 1.1 reste à payer — statut 'absent'|'non_nul'|'ok'
      const reste = detectResteAPayer(cee);
      if (reste.statut === 'ok') add('Reste à payer', 'conforme', 0, 'Reste à payer = 0 €');
      else if (reste.statut === 'non_nul') add('Reste à payer', 'a_verifier', 0, `Reste à payer non nul : ${reste.rawReste}`);
      else add('Reste à payer', 'a_verifier', 0, 'Reste à payer non lu — à vérifier manuellement');

      // 1.4 professionnel mise en œuvre — statut 'absent'|'energie_responsable'|'ok'
      const pro = detectProfessionnelMiseEnOeuvre(cee);
      if (pro.statut === 'ok') add('Professionnel', 'conforme', 0, `Professionnel : ${pro.entrepriseStr}`);
      else if (pro.statut === 'energie_responsable') add('Professionnel', 'a_verifier', 0, 'Professionnel = Energie Responsable — à vérifier');
      else add('Professionnel', 'a_verifier', 0, 'Professionnel non lu — à vérifier manuellement');

      // 1.2 délais — objet {r1,r2,r3}, statut 'ok'|'fautif'|'non_verifiable' ; chip = pire des 3 (tout 'ok' → conforme)
      const d = verifierDelaisTravaux(cee);
      const sub = [['Prévisite→début', d.r1], ['Début→fin', d.r2], ['Fin→facture', d.r3]];
      const nKo = sub.filter(([, x]) => x.statut !== 'ok').length;
      add('Délais', nKo === 0 ? 'conforme' : 'a_verifier', nKo, sub.map(([lib, x]) => `${lib} : ${x.statut}`).join(' | '));

      // 1.3 attestation non agricole — GATÉ isAgricole (sinon NON affiché ; exclusif du check NAF-inconnu de Zone 2)
      if (isAgricole) {
        const fa = detectFautifsAttestationNonAgricole(attestations);
        if (!aData) add('Attest. non agri.', 'a_verifier', 0, 'NAF agricole, aucune attestation — vérifier BAT-EQ-127');
        else if (fa.length) add('Attest. non agri.', 'a_verifier', fa.length, fa.map(f => `Chantier ${f.index} : ${f.adresse || '—'} (${f.surface} m²)`).join(' | '));
        else add('Attest. non agri.', 'conforme', 0, 'Attestation « entrepôt non agricole » présente pour chaque chantier');
      }

      // 1.5 dimensionnement — liste de fautifs [{index, adresse, type:'absent'|'autre', valeur}]
      const dim = detectFautifsDimensionnement(attestations);
      if (!aData) add('Dimensionnement', 'a_verifier', 0, 'Aucune attestation extraite — dimensionnement à vérifier');
      else if (dim.length) add('Dimensionnement', 'a_verifier', dim.length, dim.map(f => `Chantier ${f.index} : ${f.type === 'absent' ? 'absente' : (f.valeur || '—')}`).join(' | '));
      else add('Dimensionnement', 'conforme', 0, 'Étude de dimensionnement = Prime Evolution pour chaque chantier');

      return out;
    }
