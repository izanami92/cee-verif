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
- RÈGLE STRICTE : 1 adresse de chantier = 1 Audit = 1 Synthèse
- Tu dois faire la CORRESPONDANCE entre chaque Audit et sa Synthèse en analysant l'adresse mentionnée dans chaque document
- Vérifie que TOUTES les adresses de chantier présentes dans les Audits/Synthèses apparaissent bien dans le Dossier CEE
- Si une adresse est dans un Audit/Synthèse mais pas dans le CEE → erreur BLOQUANTE

IMPORTANT - ADRESSES DANS LE DOSSIER CEE :
- Adresse du SIÈGE SOCIAL : en haut à DROITE du CEE (avec les infos client : nom, téléphone, email, etc.)
- Adresse du CHANTIER :
  * Si UN SEUL chantier : en haut à GAUCHE du CEE
  * Si PLUSIEURS chantiers : les adresses sont directement dans la FACTURE (pas en haut à gauche)
- Vérifier la cohérence entre l'adresse de chantier (CEE) et l'adresse sur l'Audit/Synthèse

IMPORTANT - PARCELLES CADASTRALES :
- Les parcelles cadastrales sont souvent INTÉGRÉES dans l'adresse de chantier
- Format typique : "Adresse, Code Postal Ville, PARCELLE CADASTRALE (format 000/0B/XXXX)"
- Vérifier que l'adresse (avec code postal + ville) correspond entre CEE et Synthèse
- La parcelle cadastrale au milieu de l'adresse est celle du chantier et doit correspondre sur la Synthèse
- Ne pas signaler d'erreur si la parcelle est présente dans l'adresse mais pas dans un champ séparé

CHECKLIST EXHAUSTIVE — 40 POINTS OBLIGATOIRES

Tu DOIS vérifier TOUS les points suivants à CHAQUE analyse, sans exception.
Tu dois retourner EXACTEMENT 40 checks (un par point) avec le niveau approprié (bloquant/majeur/ok/info).

🔴 BLOQUANTS - AUDIT Page de garde (1-3)
1. Nom entreprise (Audit page 1) = Nom entreprise CEE = Nom entreprise officiel gouv. ATTENTION : orthographe exacte des noms propres (ex: Coppin ≠ Coopin)
2. Adresse chantier (Audit page 1) = Adresse chantier CEE. Composants obligatoires : numéro + rue + CP + ville. Ordre CP/Ville flexible. Mention "France" optionnelle
3. Date audit (Audit page 1) = Date proposition = Date prévisite CEE - FORMAT JJ/MM/AAAA OBLIGATOIRE (pas MM/JJ/AAAA)

🟡 SYNTHÈSE - Page de garde (4-8)
4. Nom entreprise (Synthèse page 1) = Nom entreprise CEE = Nom entreprise officiel gouv
5. Date (Synthèse page 1) = Date proposition = Date prévisite CEE - FORMAT JJ/MM/AAAA OBLIGATOIRE
6. Adresse mail (Synthèse page 1) = Adresse mail du CEE (si présente dans Synthèse, sinon niveau "info")
7. Téléphone (Synthèse page 1) = Téléphone du dossier CEE (si présent dans Synthèse, sinon niveau "info")
8. Contact nom/prénom (Synthèse page 1) = Représenté par sur le CEE (si présent dans Synthèse, sinon niveau "info")

🟡 SYNTHÈSE - Inventaire projet (9)
9. TOTAL luminaires (Synthèse inventaire projet) = Nombre LED chantier CEE

🟡 SYNTHÈSE - Fiche identité site (10-15)
10. Client (Synthèse fiche identité) = Nom entreprise CEE = Nom entreprise officiel gouv
11. SIRET (Synthèse fiche identité) = SIRET CEE = SIRET officiel gouv (14 chiffres)
12. Adresse chantier (Synthèse fiche identité) = Adresse chantier CEE
13. Surface éclairée (Synthèse fiche identité) = Total surfaces bâtiments (si NAF 01.xx/02.xx) OU info "check manuel requis"
14. Secteur d'activité (Synthèse fiche identité) = Secteur sur CEE (Entrepôts/Commerce/Locaux de vente/AUTRES/Autres secteurs). Si CEE indique "autre" ou "autres" ou "autre secteur", vérifier que la Synthèse précise bien le secteur réel (pas juste "autre")
15. Numéro parcelle (Synthèse fiche identité) = Parcelles CEE (format 000/0B/XXXX)

