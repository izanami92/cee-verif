// Route API : GET /api/search
// Relaie la recherche SIRET vers l'API gouvernementale (résout le problème CORS)

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
    const { q, password } = req.query;

    // SÉCURITÉ : Vérifier le mot de passe EN PREMIER
    if (!password || password !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }

    // Vérifier que le paramètre de recherche est présent
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Paramètre "q" requis (nom de société ou SIRET)'
      });
    }

    // Appeler l'API gouvernementale de recherche d'entreprises
    const apiUrl = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=10`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API gouvernementale:', errorData);
      return res.status(response.status).json({
        error: `Erreur API recherche entreprises (${response.status})`,
        details: errorData
      });
    }

    const data = await response.json();

    // Transformer les résultats pour ne garder que les infos utiles
    const results = (data.results || []).map(entreprise => ({
      nom: entreprise.nom_complet || entreprise.nom_raison_sociale || '',
      siret: entreprise.siege?.siret || '',
      adresse: formatAdresse(entreprise.siege),
      activite: entreprise.activite_principale || '',
      etat: entreprise.etat_administratif || '',
    }));

    return res.status(200).json({
      total: data.total_results || 0,
      results: results,
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}

// Formate l'adresse depuis les données du siège
function formatAdresse(siege) {
  if (!siege) return '';

  const parts = [];

  if (siege.numero_voie) parts.push(siege.numero_voie);
  if (siege.type_voie) parts.push(siege.type_voie);
  if (siege.libelle_voie) parts.push(siege.libelle_voie);
  if (siege.complement_adresse) parts.push(siege.complement_adresse);

  const ligne1 = parts.join(' ');

  const parts2 = [];
  if (siege.code_postal) parts2.push(siege.code_postal);
  if (siege.libelle_commune) parts2.push(siege.libelle_commune);

  const ligne2 = parts2.join(' ');

  return [ligne1, ligne2].filter(l => l).join(', ');
}
