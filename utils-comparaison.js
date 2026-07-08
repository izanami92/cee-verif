// utils-comparaison.js — Module 1 de la modularisation (ADR-016, phase B, TODO #3).
// « Moteur de comparaison » : 21 fonctions PURES (comparaisons, normalisations, parsing),
// extraites BYTE-IDENTIQUES de index.html — aucune logique modifiée (preuve : banc d'identité
// au commit + harnais test-batiments.mjs qui lit désormais CE fichier).
// Script CLASSIQUE (non-module), chargé AVANT le script principal (patron familles-config.js) :
// les déclarations `function` top-level restent des globales window, comme avant l'extraction.
// Interdits (ADR-016 §3) : aucune instruction exécutée au chargement, aucun accès
// state/elements/DOM, aucun appel réseau, aucun id de check.
// (Indentation d'origine du <script> d'index.html conservée — exigence byte-identique.)

    // ========== MOTEUR DE COMPARAISON ==========

    // Normaliser une chaîne : minuscules, espaces nettoyés, trim
    // Normaliser une chaîne : minuscules, espaces nettoyés, trim, Unicode normalisé
    // Normaliser une chaîne : minuscules, espaces, accents supprimés
    function normalize(str) {
      if (!str) return '';

      let strVal = String(str).trim();

      // Traiter "null" comme vide
      if (strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') return '';

      // Remplacer TOUS les caractères accentués directement
      const accents = {
        'à':'a', 'á':'a', 'â':'a', 'ã':'a', 'ä':'a', 'å':'a',
        'è':'e', 'é':'e', 'ê':'e', 'ë':'e',
        'ì':'i', 'í':'i', 'î':'i', 'ï':'i',
        'ò':'o', 'ó':'o', 'ô':'o', 'õ':'o', 'ö':'o',
        'ù':'u', 'ú':'u', 'û':'u', 'ü':'u',
        'ñ':'n', 'ç':'c', 'ÿ':'y'
      };

      strVal = strVal.toLowerCase();
      for (let accent in accents) {
        strVal = strVal.replace(new RegExp(accent, 'g'), accents[accent]);
      }

      const normalized = strVal
        .replace(/\s+/g, ' ')  // Espaces multiples → 1 espace
        .trim();

      return normalized;
    }

    // Parser les surfaces détaillées depuis le texte brut de la Synthèse (section 5.1)
    function parseSurfacesFromSynthese(syntheseText) {
      try {
        // Trouver la section 5.1 (peut être "5.1 INVENTAIRE", "5.1 ETAT PROJETE", etc.)
        const section51Match = syntheseText.match(/5\.1[\s\S]{0,10000}/);
        if (!section51Match) {
          console.warn('⚠️ Section 5.1 introuvable dans le texte de la Synthèse');
          return null;
        }

        const section51 = section51Match[0];

        // Chercher le tableau avec les bâtiments
        // Format : numéro + espaces + activité + espaces + surface (nombre avec possiblement décimales)
        // Exemple: "1   Entrepôt   879   219..."
        // Exemple: "3   Entrepôt   7.23   210..."
        const surfaces = [];

        // Regex multiline : ligne qui commence par un ou plusieurs chiffres,
        // suivi d'espaces, suivi de texte non-espace (l'activité),
        // suivi d'espaces, suivi d'un nombre (la surface, avec ou sans décimales)
        const regex = /^(\d+)\s+\S+\s+(\d+(?:\.\d+)?)/gm;

        let match;
        while ((match = regex.exec(section51)) !== null) {
          surfaces.push(match[2]); // match[2] = la surface
        }

        if (surfaces.length > 0) {
          console.log(`✅ Parser JS: ${surfaces.length} surface(s) trouvée(s) dans section 5.1:`, surfaces);
        }

        return surfaces.length > 0 ? surfaces : null;
      } catch (error) {
        console.error('❌ Erreur lors du parsing des surfaces:', error);
        return null;
      }
    }

    // Comparer deux parcelles cadastrales (supprimer TOUS les espaces, ignorer l'ordre)
    function compareParcelles(val1, val2) {
      const clean = (v) => {
        // Normaliser TOUS les types de tirets vers hyphen-minus standard
        // U+2013 (en dash –), U+2014 (em dash —), U+2212 (minus sign −) → U+002D (hyphen-minus -)
        const normalized = String(v || '')
          .toLowerCase()
          .replace(/[–—−]/g, '-');
        // Séparer les parcelles par virgule, tiret OU espaces multiples
        // Exemples : "000/0A/0671 - 000/0A/0668" ou "000/0A/0671 000/0A/0668"
        const parcelles = normalized
          .split(/[\s,\-]+/)  // Split par espaces, virgules ou tirets (un ou plusieurs)
          .map(p => p.trim())
          .filter(p => p)
          .sort();
        return parcelles.join(',');
      };

      const clean1 = clean(val1);
      const clean2 = clean(val2);
      const result = clean1 === clean2;

      if (!result) {
        console.log(`[compareParcelles] ÉCHEC: "${val1}" (→ "${clean1}") vs "${val2}" (→ "${clean2}")`);
      }

      return result;
    }

    // Comparer secteur d'étude (ignorer chiffres au début + détection Entrepôt/Logistique)
    function compareSecteurEtude(val1, val2) {
      const clean = (v) => {
        let cleaned = String(v || '').trim();
        // Supprimer les chiffres au début
        cleaned = cleaned.replace(/^\d+\s*/, '');
        return normalize(cleaned);
      };

      const clean1 = clean(val1);
      const clean2 = clean(val2);

      // Comparaison directe
      if (clean1 === clean2) return true;

      // Détection Entrepôt/Logistique/Stockage
      const isEntrepot = (str) => {
        const s = str.toLowerCase();
        return s.includes('entrepot') || s.includes('entrepôt') || s.includes('logistique') || s.includes('stockage');
      };

      if (isEntrepot(clean1) && isEntrepot(clean2)) {
        console.log(`[compareSecteurEtude] OK (Entrepôt/Logistique/Stockage): "${val1}" ≈ "${val2}"`);
        return true;
      }

      console.log(`[compareSecteurEtude] ÉCHEC: "${val1}" (→ "${clean1}") vs "${val2}" (→ "${clean2}")`);
      return false;
    }

    // Comparer deux chaînes après normalisation
    // Comparer deux nombres ou pourcentages (compare les valeurs numériques)
    function compareNumber(val1, val2) {
      const clean = (v) => String(v || '').replace(/\s+/g, '').replace(/%/g, '').replace(/,/g, '.');
      const num1 = parseFloat(clean(val1));
      const num2 = parseFloat(clean(val2));

      // Si l'un des deux n'est pas un nombre, comparer les chaînes nettoyées
      if (isNaN(num1) || isNaN(num2)) {
        const clean1 = clean(val1).toLowerCase();
        const clean2 = clean(val2).toLowerCase();
        const result = clean1 === clean2;
        if (!result) {
          console.log(`[compareNumber] ÉCHEC (string): "${val1}" (→ "${clean1}") vs "${val2}" (→ "${clean2}")`);
        }
        return result;
      }

      // Comparer les valeurs numériques (3.7 === 3.70)
      const result = num1 === num2;

      if (!result) {
        console.log(`[compareNumber] ÉCHEC: "${val1}" (→ ${num1}) vs "${val2}" (→ ${num2})`);
      }

      return result;
    }

    function compareStrings(val1, val2) {
      // Deux valeurs absentes ne sont PAS « conformes » : une donnée manquante doit surgir,
      // jamais passer vert par '' === '' (principe n°1 ; même garde que compareAddress #27 — M2).
      if (!val1 || !val2) return false;
      const norm1 = normalize(val1);
      const norm2 = normalize(val2);

      // Comparaison directe
      if (norm1 === norm2) return true;

      // Tolérance singulier/pluriel : si la seule différence est un 's' final
      const removePlural = (str) => {
        if (str.endsWith('s')) return str.slice(0, -1);
        if (str.endsWith('x')) return str.slice(0, -1);
        return str;
      };

      const singular1 = removePlural(norm1);
      const singular2 = removePlural(norm2);

      if (singular1 === singular2) {
        console.log(`[compareStrings] OK (singulier/pluriel): "${val1}" ≈ "${val2}"`);
        return true;
      }

      // Log ULTRA-détaillé pour déboguer les vrais échecs
      console.log(`[compareStrings] ÉCHEC: "${val1}" vs "${val2}"`);
      console.log(`  Normalisé 1: ${JSON.stringify(norm1)} (longueur: ${norm1.length})`);
      console.log(`  Normalisé 2: ${JSON.stringify(norm2)} (longueur: ${norm2.length})`);
      console.log(`  Codes char 1:`, Array.from(norm1).map(c => c.charCodeAt(0)).join(','));
      console.log(`  Codes char 2:`, Array.from(norm2).map(c => c.charCodeAt(0)).join(','));

      return false;
    }

    // Comparer deux numéros de téléphone (ignore espaces/ponctuation, gère +33 / 0033 → 0)
    function comparePhone(phone1, phone2) {
      const normPhone = (p) => {
        let digits = String(p || '').replace(/\D/g, '');
        if (digits.startsWith('0033')) digits = '0' + digits.slice(4);
        else if (digits.startsWith('33') && digits.length === 11) digits = '0' + digits.slice(2);
        return digits;
      };
      return normPhone(phone1) === normPhone(phone2);
    }

    // Comparer deux dates (gère les formats JJ/MM/AAAA et AAAA-MM-JJ)
    function compareDate(date1, date2) {
      if (!date1 || !date2) return false; // M2 : date absente des 2 côtés ≠ conforme (jamais '' === '')
      // Nettoyer : supprimer espaces
      const clean = (d) => String(d || '').replace(/\s+/g, '');
      let clean1 = clean(date1);
      let clean2 = clean(date2);

      // Convertir AAAA-MM-JJ en JJ/MM/AAAA pour uniformiser
      const isoToFr = (d) => {
        const match = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : d;
      };

      clean1 = isoToFr(clean1);
      clean2 = isoToFr(clean2);

      const result = clean1 === clean2;
      if (!result) {
        console.log(`[compareDate] ÉCHEC: "${date1}" (→ "${clean1}") vs "${date2}" (→ "${clean2}")`);
      }
      return result;
    }

    // Comparer deux montants (gère "0,00 €" vs "0" ou "0.00")
    function compareMoney(val1, val2) {
      const extractNumber = (v) => {
        if (!v) return 0;
        const str = String(v).replace(/\s+/g, '').replace(/€/g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      };

      const num1 = extractNumber(val1);
      const num2 = extractNumber(val2);
      const result = num1 === num2;

      if (!result) {
        console.log(`[compareMoney] ÉCHEC: "${val1}" (→ ${num1}) vs "${val2}" (→ ${num2})`);
      }

      return result;
    }

    // Comparer références produit (ignore tirets, espaces, variations mineures)
    function compareProductRef(val1, val2) {
      const normalizeProduct = (v) => {
        if (!v) return '';
        return String(v)
          .toLowerCase()
          .replace(/[-_\s]+/g, '')  // Supprimer tirets, underscores, espaces
          .replace(/[^a-z0-9]/g, ''); // Garder seulement lettres et chiffres
      };

      const norm1 = normalizeProduct(val1);
      const norm2 = normalizeProduct(val2);

      // Extraire les références clés à chercher
      const key = norm2.includes('neshbl') ? 'neshbl' :
                  norm2.includes('tech03') ? 'tech03' :
                  norm2.includes('highbay') ? 'highbay' : norm2;

      // Vérifier si la clé est présente dans val1
      const result = norm1.includes(key);

      if (!result) {
        console.log(`[compareProductRef] ÉCHEC: "${val1}" (→ "${norm1}") ne contient pas "${key}" de "${val2}" (→ "${norm2}")`);
      }

      return result;
    }

    // Vérifier le format de date JJ/MM/AAAA (pas MM/JJ/AAAA)
    function isValidDateFormat(dateStr) {
      if (!dateStr) return false;
      const cleaned = String(dateStr).replace(/\s+/g, '');
      const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!match) return false;
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      // Si jour > 12 ou mois > 12, c'est probablement JJ/MM (bon format)
      // Si jour <= 12 et mois > 12, c'est probablement JJ/MM (bon format)
      // Si jour <= 12 et mois <= 12, on ne peut pas être sûr, on accepte
      return month <= 12; // Format JJ/MM/AAAA acceptable si mois ≤ 12
    }

    // Extraire le nombre de bâtiments mentionnés dans une adresse
    // Exemples : "Bât 1" → 1, "bâtiments 1 à 3" → 3 (plage), "bat 1 2 3" → 3 (liste),
    //            "BAT 1 80360 HEM" → 1 (80360 = code postal, neutralisé),
    //            "BAT 1 - 000/ZA/0006" → 1 (le "- 000/..." est une parcelle, PAS une plage)
    function extraireNombreBatiments(adresse) {
      if (!adresse) return 1;

      // 1) Normaliser (normalize replie accents + minuscules : « bât »→« bat », « à »→« a »).
      const adresseNorm = normalize(adresse);

      // 2) Neutraliser le CODE POSTAL AVANT toute analyse : un n° de bâtiment fait ≤ 2
      //    chiffres, donc un nombre de 5 chiffres est forcément un CP. Retirer d'ABORD la
      //    forme découpée "\d{2} \d{3}" ("80 360") en UN bloc — sinon "80" partirait en
      //    laissant "360" —, PUIS la forme "\d{5}" ("80360"). CP avant OU après la ville →
      //    remplacement global par un espace. La forme rigide 2+3 garantit le bon découpage :
      //    dans "bat 12 80 360", seul "80 360" matche ("12" non suivi de 3 chiffres).
      const sansCP = adresseNorm
        .replace(/\b\d{2}\s\d{3}\b/g, ' ')
        .replace(/\b\d{5}\b/g, ' ');

      // 3) Capturer « bat… » + son énumération de numéros. Séparateurs CIBLÉS chacun suivi
      //    d'un NOMBRE (pas de sur-capture d'un mot voisin comme « avenue ») : virgule,
      //    « a » de plage, « et », tiret, « & », et ESPACE-NU (liste "bat 1 2 3"). Le tiret,
      //    « & » ET l'espace-nu sont REFUSÉS s'ils amorcent une parcelle (nombre suivi de « / »,
      //    ex. "1 - 000/za/0006" ou "1 000/za/0006").
      const pattern = /\b(?:bat|batiment|bâtiment|batiments|bâtiments)\s*(\d+(?:(?:\s*,\s*|\s+a\s+|\s+et\s+|\s*-(?!\s*\d+\s*\/)\s*|\s*&(?!\s*\d+\s*\/)\s*|\s+(?!\d+\s*\/))\d+)*)/i;
      const match = sansCP.match(pattern);
      if (!match) return 1; // Pas de mention de bâtiment → 1 par défaut

      const mention = match[1]; // énumération des numéros de bâtiment uniquement
      const numeros = mention.match(/\d+/g);
      if (!numeros || numeros.length === 0) return 1;

      // 4) PLAGE si un tiret OU un « a » isolé relie DEUX numéros ("1-3", "1 - 3", "1 a 3")
      //    → compte = max − min + 1. Sinon LISTE (virgule, « et », espace) : compter.
      const estPlage = /\d\s*-\s*\d/.test(mention) || /\d\s+a\s+\d/.test(mention);
      if (estPlage) {
        const nums = numeros.map(n => parseInt(n, 10));
        return Math.max(...nums) - Math.min(...nums) + 1;
      }
      return numeros.length;
    }

    // Retire la parcelle cadastrale (000/AB/0130, espaces tolérés autour des « / ») + un éventuel
    // séparateur amont. La parcelle N'EST PAS l'adresse (ADR-015) : elle ne doit jamais servir de
    // clé de découpage/comparaison. ⚠️ Ne touche PAS la DONNÉE parcelle (champ attestations[].parcelles,
    // vérifié par check_15) : on la retire seulement des CHAÎNES d'adresse normalisées.
    function retirerParcelle(str) {
      return String(str || '').replace(/\s*[-–]?\s*\d{3}\s*\/\s*\w+\s*\/\s*\d+/g, ' ');
    }

    // Normaliser une adresse en supprimant les mentions de bâtiment
    // Utilisé pour regrouper les attestations par adresse
    function normaliserAdresseSansBatiment(adresse) {
      if (!adresse) return '';

      let cleaned = normalize(String(adresse));

      // Retirer la parcelle AVANT les bâtiments (sinon la regex bâtiment happerait le « 000 » de la
      // parcelle). Numéros de bâtiment BORNÉS à 1-3 chiffres → ne mange pas le code postal (5 chiffres).
      cleaned = retirerParcelle(cleaned)
        .replace(/\b(?:bat|batiment|batiments)\b\s*\d{1,3}(?:\s*(?:[,&\-]|et|à|a)\s*\d{1,3})*/gi, '')
        .replace(/\b(?:bat|batiment|batiments)\b/gi, '')
        .replace(/,/g, ' ')
        .replace(/\bfrance\b/gi, '')
        .replace(/[–\-_]/g, ' ')
        .replace(/\//g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return cleaned;
    }

    // Pré-agrège les cellules (grain LED par bâtiment, source facture) par adresse
    // normalisée. RÉUTILISE normaliserAdresseSansBatiment (clé symétrique avec le
    // regroupement des attestations, séparateur « & » inclus depuis 4a-ter) et le MÊME
    // parsing entier que le grain chantier. Retourne une Map { cléNormalisée → Σ nombre }.
    // ADR-015 étape 4b.
    function sommerCellulesParAdresse(cellules) {
      const sommes = new Map();
      if (!cellules || !Array.isArray(cellules)) return sommes;

      cellules.forEach(cellule => {
        const cle = normaliserAdresseSansBatiment(cellule.adresse || '');
        const quantite = parseInt(cellule.ledCellule || 0, 10) || 0;
        sommes.set(cle, (sommes.get(cle) || 0) + quantite);
      });

      return sommes;
    }

    // Comparer deux adresses (ordre flexible, ignore "France", tirets, virgules, etc.)
    function compareAddress(addr1, addr2) {
      // Principe n°1 : deux adresses vides/nulles ne « matchent » pas (sinon faux conforme silencieux).
      if (!addr1 || !addr2) return false;
      const clean = (a) => {
        let cleaned = normalize(String(a || ''));

        // Supprimer les mentions de bâtiment : "BAT 2", "batiment 1", "bâtiment 3", "batiments 1-2-3-4", etc.
        cleaned = retirerParcelle(cleaned)  // parcelle ignorée pour la comparaison (ADR-015 ; check_15 vérifie les parcelles à part)
          .replace(/\b(bat|batiment|bâtiment|batiments|bâtiments)\s*[\d\-]+/gi, '')
          .replace(/\b(bat|batiment|bâtiment|batiments|bâtiments)\b/gi, '')
          .replace(/,/g, ' ')  // Supprimer virgules (déjà présent mais critique)
          .replace(/\bfrance\b/gi, '')
          .replace(/–/g, ' ')  // Supprimer tirets longs
          .replace(/-/g, ' ')  // Supprimer tirets (SAINT-JEAN → SAINT JEAN)
          .replace(/_/g, ' ')  // Supprimer underscores (La Mazurie _ → La Mazurie)
          .replace(/\//g, ' ') // Supprimer les « / » résiduels (parcelle déjà retirée)
          .replace(/\s+/g, ' ')
          .trim();

        return cleaned;
      };

      const clean1 = clean(addr1);
      const clean2 = clean(addr2);

      // Extraire le code postal (5 chiffres)
      const extractCP = (str) => {
        const match = str.match(/\b\d{5}\b/);
        return match ? match[0] : '';
      };

      const cp1 = extractCP(clean1);
      const cp2 = extractCP(clean2);

      // Supprimer le code postal des deux adresses et comparer le reste
      // Cela permet d'ignorer l'ordre "60130 NOROY" vs "NOROY 60130"
      const withoutCP1 = clean1.replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim();
      const withoutCP2 = clean2.replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim();

      const addressWithoutCPMatch = withoutCP1 === withoutCP2;

      // Si les adresses (sans CP) matchent
      if (addressWithoutCPMatch) {
        // Si les codes postaux sont différents, warning mais accepter quand même
        if (cp1 && cp2 && cp1 !== cp2) {
          console.log(`[compareAddress] ⚠️ MATCH avec CP différents: "${addr1}" (CP: ${cp1}) vs "${addr2}" (CP: ${cp2}) - rue/ville identiques`);
        }
        return true;
      }

      // Sinon, échec complet
      console.log(`[compareAddress] ÉCHEC: "${addr1}" (→ "${withoutCP1}") vs "${addr2}" (→ "${withoutCP2}")`);
      return false;
    }

    // Décomposer une adresse en composantes (numéro, rue, CP, ville)
    function decomposeAddress(addr) {
      if (!addr) return { numero: '', rue: '', cp: '', ville: '' };

      const cleaned = normalize(String(addr))
        .replace(/\b(bat|batiment|bâtiment|batiments|bâtiments)\s*\d+\b/gi, '')
        .replace(/\b(bat|batiment|bâtiment|batiments|bâtiments)\b/gi, '')
        .replace(/,/g, ' ')
        .replace(/\bfrance\b/gi, '')  // Ignorer "france" comme dans compareAddress
        .replace(/–/g, ' ')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extraire le numéro de rue (premiers chiffres au début)
      const numeroMatch = cleaned.match(/^\d+/);
      const numero = numeroMatch ? numeroMatch[0] : '';

      // Extraire le code postal (5 chiffres)
      const cpMatch = cleaned.match(/\b\d{5}\b/);
      const cp = cpMatch ? cpMatch[0] : '';

      // Extraire la ville (tout après le code postal)
      let ville = '';
      if (cp) {
        const cpIndex = cleaned.indexOf(cp);
        ville = cleaned.substring(cpIndex + 5).trim();
      }

      // Extraire la rue (entre le numéro et le code postal)
      let rue = cleaned;
      if (numero) {
        rue = rue.substring(numero.length).trim();
      }
      if (cp) {
        const cpIndex = rue.indexOf(cp);
        if (cpIndex > 0) {
          rue = rue.substring(0, cpIndex).trim();
        }
      }

      return { numero, rue, cp, ville };
    }

    // Comparer SIRET (14 chiffres, ignore espaces et caractères non numériques)
    function compareSIRET(siret1, siret2) {
      if (!siret1 || !siret2) return false; // M2 : SIRET absent des 2 côtés ≠ conforme (jamais '' === '')
      const clean = (s) => String(s || '').replace(/[^\d]/g, '');  // Garder seulement chiffres
      const clean1 = clean(siret1);
      const clean2 = clean(siret2);
      const result = clean1 === clean2;

      if (!result) {
        console.log(`[compareSIRET] ÉCHEC: "${siret1}" (→ "${clean1}") vs "${siret2}" (→ "${clean2}")`);
      }

      return result;
    }

    // Additionner des surfaces extraites ["850 m²", "456 m²"] → 1306
    function sumSurfaces(surfacesArray) {
      if (!Array.isArray(surfacesArray)) return 0;
      return surfacesArray.reduce((sum, surf) => {
        const num = parseFloat(String(surf).replace(/[^\d.,]/g, '').replace(',', '.'));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }

    // Calculer somme totale LED de plusieurs documents
    function sumLED(documents) {
      return documents.reduce((sum, doc) => {
        const led = parseFloat(String(doc.ledTotal || doc.ledInitial || doc.ledFinal || doc.totalLed || 0).replace(/\s+/g, ''));
        return sum + (isNaN(led) ? 0 : led);
      }, 0);
    }

    // Conformité LED : deux valeurs RÉELLES > 0 et écart toléré. Une LED absente / non extraite
    // (parseFloat(...)||0 → 0) ne passe JAMAIS pour conforme : 0 vs 0 doit surgir, pas passer vert
    // (principe n°1 — M3, audit phase A). Tolérance <0.1 inchangée (l'anomalie A4 est un sujet distinct).
    function ledConforme(a, b) {
      return a > 0 && b > 0 && Math.abs(a - b) < 0.1;
    }
