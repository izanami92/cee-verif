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

   ⚠️ ADRESSES - NE PAS INCLURE MENTIONS DE BÂTIMENTS NI PARCELLES CADASTRALES :
   - NE JAMAIS inclure dans l'adresse :
     * Mentions de bâtiments : "batiment 1", "BAT 2", "batiments 1-2-3-4", "bâtiment A", etc.
     * Parcelles cadastrales : "000/ZI/0134", "129/YD/0203", format XXX/XX/XXXX
   - Ces éléments sont des RÉFÉRENCES, pas l'adresse géographique
   - Extraire UNIQUEMENT l'adresse postale : rue/lieu-dit, code postal, ville

   EXEMPLES CORRECTS :
   ✅ "LA MAZURIE 85190 VENANSAULT"
   ✅ "route de la raimbaudiere 49380 bellevigne-en-layon"

   EXEMPLES INCORRECTS :
   ❌ "LA MAZURIE - batiments 1-2-3-4 LA MAZURIE 85190 VENANSAULT"
   ❌ "route de la raimbaudière - 066/ZA/0006 49380 bellevigne"
   ❌ "La Mazurie - batiments 1-2-3-4, 000/ZI/0134, LA MAZURIE, 85190 VENANSAULT"

   Si tu vois "La Mazurie - batiments 1-2-3-4, 000/ZI/0134, LA MAZURIE, 85190 VENANSAULT"
   → extraire UNIQUEMENT "LA MAZURIE 85190 VENANSAULT"

CEE - FACTURE ET ATTESTATIONS (EXTRACTION PAR CHANTIER) :
- Dans la FACTURE, pour CHAQUE ligne "Mise en place de luminaires à modules LED" :
  - Identifier l'adresse du chantier dans le détail (ex: "route de la raimbaudière - 066/ZA/0006")
  - Extraire la quantité dans la colonne "Quantité" (ex: "35,00 U" → "35")
  - Associer cette quantité LED à l'adresse correspondante

⚠️ IMPORTANT - DISTINCTION ENTRE 2 TYPES D'ATTESTATIONS :
Le dossier CEE contient 2 attestations différentes. Tu dois extraire UNIQUEMENT depuis la bonne :

1️⃣ "Attestation d'installation de matériel éligible au CEE par le service technique interne
    Dans le cadre de la fiche d'opération standardisée n° BAT-EQ-127"
    → Concerne le MATÉRIEL/ÉQUIPEMENT installé
    → ⚠️ NE PAS extraire les surfaces depuis cette attestation

2️⃣ "ATTESTATION SUR L'HONNEUR
    Existence d'un entrepôt de stockage non agricole – Fiche d'opération standardisée CEE BAT-EQ-127"
    → Concerne l'ENTREPÔT (bâtiment)
    → ✅ EXTRAIRE les surfaces depuis CETTE attestation uniquement

RÈGLE D'EXTRACTION :
- Chercher la section avec "ATTESTATION SUR L'HONNEUR" ET "Existence d'un entrepôt"
- Dans cette section, extraire la phrase "La surface réelle de cet entrepôt... est de XXX m²"
- Si cette attestation n'existe PAS dans le document → surfaces: []
- Ne JAMAIS extraire les surfaces depuis l'attestation d'installation de matériel

⚠️ MAILLE DES ATTESTATIONS (RÈGLE IMPÉRATIVE) :
- 1 occurrence de la phrase "La surface réelle de cet entrepôt ... est de XXX m²" = 1 élément dans attestations[].
- CHAQUE élément porte EXACTEMENT UNE surface. NE JAMAIS empiler plusieurs surfaces dans un même élément.
- S'il y a 3 phrases de surface → 3 éléments distincts : surfaces ["274"], puis ["363"], puis ["441"] — JAMAIS 1 seul élément avec surfaces ["274","363","441"].
- NE PAS regrouper les attestations par adresse : même si plusieurs partagent la même adresse postale, 1 phrase de surface = 1 élément (ledTotal et parcelles restent ceux de CE chantier, lus depuis la facture).

