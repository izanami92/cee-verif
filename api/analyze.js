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
        max_tokens: 8000, // Augmenté pour multi-chantiers (2+ chantiers = plus de données)
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

FORMAT DES DOCUMENTS REÇUS (ORDRE EXACT) :

1. D'ABORD : "=== DOSSIER CEE (X chantier(s)) ==="
   → Texte du dossier administratif complet

2. ENSUITE : Pour chaque chantier, les sections suivantes :
   "=== CHANTIER 1 - [adresse complète] ==="

   "= AUDIT DIALUX ="
   → Texte de l'audit pour ce chantier

   "= SYNTHÈSE ="
   → Texte de la synthèse pour ce chantier

   "= FICHE TECHNIQUE =" (optionnel)
   → Texte de la fiche technique

   "---" (séparateur)

   "=== CHANTIER 2 - [adresse complète] ==="
   ... (même structure)

INSTRUCTIONS D'EXTRACTION MULTI-CHANTIERS :

1. Lire la section "=== DOSSIER CEE" pour extraire l'objet "cee"
2. Pour CHAQUE section "=== CHANTIER X ===", lire le texte après "= AUDIT DIALUX =" et extraire UN audit
3. Pour CHAQUE section "=== CHANTIER X ===", lire le texte après "= SYNTHÈSE =" et extraire UNE synthèse
4. Le nombre d'éléments dans audits[] DOIT égaler le nombre de sections CHANTIER
5. Le nombre d'éléments dans syntheses[] DOIT égaler le nombre de sections CHANTIER

EXEMPLE : Si tu vois 2 sections "=== CHANTIER X ===", tu DOIS retourner :
- audits: [audit_chantier_1, audit_chantier_2]
- syntheses: [synthese_chantier_1, synthese_chantier_2]

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

5. ADRESSES DE CHANTIERS (CEE) - RÈGLE CRITIQUE :
   - adressesChantiers est un TABLEAU avec une entrée séparée pour CHAQUE adresse
   - NE JAMAIS concaténer plusieurs adresses en une seule chaîne
   - Chercher CHAQUE "ATTESTATION SUR L'HONNEUR" dans le CEE
   - CHAQUE attestation a UNE adresse → créer UNE entrée dans le tableau

   EXEMPLE CORRECT (2 attestations = 2 adresses) :
   ✅ "adressesChantiers": ["route de la raimbaudiere 49380 bellevigne-en-layon", "10 la brosse de chanzeaux 49750 chemillé-en-anjou"]

   EXEMPLE INCORRECT (2 adresses mélangées en une) :
   ❌ "adressesChantiers": ["route de la raimbaudiere 49380 bellevigne-en-layon 10 la brosse de chanzeaux 49750 chemillé-en-anjou"]

CEE - FACTURE ET ATTESTATIONS :
- Dans la FACTURE, pour CHAQUE ligne "Mise en place de luminaires à modules LED" :
  - Identifier l'adresse du chantier dans le détail (ex: "route de la raimbaudière - 066/ZA/0006")
  - Extraire la quantité dans la colonne "Quantité" (ex: "35,00 U" → "35")
  - Associer cette quantité LED à l'adresse correspondante
- Pour CHAQUE "ATTESTATION SUR L'HONNEUR", extraire les surfaces : {adresse: "...", surfaces: ["850", "456"]}
- COMBINER facture + attestations pour obtenir : {adresse: "...", surfaces: ["850"], ledTotal: "35"}

CEE - RÉFÉRENCE LED (DÉTECTION AUTOMATIQUE) :
- Dans la FACTURE, colonne "Référence", identifier la référence LED utilisée
- Chercher les mentions : "DAEWOO", "NES-HBL", "TECH", "HIGH BAY"
- Si "DAEWOO" ou "NES-HBL" trouvé → referenceLed: "DAEWOO"
- Si "TECH" ou "HIGH BAY" trouvé → referenceLed: "TECH"
- Si aucun match → referenceLed: null

