// Authentification par mot de passe partagé (K1 — audit phase A, 07/07/2026).
//
// Le mot de passe vit UNIQUEMENT dans la variable d'environnement Vercel APP_PASSWORD :
// il n'apparaît jamais dans le code livré au navigateur. La vérification est faite ICI,
// côté serveur, en tête de chaque route API (le front ne fait que le demander).

// Lit le mot de passe fourni par le client : header « Authorization: Bearer <mdp> »
// (jamais en query string, pour ne pas le laisser fuiter dans les URLs / logs).
function readProvidedPassword(req) {
  const header = (req.headers && req.headers.authorization) || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  // Repli : mot de passe dans le corps d'une requête POST (jamais en query).
  if (req.body && typeof req.body.password === 'string') return req.body.password.trim();
  return '';
}

// Retourne true si la requête est authentifiée. Sinon, écrit la réponse d'erreur et retourne false.
// Fail-closed : si APP_PASSWORD n'est pas configuré côté serveur, on REFUSE (500 explicite)
// plutôt que de laisser l'API ouverte (c'est ce qui manquait avant l'audit).
export function requireAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'Configuration serveur manquante : APP_PASSWORD non défini côté Vercel.' });
    return false;
  }
  const provided = readProvidedPassword(req);
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Mot de passe incorrect ou manquant.' });
    return false;
  }
  return true;
}