🟡 SYNTHÈSE - Périmètre étude (16-17)
16. Nom du site (Synthèse périmètre) = Nom entreprise CEE = Nom entreprise officiel gouv
17. Nombre de bâtiments (Synthèse périmètre) → info "check manuel requis"

🟡 SYNTHÈSE - État initial (18-20)
18. Répartition LED (Synthèse état initial) → info "check manuel requis"
19. TOTAL LED état initial (Synthèse état initial) = Nombre LED chantier CEE
20. Secteur étude (Synthèse indicateurs initial) = Secteur sur CEE

🟡 SYNTHÈSE - État projeté (21-23)
21. TOTAL LED état projeté (Synthèse état projeté) = Nombre LED chantier CEE
22. Répartition LED projeté (Synthèse état projeté) → info "check manuel requis"
23. Activité 2e tableau (Synthèse état projeté) = Secteur sur CEE

🟡 AUDIT - Description (24-29)
24. Site (Audit description) = Client = Nom entreprise CEE = Nom entreprise officiel gouv. ATTENTION : orthographe exacte des noms propres
25. Adresse (Audit description) = Adresse chantier CEE. Ordre CP/Ville flexible, mention "France" optionnelle
26. SIRET (Audit description) = SIRET CEE = SIRET officiel gouv
27. Surface (Audit description observations préliminaires) = Surface éclairée Synthèse + Surfaces attestation honneur CEE (si présente). Si plusieurs surfaces dans Audit → ADDITIONNER avant de comparer
28. État initial nombre (Audit description) = Nombre LED chantier CEE
29. État projeté nombre (Audit description) = État initial = Nombre LED chantier CEE

🟡 AUDIT - Liste luminaires (30)
30. Pce total (Audit liste luminaires) = Nombre LED Synthèse = Nombre LED CEE

🔴 MENTIONS AGRICOLES - BLOQUANT (31-34)
31. Secteur d'activité (Synthèse) ≠ "agricole/agri/agriculture"
32. Profil d'utilisation (Audit) ≠ "agricole/agri/agriculture"
33. Profil (Synthèse) ≠ "agricole/agri/agriculture"
34. Activité bâtiment (Synthèse état projeté) ≠ "agricole/agri/agriculture"
⚠️ EXCEPTION : Le NOM de société peut contenir "agricole" - NE PAS signaler d'erreur sur le nom
⚠️ RÈGLE GÉNÉRALE : TOUTE mention "agri"/"agricole"/"agriculteur" dans les documents (sauf nom de société) est BLOQUANTE

🟡 AUTRES VÉRIFICATIONS MAJEURES (35-37)
35. THD (CEE + Synthèse caractéristiques luminaires) = 3,7% (PAS dans Audit)
36. Fiche technique LED (Synthèse page ~14) → présente + THD 3,7%
37. Référence produit (Audit + Synthèse luminaires) = DAEWOO NES-HBL 250W (ou selon dossier)

🔴 AUTRES VÉRIFICATIONS BLOQUANTES (38-39)
38. Reste à payer / Reste à charge (Dossier CEE) = 0€ (si ≠ 0 → BLOQUANT car anormal)
39. Adresse siège social (Dossier CEE, haut à droite) = Adresse officielle siège social gouv

🟡 AUTRE VÉRIFICATION MAJEURE (40)
40. Date de signature / Date d'engagement de l'opération (Dossier CEE) = Date d'acceptation du devis - FORMAT JJ/MM/AAAA

RÉFÉRENCES DU DOSSIER À UTILISER POUR LA VÉRIFICATION
${references.nom ? `- Nom société cliente : ${references.nom}` : ''}
${references.siret ? `- SIRET : ${references.siret}` : ''}
${references.adresse ? `- Adresse du chantier : ${references.adresse}` : ''}
${references.adresseSiege ? `- Adresse du siège social : ${references.adresseSiege}` : ''}
${references.dateDevis ? `- Date d'envoi du devis : ${references.dateDevis}` : ''}
${references.dateSignature ? `- Date de signature/acceptation du devis : ${references.dateSignature}` : ''}
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