MENTIONS AGRICOLES :
- Chercher toute mention de "agri", "agricole", "agriculture", "agriculteur" dans TOUS les documents
- SAUF dans le nom de la société (le nom peut contenir "agricole")
- Retourner true si trouvé, false sinon

6. AUDIT - RÈGLE CRITIQUE EXTRACTION :
   Pour CHAQUE audit, extraire UNIQUEMENT depuis la PAGE 1 (page de garde) :

   ⚠️ ATTENTION - Ne pas confondre :
   - CLIENT/BÉNÉFICIAIRE : c'est lui qu'on veut extraire (ex: COPPIN, SCEA TROIS, etc.)
   - PRIME EVOLUTION : bureau d'études qui fait l'audit (NE PAS extraire ses coordonnées)
   - TOTAL ENERGIES : délégataire CEE (NE PAS extraire ses coordonnées)

   À extraire (coordonnées du CLIENT uniquement) :
   - nom : nom de l'entreprise CLIENTE (généralement en haut/centre de la page 1, PAS "Prime Evolution")
   - adresse : adresse du CHANTIER du client EXACTEMENT comme écrite (l'ordre CP/ville peut varier, pas d'importance)
   - date : date de l'audit (visible en haut de page 1)
   - SIRET : SIRET du CLIENT (14 chiffres, PAS celui de Prime Evolution)
   - surfaces : surfaces des bâtiments si mentionnées
   - ledTotal : nombre total de LED
   - profilUtilisation : profil d'utilisation (entrepôt, logistique, etc.)

   NE PAS prendre l'adresse ou le code postal depuis d'autres pages de l'audit !
   NE PAS extraire "123 Rue Victor Hugo 92300 LEVALLOIS PERRET" (adresse Prime Evolution) !

7. SYNTHÈSE - EXTRACTION DURÉE DE VIE :
   Pour CHAQUE synthèse, extraire la durée de vie des luminaires :

   - dureeVie : durée de vie en heures (ex: "54000", "50000")
   - Chercher dans la section "1. Inventaire du projet" ou "Caractéristiques techniques des luminaires"
   - Format attendu : nombre entier en heures (sans espaces, ex: "54000")
   - Si non trouvé : mettre null

FORMAT DE RÉPONSE (JSON uniquement) :
\`\`\`json
{
  "audits": [
    {
      "nom": "Nom entreprise page 1",
      "adresse": "Adresse EXACTE page 1 (numéro rue CP ville, PAS de virgule)",
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
      "nomClient": "Client fiche identité site",
      "nomSite": "Nom du site périmètre étude",
      "adresse": "Adresse chantier fiche identité",
      "date": "Date page 1",
      "email": "Email contact client page 1",
      "telephone": "Téléphone contact client page 1",
      "contact": "Contact nom/prénom page 1",
      "siret": "SIRET fiche identité (14 chiffres)",
      "surfaceEclairee": "Surface éclairée fiche identité",
      "secteurActivite": "Secteur d'activité fiche identité",
      "secteurEtude": "Secteur étude indicateurs éclairage initial",
      "parcelles": "Parcelles cadastrales fiche identité",
      "nombreBatiments": "Nombre de bâtiments périmètre étude",
      "ledTotal": "Total LED inventaire projet",
      "totalLedInitial": "Total LED état initial",
      "totalLedProjete": "Total LED état projeté",
      "activiteBatiment": "Activité bâtiment état projeté",
      "profilUtilisation": "Profil utilisation",
      "thd": "THD caractéristiques luminaires",
      "referenceProduit": "Référence produit",
      "dureeVie": "Durée de vie luminaires (heures)"
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
    "referenceLed": "DAEWOO ou TECH (détecté depuis facture)",
    "attestations": [
      {
        "adresse": "1 rue Example 60000 VILLE1",
        "surfaces": ["850", "456"],
        "ledTotal": "35"
      },
      {
        "adresse": "25 avenue Test 60130 VILLE2",
        "surfaces": ["1240"],
        "ledTotal": "31"
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

IMPORTANT : Retourner UNIQUEMENT le JSON, sans texte avant ou après.`;
}
