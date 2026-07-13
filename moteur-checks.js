// moteur-checks.js — Module 5 de la modularisation (ADR-016, phase B, TODO #3).
// « Moteur de checks » : generateChecks ENTIÈRE (~1400 l. — JAMAIS scindée pendant une extraction,
// leçon des 26-27 mai / ADR-015 ; ses 4 fonctions imbriquées sont des closures inextractibles),
// buildMessageAuditeur (rapport texte) et la donnée statique FICHES_TECHNIQUES (unique
// consommatrice : generateChecks). Extraits BYTE-IDENTIQUES de index.html (banc difflib au commit).
// Dépend AU CALL-TIME des modules 1/2/3 (chargés avant). Retourne les checks à l'appelant
// (handler btnAnalyze, index.html) — aucun accès à currentChecks/state/elements/DOM.
// Invariant ADR-014 : tout id de check généré ici se répercute sur getCheckProvenance (index.html),
// resolveFamille (familles-config.js) et le harnais — AUCUN id modifié par ce déplacement.
// Script CLASSIQUE (non-module) : les déclarations top-level restent des globales window.
// Interdits (ADR-016 §3) : aucune instruction exécutée au chargement (le littéral const est inerte).
// (Indentation d'origine du <script> d'index.html conservée — exigence byte-identique.)

    // ========== FICHES TECHNIQUES LED ==========
    const FICHES_TECHNIQUES = {
      DAEWOO: {
        nom: "DAEWOO NES-HBL250W",
        reference: "NES-HBL250W",
        dureeVie: "54000",
        thd: "3.7",
        efficacite: "185",
        irc: "71",
        ik: "9"
      },
      TECH: {
        nom: "TECH HIGH BAY TECH-03 250W",
        reference: "HIGH BAY TECH-03 250W",
        dureeVie: "50000",
        thd: "4.65",
        efficacite: "185",
        irc: "80",
        ik: "8"
      }
    };

    // Générer les checks (adapté multi-chantiers)
    function generateChecks(extracted, references) {
      const checks = [];
      const norm = normalizeExtracted(extracted);
      const firstAudit = getFirstAudit(norm);
      const firstSynthese = getFirstSynthese(norm);

      // Déterminer le nombre de chantiers et le suffixe pour les localisations
      const nbChantiers = norm.cee?.attestations?.length || norm.audits.length || 1;
      const chantierSuffix = nbChantiers > 1 ? ' (chantier 1)' : '';

      // Cardinalité DOCUMENTAIRE (1 chantier = 1 couple audit/synthèse — ADR-011/#27), pour les
      // gardes mono-chantier des checks 19/21/28/29/30. Ne PAS réutiliser nbChantiers ci-dessus :
      // il compte les attestations en premier → faux « mono » quand l'attestation est repliée
      // (type DELEFORTRIE : 5 faux majeurs « 66 vs 52 »), faux « multi » quand un chantier a
      // plusieurs attestations (type COPPIN : les 5 checks éteints à tort). Même source que le
      // filet surface (nbChantiersAttendus).
      const nbChantiersDocumentaires = matchChantiers(norm.audits, norm.syntheses).length;

      // Log détaillé des données extraites pour debug
      console.log('\n=== DONNÉES EXTRAITES PAR CLAUDE ===');
      console.log('Audits extraits:', norm.audits.length);
      norm.audits.forEach((audit, i) => {
        console.log(`  Audit ${i + 1}:`, { nom: audit.nom, adresse: audit.adresse, ledTotal: audit.ledTotal });
      });
      console.log('Synthèses extraites:', norm.syntheses.length);
      norm.syntheses.forEach((synthese, i) => {
        console.log(`  Synthèse ${i + 1} (COMPLET):`, synthese);
      });
      console.log('Adresses chantiers CEE:', norm.cee?.adressesChantiers || []);

      // ========== BLOQUANTS - Page de garde Audit (1-3) ==========
      // Pour chaque audit (1 ou plusieurs chantiers)

      norm.audits.forEach((audit, auditIndex) => {
        const suffix = norm.audits.length > 1 ? ` chantier ${auditIndex + 1}` : '';
        const idSuffix = norm.audits.length > 1 ? `_c${auditIndex + 1}` : '';
        const chantierIndex = auditIndex + 1; // ⭐ Index du chantier (1, 2, 3...)

        // Check 1 : Nom entreprise Audit
        const nomAuditOk = compareStrings(audit.nom, references.nom);
        checks.push({
          id: `check_01${idSuffix}`,
          categorie: 'garde',
          niveau: nomAuditOk ? 'ok' : 'bloquant',
          champ: `Nom entreprise Audit page 1${suffix}`,
          localisation: `Audit${suffix} page 1, en-tête`,
          detail: nomAuditOk ? 'Nom conforme' : 'Nom différent de la référence',
          valeur_attendue: references.nom || '',
          valeur_trouvee: audit.nom || '',
          chantierIndex // ⭐ Chantier détecté depuis la case d'import
        });

        // Check 2 : Adresse chantier Audit (matching + vérifications détaillées)
        const adressesCEE = norm.cee?.adressesChantiers || [];

        // Trouver l'adresse CEE correspondante (matching tolérant)
        const adresseCEECorrespondante = adressesCEE.find(adresseCEE =>
          compareAddress(audit.adresse, adresseCEE)
        );
        const adresseAuditMatchCEE = !!adresseCEECorrespondante;

        // Check 2a : Adresse globale (matching réussi ou non)
        checks.push({
          id: `check_02${idSuffix}`,
          categorie: 'garde',
          niveau: adresseAuditMatchCEE ? 'ok' : 'bloquant',
          champ: `Adresse chantier Audit page 1${suffix}`,
          localisation: `Audit${suffix} page 1, en-tête`,
          detail: adresseAuditMatchCEE ? 'Adresse correspond à un chantier du CEE' : 'Adresse ne correspond à aucune adresse du CEE',
          valeur_attendue: adresseCEECorrespondante || adressesCEE[0] || '',
          valeur_trouvee: audit.adresse || '',
          chantierIndex // ⭐ Chantier détecté depuis la case d'import
        });

        // Check 3 : Date audit
        const dateAuditOk = compareDate(audit.date, references.dateDevis) &&
                            isValidDateFormat(audit.date);
        checks.push({
          id: `check_03${idSuffix}`,
          categorie: 'garde',
          niveau: dateAuditOk ? 'ok' : 'bloquant',
          champ: `Date audit Audit page 1${suffix}`,
          localisation: `Audit${suffix} page 1, en-tête`,
          detail: dateAuditOk ? 'Date conforme (format JJ/MM/AAAA)' :
                  !isValidDateFormat(audit.date) ? 'Format de date incorrect (attendu JJ/MM/AAAA)' :
                  'Date différente de la référence',
          valeur_attendue: references.dateDevis || '',
          valeur_trouvee: audit.date || '',
          chantierIndex // ⭐ Chantier détecté depuis la case d'import
        });
      });

      // ========== SYNTHÈSE - Page de garde (4-8) - PAR CHANTIER ==========

      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        // Check 4 : Nom entreprise Synthèse
        const nomSyntheseOk = compareStrings(synthese.nom, references.nom);
        checks.push({
          id: `check_04${idSuffix}`,
          categorie: 'synthese',
          niveau: nomSyntheseOk ? 'ok' : 'majeur',
          champ: `Nom entreprise Synthèse page 1${suffix}`,
          localisation: `Synthèse${suffix} page 1, en-tête`,
          detail: nomSyntheseOk ? 'Nom conforme' : 'Nom différent de la référence',
          valeur_attendue: references.nom || '',
          valeur_trouvee: synthese.nom || '',
          chantierIndex
        });

        // Check 5 : Date Synthèse
        const dateSyntheseOk = compareDate(synthese.date, references.dateDevis) &&
                               isValidDateFormat(synthese.date);
        checks.push({
          id: `check_05${idSuffix}`,
          categorie: 'synthese',
          niveau: dateSyntheseOk ? 'ok' : 'majeur',
          champ: `Date Synthèse page 1${suffix}`,
          localisation: `Synthèse${suffix} page 1, en-tête`,
          detail: dateSyntheseOk ? 'Date conforme (format JJ/MM/AAAA)' :
                  !isValidDateFormat(synthese.date) ? 'Format de date incorrect' :
                  'Date différente de la référence',
          valeur_attendue: references.dateDevis || '',
          valeur_trouvee: synthese.date || '',
          chantierIndex
        });

        // Checks 6-8 : Contacts (email / téléphone / contact) — comparaison Synthèse vs référence CEE
        // Matrice : conforme → ok ; présent des deux côtés mais différent → majeur ;
        // absent côté Synthèse, ou pas de référence CEE → info (jamais de faux conforme via '' === '').
        const pushContactCheck = (id, champ, refVal, synVal, compareFn) => {
          let niveau, detail;
          if (!refVal) {
            niveau = 'info';
            detail = 'Pas de référence CEE — à vérifier manuellement';
          } else if (!synVal) {
            niveau = 'info';
            detail = 'Absent sur la Synthèse';
          } else if (compareFn(synVal, refVal)) {
            niveau = 'ok';
            detail = 'Conforme';
          } else {
            niveau = 'majeur';
            detail = 'Différent de la référence CEE';
          }
          checks.push({
            id: `${id}${idSuffix}`,
            categorie: 'synthese',
            niveau,
            champ: `${champ}${suffix}`,
            localisation: `Synthèse${suffix} page 1, contact client`,
            detail,
            valeur_attendue: refVal || '',
            valeur_trouvee: synVal || 'Non présent',
            chantierIndex
          });
        };
        pushContactCheck('check_06', 'Email Synthèse page 1', references.email, synthese.email, compareStrings);
        pushContactCheck('check_07', 'Téléphone Synthèse page 1', references.telephone, synthese.telephone, comparePhone);
        pushContactCheck('check_08', 'Contact nom/prénom Synthèse page 1', references.contact, synthese.contact, compareStrings);
      });

      // Checks 9-30 : Autres vérifications Synthèse et Audit (simplifié pour l'instant)
      // Je vais créer des checks génériques pour compléter à 40

      // ========== CHECK 9 : TOTAL LED (MULTI-CHANTIERS) ==========

      // Calculer sommes totales
      const sommeAudits = sumLED(norm.audits);
      const sommeSyntheses = sumLED(norm.syntheses);
      const totalCEE = parseFloat(String(references.totalLed || norm.cee?.totalLed || 0).replace(/\s+/g, '')) || 0;

      // Check 9a : Somme audits = Total CEE
      const sommeAuditsOk = ledConforme(sommeAudits, totalCEE);
      checks.push({
        id: 'check_09a',
        portee: 'global-cee',
        categorie: 'synthese',
        niveau: sommeAuditsOk ? 'ok' : 'majeur',
        champ: 'TOTAL LED Audits = Total CEE',
        localisation: 'Somme de tous les audits vs Dossier CEE',
        detail: sommeAuditsOk ?
          `Somme audits conforme : ${sommeAudits} LED` :
          `Somme audits (${sommeAudits}) différente du total CEE (${totalCEE})`,
        valeur_attendue: totalCEE.toString(),
        valeur_trouvee: sommeAudits.toString()
      });

      // Check 9b : Somme synthèses = Total CEE
      const sommeSynthesesOk = ledConforme(sommeSyntheses, totalCEE);
      checks.push({
        id: 'check_09b',
        portee: 'global-cee',
        categorie: 'synthese',
        niveau: sommeSynthesesOk ? 'ok' : 'majeur',
        champ: 'TOTAL LED Synthèses = Total CEE',
        localisation: 'Somme de toutes les synthèses vs Dossier CEE',
        detail: sommeSynthesesOk ?
          `Somme synthèses conforme : ${sommeSyntheses} LED` :
          `Somme synthèses (${sommeSyntheses}) différente du total CEE (${totalCEE})`,
        valeur_attendue: totalCEE.toString(),
        valeur_trouvee: sommeSyntheses.toString()
      });

      // Check 9c : Si multi-chantiers, vérifier cohérence par chantier
      if (norm.audits.length > 1 || norm.syntheses.length > 1) {
        const chantiers = matchChantiers(norm.audits, norm.syntheses);

        chantiers.forEach((chantier, index) => {
          if (chantier.audit && chantier.synthese) {
            const ledAudit = parseFloat(String(chantier.audit.ledTotal || 0).replace(/\s+/g, '')) || 0;
            const ledSynthese = parseFloat(String(chantier.synthese.ledTotal || 0).replace(/\s+/g, '')) || 0;
            const coherent = ledConforme(ledAudit, ledSynthese);
            const chantierIndex = index + 1; // ⭐ Index du chantier

            checks.push({
              id: `check_09c_ch${index + 1}`,
              categorie: 'synthese',
              niveau: coherent ? 'ok' : 'majeur',
              champ: `LED chantier ${index + 1} : Audit = Synthèse`,
              localisation: `Chantier ${index + 1} (${chantier.adresse || 'adresse non trouvée'})`,
              detail: coherent ?
                `LED cohérentes pour ce chantier : ${ledAudit}` :
                `LED différentes : Audit ${ledAudit} vs Synthèse ${ledSynthese}`,
              valeur_attendue: ledAudit.toString(),
              valeur_trouvee: ledSynthese.toString(),
              chantierIndex // ⭐ Chantier détecté depuis la case d'import
            });
          }
        });
      }

      // Check 9d : LED par chantier vs CEE (si attestations ont ledTotal)
      const attestationsCEE = norm.cee?.attestations || [];

      // Regrouper les attestations CEE par adresse (gérer les multi-bâtiments)
      const attestationsRegroupees = regrouperAttestationsParAdresse(attestationsCEE, norm.cee?.cellules || []);
      const attestationsAvecLed = attestationsRegroupees.filter(att => att.ledTotal);

      // ===== S2 (ADR-014/#22) : appariement attestation↔chantier non silencieux =====
      // Compte, par adresse normalisée (MÊME normalisation que la clé de regroupement), combien de
      // chantiers la partagent. compte>1 ⇒ COLLISION : la comparaison auto compare alors un chantier
      // au TOTAL agrégé des deux (faux ok/majeur) → on signale 'info' « à vérifier » sur les checks
      // EXISTANTS (aucun nouvel id). MISS = le .find ne renvoie aucune attestation pour ce chantier.
      const compteAdresseS2 = {};
      matchChantiers(norm.audits, norm.syntheses).forEach(ch => {
        const key = normaliserAdresseSansBatiment(ch.adresse || '');
        if (key) compteAdresseS2[key] = (compteAdresseS2[key] || 0) + 1;
      });
      const nbCoChantiersS2 = (adresse) => compteAdresseS2[normaliserAdresseSansBatiment(adresse || '')] || 0;
      const collisionAdresseS2 = (adresse) => nbCoChantiersS2(adresse) > 1;
      // Pousse un check 'info' « à vérifier » sur un id EXISTANT (categorie 'synthese' + chantierIndex
      // préservés → routage Méthode 0 inchangé ; valeurs neutres, jamais lues comme un résultat).
      const pushApparInfoS2 = (id, champ, localisation, detail, chantierIndex) => {
        checks.push({ id, categorie: 'synthese', niveau: 'info', champ, localisation, detail,
          valeur_attendue: '(non vérifiable)', valeur_trouvee: '(non vérifiable)', chantierIndex });
      };

      if (attestationsAvecLed.length > 0) {
        const chantiers = matchChantiers(norm.audits, norm.syntheses);

        chantiers.forEach((chantier, index) => {
          // Trouver l'attestation CEE correspondante à ce chantier
          const attestationCorrespondante = attestationsAvecLed.find(att =>
            compareAddress(chantier.adresse, att.adresse)
          );
          const chantierIndex = index + 1; // ⭐ Index du chantier

          if (attestationCorrespondante) {
            const adresseCEE = attestationCorrespondante.adresse; // Adresse de référence du CEE
            const ledCEE = parseFloat(String(attestationCorrespondante.ledTotal || 0).replace(/\s+/g, '')) || 0;
            const ledAudit = chantier.audit ? parseFloat(String(chantier.audit.ledTotal || 0).replace(/\s+/g, '')) || 0 : null;
            const ledSynthese = chantier.synthese ? parseFloat(String(chantier.synthese.ledTotal || 0).replace(/\s+/g, '')) || 0 : null;
            const nbBatiments = attestationCorrespondante.nbBatiments || 1;
            const batimentsLabel = nbBatiments > 1 ? ` (${nbBatiments} bâtiments)` : '';

            // Vérifier cohérence Audit vs CEE
            if (ledAudit !== null) {
              const auditOk = ledConforme(ledAudit, ledCEE);
              checks.push({
                id: `check_09d_audit_${adresseCEE.replace(/[^a-z0-9]/gi, '_')}`,
                categorie: 'synthese',
                niveau: auditOk ? 'ok' : 'majeur',
                champ: `LED ${adresseCEE} : Audit vs CEE`,
                localisation: `${adresseCEE}`,
                detail: auditOk ?
                  `LED Audit conforme au CEE : ${ledAudit}${batimentsLabel}` :
                  `LED différentes : ${ledCEE} attendues (CEE)${batimentsLabel} vs ${ledAudit} trouvées (Audit)`,
                valeur_attendue: `${ledCEE}${batimentsLabel}`,
                valeur_trouvee: ledAudit.toString(),
                chantierIndex // ⭐ Chantier détecté depuis la case d'import
              });
            }

            // Vérifier cohérence Synthèse vs CEE
            if (ledSynthese !== null) {
              const syntheseOk = ledConforme(ledSynthese, ledCEE);
              checks.push({
                id: `check_09d_synthese_${adresseCEE.replace(/[^a-z0-9]/gi, '_')}`,
                categorie: 'synthese',
                niveau: syntheseOk ? 'ok' : 'majeur',
                champ: `LED ${adresseCEE} : Synthèse vs CEE`,
                localisation: `${adresseCEE}`,
                detail: syntheseOk ?
                  `LED Synthèse conforme au CEE : ${ledSynthese}${batimentsLabel}` :
                  `LED différentes : ${ledCEE} attendues (CEE)${batimentsLabel} vs ${ledSynthese} trouvées (Synthèse)`,
                valeur_attendue: `${ledCEE}${batimentsLabel}`,
                valeur_trouvee: ledSynthese.toString(),
                chantierIndex // ⭐ Chantier détecté depuis la case d'import
              });
            }
          } else {
            // Attestation CEE non appariée à ce chantier → le contrôle LED de ce chantier face
            // au CEE (check_09d) ne peut PAS être fait. Ne pas le taire (principe n°1) : filet
            // 'info' « à vérifier ». Jamais majeur : l'absence peut être légitime (bâtiment
            // « Autres » sans attestation entrepôt). Symétrique côté LED du filet surface
            // check_surface_non_ventilable. Routé par getCheckProvenance Méthode 0 (categorie
            // 'synthese' + chantierIndex) ; famille 5 via familles-config.js (check_09d_miss_c\d+).
            console.warn(`⚠️ Aucune attestation CEE trouvée pour l'adresse : ${chantier.adresse}`);
            checks.push({
              id: `check_09d_miss_c${chantierIndex}`,
              categorie: 'synthese',
              niveau: 'info',
              champ: `LED chantier ${chantierIndex} : contrôle vs CEE impossible`,
              localisation: `Chantier ${chantierIndex} (${chantier.adresse || 'adresse non trouvée'})`,
              detail: `Aucune attestation CEE n'a pu être appariée à cette adresse : le contrôle du nombre de LED de ce chantier face au CEE n'a pas pu être effectué. À vérifier manuellement.`,
              chantierIndex
            });
          }
        });
      }

      // Checks 10-13, 15 : Fiche identité Synthèse - PAR CHANTIER
      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        checks.push({
          id: `check_10${idSuffix}`,
          categorie: 'synthese',
          niveau: compareStrings(synthese.nomClient, references.nom) ? 'ok' : 'majeur',
          champ: `Client Synthèse fiche identité${suffix}`,
          localisation: `Synthèse${suffix}, fiche identité du site`,
          detail: 'Vérification nom client',
          valeur_attendue: references.nom || '',
          valeur_trouvee: synthese.nomClient || '',
          chantierIndex
        });

        checks.push({
          id: `check_11${idSuffix}`,
          categorie: 'synthese',
          niveau: compareSIRET(synthese.siret, references.siret) ? 'ok' : 'majeur',
          champ: `SIRET Synthèse fiche identité${suffix}`,
          localisation: `Synthèse${suffix}, fiche identité du site`,
          detail: 'Vérification SIRET (14 chiffres)',
          valeur_attendue: references.siret || '',
          valeur_trouvee: synthese.siret || '',
          chantierIndex
        });

        // Check 12 : Adresse synthèse
        const adressesCEE12 = norm.cee?.adressesChantiers || [];
        const adresseCEECorrespondanteSynthese = adressesCEE12[syntheseIndex] || adressesCEE12[0];
        const adresseSyntheseMatchCEE = adresseCEECorrespondanteSynthese &&
                                        compareAddress(synthese.adresse, adresseCEECorrespondanteSynthese);

        checks.push({
          id: `check_12${idSuffix}`,
          categorie: 'synthese',
          niveau: adresseSyntheseMatchCEE ? 'ok' : 'majeur',
          champ: `Adresse chantier Synthèse fiche identité${suffix}`,
          localisation: `Synthèse${suffix}, fiche identité du site`,
          detail: adresseSyntheseMatchCEE ? 'Adresse correspond à un chantier du CEE' : 'Adresse ne correspond à aucune adresse du CEE',
          valeur_attendue: adresseCEECorrespondanteSynthese || '',
          valeur_trouvee: synthese.adresse || '',
          chantierIndex
        });

        checks.push({
          id: `check_13${idSuffix}`,
          categorie: 'synthese',
          niveau: 'info',
          champ: `Surface éclairée Synthèse fiche identité${suffix}`,
          localisation: `Synthèse${suffix}, fiche identité du site`,
          detail: 'Vérification manuelle requise',
          valeur_attendue: '',
          valeur_trouvee: synthese.surfaceEclairee || '',
          chantierIndex
        });
      });

      // Check 14 : Secteur d'activité par chantier (si attestations disponibles)
      if (attestationsRegroupees.length > 0 && norm.syntheses.length > 0) {
        // Vérifier chaque synthèse avec l'attestation correspondante (matching par adresse)
        norm.syntheses.forEach((synthese, syntheseIndex) => {
          // Trouver l'attestation correspondante par adresse
          const attestation = attestationsRegroupees.find(att =>
            compareAddress(synthese.adresse, att.adresse)
          );

          const suffixS2 = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
          const idSuffixS2 = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
          if (collisionAdresseS2(synthese.adresse)) {
            // S2 : 2+ chantiers même adresse → secteur comparé au CEE agrégé = faux → 'info' (pas de sous-check conflit).
            pushApparInfoS2(`check_14${idSuffixS2}`,
              `Secteur d'activité Synthèse${suffixS2}`, `Synthèse${suffixS2}, fiche identité du site`,
              `⚠️ À vérifier manuellement : ${nbCoChantiersS2(synthese.adresse)} chantiers à la même adresse « ${synthese.adresse || ''} » — secteur non réconciliable automatiquement (1 chantier = 1 adresse non garanti).`,
              syntheseIndex + 1);
          } else if (!attestation && nbChantiersDocumentaires > 1) {
            // S2 : multi-chantier, aucune attestation appariée → 'info' (mono garde le fallback references.*).
            pushApparInfoS2(`check_14${idSuffixS2}`,
              `Secteur d'activité Synthèse${suffixS2}`, `Synthèse${suffixS2}, fiche identité du site`,
              `⚠️ À vérifier manuellement : aucune attestation CEE trouvée pour ce chantier (adresse « ${synthese.adresse || ''} »).`,
              syntheseIndex + 1);
          } else if (attestation && attestation.secteurActivite) {
            const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
            const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';

            // Un chantier = 1 adresse peut légitimement regrouper des bâtiments de secteurs
            // différents (ex. un entrepôt + un local « Autres »). Le secteur n'entre PAS dans le
            // découpage des chantiers (règle métier #27) → INFO, jamais une erreur.
            if (attestation.secteurConflict) {
              checks.push({
                id: `check_14_conflict${idSuffix}`,
                categorie: 'synthese',
                niveau: 'info',
                champ: `Secteurs multiples à la même adresse${suffix}`,
                localisation: `Attestations CEE`,
                detail: `ℹ️ Ce chantier regroupe des bâtiments de secteurs différents (${attestation.secteurActivite}) — normal quand plusieurs bâtiments partagent une adresse. À vérifier seulement si inattendu.`,
                valeur_attendue: 'Plusieurs secteurs admis à une même adresse',
                valeur_trouvee: attestation.secteurActivite,
                chantierIndex: syntheseIndex + 1
              });
            }

            // Vérifier si le secteur de la synthèse correspond au secteur CEE
            const secteurOk = compareSecteurEtude(synthese.secteurActivite, attestation.secteurActivite);
            checks.push({
              id: `check_14${idSuffix}`,
              categorie: 'synthese',
              niveau: secteurOk ? 'ok' : 'majeur',
              champ: `Secteur d'activité Synthèse${suffix}`,
              localisation: `Synthèse${suffix}, fiche identité du site`,
              detail: secteurOk ?
                `Secteur conforme : ${attestation.secteurActivite}` :
                `Secteur Synthèse (${synthese.secteurActivite || 'non trouvé'}) ≠ Secteur CEE (${attestation.secteurActivite})`,
              valeur_attendue: attestation.secteurActivite || '',
              valeur_trouvee: synthese.secteurActivite || '',
              chantierIndex: syntheseIndex + 1
            });
          } else {
            // Fallback : comparer avec references.typeLocal si pas d'attestation
            const secteurOk = compareSecteurEtude(synthese.secteurActivite, references.typeLocal);
            const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';

            checks.push({
              id: `check_14${norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : ''}`,
              categorie: 'synthese',
              niveau: secteurOk ? 'ok' : 'majeur',
              champ: `Secteur d'activité Synthèse${suffix}`,
              localisation: `Synthèse${suffix}, fiche identité du site`,
              detail: 'Vérification secteur d\'activité',
              valeur_attendue: references.typeLocal || '',
              valeur_trouvee: synthese.secteurActivite || '',
              chantierIndex: syntheseIndex + 1
            });
          }
        });
      } else {
        // Mono-chantier sans attestations : utiliser references.typeLocal
        checks.push({
          id: 'check_14',
          categorie: 'synthese',
          niveau: compareSecteurEtude(firstSynthese.secteurActivite, references.typeLocal) ? 'ok' : 'majeur',
          champ: 'Secteur d\'activité Synthèse fiche identité',
          localisation: `Synthèse, fiche identité du site${chantierSuffix}`,
          detail: 'Vérification secteur d\'activité',
          valeur_attendue: references.typeLocal || '',
          valeur_trouvee: firstSynthese.secteurActivite || ''
        });
      }

      // Checks 15-18 : Parcelles + Périmètre + Inventaire - PAR CHANTIER
      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        // Récupérer les parcelles de l'attestation correspondante (match par adresse)
        const attestationCorrespondante = attestationsRegroupees.find(att =>
          compareAddress(synthese.adresse, att.adresse)
        );
        if (collisionAdresseS2(synthese.adresse)) {
          // S2 : 2+ chantiers même adresse → parcelles comparées au CEE agrégé (join) = faux → 'info'.
          pushApparInfoS2(`check_15${idSuffix}`,
            `Parcelles cadastrales Synthèse fiche identité${suffix}`, `Synthèse${suffix}, fiche identité du site`,
            `⚠️ À vérifier manuellement : ${nbCoChantiersS2(synthese.adresse)} chantiers à la même adresse « ${synthese.adresse || ''} » — parcelles non réconciliables automatiquement (1 chantier = 1 adresse non garanti).`,
            chantierIndex);
        } else if (!attestationCorrespondante && nbChantiersDocumentaires > 1) {
          // S2 : multi-chantier, aucune attestation appariée → 'info' (mono garde le fallback references.parcelles).
          pushApparInfoS2(`check_15${idSuffix}`,
            `Parcelles cadastrales Synthèse fiche identité${suffix}`, `Synthèse${suffix}, fiche identité du site`,
            `⚠️ À vérifier manuellement : aucune attestation CEE trouvée pour ce chantier (adresse « ${synthese.adresse || ''} »).`,
            chantierIndex);
        } else {
          const parcellesAttendues = attestationCorrespondante?.parcelles || references.parcelles || '';
          const parcellesOk = compareParcelles(synthese.parcelles, parcellesAttendues);

          checks.push({
            id: `check_15${idSuffix}`,
            categorie: 'synthese',
            niveau: parcellesOk ? 'ok' : 'majeur',
            champ: `Parcelles cadastrales Synthèse fiche identité${suffix}`,
            localisation: `Synthèse${suffix}, fiche identité du site`,
            detail: parcellesOk ?
              'Parcelles cadastrales conformes au dossier CEE pour ce chantier' :
              'Parcelles cadastrales différentes du dossier CEE pour ce chantier',
            valeur_attendue: parcellesAttendues,
            valeur_trouvee: synthese.parcelles || '',
            chantierIndex
          });
        }

        checks.push({
          id: `check_16${idSuffix}`,
          categorie: 'synthese',
          niveau: compareStrings(synthese.nomSite, references.nom) ? 'ok' : 'majeur',
          champ: `Nom du site Synthèse périmètre${suffix}`,
          localisation: `Synthèse${suffix}, périmètre de l'étude`,
          detail: 'Vérification nom du site',
          valeur_attendue: references.nom || '',
          valeur_trouvee: synthese.nomSite || '',
          chantierIndex
        });

        checks.push({
          id: `check_17${idSuffix}`,
          categorie: 'synthese',
          niveau: 'info',
          champ: `Nombre de bâtiments Synthèse${suffix}`,
          localisation: `Synthèse${suffix}, périmètre de l'étude`,
          detail: 'Vérification manuelle requise',
          valeur_attendue: '',
          valeur_trouvee: synthese.nombreBatiments || '',
          chantierIndex
        });

        checks.push({
          id: `check_18${idSuffix}`,
          categorie: 'synthese',
          niveau: 'info',
          champ: `Répartition LED état initial${suffix}`,
          localisation: `Synthèse${suffix}, inventaire état initial`,
          detail: 'Vérification manuelle requise',
          valeur_attendue: '',
          valeur_trouvee: '',
          chantierIndex
        });
      });

      // Check 19 : Désactivé en multi-chantiers (déjà vérifié par checks globaux)
      if (nbChantiersDocumentaires === 1) {
        const totalLedInitialOk = compareStrings(firstSynthese.totalLedInitial, references.totalLed);
        checks.push({
          id: 'check_19',
          categorie: 'synthese',
          niveau: totalLedInitialOk ? 'ok' : 'majeur',
          champ: 'TOTAL LED état initial Synthèse',
          localisation: 'Synthèse, inventaire état initial',
          detail: totalLedInitialOk ? 'Total LED initial conforme' : 'Total LED initial différent',
          valeur_attendue: references.totalLed || '',
          valeur_trouvee: firstSynthese.totalLedInitial || ''
        });
      }

      // ========== SYNTHÈSE - Indicateurs éclairage initial (20) ==========
      // Check 20 : Secteur étude par chantier (si attestations disponibles)
      if (attestationsRegroupees.length > 0 && norm.syntheses.length > 0) {
        norm.syntheses.forEach((synthese, syntheseIndex) => {
          // Trouver l'attestation correspondante par adresse
          const attestation = attestationsRegroupees.find(att =>
            compareAddress(synthese.adresse, att.adresse)
          );
          const suffixS2 = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
          const idSuffixS2 = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
          if (collisionAdresseS2(synthese.adresse)) {
            // S2 : 2+ chantiers même adresse → secteur étude comparé au CEE agrégé = faux → 'info'.
            pushApparInfoS2(`check_20${idSuffixS2}`,
              `Secteur étude indicateurs${suffixS2}`, `Synthèse${suffixS2}, indicateurs éclairage intérieur état initial`,
              `⚠️ À vérifier manuellement : ${nbCoChantiersS2(synthese.adresse)} chantiers à la même adresse « ${synthese.adresse || ''} » — secteur non réconciliable automatiquement (1 chantier = 1 adresse non garanti).`,
              syntheseIndex + 1);
          } else if (!attestation && nbChantiersDocumentaires > 1) {
            // S2 : multi-chantier, aucune attestation appariée → 'info' (mono garde le fallback references.*).
            pushApparInfoS2(`check_20${idSuffixS2}`,
              `Secteur étude indicateurs${suffixS2}`, `Synthèse${suffixS2}, indicateurs éclairage intérieur état initial`,
              `⚠️ À vérifier manuellement : aucune attestation CEE trouvée pour ce chantier (adresse « ${synthese.adresse || ''} »).`,
              syntheseIndex + 1);
          } else if (attestation && attestation.secteurActivite) {
            const secteurOk = compareSecteurEtude(synthese.secteurEtude, attestation.secteurActivite);
            const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
            const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';

            checks.push({
              id: `check_20${idSuffix}`,
              categorie: 'synthese',
              niveau: secteurOk ? 'ok' : 'majeur',
              champ: `Secteur étude indicateurs${suffix}`,
              localisation: `Synthèse${suffix}, indicateurs éclairage intérieur état initial`,
              detail: secteurOk ?
                `Secteur étude conforme : ${attestation.secteurActivite}` :
                `Secteur étude (${synthese.secteurEtude || 'non trouvé'}) ≠ Secteur CEE (${attestation.secteurActivite})`,
              valeur_attendue: attestation.secteurActivite || '',
              valeur_trouvee: synthese.secteurEtude || '',
              chantierIndex: syntheseIndex + 1
            });
          } else {
            // Fallback
            const secteurOk = compareSecteurEtude(synthese.secteurEtude, references.typeLocal);
            const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';

            checks.push({
              id: `check_20${norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : ''}`,
              categorie: 'synthese',
              niveau: secteurOk ? 'ok' : 'majeur',
              champ: `Secteur étude indicateurs${suffix}`,
              localisation: `Synthèse${suffix}, indicateurs éclairage intérieur état initial`,
              detail: 'Vérification secteur d\'étude',
              valeur_attendue: references.typeLocal || '',
              valeur_trouvee: synthese.secteurEtude || '',
              chantierIndex: syntheseIndex + 1
            });
          }
        });
      } else {
        checks.push({
          id: 'check_20',
          categorie: 'synthese',
          niveau: compareSecteurEtude(firstSynthese.secteurEtude, references.typeLocal) ? 'ok' : 'majeur',
          champ: 'Secteur étude indicateurs initial',
          localisation: `Synthèse, indicateurs éclairage intérieur état initial${chantierSuffix}`,
          detail: 'Vérification secteur d\'étude',
          valeur_attendue: references.typeLocal || '',
          valeur_trouvee: firstSynthese.secteurEtude || ''
        });
      }

      // ========== SYNTHÈSE - Inventaire état projeté (21-23) ==========
      // Check 21 : Désactivé en multi-chantiers (déjà vérifié par checks globaux)
      if (nbChantiersDocumentaires === 1) {
        const totalLedProjeteOk = compareStrings(firstSynthese.totalLedProjete, references.totalLed);
        checks.push({
          id: 'check_21',
          categorie: 'synthese',
          niveau: totalLedProjeteOk ? 'ok' : 'majeur',
          champ: 'TOTAL LED état projeté Synthèse',
          localisation: 'Synthèse, inventaire état projeté',
          detail: totalLedProjeteOk ? 'Total LED projeté conforme' : 'Total LED projeté différent',
          valeur_attendue: references.totalLed || '',
          valeur_trouvee: firstSynthese.totalLedProjete || ''
        });
      }

      // Check 22 : Répartition LED projeté - PAR CHANTIER
      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        checks.push({
          id: `check_22${idSuffix}`,
          categorie: 'synthese',
          niveau: 'info',
          champ: `Répartition LED état projeté${suffix}`,
          localisation: `Synthèse${suffix}, inventaire état projeté`,
          detail: 'Vérification manuelle requise',
          valeur_attendue: '',
          valeur_trouvee: '',
          chantierIndex
        });
      });

      // Check 23 : Activité bâtiment par chantier (si attestations disponibles)
      if (attestationsRegroupees.length > 0 && norm.syntheses.length > 0) {
        norm.syntheses.forEach((synthese, syntheseIndex) => {
          // Trouver l'attestation correspondante par adresse
          const attestation = attestationsRegroupees.find(att =>
            compareAddress(synthese.adresse, att.adresse)
          );
          const suffixS2 = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
          const idSuffixS2 = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
          if (collisionAdresseS2(synthese.adresse)) {
            // S2 : 2+ chantiers même adresse → activité comparée au CEE agrégé = faux → 'info'.
            pushApparInfoS2(`check_23${idSuffixS2}`,
              `Activité bâtiment état projeté${suffixS2}`, `Synthèse${suffixS2}, inventaire état projeté (2e tableau)`,
              `⚠️ À vérifier manuellement : ${nbCoChantiersS2(synthese.adresse)} chantiers à la même adresse « ${synthese.adresse || ''} » — secteur non réconciliable automatiquement (1 chantier = 1 adresse non garanti).`,
              syntheseIndex + 1);
          } else if (!attestation && nbChantiersDocumentaires > 1) {
            // S2 : multi-chantier, aucune attestation appariée → 'info' (mono garde le fallback existant).
            pushApparInfoS2(`check_23${idSuffixS2}`,
              `Activité bâtiment état projeté${suffixS2}`, `Synthèse${suffixS2}, inventaire état projeté (2e tableau)`,
              `⚠️ À vérifier manuellement : aucune attestation CEE trouvée pour ce chantier (adresse « ${synthese.adresse || ''} »).`,
              syntheseIndex + 1);
          } else if (attestation && attestation.secteurActivite) {
            const activiteOk = compareSecteurEtude(synthese.activiteBatiment, attestation.secteurActivite);
            const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
            const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';

            checks.push({
              id: `check_23${idSuffix}`,
              categorie: 'synthese',
              niveau: activiteOk ? 'ok' : 'majeur',
              champ: `Activité bâtiment état projeté${suffix}`,
              localisation: `Synthèse${suffix}, inventaire état projeté (2e tableau)`,
              detail: activiteOk ?
                `Activité conforme : ${attestation.secteurActivite}` :
                `Activité bâtiment (${synthese.activiteBatiment || 'non trouvée'}) ≠ Secteur CEE (${attestation.secteurActivite})`,
              valeur_attendue: attestation.secteurActivite || '',
              valeur_trouvee: synthese.activiteBatiment || '',
              chantierIndex: syntheseIndex + 1
            });
          } else if (nbChantiersDocumentaires === 1) {
            // Fallback mono-chantier (id suffixé + chantierIndex : fin de l'« id nu » qui pouvait
            // entrer en collision et se rattacher au mauvais chantier — dette D1/#5 ; en mono
            // 1 synthèse, idSuffixS2 = '' → id 'check_23' inchangé).
            checks.push({
              id: `check_23${idSuffixS2}`,
              categorie: 'synthese',
              niveau: compareSecteurEtude(synthese.activiteBatiment, references.typeLocal) ? 'ok' : 'majeur',
              champ: `Activité bâtiment état projeté (2e tableau)${suffixS2}`,
              localisation: `Synthèse${suffixS2}, inventaire état projeté`,
              detail: 'Vérification activité bâtiment',
              valeur_attendue: references.typeLocal || '',
              valeur_trouvee: synthese.activiteBatiment || '',
              chantierIndex: syntheseIndex + 1
            });
          }
        });
      } else if (nbChantiersDocumentaires === 1) {
        checks.push({
          id: 'check_23',
          categorie: 'synthese',
          niveau: compareSecteurEtude(firstSynthese.activiteBatiment, references.typeLocal) ? 'ok' : 'majeur',
          champ: 'Activité bâtiment état projeté (2e tableau)',
          localisation: 'Synthèse, inventaire état projeté',
          detail: 'Vérification activité bâtiment',
          valeur_attendue: references.typeLocal || '',
          valeur_trouvee: firstSynthese.activiteBatiment || ''
        });
      }

      // ========== AUDIT - Page description (24-27) - PAR CHANTIER ==========
      norm.audits.forEach((audit, auditIndex) => {
        const suffix = norm.audits.length > 1 ? ` chantier ${auditIndex + 1}` : '';
        const idSuffix = norm.audits.length > 1 ? `_c${auditIndex + 1}` : '';
        const chantierIndex = auditIndex + 1;
        const syntheseCorrespondante = norm.syntheses[auditIndex] || {};

        checks.push({
          id: `check_24${idSuffix}`,
          categorie: 'audit',
          niveau: compareStrings(audit.nom, references.nom) ? 'ok' : 'majeur',
          champ: `Site Audit description${suffix}`,
          localisation: `Audit${suffix}, description`,
          detail: 'Vérification site = client',
          valeur_attendue: references.nom || '',
          valeur_trouvee: audit.nom || '',
          chantierIndex
        });

        // Check 25 : Adresse Audit description
        // Apparier au CHANTIER CEE par ADRESSE (guichet regroupé + fallback adressesChantiers), jamais
        // par index brut sur les attestations (grain BÂTIMENT) : sinon audit[i] tombe sur le i-ème
        // bâtiment ≠ i-ème chantier (bug #27 : Grozeille comparé à « Lauriol BAT 2 »).
        const adressesChantiersCEE = attestationsRegroupees.map(g => g.adresse)
          .concat(norm.cee?.adressesChantiers || []);
        const refCEE = adressesChantiersCEE.find(a => compareAddress(audit.adresse, a));
        const adresseMatch = refCEE !== undefined; // find() → undefined si aucun match (robuste même si adresse falsy)
        const adresseChantierCEE = refCEE || adressesChantiersCEE.filter(a => a && a.trim()).join(' | ') || '';

        checks.push({
          id: `check_25${idSuffix}`,
          categorie: 'audit',
          niveau: adresseMatch ? 'ok' : 'majeur',
          champ: `Adresse Audit description${suffix}`,
          localisation: `Audit${suffix}, description`,
          detail: adresseMatch ? 'Vérification adresse' : '❌ Adresse Audit absente des chantiers du CEE',
          valeur_attendue: adresseChantierCEE,
          valeur_trouvee: audit.adresse || '',
          chantierIndex
        });

        checks.push({
          id: `check_26${idSuffix}`,
          categorie: 'audit',
          niveau: compareSIRET(audit.siret, references.siret) ? 'ok' : 'majeur',
          champ: `SIRET Audit description${suffix}`,
          localisation: `Audit${suffix}, description`,
          detail: 'Vérification SIRET',
          valeur_attendue: references.siret || '',
          valeur_trouvee: audit.siret || '',
          chantierIndex
        });

        // Check 27 : Surface Audit = Surface Synthèse (tolérance ±1 m²)
        const surfaceAuditOk = audit.surfaces && syntheseCorrespondante.surfaceEclairee ?
          Math.abs(sumSurfaces(audit.surfaces) - parseFloat(String(syntheseCorrespondante.surfaceEclairee).replace(/[^\d.,]/g, '').replace(',', '.'))) < 1 :
          false;
        checks.push({
          id: `check_27${idSuffix}`,
          categorie: 'audit',
          niveau: surfaceAuditOk ? 'ok' : 'info',
          champ: `Surface Audit description${suffix}`,
          localisation: `Audit${suffix}, description`,
          detail: 'Vérification surface éclairée (check manuel requis)',
          valeur_attendue: syntheseCorrespondante.surfaceEclairee || '',
          valeur_trouvee: audit.surfaces ? audit.surfaces.join(' + ') : '',
          chantierIndex
        });
      });

      // Check 28-29 : Désactivés en multi-chantiers (déjà vérifiés par checks globaux)
      if (nbChantiersDocumentaires === 1) {
        const ledInitialOk = compareStrings(firstAudit.ledInitial, references.totalLed);
        checks.push({
          id: 'check_28',
          categorie: 'audit',
          niveau: ledInitialOk ? 'ok' : 'majeur',
          champ: 'État initial nombre LED Audit',
          localisation: 'Audit, description',
          detail: ledInitialOk ? 'Nombre LED initial conforme' : 'Nombre LED initial différent',
          valeur_attendue: references.totalLed || '',
          valeur_trouvee: firstAudit.ledInitial || ''
        });

        const ledFinalOk = compareStrings(firstAudit.ledFinal, references.totalLed);
        checks.push({
          id: 'check_29',
          categorie: 'audit',
          niveau: ledFinalOk ? 'ok' : 'majeur',
          champ: 'État projeté nombre LED Audit',
          localisation: 'Audit, description',
          detail: ledFinalOk ? 'Nombre LED projeté conforme' : 'Nombre LED projeté différent',
          valeur_attendue: references.totalLed || '',
          valeur_trouvee: firstAudit.ledFinal || ''
        });
      }

      // ========== AUDIT - Liste luminaires (30) ==========
      // Check 30 : Désactivé en multi-chantiers (déjà vérifié par checks globaux)
      if (nbChantiersDocumentaires === 1) {
        const pceLuminairesOk = compareStrings(firstAudit.pceLuminaires, references.totalLed);
        checks.push({
          id: 'check_30',
          categorie: 'audit',
          niveau: pceLuminairesOk ? 'ok' : 'majeur',
          champ: 'Pce total liste luminaires Audit',
          localisation: 'Audit, liste des luminaires',
          detail: pceLuminairesOk ? 'Total pce conforme' : 'Total pce différent',
          valeur_attendue: references.totalLed || '',
          valeur_trouvee: firstAudit.pceLuminaires || ''
        });
      }

      // ========== MENTION AGRICOLE (31) — check global unique, couvre Audit + Synthèse ==========
      const mentionsAgri = checkMentionsAgricoles(extracted, references.nom);

      checks.push({
        id: 'check_31',
        portee: 'global-cee',
        categorie: 'synthese',
        niveau: mentionsAgri.found ? 'majeur' : 'ok',
        champ: 'Mention agricole (Audit + Synthèse)',
        localisation: mentionsAgri.location || 'Audit + Synthèse',
        detail: mentionsAgri.found ? `Mention agricole trouvée : ${mentionsAgri.location}` : 'Aucune mention agricole (Audit + Synthèses)',
        valeur_attendue: 'Aucune mention agricole',
        valeur_trouvee: mentionsAgri.found ? 'Mention trouvée' : 'Conforme'
      });

      // ========== CHECKS 35-38 : THD, Fiche technique, Référence, Durée de vie ==========
      // Récupérer la fiche technique sélectionnée
      const ficheSelected = FICHES_TECHNIQUES[references.refLed] || FICHES_TECHNIQUES.DAEWOO;

      // ========== CHECK 35 : THD Synthèse - PAR CHANTIER ==========
      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        if (references.refLed === 'DAEWOO') {
          const thdOk = compareNumber(synthese.thd, ficheSelected.thd + '%');
          checks.push({
            id: `check_35${idSuffix}`,
            categorie: 'synthese',
            niveau: thdOk ? 'ok' : 'majeur',
            champ: `THD Synthèse caractéristiques luminaires${suffix}`,
            localisation: `Synthèse${suffix} + CEE, caractéristiques luminaires`,
            detail: thdOk ? `THD = ${ficheSelected.thd}% conforme` : `THD différent de ${ficheSelected.thd}%`,
            valeur_attendue: `${ficheSelected.thd}%`,
            valeur_trouvee: synthese.thd || '',
            chantierIndex
          });
        } else {
          // Pour TECH : pas de vérification THD
          checks.push({
            id: `check_35${idSuffix}`,
            categorie: 'synthese',
            niveau: 'info',
            champ: `THD Synthèse caractéristiques luminaires${suffix}`,
            localisation: `Synthèse${suffix} + CEE, caractéristiques luminaires`,
            detail: 'Pas de vérification THD pour référence TECH',
            valeur_attendue: 'N/A',
            valeur_trouvee: synthese.thd || 'N/A',
            chantierIndex
          });
        }
      });

      // ========== CHECK 36 : Fiche technique LED - GLOBAL (une seule fiche pour tout le dossier) ==========
      // Vérifier d'abord si la référence produit est OK quelque part (pour déterminer le niveau)
      const refProduitOkGlobal = norm.syntheses.some(s => compareProductRef(s.referenceProduit, ficheSelected.nom)) ||
                                 norm.audits.some(a => compareProductRef(a.pceLuminaires, ficheSelected.nom));

      const ficheTechOk = extracted.ficheTechnique?.reference || extracted.ficheTechnique?.thd;

      if (references.refLed === 'DAEWOO') {
        const ficheTechThdOk = compareNumber(extracted.ficheTechnique?.thd, ficheSelected.thd + '%');
        const niveauFiche = (ficheTechOk && ficheTechThdOk) ? 'ok' :
                           (!ficheTechOk && refProduitOkGlobal) ? 'info' : 'majeur';
        checks.push({
          id: 'check_36',
          portee: 'global-synthese',
          categorie: 'synthese',
          niveau: niveauFiche,
          champ: 'Fiche technique LED',
          localisation: `Synthèse page ~14 (globale)`,
          detail: ficheTechOk ?
            (ficheTechThdOk ? `Fiche présente + THD ${ficheSelected.thd}%` : 'Fiche présente mais THD incorrect') :
            (refProduitOkGlobal ? 'Fiche technique non trouvée (vérifier manuellement si image)' : 'Fiche technique non trouvée'),
          valeur_attendue: `Présente + THD ${ficheSelected.thd}%`,
          valeur_trouvee: `${extracted.ficheTechnique?.reference || 'N/A'} | THD: ${extracted.ficheTechnique?.thd || 'N/A'}`
        });
      } else {
        // Pour TECH : juste vérifier présence
        const niveauFiche = ficheTechOk ? 'ok' : (refProduitOkGlobal ? 'info' : 'majeur');
        checks.push({
          id: 'check_36',
          portee: 'global-synthese',
          categorie: 'synthese',
          niveau: niveauFiche,
          champ: 'Fiche technique LED',
          localisation: `Synthèse page ~14 (globale)`,
          detail: ficheTechOk ?
            'Fiche technique présente' :
            (refProduitOkGlobal ? 'Fiche technique non trouvée (vérifier manuellement si image)' : 'Fiche technique non trouvée'),
          valeur_attendue: 'Présente',
          valeur_trouvee: extracted.ficheTechnique?.reference || 'N/A'
        });
      }

      // ========== CHECK 37 : Référence produit - PAR CHANTIER ==========
      norm.audits.forEach((audit, auditIndex) => {
        const suffix = norm.audits.length > 1 ? ` chantier ${auditIndex + 1}` : '';
        const idSuffix = norm.audits.length > 1 ? `_c${auditIndex + 1}` : '';
        const chantierIndex = auditIndex + 1;
        const syntheseCorrespondante = norm.syntheses[auditIndex] || {};

        const refProduitOk = compareProductRef(syntheseCorrespondante.referenceProduit, ficheSelected.nom) ||
                            compareProductRef(audit.pceLuminaires, ficheSelected.nom);

        checks.push({
          id: `check_37${idSuffix}`,
          categorie: 'audit',
          niveau: refProduitOk ? 'ok' : 'majeur',
          champ: `Référence produit${suffix}`,
          localisation: `Audit${suffix} + Synthèse${suffix} luminaires`,
          detail: refProduitOk ? 'Référence produit conforme' : 'Référence produit différente',
          valeur_attendue: ficheSelected.nom,
          valeur_trouvee: syntheseCorrespondante.referenceProduit || audit.pceLuminaires || '',
          chantierIndex
        });
      });

      // ========== CHECK 38 : Durée de vie luminaires - PAR CHANTIER ==========
      norm.syntheses.forEach((synthese, syntheseIndex) => {
        const suffix = norm.syntheses.length > 1 ? ` chantier ${syntheseIndex + 1}` : '';
        const idSuffix = norm.syntheses.length > 1 ? `_c${syntheseIndex + 1}` : '';
        const chantierIndex = syntheseIndex + 1;

        const dureeVieOk = compareNumber(synthese.dureeVie, ficheSelected.dureeVie);
        checks.push({
          id: `check_38_duree_vie${idSuffix}`,
          categorie: 'synthese',
          niveau: dureeVieOk ? 'ok' : 'majeur',
          champ: `Durée de vie luminaires${suffix}`,
          localisation: `Synthèse${suffix}, inventaire du projet`,
          detail: dureeVieOk ? `Durée de vie conforme : ${ficheSelected.dureeVie}h` : `Durée de vie différente de ${ficheSelected.dureeVie}h`,
          valeur_attendue: `${ficheSelected.dureeVie}h`,
          valeur_trouvee: synthese.dureeVie ? `${synthese.dureeVie}h` : '',
          chantierIndex
        });
      });

      // ========== CHECK 39 : COHÉRENCE NOMBRE DE CHANTIERS ==========
      const nbAudits = norm.audits.length;
      const nbSyntheses = norm.syntheses.length;
      const nbAttestations = (norm.cee?.attestations || []).length;
      const nbChantiersCoherent = (nbAudits === nbSyntheses) && (nbSyntheses === nbAttestations);
      // #27 : ne JAMAIS regrouper les attestations avant de compter (masquerait une vraie collision
      // d'adresses = faux conforme silencieux). Mais un SURPLUS d'attestations qui se replie
      // proprement sur les chantiers documentaires (plusieurs bâtiments à la même adresse, ex.
      // COPPIN 2 attestations / 1 chantier) est une ambiguïté LÉGITIME → 'info' « à vérifier »
      // (jamais vert), plus un faux « majeur ». Un manque (DELEFORTRIE) reste majeur.
      const surplusReplieProprement = !nbChantiersCoherent && (nbAudits === nbSyntheses)
        && nbAttestations > nbAudits && attestationsRegroupees.length === nbAudits;

      checks.push({
        id: 'check_39',
        portee: 'global-cee',
        categorie: 'global',
        niveau: nbChantiersCoherent ? 'ok' : (surplusReplieProprement ? 'info' : 'majeur'),
        champ: 'Cohérence nombre de chantiers',
        localisation: 'Global - Audits / Synthèses / Attestations CEE',
        detail: nbChantiersCoherent ?
          `Nombre cohérent : ${nbAudits} chantier(s) détecté(s)` :
          (surplusReplieProprement ?
            `⚠️ À vérifier : ${nbAttestations} attestation(s) CEE pour ${nbAudits} chantier(s) (audits = synthèses) — plusieurs bâtiments par chantier possibles (${attestationsRegroupees.length} adresse(s) après regroupement)` :
            `⚠️ Incohérence détectée : ${nbAudits} audit(s), ${nbSyntheses} synthèse(s), ${nbAttestations} attestation(s) CEE`),
        valeur_attendue: `${nbAudits} = ${nbSyntheses} = ${nbAttestations}`,
        valeur_trouvee: nbChantiersCoherent ? 'Cohérent ✓' : `Audits: ${nbAudits}, Synthèses: ${nbSyntheses}, CEE: ${nbAttestations}`
      });

      // ========== CHECKS 41-42 : VÉRIFICATIONS FINANCIÈRES ET ADMINISTRATIVES ==========

      // Si l'extraction n'a renvoyé aucun objet CEE, les checks 41/42 (adresse siège,
      // date de signature) n'ont plus de quoi se comparer : on émet UN signal explicite
      // au lieu de deux lignes trompeuses (faux échec, ou faux "conforme" si les références
      // sont vides aussi). Niveau majeur, jamais bloquant (§1 : seule la page de garde Audit bloque).
      if (!norm.cee) {
        checks.push({
          id: 'check_cee_incomplet',
          portee: 'global-cee',
          categorie: 'cee',
          niveau: 'majeur',
          champ: 'Extraction du Dossier CEE',
          localisation: 'Dossier CEE',
          detail: '⚠️ Extraction CEE incomplète — réimporter le Dossier CEE',
          valeur_attendue: 'Données du Dossier CEE extraites',
          valeur_trouvee: 'Aucune donnée CEE extraite'
        });
      } else {
        // Check 41 : Adresse siège social
        const adresseSiegeOk = compareAddress(norm.cee?.adresseSiege, references.adresseSiege);
        checks.push({
          id: 'check_41',
          portee: 'global-cee',
          categorie: 'audit',
          niveau: adresseSiegeOk ? 'ok' : 'majeur',
          champ: 'Adresse siège social Dossier CEE',
          localisation: 'Dossier CEE, haut à droite',
          detail: adresseSiegeOk ? 'Adresse siège conforme' : 'Adresse siège différente de la référence',
          valeur_attendue: references.adresseSiege || '',
          valeur_trouvee: norm.cee?.adresseSiege || ''
        });

        // Check 42 : Date de signature
        const dateSignatureOk = compareDate(norm.cee?.dateSignature, references.dateSignature);
        checks.push({
          id: 'check_42',
          portee: 'global-cee',
          categorie: 'synthese',
          niveau: dateSignatureOk ? 'ok' : 'majeur',
          champ: 'Date de signature / Date d\'engagement Dossier CEE',
          localisation: 'Dossier CEE, informations engagement',
          detail: dateSignatureOk ?
            'Date de signature conforme' :
            `Date différente : ${norm.cee?.dateSignature || 'non trouvée'} vs référence ${references.dateSignature || ''}`,
          valeur_attendue: references.dateSignature || '',
          valeur_trouvee: norm.cee?.dateSignature || ''
        });
      }

      // ========== VÉRIFICATIONS ATTESTATIONS SUR L'HONNEUR + SURFACES ==========

      // Check 43 : Attestation(s) sur l'honneur présente(s) (check manuel si absente)
      const attestations = norm.cee?.attestations || [];
      const attestationsPresentes = attestations.length > 0;
      checks.push({
        id: 'check_43',
        portee: 'global-cee',
        categorie: 'audit',
        niveau: attestationsPresentes ? 'ok' : 'info',
        champ: 'Attestation(s) sur l\'honneur',
        localisation: 'Dossier CEE, attestation entrepôt non agricole BAT-EQ-127',
        detail: attestationsPresentes ?
          `${attestations.length} attestation(s) sur l'honneur présente(s) et surfaces détectées` :
          '⚠️ Check manuel requis : vérifier si attestation sur l\'honneur nécessaire',
        valeur_attendue: attestationsPresentes ? 'Présent' : 'Check manuel',
        valeur_trouvee: attestationsPresentes ? `${attestations.length} attestation(s)` : 'Non détecté'
      });

      // Si attestations présentes, vérifier les surfaces par chantier
      if (attestationsPresentes) {
        // NOUVELLE LOGIQUE : Grouper les attestations par adresse (chantier)
        // Car plusieurs attestations peuvent avoir la MÊME adresse (même chantier, bâtiments différents)

        // Normaliser les adresses des attestations (comme pour la détection des chantiers)
        const attestationsNormalized = attestations.map((att, idx) => {
          return {
            original: att,
            // Clé de regroupement unifiée (rue+ville+CP, sans bâtiment NI parcelle) — même
            // normalisation que le reste du moteur (ADR-014 §S0)
            normalizedAddress: normaliserAdresseSansBatiment(att.adresse || ''),
            index: idx
          };
        });

        // Grouper par adresse normalisée
        const attestationsByChantier = new Map();
        attestationsNormalized.forEach(attNorm => {
          if (!attestationsByChantier.has(attNorm.normalizedAddress)) {
            attestationsByChantier.set(attNorm.normalizedAddress, []);
          }
          attestationsByChantier.get(attNorm.normalizedAddress).push(attNorm);
        });

        console.log(`\n=== GROUPEMENT DES ATTESTATIONS PAR CHANTIER ===`);
        console.log(`Total attestations: ${attestations.length}`);
        console.log(`Chantiers uniques: ${attestationsByChantier.size}`);

        // Pour chaque chantier unique
        let chantierIndex = 0;
        attestationsByChantier.forEach((attestationsGroupe, adresseNormalisee) => {
          const chantierAdresse = attestationsGroupe[0].original.adresse || '';

          // SOMMER TOUTES les surfaces des attestations de ce chantier
          const toutesLesSurfaces = [];
          attestationsGroupe.forEach(attNorm => {
            const surfaces = attNorm.original.surfaces || [];
            toutesLesSurfaces.push(...surfaces);
          });
          const sommeAttestationTotale = sumSurfaces(toutesLesSurfaces);

          // Bâtiment de secteur « Autres » (non entrepôt) à cette adresse : sa surface compte dans la
          // synthèse/audit mais il n'a pas d'attestation entrepôt propre → l'écart somme-attestations vs
          // surface devient AMBIGU → « à vérifier » (info), jamais majeur (rouge trompeur) ni conforme
          // silencieux (principe n°1). Détection via detectAutresSecteurs (MÊME logique métier que la
          // Règle A), et NON via des libellés bruts distincts (2 entrepôts de libellés différents ≠ Autres).
          const aBatimentAutresSecteur = detectAutresSecteurs(
            attestationsGroupe.map(a => a.original)
          ).autresSecteurs.length > 0;

          console.log(`\nChantier ${chantierIndex + 1} : ${chantierAdresse}`);
          console.log(`  - Nombre d'attestations pour ce chantier: ${attestationsGroupe.length}`);
          console.log(`  - Surfaces combinées: ${toutesLesSurfaces.join(' + ')} = ${sommeAttestationTotale} m²`);

          const surfacesAttestation = toutesLesSurfaces;

          // Grain CHANTIER (adresses regroupées), pas attestations brutes : COPPIN a 2 attestations
          // mais 1 seul chantier → pas de libellé « (Chantier 1 : …) » trompeur (dette D1/#6).
          const nbChantiers = attestationsByChantier.size;
          const chantierLabel = nbChantiers > 1 ?
            ` (Chantier ${chantierIndex + 1} : ${chantierAdresse.substring(0, 30)}...)` :
            '';

          // ⚠️ VÉRIFICATION CRITIQUE : Attestations vides → Saisie manuelle requise
          if (toutesLesSurfaces.length === 0 || sommeAttestationTotale === 0) {
            console.warn(`⚠️ Chantier ${chantierIndex + 1}: Aucune surface d'attestation trouvée → Saisie manuelle requise`);

            checks.push({
              id: `check_attestation_manquante_${chantierIndex}`,
              categorie: 'cee',
              niveau: 'info',
              champ: `Attestation CEE manquante${chantierLabel}`,
              localisation: `Dossier CEE - Chantier ${chantierIndex + 1} : ${chantierAdresse}`,
              detail: '⚠️ Saisie manuelle requise : Aucune attestation sur l\'honneur trouvée (CEE BAT-EQ-127 "Existence d\'un entrepôt") ou surfaces non extraites. Veuillez saisir la surface totale manuellement ci-dessous.',
              valeur_attendue: 'Saisie manuelle',
              valeur_trouvee: 'Attestation non trouvée',
              chantierIndex: chantierIndex + 1
            });

            // Passer au chantier suivant sans générer les checks 42, 45, 45b
            chantierIndex++;
            return;
          }

          // Trouver l'audit correspondant PAR INDEX (pas par adresse)
          const auditCorrespondant = norm.audits[chantierIndex] || null;
          console.log(`\n=== CHANTIER ${chantierIndex + 1} - ${chantierAdresse} ===`);
          console.log('Audit correspondant (par index):', auditCorrespondant ? auditCorrespondant.adresse : 'NON TROUVÉ');

          // Trouver la synthèse correspondante PAR INDEX (pas par adresse)
          const syntheseCorrespondante = norm.syntheses[chantierIndex] || null;
          console.log('Synthèse correspondante (par index):', syntheseCorrespondante ? syntheseCorrespondante.adresse : 'NON TROUVÉE');

          // Check 42 : Audit trouvé pour ce chantier (PAR INDEX)
          if (!auditCorrespondant) {
            checks.push({
              id: `check_42_${chantierIndex}`,
              categorie: 'audit',
              niveau: 'majeur',
              champ: `Audit correspondant${chantierLabel}`,
              localisation: `Chantier ${chantierIndex + 1} - ${chantierAdresse}`,
              detail: `⚠️ Audit manquant : attendu à la position ${chantierIndex + 1} mais non extrait par Claude`,
              valeur_attendue: `Audit ${chantierIndex + 1} pour ${chantierAdresse}`,
              valeur_trouvee: 'Audit non extrait',
              chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
            });
          } else {
            // Check 42a : Adresse audit correspond à l'adresse CEE
            const adresseMatch = compareAddress(auditCorrespondant.adresse, chantierAdresse);
            if (!adresseMatch) {
              checks.push({
                id: `check_42a_${chantierIndex}`,
                categorie: 'audit',
                niveau: 'majeur',
                champ: `Adresse Audit${chantierLabel}`,
                localisation: `Audit ${chantierIndex + 1}, page 1`,
                detail: `❌ Adresse audit différente de l'adresse chantier CEE`,
                valeur_attendue: chantierAdresse,
                valeur_trouvee: auditCorrespondant.adresse || '',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });
            }
            const surfacesAudit = auditCorrespondant.surfaces || [];
            const sommeAudit = sumSurfaces(surfacesAudit);

            if (surfacesAudit.length === 0 || sommeAudit === 0) {
              // Surfaces audit non trouvées → check manuel
              checks.push({
                id: `check_42_${chantierIndex}`,
                categorie: 'audit',
                niveau: 'info',
                champ: `Surfaces Audit observations préliminaires${chantierLabel}`,
                localisation: 'Audit description observations préliminaires',
                detail: '⚠️ Check manuel requis : surfaces non trouvées dans observations préliminaires de l\'audit. Vérifier manuellement.',
                valeur_attendue: 'Check manuel',
                valeur_trouvee: 'Non trouvées',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });
            } else {
              // Check 42 : NE PLUS comparer les listes (car audit peut ne pas avoir toutes les surfaces)
              // On compare SEULEMENT les sommes maintenant

              // Check 44 : Somme Audit = Somme attestation
              const sommesAuditMatch = Math.abs(sommeAttestationTotale - sommeAudit) < 1; // Tolérance 1 m²

              checks.push({
                id: `check_45_audit_${chantierIndex}`,
                categorie: 'audit',
                niveau: sommesAuditMatch ? 'ok' : (aBatimentAutresSecteur ? 'info' : 'majeur'),
                champ: `Somme surfaces Audit = Somme attestation${chantierLabel}`,
                localisation: `Total Audit observations vs Total attestation honneur chantier ${chantierIndex + 1}`,
                detail: sommesAuditMatch ?
                  `Somme Audit cohérente avec attestation : ${sommeAttestationTotale} m²` :
                  (aBatimentAutresSecteur ?
                    `⚠️ À vérifier : ce chantier contient un bâtiment de secteur différent (« Autres ») dont la surface compte dans l'audit mais pas dans les attestations entrepôt → écart possiblement légitime. Somme Audit ${sommeAudit} m² vs attestations ${sommeAttestationTotale} m².` :
                    `Somme Audit (${sommeAudit} m²) différente de l'attestation (${sommeAttestationTotale} m²)`),
                valeur_attendue: surfacesAttestation.join(' + ') + ' = ' + sommeAttestationTotale.toString() + ' m²',
                valeur_trouvee: surfacesAudit.join(' + ') + ' = ' + sommeAudit.toString() + ' m²',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });
            }
          }

          // Check 45 : Somme surfaces attestations = surface éclairée synthèse (par chantier)
          if (!syntheseCorrespondante) {
            checks.push({
              id: `check_synthese_manquante_${chantierIndex}`,
              categorie: 'synthese',
              niveau: 'majeur',
              champ: `Synthèse correspondante${chantierLabel}`,
              localisation: `Chantier ${chantierIndex + 1} - ${chantierAdresse}`,
              detail: `⚠️ Synthèse manquante : attendue à la position ${chantierIndex + 1} mais non extraite par Claude`,
              valeur_attendue: `Synthèse ${chantierIndex + 1} pour ${chantierAdresse}`,
              valeur_trouvee: 'Synthèse non extraite',
              chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
            });
          } else {
            // Check 45a : Adresse synthèse correspond à l'adresse CEE
            const adresseMatch = compareAddress(syntheseCorrespondante.adresse, chantierAdresse);
            if (!adresseMatch) {
              checks.push({
                id: `check_44a_${chantierIndex}`,
                categorie: 'synthese',
                niveau: 'majeur',
                champ: `Adresse Synthèse${chantierLabel}`,
                localisation: `Synthèse ${chantierIndex + 1}, fiche identité`,
                detail: `❌ Adresse synthèse différente de l'adresse chantier CEE`,
                valeur_attendue: chantierAdresse,
                valeur_trouvee: syntheseCorrespondante.adresse || '',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });
            }
            const surfaceSynthese = syntheseCorrespondante.surfaceEclairee || '';
            const surfaceSyntheseNum = parseFloat(String(surfaceSynthese).replace(/\s+/g, '').replace(/m²/g, '').replace(/,/g, '.')) || 0;

            if (!surfaceSynthese || surfaceSyntheseNum === 0) {
              // Surface éclairée non trouvée → check manuel
              checks.push({
                id: `check_45_synthese_${chantierIndex}`,
                categorie: 'synthese',
                niveau: 'info',
                champ: `Surface éclairée Synthèse${chantierLabel}`,
                localisation: 'Synthèse fiche identité surface éclairée',
                detail: '⚠️ Check manuel requis : surface éclairée non trouvée dans la synthèse. Vérifier manuellement.',
                valeur_attendue: 'Check manuel',
                valeur_trouvee: 'Non trouvée',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });
            } else {
              const sommeSyntheseMatch = Math.abs(sommeAttestationTotale - surfaceSyntheseNum) < 1; // Tolérance 1 m²

              checks.push({
                id: `check_45_synthese_${chantierIndex}`,
                categorie: 'synthese',
                niveau: sommeSyntheseMatch ? 'ok' : (aBatimentAutresSecteur ? 'info' : 'majeur'),
                champ: `Surface Synthèse = Somme attestation${chantierLabel}`,
                localisation: `Synthèse fiche identité vs Attestation honneur chantier ${chantierIndex + 1}`,
                detail: sommeSyntheseMatch ?
                  `Surface Synthèse cohérente avec attestation : ${sommeAttestationTotale} m²` :
                  (aBatimentAutresSecteur ?
                    `⚠️ À vérifier : ce chantier contient un bâtiment de secteur différent (« Autres ») dont la surface compte dans la synthèse mais pas dans les attestations entrepôt → écart possiblement légitime. Surface Synthèse ${surfaceSyntheseNum} m² vs attestations ${sommeAttestationTotale} m².` :
                    `Surface Synthèse (${surfaceSyntheseNum} m²) différente de l'attestation (${sommeAttestationTotale} m²)`),
                valeur_attendue: surfacesAttestation.join(' + ') + ' = ' + sommeAttestationTotale.toString() + ' m²',
                valeur_trouvee: surfaceSyntheseNum.toString() + ' m²',
                chantierIndex: chantierIndex + 1 // ⭐ Chantier détecté depuis la case d'import
              });

              // Check 45b : Vérification INDIVIDUELLE des surfaces par bâtiment (tableau détaillé Synthèse vs attestations)
              if (syntheseCorrespondante.surfacesDetaillees && Array.isArray(syntheseCorrespondante.surfacesDetaillees) && syntheseCorrespondante.surfacesDetaillees.length > 0) {

                // ⚠️ Vérifier que les attestations ont des surfaces (sécurité, normalement déjà géré par le return plus haut)
                if (!surfacesAttestation || surfacesAttestation.length === 0) {
                  checks.push({
                    id: `check_45b_${chantierIndex}`,
                    categorie: 'synthese',
                    niveau: 'info',
                    champ: `Surfaces détaillées Synthèse (saisie manuelle requise)${chantierLabel}`,
                    localisation: `Synthèse page 10, tableau 5.1`,
                    detail: `⚠️ Surfaces détaillées trouvées dans la Synthèse mais pas d'attestation de référence. Saisie manuelle requise pour vérification.`,
                    valeur_attendue: 'Saisie manuelle',
                    valeur_trouvee: `${syntheseCorrespondante.surfacesDetaillees.length} surface(s) dans tableau`,
                    chantierIndex: chantierIndex + 1
                  });
                } else {
                  const surfacesDetailleesNum = syntheseCorrespondante.surfacesDetaillees.map(s =>
                    parseFloat(String(s).replace(/\s+/g, '').replace(/m²/g, '').replace(/,/g, '.')) || 0
                  );
                  const surfacesAttestationNum = surfacesAttestation.map(s =>
                    parseFloat(String(s).replace(/\s+/g, '').replace(/m²/g, '').replace(/,/g, '.')) || 0
                  );

                // Vérifier que les deux tableaux ont la même longueur
                if (surfacesDetailleesNum.length === surfacesAttestationNum.length) {
                  // Comparer chaque surface individuellement
                  surfacesDetailleesNum.forEach((surfaceSynthese, batIndex) => {
                    const surfaceAttestation = surfacesAttestationNum[batIndex];
                    const surfaceOk = Math.abs(surfaceSynthese - surfaceAttestation) < 1; // Tolérance 1 m²

                    if (!surfaceOk) {
                      checks.push({
                        id: `check_45b_${chantierIndex}_bat${batIndex + 1}`,
                        categorie: 'synthese',
                        niveau: 'majeur',
                        champ: `Surface bâtiment ${batIndex + 1} Synthèse vs Attestation${chantierLabel}`,
                        localisation: `Synthèse page 10, tableau 5.1 INVENTAIRE, ligne ${batIndex + 1}`,
                        detail: `Surface bâtiment ${batIndex + 1} différente : ${surfaceSynthese} m² (Synthèse tableau) vs ${surfaceAttestation} m² (Attestation)`,
                        valeur_attendue: surfaceAttestation.toString() + ' m²',
                        valeur_trouvee: surfaceSynthese.toString() + ' m²',
                        chantierIndex: chantierIndex + 1
                      });
                    }
                  });
                  } else {
                    // Nombre de surfaces différent → check manuel
                    checks.push({
                      id: `check_45b_${chantierIndex}`,
                      categorie: 'synthese',
                      niveau: 'info',
                      champ: `Surfaces détaillées Synthèse${chantierLabel}`,
                      localisation: `Synthèse page 10, tableau 5.1`,
                      detail: `⚠️ Check manuel requis : nombre de surfaces différent (Synthèse: ${surfacesDetailleesNum.length}, Attestations: ${surfacesAttestationNum.length})`,
                      valeur_attendue: `${surfacesAttestationNum.length} surfaces`,
                      valeur_trouvee: `${surfacesDetailleesNum.length} surfaces`,
                      chantierIndex: chantierIndex + 1
                    });
                  }
                }
              }
            }
          }

          // Incrémenter l'index du chantier pour le prochain
          chantierIndex++;
        });

        // ===== FILET ANTI-FAUX-CONFORME (ADR-015 étape 2) : surface non ventilable au grain chantier =====
        // A = chantiers attendus (audits/synthèses) ; S = attestations PORTEUSES DE SURFACE.
        // S < A (avec S > 0) ⇒ une (ou plusieurs) attestation(s) surface couvre(nt) plusieurs chantiers :
        // la surface est repliée → impossible de la recouper par chantier. Constat de COMPTAGE, jamais une
        // affirmation (« globale » / « manquante ») : peut être légitime OU une extraction incomplète.
        // Signal DOSSIER (portee:'global-cee'), niveau info → cellule/famille « à vérifier » JAUNE (jamais vert).
        const nbChantiersAttendus = matchChantiers(norm.audits, norm.syntheses).length;
        const nbAttestationsSurface = attestations.filter(att => sumSurfaces(att.surfaces) > 0).length;
        if (nbAttestationsSurface > 0 && nbAttestationsSurface < nbChantiersAttendus) {
          checks.push({
            id: 'check_surface_non_ventilable',
            portee: 'global-cee',
            categorie: 'cee',
            niveau: 'info',
            champ: 'Surface non ventilable par chantier',
            localisation: 'Dossier CEE — attestation(s) entrepôt',
            detail: `⚠️ À vérifier manuellement : ${nbAttestationsSurface} attestation(s) de surface pour ${nbChantiersAttendus} chantiers. La surface ne peut pas être recoupée chantier par chantier — soit une attestation couvre plusieurs chantiers, soit une attestation par chantier n'a pas été extraite. Vérifier la surface de chaque chantier sur le Dossier CEE.`,
            valeur_attendue: `${nbChantiersAttendus} attestation(s) de surface (1 par chantier)`,
            valeur_trouvee: `${nbAttestationsSurface} attestation(s) de surface`
          });
        }
      }

      return checks;
    }

    // Générer le message auditeur
    function buildMessageAuditeur(checks) {
      const bloquants = checks.filter(c => c.niveau === 'bloquant');
      const majeurs = checks.filter(c => c.niveau === 'majeur');

      let message = 'RAPPORT DE VÉRIFICATION CEE\n\n';

      if (bloquants.length > 0) {
        message += `⛔ ERREURS BLOQUANTES (${bloquants.length}) - Corrections obligatoires avant envoi client :\n`;
        bloquants.forEach((c, i) => {
          message += `${i + 1}. ${c.champ} : ${c.detail}\n`;
        });
        message += '\n';
      }

      if (majeurs.length > 0) {
        message += `⚠️ ERREURS MAJEURES (${majeurs.length}) - À corriger pour finaliser le dossier :\n`;
        majeurs.forEach((c, i) => {
          message += `${i + 1}. ${c.champ} : ${c.detail}\n`;
        });
        message += '\n';
      }

      if (bloquants.length === 0 && majeurs.length === 0) {
        message += '✅ Dossier conforme - Aucune erreur détectée\n';
      }

      message += '\n🤖 Analyse générée par CEE Vérif';

      return message;
    }
