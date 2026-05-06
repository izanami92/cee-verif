// Route API : POST /api/analyze
// Vérifie le mot de passe, appelle Claude pour analyser les documents CEE, retourne le JSON d'analyse

export const config = {
  maxDuration: 60, // Timeout de 60 secondes (maximum Vercel gratuit)
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
    const { messages, system, references } = req.body;

    // Vérifier que la clé API OpenRouter est configurée
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: 'Configuration serveur manquante. Contactez l\'administrateur.'
      });
    }

    // Vérifier que les paramètres requis sont présents
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Paramètre "messages" requis (tableau de messages)'
      });
    }

    // Construire le prompt système avec les règles métier
    const systemPrompt = system || buildSystemPrompt(references);

    // Préparer les messages au format OpenAI (avec system comme premier message)
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Appeler l'API OpenRouter (compatible OpenAI)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://cee-verif.vercel.app', // Optionnel mais recommandé
        'X-Title': 'CEE Verif App', // Optionnel mais recommandé
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku', // Modèle Claude Haiku (plus économique)
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.3, // Moins de créativité = plus de précision
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

    // Extraire le contenu de la réponse (format OpenAI)
    const content = data.choices?.[0]?.message?.content || '';

    // Tenter de parser le JSON depuis la réponse
    let analysisResult;
    try {
      // Chercher un bloc JSON dans la réponse (entre ```json et ``` ou directement)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/({[\s\S]*})/);

      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1]);
      } else {
        // Si pas de JSON trouvé, retourner le texte brut
        analysisResult = {
          checks: [],
          page_garde_ok: false,
          message_auditeur: content,
          raw_response: content
        };
      }
    } catch (parseError) {
      console.error('Erreur de parsing JSON:', parseError);
      // En cas d'erreur de parsing, retourner le texte brut
      analysisResult = {
        checks: [],
        page_garde_ok: false,
        message_auditeur: content,
        raw_response: content,
        parse_error: parseError.message
      };
    }

    // Retourner le résultat
    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}

