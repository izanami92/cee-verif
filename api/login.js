// Route API : POST /api/login
// Vérifie UNIQUEMENT le mot de passe (AUCUN appel LLM) → 200 si OK, 401 sinon.
// Sert à valider la connexion côté front sans déclencher d'analyse coûteuse
// (l'ancien login testait le mot de passe via /api/analyze → lent et payant).

import { requireAuth } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
  }

  // Vérifie le mot de passe EN PREMIER (écrit 401/500 et s'arrête si invalide).
  if (!requireAuth(req, res)) return;

  return res.status(200).json({ ok: true });
}
