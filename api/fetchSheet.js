// Route API : GET /api/fetchSheet
// Lit le Google Sheet et retourne toutes les lignes

import { google } from 'googleapis';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  // Gérer les requêtes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vérifier que c'est bien une requête GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez GET.' });
  }

  try {
    // Vérifier que les variables d'environnement sont configurées
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEET_ID) {
      return res.status(500).json({
        error: 'Configuration serveur manquante. Vérifiez GOOGLE_SERVICE_ACCOUNT_KEY et GOOGLE_SHEET_ID.'
      });
    }

    // Parser la clé JSON du service account
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    // Créer le client d'authentification
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    // Lire toutes les données du sheet (première feuille, toutes les lignes)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'A:AO', // De la colonne A à AO (couvre toutes les colonnes mentionnées)
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        success: true,
        headers: [],
        data: [],
        message: 'Sheet vide ou aucune donnée trouvée'
      });
    }

    // La première ligne contient les en-têtes
    const headers = rows[0];

    // Convertir les lignes en objets avec les en-têtes comme clés
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || ''; // Valeur vide si la cellule n'existe pas
      });
      return obj;
    });

    console.log(`✅ Google Sheet lu avec succès : ${data.length} lignes (hors en-tête)`);

    return res.status(200).json({
      success: true,
      headers,
      data,
      count: data.length
    });

  } catch (error) {
    console.error('Erreur lors de la lecture du Google Sheet:', error);
    return res.status(500).json({
      error: 'Erreur lors de la lecture du Google Sheet',
      details: error.message
    });
  }
}
