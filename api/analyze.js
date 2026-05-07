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
        model: 'anthropic/claude-sonnet-4', // Claude Sonnet 4 (version originale qui marchait)
        messages: formattedMessages,
        max_tokens: 10000, // Optimisé pour éviter timeout tout en permettant 40 checks
        temperature: 0, // Déterministe = résultats identiques à chaque fois
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

    console.log('=== RÉPONSE BRUTE DE CLAUDE ===');
    console.log('Longueur:', content.length);
    console.log('Premiers 500 caractères:', content.substring(0, 500));

    // Tenter de parser le JSON depuis la réponse
    let analysisResult;
    try {
      // Chercher un bloc JSON dans la réponse (entre ```json et ``` ou directement)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                       content.match(/({[\s\S]*})/);

      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[1]);
        console.log('=== JSON PARSÉ AVEC SUCCÈS ===');
        console.log('Clés présentes:', Object.keys(analysisResult));
        console.log('Contient "checks":', 'checks' in analysisResult);
        console.log('Contient "audit":', 'audit' in analysisResult);
        console.log('Contient "synthese":', 'synthese' in analysisResult);
        console.log('Contient "cee":', 'cee' in analysisResult);
      } else {
        // Si pas de JSON trouvé, retourner le texte brut
        console.error('❌ AUCUN JSON TROUVÉ dans la réponse de Claude');
        analysisResult = {
          checks: [],
          page_garde_ok: false,
          message_auditeur: content,
          raw_response: content
        };
      }
    } catch (parseError) {
      console.error('❌ ERREUR DE PARSING JSON:', parseError);
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
    console.log('=== RÉPONSE ENVOYÉE AU FRONTEND ===');
    console.log('Format:', 'checks' in analysisResult ? 'ANCIEN (checks)' : 'NOUVEAU (extraction)');
    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}

