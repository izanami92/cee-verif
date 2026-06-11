/**
 * test-familles.mjs — Harnais de contrôle de familles-config.js (Chantier B, étape 1/2).
 *
 * Prouve la table À VIDE, sans navigateur ni app.  Lancer :  node test-familles.mjs
 * Sort en code ≠ 0 au moindre KO ou null inattendu (vrai garde-fou pré-commit/CI).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// Shim navigateur : window === globalThis, exactement comme une balise <script> classique.
globalThis.window = globalThis;
const cfgPath = fileURLToPath(new URL('./familles-config.js', import.meta.url));
// eslint-disable-next-line no-eval — exécution en portée globale → window.X = ... peuple globalThis
(0, eval)(readFileSync(cfgPath, 'utf8'));

const resolveFamille = window.resolveFamille;
const CEE_FAMILLES = window.CEE_FAMILLES;

if (typeof resolveFamille !== 'function' || !CEE_FAMILLES || !Array.isArray(CEE_FAMILLES.ORDRE)) {
  console.error('❌ familles-config.js n\'a pas exposé window.resolveFamille / window.CEE_FAMILLES');
  process.exit(1);
}

// === Cas POSITIFS : 1 instance représentative par pattern (54), + suffixe _c2, + 2 branches de collision ===
const CAS_POSITIFS = [
  // --- 1a — Identité société ---
  { id: 'check_01',    champ: 'Nom entreprise Audit page 1',                attendu: '1a' },
  { id: 'check_01_c2', champ: 'Nom entreprise Audit page 1 chantier 2',     attendu: '1a' }, // suffixe multi-chantier
  { id: 'check_04',    champ: 'Nom entreprise Synthèse page 1',             attendu: '1a' },
  { id: 'check_10',    champ: 'Client Synthèse fiche identité',             attendu: '1a' },
  { id: 'check_16',    champ: 'Nom du site Synthèse périmètre',             attendu: '1a' },
  { id: 'check_24',    champ: 'Site Audit description',                     attendu: '1a' },
  { id: 'check_11',    champ: 'SIRET Synthèse fiche identité',              attendu: '1a' },
  { id: 'check_26',    champ: 'SIRET Audit description',                    attendu: '1a' },
  { id: 'check_41',    champ: 'Adresse siège social Dossier CEE',           attendu: '1a' },

  // --- 1b — Coordonnées client ---
  { id: 'check_06',    champ: 'Email Synthèse page 1',                      attendu: '1b' },
  { id: 'check_06_c2', champ: 'Email Synthèse page 1 chantier 2',           attendu: '1b' },
  { id: 'check_07',    champ: 'Téléphone Synthèse page 1',                  attendu: '1b' },
  { id: 'check_08',    champ: 'Contact nom/prénom Synthèse page 1',         attendu: '1b' },

  // --- 2 — Dates ---
  { id: 'check_03',    champ: 'Date audit Audit page 1',                    attendu: '2' },
  { id: 'check_05',    champ: 'Date Synthèse page 1',                       attendu: '2' },
  { id: 'check_42',    champ: 'Date de signature / Date d\'engagement Dossier CEE', attendu: '2' },

  // --- 3 — Type de local + mention agricole ---
  { id: 'check_14',          champ: 'Secteur d\'activité Synthèse',              attendu: '3' },
  { id: 'check_14_c2',       champ: 'Secteur d\'activité Synthèse chantier 2',   attendu: '3' },
  { id: 'check_14_conflict', champ: 'Secteur d\'activité CEE',                   attendu: '3' },
  { id: 'check_20',          champ: 'Secteur étude indicateurs',                attendu: '3' },
  { id: 'check_23',          champ: 'Activité bâtiment état projeté',           attendu: '3' },
  { id: 'check_31',          champ: 'Mention agricole (Audit + Synthèse)',      attendu: '3' },
  { id: 'check_attestation_non_agricole_naf_inconnu', champ: 'Attestation entrepôt non agricole (BAT-EQ-127)', attendu: '3' },

  // --- 4 — Adresses chantier ---
  { id: 'check_02',    champ: 'Adresse chantier Audit page 1',             attendu: '4' },
  { id: 'check_02_c2', champ: 'Adresse chantier Audit page 1 chantier 2',  attendu: '4' },
  { id: 'check_12',    champ: 'Adresse chantier Synthèse fiche identité',  attendu: '4' },
  { id: 'check_25',    champ: 'Adresse Audit description',                 attendu: '4' },
  { id: 'check_42a_0', champ: 'Adresse Audit (Chantier 1 : ...)',          attendu: '4' },
  { id: 'check_44a_0', champ: 'Adresse Synthèse (Chantier 1 : ...)',       attendu: '4' },

  // --- 5 — Nb LED total + répartition ---
  { id: 'check_09a',                         champ: 'TOTAL LED Audits = Total CEE',         attendu: '5' },
  { id: 'check_09b',                         champ: 'TOTAL LED Synthèses = Total CEE',      attendu: '5' },
  { id: 'check_09c_ch1',                     champ: 'LED chantier 1 : Audit = Synthèse',    attendu: '5' },
  { id: 'check_09d_audit_rue_de_la_paix',    champ: 'LED rue de la paix : Audit vs CEE',    attendu: '5' },
  { id: 'check_09d_synthese_rue_de_la_paix', champ: 'LED rue de la paix : Synthèse vs CEE', attendu: '5' },
  { id: 'check_18',    champ: 'Répartition LED état initial',  attendu: '5' },
  { id: 'check_22',    champ: 'Répartition LED état projeté',  attendu: '5' },
  { id: 'check_19',    champ: 'TOTAL LED état initial Synthèse', attendu: '5' },
  { id: 'check_21',    champ: 'TOTAL LED état projeté Synthèse', attendu: '5' },
  { id: 'check_28',    champ: 'État initial nombre LED Audit',  attendu: '5' },
  { id: 'check_29',    champ: 'État projeté nombre LED Audit',  attendu: '5' },
  { id: 'check_30',    champ: 'Pce total liste luminaires Audit', attendu: '5' },
  { id: 'check_17',    champ: 'Nombre de bâtiments Synthèse',   attendu: '5' },

  // --- 6 — Parcelles ---
  { id: 'check_15',    champ: 'Parcelles cadastrales Synthèse fiche identité',            attendu: '6' },
  { id: 'check_15_c2', champ: 'Parcelles cadastrales Synthèse fiche identité chantier 2', attendu: '6' },

  // --- 7 — Surface + superficies ---
  { id: 'check_13',         champ: 'Surface éclairée Synthèse fiche identité',          attendu: '7' },
  { id: 'check_27',         champ: 'Surface Audit description',                         attendu: '7' },
  { id: 'check_45b_0',      champ: 'Surfaces détaillées Synthèse',                      attendu: '7' },
  { id: 'check_45b_0_bat1', champ: 'Surface bâtiment 1 Synthèse vs Attestation',        attendu: '7' },
  { id: 'check_surface_non_ventilable', champ: 'Surface non ventilable par chantier',   attendu: '7' },
  { id: 'check_47_global',  champ: 'Somme surfaces manuelles = Sommes audits & synthèses (global)', attendu: '7' },
  // 7 via résolveur check_45_audit_N / check_45_synthese_N (formes surface — collision A1 levée, étape 1a)
  { id: 'check_45_audit_0',    champ: 'Somme surfaces Audit = Somme attestation', attendu: '7' },
  { id: 'check_45_synthese_0', champ: 'Surface Synthèse = Somme attestation',     attendu: '7' },
  { id: 'check_45_synthese_0', champ: 'Surface éclairée Synthèse',                attendu: '7' },
  // 7 via COLLISION check_42_N (forme surface)
  { id: 'check_42_0', champ: 'Surfaces Audit observations préliminaires', attendu: '7' },

  // --- 8 — Fiche technique ---
  { id: 'check_35',              champ: 'THD Synthèse caractéristiques luminaires',            attendu: '8' },
  { id: 'check_35_c2',           champ: 'THD Synthèse caractéristiques luminaires chantier 2', attendu: '8' },
  { id: 'check_36',              champ: 'Fiche technique LED',          attendu: '8' },
  { id: 'check_37',              champ: 'Référence produit',            attendu: '8' },
  { id: 'check_38_duree_vie',    champ: 'Durée de vie luminaires',      attendu: '8' },
  { id: 'check_38_duree_vie_c2', champ: 'Durée de vie luminaires chantier 2', attendu: '8' },

  // --- 9 — Complétude ---
  { id: 'check_39',                      champ: 'Cohérence nombre de chantiers',  attendu: '9' },
  { id: 'check_43',                      champ: 'Attestation(s) sur l\'honneur',  attendu: '9' },
  { id: 'check_cee_incomplet',           champ: 'Extraction du Dossier CEE',      attendu: '9' },
  { id: 'check_attestation_manquante_0', champ: 'Attestation CEE manquante',      attendu: '9' },
  { id: 'check_synthese_manquante_0',    champ: 'Synthèse correspondante (Chantier 1 : ...)', attendu: '9' }, // ex-collision check_45 → table ancrée (étape 1a)
  // 9 via COLLISION (check_42 inchangé — étape 1a ne touche pas check_42)
  { id: 'check_42_0', champ: 'Audit correspondant (Chantier 1 : ...)',     attendu: '9' }
];

// === Cas NÉGATIFS (hors couverture) : prouvent que le filet null fonctionne ===
const CAS_NEGATIFS = [
  { id: 'check_42_7',        champ: 'Libellé qui aurait changé' }, // collision 42 : fragment introuvable → null
  { id: 'check_zzz_inconnu', champ: '' },                          // id totalement inconnu → null
  { id: 'check_45_synthese_9', champ: 'Forme de check_45 jamais vue' }, // résolveur surface : champ inattendu → null (étape 1a)
  { id: 'check_32',          champ: 'Mention agricole 2' }         // fusionné dans check_31, entrée de table retirée → null
];

// --- Exécution ---
const pad = (s, n) => { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); };

let okCount = 0, koCount = 0;
const trous = [];
const lignes = [];
for (const cas of CAS_POSITIFS) {
  const obtenu = resolveFamille({ id: cas.id, champ: cas.champ });
  const ok = obtenu === cas.attendu;
  ok ? okCount++ : koCount++;
  if (obtenu === null) trous.push(cas); // null alors qu'on attendait une famille
  lignes.push({ id: cas.id, champ: cas.champ, obtenu, attendu: cas.attendu, ok });
}

let negOk = 0, negKo = 0;
const lignesNeg = [];
for (const cas of CAS_NEGATIFS) {
  const obtenu = resolveFamille({ id: cas.id, champ: cas.champ });
  const ok = obtenu === null;
  ok ? negOk++ : negKo++;
  lignesNeg.push({ id: cas.id, champ: cas.champ, obtenu, ok });
}

const famillesCouvertes = new Set(CAS_POSITIFS.map(c => c.attendu));
const famillesMortes = CEE_FAMILLES.ORDRE.filter(f => !famillesCouvertes.has(f));

// --- Récap ---
console.log('\n=== HARNAIS FAMILLES — récap ===\n');
console.log(pad('id testé', 42) + pad('champ', 52) + pad('obtenu', 8) + pad('attendu', 8) + 'statut');
console.log('-'.repeat(118));
for (const l of lignes) {
  console.log(
    pad(l.id, 42) +
    pad((l.champ || '').slice(0, 50), 52) +
    pad(l.obtenu === null ? 'null' : l.obtenu, 8) +
    pad(l.attendu, 8) +
    (l.ok ? 'OK' : 'KO  <<<')
  );
}

console.log('\n--- Contrôles négatifs (filet null attendu) ---');
for (const l of lignesNeg) {
  console.log(
    pad(l.id, 42) +
    pad((l.champ || '').slice(0, 50), 52) +
    pad(l.obtenu === null ? 'null' : l.obtenu, 8) +
    (l.ok ? 'OK (null)' : 'KO  <<<')
  );
}

console.log('\n--- Patterns résolus en null INATTENDU (trous : doit être vide) ---');
console.log(trous.length ? trous.map(t => `  • ${t.id} | ${t.champ}`).join('\n') : '  (aucun — ✅)');

console.log('\n--- Familles sans aucun check (mortes : à questionner) ---');
console.log(
  famillesMortes.length
    ? famillesMortes.map(f => `  • ${f} (${CEE_FAMILLES.LIBELLES[f]})`).join('\n')
    : '  (aucune — ✅ les 10 familles sont couvertes)'
);

const total = CAS_POSITIFS.length + CAS_NEGATIFS.length;
const okTotal = okCount + negOk;
console.log(`\n=== COMPTE FINAL : ${okTotal}/${total} cas OK (positifs ${okCount}/${CAS_POSITIFS.length}, négatifs ${negOk}/${CAS_NEGATIFS.length}) ===`);

const echec = koCount > 0 || negKo > 0 || trous.length > 0;
console.log(echec ? '❌ ÉCHEC — voir KO / trous ci-dessus' : '✅ SUCCÈS — table prouvée à vide');
process.exit(echec ? 1 : 0);
