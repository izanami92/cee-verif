// io.js — Module 4 de la modularisation (ADR-016, phase B, TODO #3).
// « Entrées/sorties » : 4 fonctions async — apiFetch (enveloppe /api/* : header d'auth + 401→login
// + timeout AbortController ; POINT D'INSERTION UNIQUE de l'authentification K1),
// compareWithGoogleSheet, extractTextFromPDF (pdf.js), ensureCodeNafFromSiret (gate NAF 1.3) —
// extraites BYTE-IDENTIQUES de index.html, aucune logique modifiée (preuve : banc au commit).
// Dépendances REMONTANTES assumées, résolues AU CALL-TIME (cycle M4→index.html acté ADR-016 §3) :
// state (appPassword, googleSheet*), showLogin/showLoginError (401), pdfjsLib (config workerSrc
// restée dans index.html), window.selectedCodeNaf + localStorage 'ceeVerifCodeNaf' (contrat 1.3).
// Script CLASSIQUE (non-module) : les déclarations `function` top-level restent des globales window.
// Interdits (ADR-016 §3) : aucune instruction exécutée au chargement, aucun accès DOM direct.
// (Indentation d'origine du <script> d'index.html conservée — exigence byte-identique.)

    // Enveloppe de fetch pour les routes /api/* : ajoute le header d'auth et rebascule
    // au login sur 401 (mot de passe invalide ou session expirée).
    async function apiFetch(url, options = {}) {
      const headers = Object.assign({}, options.headers, {
        'Authorization': 'Bearer ' + (state.appPassword || '')
      });
      // Timeout anti-pendage : borne l'attente si le réseau/serveur ne répond pas (défaut 30 s).
      // L'analyse (/api/analyze) passe un délai plus long (options.timeoutMs) car elle est lente
      // côté serveur ; on ne veut jamais couper une analyse légitime.
      const timeoutMs = options.timeoutMs || 30000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetch(url, Object.assign({}, options, { headers, signal: controller.signal }));
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error(`Délai dépassé (${Math.round(timeoutMs / 1000)} s) : le serveur ne répond pas. Vérifiez votre connexion et réessayez.`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
      if (response.status === 401) {
        state.appPassword = null;
        sessionStorage.removeItem('app_password');
        showLogin();
        showLoginError('Session expirée ou mot de passe invalide. Reconnectez-vous.');
        throw new Error('Non authentifié (401)');
      }
      return response;
    }

    async function compareWithGoogleSheet(extractedData) {
      if (!state.googleSheetEnabled || !state.googleSheetData) {
        return [];
      }

      console.log('🔍 Comparaison avec Google Sheet...');

      try {
        // Préparer les données CEE pour la comparaison
        const ceeData = {
          nom: extractedData.cee?.nom || '',
          siret: extractedData.cee?.siret || '',
          adresseSiege: extractedData.cee?.adresseSiege || '',
          dateDevis: extractedData.cee?.dateDevis || '',
          dateSignature: extractedData.cee?.dateSignature || '',
          resteAPayer: extractedData.cee?.resteAPayer || '',
          chantiers: (extractedData.cee?.attestations || []).map(att => ({
            adresse: att.adresse || '',
            ledTotal: att.ledTotal || '',
            secteurActivite: att.secteurActivite || ''
          }))
        };

        // Appeler l'API de comparaison
        const response = await apiFetch('/api/compareSheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ceeData,
            sheetData: state.googleSheetData
          })
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la comparaison avec le Google Sheet');
        }

        const result = await response.json();

        console.log(`✅ Comparaison terminée : ${result.checks.length} checks générés`);

        return result.checks || [];

      } catch (error) {
        console.error('Erreur lors de la comparaison Google Sheet:', error);
        return [{
          id: 'sheet_error',
          categorie: 'google_sheet',
          niveau: 'info',
          champ: 'Erreur Google Sheet',
          localisation: 'Google Sheet',
          detail: `Erreur lors de la comparaison : ${error.message}`,
          valeur_attendue: '',
          valeur_trouvee: ''
        }];
      }
    }

    // ========== EXTRACTION PDF ==========
    async function extractTextFromPDF(file) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n\n';
        }

        return fullText;
      } catch (error) {
        console.error('Erreur extraction PDF:', error);
        throw error;
      }
    }

    // Récupère le code NAF du client depuis le SIRET du CEE (API /api/search) si pas déjà connu.
    // Idempotent : no-op si window.selectedCodeNaf est déjà renseigné (garde interne).
    // Extrait du bloc d'enrichissement historique pour pouvoir être appelé AVANT la fenêtre d'alertes.
    async function ensureCodeNafFromSiret(extractedData) {
      if (!(extractedData && extractedData.cee && extractedData.cee.siret && !window.selectedCodeNaf)) {
        return;
      }
      try {
        console.log('🔍 SIRET détecté, récupération automatique du code NAF...');
        const siret = extractedData.cee.siret;
        console.log('   SIRET utilisé:', siret);
        const nafResponse = await apiFetch(`/api/search?q=${encodeURIComponent(siret)}`);

        console.log('   Statut réponse API:', nafResponse.status, nafResponse.statusText);

        if (nafResponse.ok) {
          const nafData = await nafResponse.json();
          console.log('   Réponse API complète:', nafData);
          console.log('   Nombre de résultats:', nafData.results?.length || 0);
          console.log('   Premier résultat:', nafData.results?.[0]);

          if (nafData.results && nafData.results[0] && nafData.results[0].codeNaf) {
            window.selectedCodeNaf = nafData.results[0].codeNaf;
            localStorage.setItem('ceeVerifCodeNaf', nafData.results[0].codeNaf);
            console.log(`✅ Code NAF récupéré automatiquement: ${window.selectedCodeNaf}`);
          } else {
            console.warn('⚠️ Code NAF non trouvé dans la réponse API');
            console.warn('   Structure reçue:', JSON.stringify(nafData, null, 2));
          }
        } else {
          console.warn('⚠️ Erreur HTTP lors de la récupération du NAF:', nafResponse.status);
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la récupération automatique du NAF:', error);
        console.warn('   Message:', error.message);
        // On continue même si ça échoue
      }
    }