- Pour CHAQUE "ATTESTATION SUR L'HONNEUR" (celle concernant l'entrepôt), extraire :
  - adresse : adresse du chantier
  - surfaces : tableau contenant UNE seule surface, ex. ["850"] (voir RÈGLE DE MAILLE ci-dessus)
  - ledTotal : nombre de LED (depuis facture)
  - secteurActivite : secteur d'activité SPÉCIFIQUE à ce chantier (voir section suivante)
  - parcelles : parcelles cadastrales SPÉCIFIQUES à ce chantier (format "000/0B/0551 - 000/0B/0547")
    * Chercher dans le CEE, SOUS ou À PROXIMITÉ de l'adresse de ce chantier
    * Format typique : "000/0B/0551 - 000/0B/0547 - 000/0B/0549 - 000/0B/0045"
    * Si plusieurs chantiers : CHAQUE attestation a ses propres parcelles
    * Si un seul chantier : toutes les parcelles vont dans cette attestation
  - etudeDimensionnement : entreprise citée dans la mention "Etude de dimensionnement réalisée par l'entreprise ..." de la FACTURE, pour CE chantier (ex: "PRIME EVOLUTION"). null si la mention est absente. Extraire UNIQUEMENT l'entreprise (pas SIRET/adresse/représentant).
  - attestationNonAgricole : statut de l'« ATTESTATION SUR L'HONNEUR — Existence d'un entrepôt de stockage non agricole » pour CE chantier. 2 valeurs EXACTES :
    * "presente" → la phrase « entrepôt de stockage non agricole » est bien détectée dans l'attestation sur l'honneur de ce chantier. SEUL cas conforme.
    * "non_detectee" → cette phrase n'est PAS détectée (attestation entrepôt absente, illisible, ou doute). VALEUR PAR DÉFAUT. Ne JAMAIS mettre "presente" par défaut.
    * ⚠️ La phrase « entrepôt de stockage non agricole » est ce qui DISTINGUE cette attestation de l'« Attestation d'installation de matériel … par le service technique interne ». NE PAS déduire "presente" du seul code « BAT-EQ-127 » (présent sur les DEUX attestations).
- COMBINER facture + attestations pour obtenir : {adresse: "...", surfaces: ["850"], ledTotal: "35", secteurActivite: "Entrepôts", parcelles: "000/0B/0551 - 000/0B/0547"}

CEE - GRAIN CELLULE (LED PAR BÂTIMENT) — TABLEAU cellules[] (DISTINCT DE attestations[]) :

⚠️ DÉCLENCHEUR = RÉPÉTITION DE L'ADRESSE SUR LA FACTURE (analyse INTER-chantiers) :
- Compare entre eux TOUS les blocs facture « Mise en place de luminaires à modules LED »
  (ceux dont tu extrais déjà adresse + quantité plus haut).
- Normalise chaque adresse pour la COMPARAISON : garde rue + ville + code postal ;
  RETIRE de la clé de comparaison la mention de bâtiment (BAT 1, Bât 2, bâtiment A…)
  ET les parcelles cadastrales. (Tu ne retires ceci que pour COMPARER ; l'adresse
  écrite dans la cellule, elle, reste verbatim — voir champs plus bas.)
- Une adresse a PLUSIEURS BÂTIMENTS si DEUX blocs facture ou plus partagent la même
  adresse normalisée. Dans ce cas : émettre UNE cellule PAR BLOC facture de ce groupe.
- Une adresse qui n'apparaît que dans UN SEUL bloc facture → AUCUNE cellule (bâtiment
  unique ; sa LED reste au grain chantier dans attestations[]).
- ⚠️ Ce déclencheur ne dépend PAS de la présence d'un numéro « BAT n » : deux blocs à
  la même adresse SANS aucune mention de bâtiment comptent quand même pour 2 bâtiments.
  Exemple réel : « 541 RUE SAINT-JEAN DES PLEURS » (sans numéro, 24 luminaires) +
  « 541 RUE SAINT-JEAN DES PLEURS BAT 2 » (12 luminaires) → 2 cellules [24, 12], bien
  que le premier bloc ne porte aucun numéro de bâtiment.