// Construit le prompt système pour l'extraction
function buildSystemPrompt(references = {}) {
  return `Tu es un assistant d'extraction de données pour des dossiers CEE (Certificats d'Économies d'Énergie).

TON RÔLE : Extraire toutes les valeurs des documents et les retourner en JSON structuré. NE PAS faire de comparaisons, NE PAS analyser, juste EXTRAIRE.

DOCUMENTS À ANALYSER :
- AUDIT DIALUX : audit énergétique (peut y en avoir plusieurs = plusieurs chantiers)
- SYNTHÈSE : document de synthèse (peut y en avoir plusieurs = plusieurs chantiers)
- DOSSIER CEE : dossier administratif (1 seul, contient le total de tous les chantiers)
- FICHE TECHNIQUE : spécifications LED (optionnel)

RÈGLE MULTI-CHANTIERS (TRÈS IMPORTANT) :
- 1 Audit + 1 Synthèse = 1 chantier
- 2 Audits + 2 Synthèses = 2 chantiers (même dossier CEE)
- Pour matcher Audit ↔ Synthèse : comparer l'ADRESSE (même adresse = même chantier)
- Extraire CHAQUE audit et CHAQUE synthèse séparément avec leur adresse et leur total LED

EXTRACTION AUDIT (LOCALISATION PRÉCISE) :
- "nom" : page 1, en-tête en haut (nom client/société)
- "adresse" : page 1, en-tête en haut (adresse complète du chantier)
- "date" : page 1, en-tête en haut (date de l'audit)
- "siret" : page "Description" > "SIRET" (14 chiffres sans espaces)
- "surfaces" : page "Description" > section "Observations préliminaires" > tableau des surfaces (toutes les valeurs en m²)
- "ledTotal" : page "Liste des luminaires" > colonne "Pce" > TOTAL (somme en bas du tableau) OU page "Description" > "Etat initial : nombre" OU "Etat projeté : nombre"
- "profilUtilisation" : page "Description" > "Profil d'utilisation" ou similaire

EXTRACTION SYNTHÈSE (LOCALISATION PRÉCISE) :
- "nom" : page 1, en haut (nom du client/société)
- "adresse" : page "Fiche d'identité du site" > "Adresse"
- "date" : page 1, en haut (date du document)
- "ledTotal" : page "Inventaire du projet" > TOTAL des luminaires (ligne de total en bas du tableau)
- "surfaceEclairee" : page "Fiche d'identité du site" > "Surface éclairée"
- "secteurActivite" : page "Fiche d'identité du site" > "Secteur d'activité" OU "Type de bâtiment"
- "profilUtilisation" : chercher dans tout le document les mentions de profil/type d'utilisation
- "thd" : page "Caractéristiques des luminaires" > "Taux de distorsion harmonique" ou "THD"
- "referenceProduit" : page "Caractéristiques des luminaires" > "Référence" ou "Modèle"

RÈGLES D'EXTRACTION CRITIQUES :

1. NOMBRES (LED, surfaces, etc.) :
   - SUPPRIMER tous les espaces parasites : "3 6" → "36", "8 5 2" → "852"
   - Garder seulement les chiffres et les séparateurs décimaux
   - Exemples : "3 6" → "36", "1 2 3" → "123", "850 m²" → "850"

2. NOMS et ADRESSES :
   - Garder la casse EXACTEMENT comme dans le document (majuscules/minuscules)
   - Garder les espaces normaux entre les mots
   - Exemples : "COPPIN JEAN BAPTISTE" → "COPPIN JEAN BAPTISTE" (tel quel)

3. DATES :
   - Garder le format avec espaces s'il existe : "08 / 10 / 2025" → "08 / 10 / 2025"
   - Ne pas reformater

4. Valeurs manquantes :
   - Si une valeur n'existe pas dans le document : mettre null (pas la chaîne "null")

ADRESSES DANS LE DOSSIER CEE (TRÈS IMPORTANT) :
- Adresse SIÈGE SOCIAL : en haut à DROITE du CEE (avec coordonnées client)
- Adresses CHANTIERS (CRITIQUE - lire TOUT le document) :
  * PARCOURIR ENTIÈREMENT le dossier CEE pour identifier TOUTES les adresses de chantiers
  * Chercher dans :
    1. En haut à GAUCHE (première page) : adresse chantier principal
    2. Dans CHAQUE page "ATTESTATION SUR L'HONNEUR" : adresse en haut de l'attestation
    3. Dans les factures : adresses mentionnées
    4. Dans toute section mentionnant une adresse de travaux/chantier/site
  * IMPORTANT : Si tu trouves 2 attestations sur l'honneur → extraire les 2 adresses
  * IMPORTANT : Si tu trouves 3 attestations sur l'honneur → extraire les 3 adresses
  * Retourner un tableau avec TOUTES les adresses trouvées : ["adresse 1", "adresse 2", ...]
  * NE PAS déduire le nombre d'adresses du nombre d'audits/synthèses - lire le CEE lui-même

SURFACES ET ATTESTATIONS (TRÈS IMPORTANT) :
- Dans l'AUDIT, section "Description" > "Observations préliminaires" : extraire TOUTES les surfaces mentionnées (tableau)
- Dans le CEE, chercher "ATTESTATION SUR L'HONNEUR Existence d'un entrepôt de stockage non agricole" :
  - PARCOURIR TOUT LE DOCUMENT pour trouver TOUTES les attestations (il peut y en avoir 2, 3 ou plus)
  - Pour CHAQUE attestation trouvée (ne pas s'arrêter à la première) :
    - Extraire l'ADRESSE COMPLÈTE du chantier (numéro, rue, CP, ville - généralement en haut de l'attestation)
    - Extraire TOUTES les surfaces de bâtiments listées dans cette attestation (tableau)
  - Retourner un tableau d'objets : [{adresse: "adresse complète 1", surfaces: ["850", "456"]}, {adresse: "adresse complète 2", surfaces: ["1240"]}, ...]
  - Si aucune attestation trouvée : retourner un tableau vide []
- Dans la SYNTHÈSE, "Fiche d'identité du site" > "Surface éclairée" : extraire la surface totale

MENTIONS AGRICOLES :
- Chercher toute mention de "agri", "agricole", "agriculture", "agriculteur" dans TOUS les documents
- SAUF dans le nom de la société (le nom peut contenir "agricole")
- Retourner true si trouvé, false sinon

FORMAT DE RÉPONSE (JSON uniquement) :
\`\`\`json
{
  "audits": [
    {
      "nom": "Nom entreprise page 1",
      "adresse": "Adresse chantier complète page 1",
      "date": "Date page 1",
      "siret": "SIRET sans espaces",
      "surfaces": ["850", "456"],
      "ledTotal": "36",
      "profilUtilisation": "Profil/type"
    }
  ],
  "syntheses": [
    {
      "nom": "Nom entreprise page 1",
      "adresse": "Adresse chantier fiche identité",
      "date": "Date page 1",
      "ledTotal": "Total LED inventaire projet",
      "surfaceEclairee": "Surface éclairée fiche identité",
      "secteurActivite": "Secteur d'activité",
      "profilUtilisation": "Profil mentionné",
      "thd": "THD caractéristiques luminaires",
      "referenceProduit": "Référence produit"
    }
  ],
  "cee": {
    "nom": "Nom société bénéficiaire",
    "siret": "SIRET (14 chiffres)",
    "adressesChantiers": ["1 rue Example 60000 VILLE1", "25 avenue Test 60130 VILLE2"],
    "adresseSiege": "Adresse siège social (haut droite)",
    "totalLed": "Nombre total LED",
    "dateDevis": "Date envoi devis",
    "dateSignature": "Date signature/engagement",
    "resteAPayer": "Reste à payer / reste à charge",
    "secteurActivite": "Secteur d'activité / type de local",
    "parcelles": "Parcelles cadastrales",
    "attestations": [
      {
        "adresse": "1 rue Example 60000 VILLE1",
        "surfaces": ["850", "456"]
      },
      {
        "adresse": "25 avenue Test 60130 VILLE2",
        "surfaces": ["1240"]
      }
    ],
    "mentionsAgricoles": {
      "trouvee": false,
      "localisation": null
    }
  },
  "ficheTechnique": {
    "thd": "THD spécifications (ou null)",
    "reference": "Référence produit (ou null)"
  }
}
\`\`\`

RAPPEL MULTI-CHANTIERS :
- Si le dossier CEE contient 2 attestations sur l'honneur → extraire 2 adresses dans "adressesChantiers" ET 2 objets dans "attestations"
- Si le dossier CEE contient 3 attestations sur l'honneur → extraire 3 adresses dans "adressesChantiers" ET 3 objets dans "attestations"
- Chaque attestation DOIT avoir son adresse complète (celle écrite en haut de l'attestation)
- NE JAMAIS mettre qu'une seule adresse si le document contient plusieurs chantiers

IMPORTANT : Retourner UNIQUEMENT le JSON, sans texte avant ou après.`;
}
