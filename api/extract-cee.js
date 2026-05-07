// Route API : POST /api/extract-cee
// Extraction rapide des adresses de chantiers depuis le document CEE uniquement

export const config = {
  maxDuration: 30, // Extraction rapide, 30 secondes suffisent
};

export default async function handler(req, res) {
  // Gérer les requêtes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Vérifier que c'est bien une requête POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  try {
    const { ceeText } = req.body;

    // Vérifier que la clé API OpenRouter est configurée
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'Configuration serveur manquante. Contactez l\'administrateur.'
      });
    }

    // Vérifier que le texte du CEE est présent
    if (!ceeText || typeof ceeText !== 'string' || ceeText.trim().length === 0) {
      return res.status(400).json({
        error: 'Paramètre "ceeText" requis (texte extrait du PDF CEE)'
      });
    }

    // Construire le prompt système ultra-simple pour détecter les chantiers
    const systemPrompt = buildDetectionPrompt();

    // Message utilisateur avec le texte du CEE
    const userMessage = `Voici le document CEE à analyser :\n\n${ceeText}`;

    // Préparer les messages
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    // Appeler l'API OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://cee-verif.vercel.app',
        'X-Title': 'CEE Verif App',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages: messages,
        max_tokens: 2000, // Peu de tokens nécessaires pour cette tâche simple
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erreur API OpenRouter:', errorData);
      return res.status(response.status).json({
        error: `Erreur API OpenRouter (${response.status})`,
        details: errorData
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('=== DÉTECTION CHANTIERS CEE ===');
    console.log('Réponse brute:', content);

    // Parser le JSON
    let result;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/({[\s\S]*})/);

      if (jsonMatch) {
        result = JSON.parse(jsonMatch[1]);
        console.log('Chantiers détectés:', result.chantiers?.length || 0);
      } else {
        console.error('❌ AUCUN JSON TROUVÉ');
        result = { chantiers: [] };
      }
    } catch (parseError) {
      console.error('❌ ERREUR DE PARSING JSON:', parseError);
      result = { chantiers: [], parse_error: parseError.message };
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}

// Construit le prompt système pour la détection des chantiers
function buildDetectionPrompt() {
  return `Tu es un assistant d'extraction de données pour des dossiers CEE (Certificats d'Économies d'Énergie).

TON RÔLE : Extraire UNIQUEMENT les adresses de chantiers depuis le document CEE.

RÈGLES D'EXTRACTION :

1. Chercher TOUTES les adresses de chantiers dans le document :
   - Page 1 : adresse(s) mentionnée(s)
   - Section "ATTESTATION SUR L'HONNEUR" : CHAQUE attestation a une adresse
   - Factures : adresses de chantiers mentionnées

2. Format des adresses :
   - Inclure : numéro + rue + code postal + ville
   - Exemple : "10 LA BROSSE DE CHANZEAUX 49380 BELLEVIGNE EN LAYON"
   - Garder la casse EXACTEMENT comme dans le document

3. Nombre de chantiers :
   - 1 adresse unique = 1 chantier
   - 2 adresses différentes = 2 chantiers
   - Si plusieurs attestations ont la MÊME adresse = 1 seul chantier

4. Dédoublonner les adresses identiques (même si répétées plusieurs fois)

FORMAT DE RÉPONSE (JSON uniquement) :
\`\`\`json
{
  "chantiers": [
    {
      "adresse": "10 LA BROSSE DE CHANZEAUX 49380 BELLEVIGNE EN LAYON"
    },
    {
      "adresse": "ROUTE DE LA RAIMBAUDIERE 49380 BELLEVIGNE EN LAYON"
    }
  ]
}
\`\`\`

IMPORTANT : Retourner UNIQUEMENT le JSON, sans texte avant ou après.`;
}