⚠️ VALEUR ledCellule = QUANTITÉ DE CE BLOC FACTURE (anti-invention, jamais de faux
conforme silencieux) :
- ledCellule = la quantité LED lue dans la colonne « Quantité » DU BLOC FACTURE de ce
  bâtiment (ex. « 26,00 U » → "26"). C'est la SEULE source de ce chiffre.
- NE JAMAIS lire ledCellule sur l'attestation entrepôt (surface) ni la sommer ; NE
  JAMAIS répartir/estimer un total chantier sur des bâtiments supposés.
- La quantité de CHAQUE bloc est conservée TELLE QUELLE, NON sommée — même si plusieurs
  blocs partagent l'adresse. (Ex. deux blocs « 4 RUE DE FEUILLERES » à 26 chacun → deux
  cellules à "26", PAS une à "52".)

⚠️ MAILLE PROPRE À cellules[] — INDÉPENDANTE DE attestations[] :
- 1 bloc facture appartenant à une adresse multi-bâtiments = 1 élément dans cellules[].
- Cette maille est INDÉPENDANTE de celle de attestations[] : NE JAMAIS aligner le
  nombre de cellules sur le nombre d'éléments de attestations[], NI l'inverse. Les deux
  tableaux peuvent avoir des cardinalités DIFFÉRENTES, et c'est NORMAL. (Ex. DELEFORTRIE :
  1 seule attestation entrepôt — surface 2601 agrégée — mais 2 cellules au « 4 rue ».)
- Si AUCUNE adresse n'apparaît dans 2 blocs facture ou plus → cellules: [].
- Mieux vaut cellules: [] qu'une cellule dont le chiffre serait un total ou une estimation.

EXEMPLES (à appliquer tels quels) :
- Facture avec « 4 RUE DE FEUILLERES BAT 1 » (26) + « 4 RUE DE FEUILLERES BAT 2 » (26)
  + « 6 RUE DE FEUILLERES » (14) → « 4 rue » apparaît dans 2 blocs → 2 cellules [26, 26].
  « 6 rue » dans 1 seul bloc → PAS de cellule.
- Facture avec « 541 RUE SAINT-JEAN DES PLEURS » (24) + « 541 RUE SAINT-JEAN DES PLEURS
  BAT 2 » (12) → même adresse normalisée, 2 blocs → 2 cellules [24, 12].
- Facture avec 2 adresses DIFFÉRENTES, 1 bloc chacune → cellules: [].
- Un seul bloc facture pour une adresse, même libellée « bâtiment 1 à 4 » → cellules: [].

- Champs de chaque élément cellules[] (EXACTEMENT ces trois) :
  - adresse : l'adresse COMPLÈTE du bloc facture, RECOPIÉE telle qu'écrite sur les lignes
    du bloc — rue + mention de bâtiment (si présente) + code postal + ville — sans rien
    omettre. Le bloc facture écrit le code postal et la ville sur la ligne qui SUIT la rue
    (ex. « 80360 HEM-MONACU ») : tu DOIS recopier cette ligne code postal + ville, ne
    l'omets JAMAIS. Exemple : "4 RUE DE FEUILLERES BAT 1 80360 HEM-MONACU". Si le bloc ne
    porte aucun numéro de bâtiment, recopie quand même rue + code postal + ville. NE PAS
    normaliser ici, NE PAS retirer la mention de bâtiment, NE PAS retirer le code
    postal/ville. (La normalisation ne sert qu'à la comparaison ci-dessus.) C'est une
    RECOPIE fidèle, pas une transformation. Cette adresse doit CORRESPONDRE à celle de
    l'attestation entrepôt du même chantier (qui porte rue + bâtiment + code postal +
    ville) — c'est la cible de symétrie.
  - ledCellule : la quantité LED de ce bloc facture, en string (ex. "26"), NON sommée.
  - source : la chaîne EXACTE "facture".

CEE - ADRESSE DU SIÈGE SOCIAL (CRITIQUE) :
⚠️ IMPORTANT : L'adresse du siège social est OBLIGATOIRE pour valider le dossier CEE.

