/**
 * familles-config.js — Table de correspondance check → famille (Chantier B, étape 1/2).
 *
 * Chargé en <script src="familles-config.js"> (pas de build : JS classique, pose sur window).
 * N'altère RIEN du moteur : expose seulement window.CEE_FAMILLES et window.resolveFamille.
 * Étape 1/2 = config isolée + harnais. L'intégration au rapport viendra en étape 2/2.
 *
 * Ne pas confondre avec GROUPES_CONFIG / getGroupeForCheck (index.html) : système
 * d'affichage SÉPARÉ (11 groupes, résolution par contenu). Ici : 10 familles, par id.
 */
(function (global) {
  'use strict';

  // --- A) Ordre d'affichage + libellés des 10 familles ---
  var CEE_FAMILLES = {
    ORDRE: ['1a', '1b', '2', '3', '4', '5', '6', '7', '8', '9'],
    LIBELLES: {
      '1a': 'Identité société',
      '1b': 'Coordonnées client',
      '2':  'Dates',
      '3':  'Type de local + mention agricole',
      '4':  'Adresses chantier',
      '5':  'Nb LED total + répartition',
      '6':  'Parcelles',
      '7':  'Surface + superficies',
      '8':  'Fiche technique',
      '9':  'Complétude'
    }
  };

  // --- B) Règles ID ANCRÉ : [regex, famille] (tout SAUF les 2 collisions, traitées avant) ---
  // idSuffix multi-chantier = "_c{n}" (n = index+1, peut dépasser 9) → on accepte (_c\d+)?.
  // chantierIndex des familles 4/7/9 (boucle attestations) est 0-based → \d+.
  var REGLES = [
    // 1a — Identité société
    [/^check_01(_c\d+)?$/, '1a'],
    [/^check_04(_c\d+)?$/, '1a'],
    [/^check_10(_c\d+)?$/, '1a'],
    [/^check_16(_c\d+)?$/, '1a'],
    [/^check_24(_c\d+)?$/, '1a'],
    [/^check_11(_c\d+)?$/, '1a'],
    [/^check_26(_c\d+)?$/, '1a'],
    [/^check_41$/,         '1a'],

    // 1b — Coordonnées client
    [/^check_06(_c\d+)?$/, '1b'],
    [/^check_07(_c\d+)?$/, '1b'],
    [/^check_08(_c\d+)?$/, '1b'],

    // 2 — Dates
    [/^check_03(_c\d+)?$/, '2'],
    [/^check_05(_c\d+)?$/, '2'],
    [/^check_42$/,         '2'],

    // 3 — Type de local + mention agricole
    [/^check_14(_conflict)?(_c\d+)?$/, '3'],
    [/^check_20(_c\d+)?$/,             '3'],
    [/^check_23(_c\d+)?$/,             '3'],
    [/^check_31$/,                     '3'],
    [/^check_attestation_non_agricole_naf_inconnu$/, '3'],

    // 4 — Adresses chantier
    [/^check_02(_c\d+)?$/, '4'],
    [/^check_12(_c\d+)?$/, '4'],
    [/^check_25(_c\d+)?$/, '4'],
    [/^check_42a_\d+$/,    '4'],
    [/^check_44a_\d+$/,    '4'],

    // 5 — Nb LED total + répartition
    [/^check_09a$/,          '5'],
    [/^check_09b$/,          '5'],
    [/^check_09c_ch\d+$/,    '5'],
    [/^check_09d_audit_/,    '5'],
    [/^check_09d_synthese_/, '5'],
    [/^check_18(_c\d+)?$/,   '5'],
    [/^check_22(_c\d+)?$/,   '5'],
    [/^check_19$/,           '5'],
    [/^check_21$/,           '5'],
    [/^check_28$/,           '5'],
    [/^check_29$/,           '5'],
    [/^check_30$/,           '5'],
    [/^check_17(_c\d+)?$/,   '5'],

    // 6 — Parcelles
    [/^check_15(_c\d+)?$/, '6'],

    // 7 — Surface + superficies
    [/^check_13(_c\d+)?$/,     '7'],
    [/^check_27(_c\d+)?$/,     '7'],
    [/^check_45b_\d+$/,        '7'],
    [/^check_45b_\d+_bat\d+$/, '7'],
    [/^check_surface_non_ventilable$/, '7'],
    [/^check_47_global$/,      '7'],

    // 8 — Fiche technique
    [/^check_35(_c\d+)?$/,           '8'],
    [/^check_36$/,                   '8'],
    [/^check_37(_c\d+)?$/,           '8'],
    [/^check_38_duree_vie(_c\d+)?$/, '8'],

    // 9 — Complétude
    [/^check_39$/,                        '9'],
    [/^check_43$/,                        '9'],
    [/^check_cee_incomplet$/,             '9'],
    [/^check_attestation_manquante_\d+$/, '9'],
    [/^check_synthese_manquante_\d+$/,    '9']
  ];

  // --- B) Résolveur : check {id, champ, ...} → clé de famille ou null ---
  function resolveFamille(check) {
    var id = (check && check.id) || '';
    var champ = (check && check.champ) || '';

    // RÈGLE COLLISION (prioritaire) — id seul insuffisant, on désambiguïse par le label.
    if (/^check_42_\d+$/.test(id)) {
      if (champ.indexOf('Audit correspondant') !== -1) return '9'; // audit manquant = complétude
      if (champ.indexOf('Surfaces Audit') !== -1) return '7';      // surfaces = surface
      return null; // label inattendu → ne pas deviner (remonté comme trou par le harnais)
    }
    if (/^check_45_(audit|synthese)_\d+$/.test(id)) {
      // Collision A1 levée par préfixage d'id (étape 1a) : check_45_audit_N et
      // check_45_synthese_N sont tous deux des formes SURFACE → famille 7.
      // La forme « Synthèse correspondante » (complétude) a migré vers
      // check_synthese_manquante_N (table ancrée, famille 9).
      // Filet principe n°1 conservé : forme de champ inattendue → null (trou visible).
      if (champ.indexOf('Somme surfaces') !== -1
        || champ.indexOf('Surface Synthèse') !== -1
        || champ.indexOf('Surface éclairée') !== -1) return '7';
      return null; // label inattendu → ne pas deviner (cohérent avec check_42_N)
    }

    // RÈGLE ID ANCRÉ
    for (var i = 0; i < REGLES.length; i++) {
      if (REGLES[i][0].test(id)) return REGLES[i][1];
    }

    // FILET — aucun match : ne pas inventer de famille (jamais de faux conforme silencieux).
    return null;
  }

  global.CEE_FAMILLES = CEE_FAMILLES;
  global.resolveFamille = resolveFamille;
})(typeof window !== 'undefined' ? window : globalThis);
