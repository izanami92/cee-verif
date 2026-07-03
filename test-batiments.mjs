/**
 * test-batiments.mjs — Auto-test isolé de extraireNombreBatiments (ADR-015 étape 4a-bis).
 *
 * Prouve la fonction SANS navigateur ni app : on lit le VRAI code de index.html
 * (pas une copie) et on extrait normalize() + extraireNombreBatiments() par
 * comptage d'accolades, puis on les évalue en portée globale (même esprit que
 * test-familles.mjs). Lancer :  node test-batiments.mjs
 * Sort en code ≠ 0 au moindre KO (vrai garde-fou pré-commit).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const htmlPath = fileURLToPath(new URL('./index.html', import.meta.url));
const src = readFileSync(htmlPath, 'utf8');

// Extrait `function NAME(...) { ... }` par comptage d'accolades à partir de la 1re « { ».
// OK ici : les seules accolades dans les corps visés sont des quantificateurs regex
// équilibrés (\d{2}, \d{3}, \d{5}) → solde nul, le compteur retombe juste.
function extractFn(name) {
  const sig = `function ${name}(`;
  const start = src.indexOf(sig);
  if (start === -1) throw new Error(`Fonction ${name} introuvable dans index.html`);
  let depth = 0, started = false;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    const c = src[j];
    if (c === '{') { depth++; started = true; }
    else if (c === '}') { depth--; if (started && depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error(`Accolade fermante introuvable pour ${name}`);
}

// normalize() est appelée partout ; normaliserAdresseSansBatiment + compareAddress réutilisent
// retirerParcelle ; sommerCellulesParAdresse réutilise normaliserAdresseSansBatiment → on extrait
// tout le petit graphe de dépendances (déclarations hoistées, l'ordre importe peu).
const code = extractFn('normalize') + '\n'
  + extractFn('retirerParcelle') + '\n'
  + extractFn('extraireNombreBatiments') + '\n'
  + extractFn('normaliserAdresseSansBatiment') + '\n'
  + extractFn('sommerCellulesParAdresse') + '\n'
  + extractFn('compareAddress') + '\n'
  + 'globalThis.__extraireNombreBatiments = extraireNombreBatiments;\n'
  + 'globalThis.__normaliserAdresseSansBatiment = normaliserAdresseSansBatiment;\n'
  + 'globalThis.__sommerCellulesParAdresse = sommerCellulesParAdresse;\n'
  + 'globalThis.__compareAddress = compareAddress;';
// eslint-disable-next-line no-eval — eval indirect en portée globale, comme test-familles.mjs
(0, eval)(code);

const extraireNombreBatiments = globalThis.__extraireNombreBatiments;
if (typeof extraireNombreBatiments !== 'function') {
  console.error('❌ extraireNombreBatiments non extraite depuis index.html');
  process.exit(1);
}

const normaliserAdresseSansBatiment = globalThis.__normaliserAdresseSansBatiment;
if (typeof normaliserAdresseSansBatiment !== 'function') {
  console.error('❌ normaliserAdresseSansBatiment non extraite depuis index.html');
  process.exit(1);
}

const sommerCellulesParAdresse = globalThis.__sommerCellulesParAdresse;
if (typeof sommerCellulesParAdresse !== 'function') {
  console.error('❌ sommerCellulesParAdresse non extraite depuis index.html');
  process.exit(1);
}

const compareAddress = globalThis.__compareAddress;
if (typeof compareAddress !== 'function') {
  console.error('❌ compareAddress non extraite depuis index.html');
  process.exit(1);
}

// === Cas de test ===
const CAS = [
  // --- 4a-bis : nouveau séparateur « & » ---
  { in: 'bat 1 & 2',                   attendu: 2, note: '& espacé → liste 2' },
  { in: 'bat 1&2',                     attendu: 2, note: '& collé → liste 2' },
  { in: 'bat 1 & 2 & 3',               attendu: 3, note: 'liste à 3 via &' },
  { in: 'bat 1 & 000/za/0006',         attendu: 1, note: 'garde parcelle : & ne capture pas la parcelle' },
  { in: 'bat 1, 2 & 3',                attendu: 3, note: 'mixte virgule + &' },
  { in: 'bat 1 durand & fils',         attendu: 1, note: '& dans raison sociale après n° → non compté (chaîne rompue)' },

  // --- Non-régression (séparateurs existants) ---
  { in: 'bat 1 et 2',                  attendu: 2, note: 'et → liste 2' },
  { in: 'bat 1-3',                     attendu: 3, note: 'tiret → plage 1..3' },
  { in: 'bat 1 à 3',                   attendu: 3, note: 'à (→a) → plage 1..3' },
  { in: 'bat 1',                       attendu: 1, note: 'un seul bâtiment' },
  { in: 'DURAND & FILS, ZAC du Moulin, 80360 AMIENS', attendu: 1, note: 'aucune mention bat numérotée → 1' },

  // --- Garde-fous supplémentaires ---
  { in: 'bat 1 - 000/za/0006',         attendu: 1, note: 'garde parcelle tiret (non-rég)' },
  { in: 'bat 12 80360 amiens',         attendu: 1, note: 'code postal neutralisé (non-rég)' },
];

// === Cas de test — normaliserAdresseSansBatiment (CLÉ DE REGROUPEMENT, ADR-015 4a-ter) ===
// Sorties EXACTES déroulées depuis normalize (lowercase + accents + collapse espaces) puis
// les replace de la fonction (run bâtiment, virgules, tirets). NON inventées (cf. diag 4a-ter).
const CAS_NORM = [
  // COPPIN : avec et sans BAT → MÊME clé (invariant de regroupement, motive 4b)
  { in: '541 RUE SAINT-JEAN DES PLEURS BAT 2', attendu: '541 rue saint jean des pleurs', note: 'COPPIN avec BAT' },
  { in: '541 RUE SAINT-JEAN DES PLEURS',       attendu: '541 rue saint jean des pleurs', note: 'COPPIN sans BAT → même clé' },
  // 4a-ter : « & » dans la mention bâtiment consommé en entier (plus de « & 2 » résiduel)
  { in: '4 RUE DE FEUILLERES BAT 1 & 2', attendu: '4 rue de feuilleres', note: '4a-ter : & espacé' },
  { in: '4 RUE DE FEUILLERES BAT 1&2',   attendu: '4 rue de feuilleres', note: '4a-ter : & collé → même clé' },
  { in: '4 RUE DE FEUILLERES',           attendu: '4 rue de feuilleres', note: 'référence sans bâtiment → même clé' },
  // Invariant : « & » HORS bâtiment CONSERVÉ (raison sociale)
  { in: 'SARL DURAND & FILS, ZAC DU MOULIN, 80360 AMIENS', attendu: 'sarl durand & fils zac du moulin 80360 amiens', note: 'invariant : & raison sociale conservé' },
  // Non-régression accent : BÂT accentué regroupe comme BAT
  { in: '4 RUE DE FEUILLERES BÂT 2', attendu: '4 rue de feuilleres', note: 'accent : BÂT 2 → même clé que BAT 2' },

  // #27 — LATRILLE : la PARCELLE cadastrale ne doit PAS discriminer un chantier (ADR-015).
  { in: 'À Lauriol, - 000 / AC / 0130 47120 CAUBON-SAINT-SAUVEUR',       attendu: 'a lauriol 47120 caubon saint sauveur', note: '#27 Lauriol BAT1 (virgule + parcelle retirées)' },
  { in: 'À Lauriol - BAT 2 - 000 / AC / 0130 47120 CAUBON-SAINT-SAUVEUR', attendu: 'a lauriol 47120 caubon saint sauveur', note: '#27 Lauriol BAT2 → même clé' },
  { in: 'À Lauriol - BAT 3 - 000 / AC / 0130 47120 CAUBON-SAINT-SAUVEUR', attendu: 'a lauriol 47120 caubon saint sauveur', note: '#27 Lauriol BAT3 → même clé' },
  // Grozeille : parcelles DIFFÉRENTES (0022 vs 0023), même adresse → doivent converger.
  { in: '36 À Grozeille - 000 / AB / 0022 47120 CAUBON-SAINT-SAUVEUR',       attendu: '36 a grozeille 47120 caubon saint sauveur', note: '#27 Grozeille BAT1 parcelle 0022' },
  { in: '36 À Grozeille - BAT 2 - 000 / AB / 0023 47120 CAUBON-SAINT-SAUVEUR', attendu: '36 a grozeille 47120 caubon saint sauveur', note: '#27 Grozeille BAT2 parcelle 0023 → même clé' },
  // Site distinct (autre rue + autre ville/CP) → clé distincte (ne pas sur-fusionner).
  { in: '2971 Route de La Piotte - 000 / ZD / 0157 33580 SAINT-VIVIEN-DE-MONSÉGUR', attendu: '2971 route de la piotte 33580 saint vivien de monsegur', note: '#27 La Piotte = chantier distinct' },
];

let ok = 0;
const echecs = [];

console.log('— extraireNombreBatiments (comptage, 4a-bis) —');
for (const cas of CAS) {
  const res = extraireNombreBatiments(cas.in);
  const pass = res === cas.attendu;
  if (pass) ok++;
  else echecs.push({ ...cas, res });
  const icone = pass ? '✅' : '❌';
  console.log(`${icone} "${cas.in}" → ${res} (attendu ${cas.attendu})  — ${cas.note}`);
}

console.log('\n— normaliserAdresseSansBatiment (clé de regroupement, 4a-ter) —');
for (const cas of CAS_NORM) {
  const res = normaliserAdresseSansBatiment(cas.in);
  const pass = res === cas.attendu;
  if (pass) ok++;
  else echecs.push({ ...cas, res });
  const icone = pass ? '✅' : '❌';
  console.log(`${icone} "${cas.in}" → "${res}" (attendu "${cas.attendu}")  — ${cas.note}`);
}

// === Cas de test — sommerCellulesParAdresse (pré-agrégation cellules, ADR-015 4b-1) ===
// Helper PUR : groupe les cellules entre elles par normaliserAdresseSansBatiment et somme
// ledCellule via parseInt (vide/non numérique → 0 par NaN||0, aucune cellule filtrée).
// Sommes déroulées depuis parseInt, NON inventées. (La substitution dans
// regrouperAttestationsParAdresse est jugée en preview sur DELEFORTRIE, hors harnais pur.)
const CAS_CELLULES = [
  // DELEFORTRIE : 2 cellules même adresse normalisée → 26 + 26 = 52
  { cle: '4 rue de feuilleres', attendu: 52, note: 'DELEFORTRIE : 26 + 26',
    cellules: [
      { adresse: '4 RUE DE FEUILLERES BAT 1', ledCellule: '26', source: 'facture' },
      { adresse: '4 RUE DE FEUILLERES BAT 2', ledCellule: '26', source: 'facture' },
    ] },
  // COPPIN : 541 (24) + 541 BAT 2 (12) → même clé → 36
  { cle: '541 rue saint jean des pleurs', attendu: 36, note: 'COPPIN : 24 + 12',
    cellules: [
      { adresse: '541 RUE SAINT-JEAN DES PLEURS', ledCellule: '24', source: 'facture' },
      { adresse: '541 RUE SAINT-JEAN DES PLEURS BAT 2', ledCellule: '12', source: 'facture' },
    ] },
  // Cellule unique : la clé existe avec sa valeur seule (le helper agrège tout)
  { cle: '6 rue de feuilleres', attendu: 14, note: 'cellule unique → valeur seule',
    cellules: [ { adresse: '6 RUE DE FEUILLERES', ledCellule: '14', source: 'facture' } ] },
  // Vide + non numérique + valide → parseInt(NaN||0) : 0 + 0 + 10 = 10 (aucune cellule filtrée)
  { cle: 'za du moulin', attendu: 10, note: 'vide + abc + 10 → 0+0+10',
    cellules: [
      { adresse: 'ZA DU MOULIN', ledCellule: '',    source: 'facture' },
      { adresse: 'ZA DU MOULIN', ledCellule: 'abc', source: 'facture' },
      { adresse: 'ZA DU MOULIN', ledCellule: '10',  source: 'facture' },
    ] },
];

console.log('\n— sommerCellulesParAdresse (pré-agrégation cellules, 4b-1) —');
for (const cas of CAS_CELLULES) {
  const res = sommerCellulesParAdresse(cas.cellules).get(cas.cle);
  const pass = res === cas.attendu;
  if (pass) ok++;
  else echecs.push({ in: cas.cle, attendu: cas.attendu, res, note: cas.note });
  const icone = pass ? '✅' : '❌';
  console.log(`${icone} clé "${cas.cle}" → ${res} (attendu ${cas.attendu})  — ${cas.note}`);
}

// === Cas de test — compareAddress (parcelle IGNORÉE pour la comparaison, ADR-015) ===
// La parcelle ne doit PAS discriminer (Grozeille 0022 vs 0023 = même chantier) ; les vrais
// écarts (rue/ville) restent détectés. La donnée parcelle reste vérifiée à part (check_15).
const CAS_CMP = [
  { a: '36 À Grozeille - 000 / AB / 0022 47120 CAUBON-SAINT-SAUVEUR',
    b: '36 À Grozeille - BAT 2 - 000 / AB / 0023 47120 CAUBON-SAINT-SAUVEUR', attendu: true,  note: 'Grozeille 0022 vs 0023 (même rue) → matche' },
  { a: '36 À Grozeille - 000 / AB / 0022 47120 CAUBON-SAINT-SAUVEUR',
    b: 'À Lauriol, - 000 / AC / 0130 47120 CAUBON-SAINT-SAUVEUR',                attendu: false, note: 'rues différentes → NON (pas de sur-fusion)' },
  { a: 'À Lauriol, - 000 / AC / 0130 47120 CAUBON-SAINT-SAUVEUR',
    b: '2971 Route de La Piotte - 000 / ZD / 0157 33580 SAINT-VIVIEN-DE-MONSÉGUR', attendu: false, note: 'rue+ville différentes → NON' },
  { a: '541 RUE SAINT-JEAN DES PLEURS BAT 2', b: '541 RUE SAINT-JEAN DES PLEURS', attendu: true, note: 'non-rég COPPIN : BAT vs sans BAT → matche' },
  // #27 vérif adversariale (garde principe n°1) : adresses vides ne matchent JAMAIS (sinon faux conforme).
  { a: '', b: '', attendu: false, note: 'garde : 2 adresses vides → PAS de faux match' },
  { a: '4 rue de feuilleres 49000', b: '', attendu: false, note: 'garde : une adresse vide → pas de match' },
];
console.log('\n— compareAddress (parcelle ignorée, rue/ville comparées) —');
for (const c of CAS_CMP) {
  const res = compareAddress(c.a, c.b);
  const pass = res === c.attendu;
  if (pass) ok++;
  else echecs.push({ in: `${c.a} ⟷ ${c.b}`, attendu: c.attendu, res });
  console.log(`${pass ? '✅' : '❌'} ${res} (attendu ${c.attendu})  — ${c.note}`);
}

const total = CAS.length + CAS_NORM.length + CAS_CELLULES.length + CAS_CMP.length;
console.log(`\n${ok}/${total} cas OK`);
if (echecs.length) {
  console.error(`\n❌ ${echecs.length} ÉCHEC(S) :`);
  for (const e of echecs) console.error(`   "${e.in}" → ${e.res}, attendu ${e.attendu}`);
  process.exit(1);
}
console.log('✅ Tous les cas passent.');