- Chercher en HAUT À DROITE du dossier CEE (première page)
- Section typique : "Bénéficiaire" ou "Entreprise bénéficiaire" ou coordonnées société
- Extraire l'adresse COMPLÈTE du siège social (rue, code postal, ville)
- Format attendu : "2 RUE DE PREPSON, 86110 AMBERRE" ou "123 Avenue Example, 75001 PARIS"
- NE PAS confondre avec l'adresse du chantier (qui peut être différente)
- Si plusieurs adresses sont mentionnées :
  * Siège social : généralement indiqué explicitement ou dans les coordonnées principales
  * Adresse chantier : dans les attestations sur l'honneur
- Si non trouvé : chercher aussi dans les sections "Coordonnées", "Raison sociale", "SIRET"
- L'adresse du siège est généralement proche du SIRET et du nom de la société
- En cas de doute : prendre l'adresse qui accompagne le SIRET de l'entreprise

EXEMPLE :
Si tu vois :
  "Bénéficiaire : NAUDON ERWAN
   SIRET : 88130016400020
   2 Rue de Prepson
   86110 AMBERRE"
→ adresseSiege: "2 Rue de Prepson, 86110 AMBERRE"

CEE - PROFESSIONNEL AYANT MIS EN ŒUVRE (section C de l'attestation sur l'honneur Total Énergies) :
- entrepriseMiseEnOeuvre : raison sociale du professionnel déclaré DANS la section C de l'attestation sur l'honneur Total Énergies.

  OÙ LIRE (ancrage de la SOURCE) :
  1. Repérer la section dont le titre EXACT est : "C/ Professionnel ayant mis en œuvre l'opération d'économies d'énergie ou assuré sa maîtrise d'œuvre".
  2. À L'INTÉRIEUR de cette section UNIQUEMENT, prendre la valeur inscrite EN FACE de l'intitulé "Raison sociale".
  3. Cette section aligne plusieurs champs (Nom du signataire, Fonction du signataire, Raison sociale, Numéro SIRET, Adresse, Code postal, Ville). On veut EXACTEMENT la valeur du champ "Raison sociale" — qui est un champ DISTINCT du "Nom du signataire".

  EXEMPLE (section C) :
    *Nom du signataire :      Brocas Yann
    *Fonction du signataire : GERANT
    *Raison sociale :         LES MOUETTES
    Numéro SIRET :            34463528900012
  → entrepriseMiseEnOeuvre: "LES MOUETTES" (la Raison sociale ; PAS le nom du signataire, PAS le SIRET, PAS l'adresse).

  ⚠️ PIÈGE — MAUVAISE SOURCE À NE PAS CONFONDRE AVEC LA SECTION C :
  - L'émetteur de la FACTURE n'est PAS la section C de l'attestation. Il apparaît en en-tête (avec le logo) et en pied de CHAQUE page de facture, sous la forme d'un bloc de coordonnées de société : nom + adresse + e-mail + "SAS au capital de ..." + "SIRET ..." + "... R.C.S. ..." (souvent domicilié à CLICHY).
  - Ce bloc "émetteur de facture" ne doit JAMAIS servir à remplir entrepriseMiseEnOeuvre : ce n'est pas la section C.
  - À l'inverse, si une raison sociale est bien inscrite EN FACE de "Raison sociale" À L'INTÉRIEUR de la section C, c'est ELLE qu'il faut extraire — même si la même société apparaît aussi ailleurs dans le dossier.

  null si la section C est absente ou illisible.

⚠️ RÈGLE CRITIQUE - EXTRACTION DES SURFACES DEPUIS LES ATTESTATIONS :

Les attestations sur l'honneur ont un FORMAT STANDARD. Chercher la phrase EXACTE suivante :

**Format standard :**
"La surface réelle de cet entrepôt, prise en compte pour l'opération CEE, est de XXX m²"

**Instructions d'extraction :**
1. Chercher la section "ATTESTATION SUR L'HONNEUR" dans le CEE
2. Dans cette section, chercher la phrase qui commence par "La surface réelle de cet entrepôt"
3. La valeur de surface est à la FIN de cette phrase, en gras
4. Extraire UNIQUEMENT le nombre (ex: "879", "876", "703")
5. MAILLE IMPÉRATIVE : 1 occurrence de la phrase "La surface réelle de cet entrepôt..." = 1 élément d'attestation portant EXACTEMENT 1 surface. Plusieurs phrases → plusieurs éléments distincts. NE JAMAIS empiler plusieurs surfaces (ex. ["274","363","441"]) dans un seul élément ; produire un élément par phrase (["274"], puis ["363"], puis ["441"]).

**Exemples d'extraction :**
- Si tu vois "La surface réelle de cet entrepôt, prise en compte pour l'opération CEE, est de 879 m²"
  → Extraire "879"

- Si tu vois "La surface réelle de cet entrepôt, prise en compte pour l'opération CEE, est de 703 m²"
  → Extraire "703"

**Variantes possibles à chercher (format peut légèrement varier) :**
- "La surface réelle de cet entrepôt... est de XXX m²"
- "La superficie réelle de cet entrepôt... est de XXX m²"
- "Surface prise en compte pour l'opération CEE... XXX m²"

⚠️ IMPORTANT - Si aucune attestation trouvée :
- Si tu ne trouves AUCUNE section "ATTESTATION SUR L'HONNEUR" dans le CEE → surfaces: []
- Mais si la section existe, tu DOIS trouver la surface (cherche avec les variantes ci-dessus)
- NE JAMAIS mettre surfaces: [] si l'attestation existe mais que tu as du mal à extraire la surface
- En cas de doute, extraire la surface même si le format est légèrement différent

⚠️ NE PAS CONFONDRE AVEC :
- Puissance LED (en W ou kW) - exemple : "12000 W" n'est PAS une surface
- Surface totale depuis page de garde audit (celle-là va dans audit.surfaces)
- Quantité de luminaires (en unités)
- Si tu vois "Surface : 12000" et ailleurs "12000 W" → c'est une PUISSANCE → surfaces: []

CEE - RÉFÉRENCE LED (DÉTECTION AUTOMATIQUE) :
- Dans la FACTURE, colonne "Référence", identifier la référence LED utilisée
- Chercher les mentions : "DAEWOO", "NES-HBL", "TECH", "HIGH BAY"
- Si "DAEWOO" ou "NES-HBL" trouvé → referenceLed: "DAEWOO"
- Si "TECH" ou "HIGH BAY" trouvé → referenceLed: "TECH"
- Si aucun match → referenceLed: null

CEE - SECTEUR D'ACTIVITÉ PAR CHANTIER (CRITIQUE) :
- Pour CHAQUE attestation sur l'honneur, extraire le secteur SPÉCIFIQUE à ce chantier
- Chercher dans la FACTURE du CEE, dans le bloc associé à chaque chantier (identifié par son adresse + ses parcelles cadastrales)
- Format typique : ligne "Bâtiment tertiaire / Secteur d'activité : Entrepôts" accolée au bloc chantier
- Extraire la valeur après "Secteur d'activité :" (exemple : "Entrepôts")
- Si non trouvé dans la facture, chercher sous l'adresse du chantier dans l'attestation sur l'honneur (fallback)
- Chercher aussi variantes : "Type de local", "Activité"
- IMPORTANT : Chaque chantier peut avoir un secteur DIFFÉRENT
- Exemple : Chantier 1 = "Entrepôts", Chantier 2 = "Autres secteurs"
- Si non trouvé pour un chantier → mettre null pour ce chantier
- Retourner le secteur dans attestations[].secteurActivite (pas dans cee.secteurActivite global)

MENTIONS AGRICOLES :
- Chercher toute mention de "agri", "agricole", "agriculture", "agriculteur" dans TOUS les documents
- SAUF dans le nom de la société (le nom peut contenir "agricole")
- Retourner true si trouvé, false sinon

CEE - DATES DE DÉLAIS (PRÉVISITE, TRAVAUX, FACTURE) :
- Sur la PAGE 1 du dossier CEE, dans l'encadré EN HAUT À GAUCHE (sous le n° client et le n° de devis), ces 4 dates sont groupées au même endroit. Extraire UNIQUEMENT depuis cet encadré, d'après le LIBELLÉ EXACT :
  - datePrevisite : libellé "Date de prévisite"
  - dateDebutTravaux : libellé "Date de début des travaux"
  - dateFinTravaux : libellé "Date de fin des travaux"
  - dateFacture : libellé "Date de facture"
- Format JJ/MM/AAAA. null si le libellé est absent ou la date illisible.
- ⚠️ NE PAS confondre "Date de prévisite" avec "Date de l'étude de dimensionnement préalable" (autre date du document, parfois identique en valeur) : s'ancrer sur le libellé EXACT "Date de prévisite".

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
   - ledTotal : nombre total de LED (page 1)
   - ledInitial : nombre de LED dans la section "État initial" OU "Situation actuelle" (description détaillée)
   - ledFinal : nombre de LED dans la section "État projeté" OU "Nouvelle solution d'éclairage" (description détaillée)
   - pceLuminaires : nombre TOTAL de Pce depuis la "Liste des luminaires" (tableau avec colonnes Pce/Fabricant/Article/etc.)
   - profilUtilisation : profil d'utilisation (entrepôt, logistique, etc.)

   NE PAS prendre l'adresse ou le code postal depuis d'autres pages de l'audit !
   NE PAS extraire "123 Rue Victor Hugo 92300 LEVALLOIS PERRET" (adresse Prime Evolution) !

7. SYNTHÈSE - EXTRACTION DURÉE DE VIE :
   Pour CHAQUE synthèse, extraire la durée de vie des luminaires :

   - dureeVie : durée de vie en heures (ex: "54000", "50000")
   - Chercher dans la section "1. Inventaire du projet" ou "Caractéristiques techniques des luminaires"
   - Format attendu : nombre entier en heures (sans espaces, ex: "54000")
   - Si non trouvé : mettre null

7bis. SYNTHÈSE - SURFACES DÉTAILLÉES PAR BÂTIMENT (OBLIGATOIRE) :
   ⚠️ EXTRACTION CRITIQUE : Comparer les surfaces du tableau Synthèse vs les attestations CEE

   🔴 SOURCE D'EXTRACTION (TRÈS IMPORTANT) 🔴
   Les surfaces des ATTESTATIONS CEE sont DÉJÀ extraites dans un autre champ (cee.attestations[].surfaces).
   Pour surfacesDetaillees, tu dois extraire UNIQUEMENT depuis le TABLEAU de la SYNTHÈSE.

   ⚠️ NE PAS utiliser les surfaces des attestations CEE pour ce champ !
   ⚠️ NE PAS copier les valeurs du champ cee.attestations[].surfaces !
   ⚠️ Les surfaces Synthèse peuvent DIFFÉRER des attestations (c'est justement ce qu'on veut détecter) !

   Les deux sources sont DIFFÉRENTES et seront comparées pour détecter les erreurs de saisie dans la Synthèse.

   OÙ CHERCHER EXACTEMENT :
   1. Dans la section du message marquée "= SYNTHÈSE =" (PAS dans "=== DOSSIER CEE ===")
   2. Dans cette section, chercher "5.1" (peut s'appeler "5.1 INVENTAIRE", "5.1 ETAT PROJETE", etc.)
   3. Chercher le tableau avec les colonnes : "Bâtiment" (ou "Bâtiment s / Zones"), "Activité", "Surface"

   STRUCTURE DU TABLEAU :
   Chaque ligne contient :
   - Un NUMÉRO de bâtiment (1, 2, 3...)
   - Un TYPE D'ACTIVITÉ (Entrepôt, Bureau, Commerce, etc.)
   - Une SURFACE en m² (le nombre juste après l'activité)

   EXTRACTION :
   Pour chaque ligne numérotée, extraire le PREMIER NOMBRE après l'activité.
   Extraire EXACTEMENT ce qui est ÉCRIT dans le tableau Synthèse (même si différent des attestations).

   EXEMPLES CONCRETS :

   Si le tableau Synthèse section 5.1 contient :
   "1   Entrepôt   879   219..."
   "2   Entrepôt   876   220..."
   "3   Entrepôt   7.23   210..."

   → surfacesDetaillees: ["879", "876", "7.23"]

   MÊME SI les attestations CEE indiquent ["879", "876", "703"],
   tu dois extraire ce qui est ÉCRIT dans le tableau Synthèse : ["879", "876", "7.23"]
   Le check JavaScript détectera ensuite l'erreur de saisie (7.23 ≠ 703 sur le bâtiment 3).

   RÈGLES FINALES :
   - Extraire UNIQUEMENT depuis le texte de la section "= SYNTHÈSE ="
   - Chercher dans la sous-section "5.1" de cette synthèse
   - JAMAIS copier depuis cee.attestations[].surfaces
   - Extraire pour TOUTES les lignes numérotées du tableau
   - Si tableau vraiment introuvable → mettre null
   - Ne PAS confondre avec surfaceEclairee (total de la fiche identité)

8. NOMS ALTERNATIFS DES SECTIONS (anciens dossiers) :
   Les sections peuvent avoir des noms différents selon les versions :

   - "État initial" peut aussi être appelé "Situation actuelle"
   - "État projeté" peut aussi être appelé "Nouvelle solution d'éclairage"

   Chercher les données dans les deux variantes possibles.
   Exemples :
   - totalLedInitial (Synthèse) : chercher dans "État initial" OU "Situation actuelle"
   - totalLedProjete (Synthèse) : chercher dans "État projeté" OU "Nouvelle solution d'éclairage"
   - activiteBatiment (Synthèse) : chercher dans "État projeté" OU "Nouvelle solution"
   - ledInitial (Audit) : chercher dans "État initial" OU "Situation actuelle"
   - ledFinal (Audit) : chercher dans "État projeté" OU "Nouvelle solution d'éclairage"

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
      "ledInitial": "72",
      "ledFinal": "72",
      "pceLuminaires": "60",
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
      "surfacesDetaillees": ["879", "876", "703"],
      "secteurActivite": "Secteur d'activité fiche identité",
      "secteurEtude": "Secteur étude indicateurs éclairage initial",
      "parcelles": "Parcelles cadastrales fiche identité",
      "nombreBatiments": "Nombre de bâtiments périmètre étude",
      "ledTotal": "Total LED inventaire projet",
      "totalLedInitial": "Total LED état initial (ou Situation actuelle)",
      "totalLedProjete": "Total LED état projeté (ou Nouvelle solution d'éclairage)",
      "activiteBatiment": "Activité bâtiment état projeté (ou Nouvelle solution)",
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
    "datePrevisite": "08/10/2025",
    "dateDebutTravaux": "23/10/2025",
    "dateFinTravaux": "30/10/2025",
    "dateFacture": "05/11/2025",
    "resteAPayer": "Reste à payer / reste à charge",
    "entrepriseMiseEnOeuvre": "Raison sociale du professionnel (section C de l'attestation)",
    "parcelles": "Parcelles cadastrales",
    "referenceLed": "DAEWOO ou TECH (détecté depuis facture)",
    "attestations": [
      {
        "adresse": "1 rue Example 60000 VILLE1",
        "surfaces": ["850"],
        "ledTotal": "35",
        "secteurActivite": "Entrepôts",
        "parcelles": "000/0B/0551 - 000/0B/0547 - 000/0B/0549",
        "etudeDimensionnement": "PRIME EVOLUTION",
        "attestationNonAgricole": "presente"
      },
      {
        "adresse": "25 avenue Test 60130 VILLE2",
        "surfaces": ["1240"],
        "ledTotal": "31",
        "secteurActivite": "Entrepôts",
        "parcelles": "000/0E/0277",
        "etudeDimensionnement": "PRIME EVOLUTION",
        "attestationNonAgricole": "presente"
      }
    ],
    "cellules": [
      {
        "adresse": "4 RUE DE FEUILLERES BAT 1 80360 HEM-MONACU",
        "ledCellule": "26",
        "source": "facture"
      },
      {
        "adresse": "4 RUE DE FEUILLERES BAT 2 80360 HEM-MONACU",
        "ledCellule": "26",
        "source": "facture"
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