// Construit le prompt système avec toutes les règles métier
function buildSystemPrompt(references = {}) {
  return `Tu es un expert en vérification de dossiers CEE (Certificats d'Économies d'Énergie) pour l'opération BAT-EQ-127 (LED en entrepôt).

CONTEXTE MÉTIER
Tu travailles pour Prime Evolution (bureau d'études OPQIBI), délégataire Total Energies.
Ton rôle est de vérifier la conformité des documents fournis par les auditeurs Dialux.

IMPORTANT - GESTION MULTI-CHANTIERS :
- Il peut y avoir PLUSIEURS Audits (1 par adresse de chantier)
- Il peut y avoir PLUSIEURS Synthèses (1 par adresse de chantier)
- Il y a UN SEUL Dossier CEE qui contient TOUTES les adresses
- Tu dois faire la CORRESPONDANCE entre chaque Audit et sa Synthèse en analysant l'adresse mentionnée dans chaque document
- Vérifie que toutes les adresses présentes dans les Audits/Synthèses apparaissent bien dans le Dossier CEE

RÈGLES MÉTIER CRITIQUES — À VÉRIFIER ABSOLUMENT

🔴 RÈGLES BLOQUANTES (empêchent tout envoi client)
1. Mentions agricoles : Les mots "agri", "agricole", "agriculteur" ne doivent JAMAIS apparaître dans aucun document CEE LED
2. Profil d'utilisation (Audit) : Doit être "entrepôt", "logistique", "commerce" ou "locaux de vente" — jamais agricole
3. Page de garde Audit (nom, adresse, date) : Doit correspondre EXACTEMENT aux références fournies
   - Le nom de société doit être identique au CEE ET aux registres officiels (vérifiable sur Infogreffe)
   - Si plusieurs adresses de chantier sont fournies en référence, TOUTES doivent apparaître dans les documents (Audit ET Synthèse)
   - Vérifier que chaque adresse fournie est bien présente quelque part dans les documents
4. Secteur d'activité (Synthèse) : Doit être "Entrepôts", "Commerce", "Locaux de vente" ou "AUTRES" — jamais agricole
   - IMPORTANT : Si le Dossier CEE mentionne le secteur "AUTRES", vérifier que cette information se retranscrit bien dans la Synthèse
5. Activité par bâtiment (Synthèse, état projeté) : Doit être "Entrepôt", "Commerce" ou "Locaux de vente" — jamais agricole

🟡 RÈGLES MAJEURES (à corriger avant envoi complet)
1. Taux de distorsion harmonique (THD) : Exactement 3,7% dans le CEE et la Synthèse (PAS dans l'Audit)
2. Fiche technique LED : TOUJOURS présente dans la Synthèse (généralement page 14), les données doivent correspondre au THD 3,7%
3. SIRET : 14 chiffres numériques, cohérent entre tous les documents (CEE, Synthèse, Audit)
4. Parcelles cadastrales : Format 000/0B/XXXX, doivent être présentes et cohérentes entre CEE et Synthèse
4b. Cohérence secteur d'activité : Si le CEE indique secteur "AUTRES", vérifier que cette information se retranscrit correctement dans le secteur d'activité de la Synthèse
5. Répartition LED : Cohérente entre audit, synthèse et dossier CEE (total et par bâtiment/cellule)
6. Référence produit : DAEWOO NES-HBL 250W (ou selon le dossier)
7. Date d'audit : Doit être égale à la date d'envoi du devis
8. Contact client : Nom, Prénom, Poste, Téléphone, Email doivent être cohérents entre CEE, Synthèse et Betool
9. Superficie totale du chantier : Si mentionnée sur la Synthèse, doit correspondre à la somme des superficies par bâtiment

RÉFÉRENCES DU DOSSIER À UTILISER POUR LA VÉRIFICATION
${references.nom ? `- Nom société cliente : ${references.nom}` : ''}
${references.siret ? `- SIRET : ${references.siret}` : ''}
${references.adresse ? `- Adresse du chantier : ${references.adresse}` : ''}
${references.dateDevis ? `- Date d'envoi du devis : ${references.dateDevis}` : ''}
${references.totalLed ? `- Nombre total de LED : ${references.totalLed}` : ''}
${references.typeLocal ? `- Type de local : ${references.typeLocal}` : ''}
${references.parcelles ? `- Parcelles cadastrales : ${references.parcelles}` : ''}

FORMAT DE RÉPONSE ATTENDU
Tu dois retourner UNIQUEMENT un JSON valide (sans texte avant ou après) avec cette structure exacte :

\`\`\`json
{
  "checks": [
    {
      "id": "string_unique",
      "categorie": "garde | synthese | audit",
      "niveau": "bloquant | majeur | ok | info",
      "champ": "Nom du champ vérifié",
      "localisation": "Localisation PRÉCISE dans le document (ex: 'Page 1, section Informations client' ou 'Audit page 3, tableau récapitulatif')",
      "detail": "Explication précise de l'écart ou de la conformité avec l'extrait EXACT du texte problématique entre guillemets",
      "valeur_attendue": "Valeur de référence ou règle",
      "valeur_trouvee": "Valeur EXACTE constatée dans le document (copier-coller le texte tel quel)"
    }
  ],
  "page_garde_ok": true,
  "message_auditeur": "Message complet et professionnel en français listant toutes les corrections nécessaires"
}
\`\`\`

IMPORTANT - LOCALISATION PRÉCISE DES ERREURS :
- Pour chaque erreur, tu DOIS indiquer où elle se trouve exactement dans le document
- Format attendu : "Nom du document + page + section si possible"
- Exemples : "Audit page 1, en-tête" / "Synthèse page 2, tableau des LED" / "Dossier CEE page 5, informations bénéficiaire"
- Dans "valeur_trouvee", copie EXACTEMENT le texte tel qu'il apparaît dans le PDF (même avec fautes de frappe, espaces, casse, etc.)
- Si tu détectes une différence subtile (espace en trop, casse différente), mets le texte exact entre guillemets dans "detail"

INSTRUCTIONS POUR LE MESSAGE AUDITEUR
- Commencer par l'identification du dossier (nom client)
- Séparer les corrections urgentes (page de garde) des corrections secondaires
- Lister chaque erreur avec : champ concerné, valeur erronée, valeur attendue
- Rester factuel et professionnel
- En français

LOGIQUE DE VÉRIFICATION
1. Page de garde OK = tous les champs bloquants de la page de garde sont conformes
2. Si page de garde OK → envoi immédiat possible en signature client
3. Si page de garde KO → corrections obligatoires avant envoi
4. CEE complet → tous les bloquants ET majeurs doivent être résolus`;
}
