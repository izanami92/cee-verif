// Route API : POST /api/compareSheet
// Compare les données CEE extraites avec les lignes du Google Sheet

import { requireAuth } from '../lib/auth.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  // SÉCURITÉ : vérifier le mot de passe EN PREMIER (écrit 401/500 et s'arrête si invalide).
  if (!requireAuth(req, res)) return;

  try {
    const { ceeData, sheetData } = req.body;

    if (!ceeData || !sheetData) {
      return res.status(400).json({
        error: 'Paramètres manquants : ceeData et sheetData requis'
      });
    }

    console.log('🔍 Comparaison CEE vs Google Sheet');
    console.log('  - Nom société CEE:', ceeData.nom);
    console.log('  - Nombre de chantiers CEE:', ceeData.chantiers?.length || 0);
    console.log('  - Nombre de lignes Google Sheet:', sheetData.length);

    const checks = [];

    // ========== ÉTAPE 1 : TROUVER LES LIGNES CORRESPONDANTES ==========
    const matchedRows = findMatchingRows(ceeData, sheetData);

    if (matchedRows.length === 0) {
      checks.push({
        id: 'sheet_00_nomatch',
        categorie: 'google_sheet',
        niveau: 'majeur',
        champ: 'Correspondance Google Sheet',
        localisation: 'Google Sheet',
        detail: `Aucune ligne trouvée dans le Google Sheet pour "${ceeData.nom}" ou adresse siège "${ceeData.adresseSiege}"`,
        valeur_attendue: 'Au moins 1 ligne correspondante',
        valeur_trouvee: '0 ligne trouvée'
      });

      return res.status(200).json({ checks, matchedRows: [] });
    }

    console.log(`  ✅ ${matchedRows.length} ligne(s) trouvée(s) dans le Google Sheet`);

    // ========== ÉTAPE 2 : VÉRIFIER LA COHÉRENCE GLOBALE ==========
    checks.push(...verifyGlobalData(ceeData, matchedRows));

    // ========== ÉTAPE 3 : VÉRIFIER CHAQUE CHANTIER ==========
    ceeData.chantiers?.forEach((chantier, index) => {
      const chantierChecks = verifyChantier(chantier, matchedRows, index + 1);
      checks.push(...chantierChecks);
    });

    return res.status(200).json({
      checks,
      matchedRows: matchedRows.map(r => ({
        nomSite: r['NOM DU SITE bénéficiaire \nde l\'opération'],
        adresseOperation: r['ADRESSE \nde l\'opération'],
        ville: r.VILLE,
        nombreLuminaires: r['Nombre de luminaires de l\'opération (pour les opérations engagées avant le 1er avril 2019)']
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la comparaison:', error);
    return res.status(500).json({
      error: 'Erreur lors de la comparaison'
    });
  }
}

// ========== FONCTIONS DE COMPARAISON ==========

function findMatchingRows(ceeData, sheetData) {
  const matches = [];
  const nomCEE = normalizeString(ceeData.nom);
  const adresseSiegeCEE = normalizeString(ceeData.adresseSiege);

  sheetData.forEach(row => {
    const nomSite = normalizeString(row['NOM DU SITE bénéficiaire \nde l\'opération'] || '');
    const adresseSiegeSheet = normalizeString(row['ADRESSE \ndu siège social du bénéficiaire de l\'opération'] || '');

    // Chercher par nom de site
    if (nomCEE && nomSite && nomSite.includes(nomCEE)) {
      matches.push(row);
      return;
    }

    // Si pas trouvé par nom, chercher par adresse siège
    if (adresseSiegeCEE && adresseSiegeSheet &&
        (adresseSiegeSheet.includes(adresseSiegeCEE) || adresseSiegeCEE.includes(adresseSiegeSheet))) {
      matches.push(row);
    }
  });

  return matches;
}

function verifyGlobalData(ceeData, matchedRows) {
  const checks = [];

  // Vérifier le nom de société (RAISON SOCIALE du bénéficiaire)
  const raisonSocialeSheet = matchedRows[0]?.['RAISON SOCIALE\ndu bénéficiaire \nde l\'opération'] || '';
  const nomMatch = compareStrings(ceeData.nom, raisonSocialeSheet);

  checks.push({
    id: 'sheet_01_raison_sociale',
    categorie: 'google_sheet',
    niveau: nomMatch ? 'ok' : 'majeur',
    champ: 'Raison sociale',
    localisation: 'Google Sheet',
    detail: nomMatch ? 'Raison sociale conforme' : 'Raison sociale différente',
    valeur_attendue: raisonSocialeSheet,
    valeur_trouvee: ceeData.nom || ''
  });

  // Vérifier le SIREN (9 premiers chiffres du SIRET)
  const sirenCEE = ceeData.siret?.substring(0, 9) || '';
  const sirenSheet = matchedRows[0]?.SIREN || '';
  const sirenMatch = sirenCEE === sirenSheet;

  checks.push({
    id: 'sheet_02_siren',
    categorie: 'google_sheet',
    niveau: sirenMatch ? 'ok' : 'bloquant',
    champ: 'SIREN',
    localisation: 'Google Sheet',
    detail: sirenMatch ? 'SIREN conforme' : 'SIREN différent',
    valeur_attendue: sirenSheet,
    valeur_trouvee: sirenCEE
  });

  // Vérifier l'adresse du siège social
  const adresseSiegeCEE = normalizeAddress(ceeData.adresseSiege || '');
  const adresseSiegeSheet = normalizeAddress(matchedRows[0]?.['ADRESSE \ndu siège social du bénéficiaire de l\'opération'] || '');
  const adresseSiegeMatch = adresseSiegeCEE.includes(adresseSiegeSheet) || adresseSiegeSheet.includes(adresseSiegeCEE);

  checks.push({
    id: 'sheet_03_adresse_siege',
    categorie: 'google_sheet',
    niveau: adresseSiegeMatch ? 'ok' : 'majeur',
    champ: 'Adresse siège social',
    localisation: 'Google Sheet',
    detail: adresseSiegeMatch ? 'Adresse siège conforme' : 'Adresse siège différente',
    valeur_attendue: matchedRows[0]?.['ADRESSE \ndu siège social du bénéficiaire de l\'opération'] || '',
    valeur_trouvee: ceeData.adresseSiege || ''
  });

  // Vérifier les dates
  const dateDevisSheet = matchedRows[0]?.['DATE d\'envoi du RAI'] || '';
  const dateDevisMatch = compareDate(ceeData.dateDevis, dateDevisSheet);

  checks.push({
    id: 'sheet_04_date_devis',
    categorie: 'google_sheet',
    niveau: dateDevisMatch ? 'ok' : 'majeur',
    champ: 'Date d\'envoi du devis',
    localisation: 'Google Sheet',
    detail: dateDevisMatch ? 'Date conforme' : 'Date différente',
    valeur_attendue: dateDevisSheet,
    valeur_trouvee: ceeData.dateDevis || ''
  });

  const dateSignatureSheet = matchedRows[0]?.['DATE D\'ENGAGEMENT\nde l\'opération'] || '';
  const dateSignatureMatch = compareDate(ceeData.dateSignature, dateSignatureSheet);

  checks.push({
    id: 'sheet_05_date_signature',
    categorie: 'google_sheet',
    niveau: dateSignatureMatch ? 'ok' : 'majeur',
    champ: 'Date de signature du devis',
    localisation: 'Google Sheet',
    detail: dateSignatureMatch ? 'Date conforme' : 'Date différente',
    valeur_attendue: dateSignatureSheet,
    valeur_trouvee: ceeData.dateSignature || ''
  });

  // Vérifier le montant total CEE (somme des chantiers)
  const montantCEESheet = parseFloat(matchedRows.reduce((sum, row) => {
    const montant = parseFloat((row['MONTANT de l\'incitation financière CEE'] || '').replace(/[^\d.,]/g, '').replace(',', '.'));
    return sum + (isNaN(montant) ? 0 : montant);
  }, 0).toFixed(2));

  const montantCEETTC = parseFloat((ceeData.resteAPayer || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
  const montantMatch = Math.abs(montantCEESheet - montantCEETTC) < 1; // Tolérance de 1€

  checks.push({
    id: 'sheet_06_montant_cee',
    categorie: 'google_sheet',
    niveau: montantMatch ? 'ok' : 'majeur',
    champ: 'Montant incitation financière CEE',
    localisation: 'Google Sheet',
    detail: montantMatch ? 'Montant conforme' : `Montant différent (écart: ${Math.abs(montantCEESheet - montantCEETTC).toFixed(2)}€)`,
    valeur_attendue: `${montantCEESheet}€`,
    valeur_trouvee: `${montantCEETTC}€`
  });

  return checks;
}

function verifyChantier(chantier, matchedRows, chantierIndex) {
  const checks = [];
  const suffix = ` chantier ${chantierIndex}`;
  const idSuffix = `_c${chantierIndex}`;

  // Trouver la ligne correspondant à ce chantier par adresse
  const adresseChantierCEE = normalizeAddress(chantier.adresse || '');

  const matchingRow = matchedRows.find(row => {
    const adresseSheet = normalizeAddress(row['ADRESSE \nde l\'opération'] || '');
    return adresseSheet.includes(adresseChantierCEE) || adresseChantierCEE.includes(adresseSheet);
  });

  if (!matchingRow) {
    checks.push({
      id: `sheet_10_adresse${idSuffix}`,
      categorie: 'google_sheet',
      niveau: 'bloquant',
      champ: `Adresse chantier${suffix}`,
      localisation: `Google Sheet${suffix}`,
      detail: `Aucune ligne trouvée pour l'adresse "${chantier.adresse}"`,
      valeur_attendue: `Ligne existante pour ${chantier.adresse}`,
      valeur_trouvee: 'Aucune correspondance',
      chantierIndex
    });
    return checks;
  }

  // Vérifier l'adresse du chantier
  const adresseSheet = matchingRow['ADRESSE \nde l\'opération'] || '';
  const adresseMatch = compareAddress(chantier.adresse, adresseSheet);

  checks.push({
    id: `sheet_10_adresse${idSuffix}`,
    categorie: 'google_sheet',
    niveau: adresseMatch ? 'ok' : 'majeur',
    champ: `Adresse chantier${suffix}`,
    localisation: `Google Sheet${suffix}`,
    detail: adresseMatch ? 'Adresse conforme' : 'Adresse différente',
    valeur_attendue: adresseSheet,
    valeur_trouvee: chantier.adresse || '',
    chantierIndex
  });

  // Vérifier le nombre de LED
  const nombreLEDSheet = matchingRow['Nombre de luminaires de l\'opération (pour les opérations engagées avant le 1er avril 2019)'] || '';
  const nombreLEDCEE = chantier.ledTotal || '';
  const ledMatch = nombreLEDSheet === nombreLEDCEE;

  checks.push({
    id: `sheet_11_led${idSuffix}`,
    categorie: 'google_sheet',
    niveau: ledMatch ? 'ok' : 'bloquant',
    champ: `Nombre de LED${suffix}`,
    localisation: `Google Sheet${suffix}`,
    detail: ledMatch ? 'Nombre de LED conforme' : 'Nombre de LED différent',
    valeur_attendue: nombreLEDSheet,
    valeur_trouvee: nombreLEDCEE,
    chantierIndex
  });

  // Vérifier le secteur d'activité
  const secteurSheet = matchingRow['Secteur concerné (pour les opérations engagées entre le 1er avril 2019 et le 31 mars 2022 inclus)'] || '';
  const secteurCEE = chantier.secteurActivite || '';

  // Mapper les secteurs (Santé / Entrepôts / Commerce ≥ 400 m² = Entrepôts)
  const secteurNormalized = normalizeSecteur(secteurSheet);
  const secteurMatch = compareStrings(secteurCEE, secteurNormalized);

  checks.push({
    id: `sheet_12_secteur${idSuffix}`,
    categorie: 'google_sheet',
    niveau: secteurMatch ? 'ok' : 'bloquant',
    champ: `Secteur d'activité${suffix}`,
    localisation: `Google Sheet${suffix}`,
    detail: secteurMatch ? 'Secteur conforme' : 'Secteur différent',
    valeur_attendue: secteurNormalized,
    valeur_trouvee: secteurCEE,
    chantierIndex
  });

  return checks;
}

// ========== FONCTIONS UTILITAIRES ==========

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Retirer les accents
    .replace(/[^a-z0-9\s]/g, '') // Garder uniquement lettres, chiffres, espaces
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

function normalizeAddress(addr) {
  if (!addr) return '';
  // Retirer les parcelles cadastrales (format 000/0B/XXXX)
  const withoutParcelle = addr.replace(/\d{3}\/\w+\/\d+/g, '').trim();
  return normalizeString(withoutParcelle);
}

function normalizeSecteur(secteur) {
  const normalized = normalizeString(secteur);
  // Mapper "Santé / Entrepôts / Commerce ≥ 400 m²" vers "Entrepôts"
  if (normalized.includes('sante') || normalized.includes('entrepot') || normalized.includes('commerce')) {
    return 'Entrepôts';
  }
  return secteur;
}

function compareStrings(str1, str2) {
  return normalizeString(str1) === normalizeString(str2);
}

function compareAddress(addr1, addr2) {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);
  return norm1.includes(norm2) || norm2.includes(norm1);
}

function compareDate(date1, date2) {
  if (!date1 || !date2) return false;

  // Extraire les chiffres uniquement
  const d1 = date1.replace(/\D/g, '');
  const d2 = date2.replace(/\D/g, '');

  return d1 === d2;
}