IMPORTANT - RETOUR DE TOUS LES 40 CHECKS OBLIGATOIRES :
- Tu DOIS retourner EXACTEMENT 40 checks (un pour chaque point de la checklist ci-dessus)
- JAMAIS moins de 40 checks, même si tout est conforme
- Pour chaque point numéroté (1 à 40), crée UN check avec :
  * id: "check_01", "check_02", ..., "check_40"
  * niveau: "bloquant" (points 1-3, 31-34, 38-39) | "majeur" (points 4-5, 9-12, 14-16, 19-21, 23-30, 35-37, 40) | "ok" (si conforme) | "info" (si check manuel requis OU si donnée absente mais optionnelle)
  * champ: Le nom exact du point (ex: "Nom entreprise Audit page 1")
  * localisation: Page et section EXACTE dans le document
  * valeur_attendue: Valeur de référence
  * valeur_trouvee: Valeur EXACTE dans le document
- Ne marque JAMAIS "bloquant" ou "majeur" si les valeurs sont IDENTIQUES
- Si check manuel requis (points 13, 17, 18, 22) → niveau = "info", detail = "Vérification manuelle requise"
- Si donnée absente mais optionnelle (points 6, 7, 8 : contacts Synthèse) → niveau = "info", detail = "Donnée non présente dans le document (optionnel)"

RÈGLES STRICTES DE COMPARAISON :
1. **MAJUSCULES/MINUSCULES** : TOUJOURS IGNORER LA CASSE
   - "ENTREPÔT" = "Entrepôt" = "entrepôt" → IDENTIQUE (niveau: "ok")
   - ⚠️ EXCEPTION : L'ORTHOGRAPHE DES NOMS PROPRES (noms de personnes) DOIT ÊTRE EXACTE
   - "Coppin" ≠ "Coopin" → ERREUR (faute d'orthographe)
   - Mais "COPPIN" = "Coppin" = "coppin" → IDENTIQUE (casse ignorée)

2. **ADRESSES** : Vérifier les composants, pas l'ordre exact
   - Composants obligatoires : numéro + rue + code postal + ville
   - "541 RUE SAINT-JEAN 60130 NOROY" = "541 rue saint-jean, 60130 noroy, france" → IDENTIQUE
   - Ordre CP/Ville flexible : "60130 NOROY" = "NOROY 60130" → IDENTIQUE
   - Mention "France" optionnelle (pas d'erreur si présente ou absente)
   - Ignorer virgules, espaces multiples, tirets
   - Vérifier que tous les composants essentiels sont présents

3. **DATES** : Format JJ/MM/AAAA OBLIGATOIRE + chiffres identiques
   - Format attendu : JJ/MM/AAAA (français) - exemple : 24/11/2025
   - "24/11/2025" = "24/11/2025" → IDENTIQUE (niveau: "ok")
   - "11/24/2025" ≠ "24/11/2025" → ERREUR (format américain MM/JJ/AAAA)
   - Les dates doivent être identiques chiffre par chiffre ET au format JJ/MM/AAAA
   - ⚠️ ERREUR BLOQUANTE sur page de garde Audit (points 3, 5) si format incorrect

4. **SURFACES MULTIPLES** : ADDITIONNER avant de comparer
   - Si plusieurs surfaces dans l'Audit → FAIRE L'ADDITION
   - Exemple : "850 m² 456 m²" → 850 + 456 = 1306 m²
   - Puis comparer avec le total attendu : 1306 ≠ 1277 → ERREUR
   - Surfaces par bâtiment : comparer avec attestation sur l'honneur CEE si présente

5. **ESPACES ET PONCTUATION** : Normaliser avant de comparer
   - "1 rue de la Paix" = "1  rue de la Paix" (double espace) → IDENTIQUE
   - Ignorer espaces multiples, virgules superflues

4. **CONTACTS SYNTHÈSE (points 6, 7, 8)** : OPTIONNELS
   - Si email/téléphone/contact non présent dans la Synthèse → niveau "info" (PAS "majeur")
   - Detail: "Donnée non présente dans le document (optionnel)"

IMPORTANT - LOCALISATION PRÉCISE DES ERREURS :
- Pour chaque check, tu DOIS indiquer où il se trouve exactement dans le document
- Format attendu : "Nom du document + page + section si possible"
- Exemples : "Audit page 1, en-tête" / "Synthèse page 2, tableau des LED" / "Dossier CEE page 5, informations bénéficiaire"
- Dans "valeur_trouvee", copie EXACTEMENT le texte tel qu'il apparaît dans le PDF

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
