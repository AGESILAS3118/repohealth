/**
 * Module d'analyse et de validation d'entrées de dépôts GitHub.
 * Supporte les formats "owner/repo" et les URLs complètes GitHub.
 */

// Regex pour valider les noms d'utilisateurs/organisations et dépôts GitHub
// Owner : alphanumérique ou tiret simple, ne commence ni ne termine par un tiret
// Repo : alphanumérique ou tiret/underscore/point (ne commence ni ne termine par un point/tiret)
const GITHUB_REPO_REGEX = /^(?:https?:\/\/github\.com\/)?([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9_](?:[a-zA-Z0-9._-]*[a-zA-Z0-9_])?)(?:\.git)?(?:\/.*)?$/;

/**
 * Analyse une chaîne d'entrée et extrait le propriétaire (owner) et le nom du dépôt (repo).
 * 
 * @param {string} input - Chaîne d'entrée fournie par l'utilisateur (ex: "facebook/react" ou "https://github.com/facebook/react").
 * @returns {{ owner: string, repo: string } | null} - Objet contenant owner et repo ou null si invalide.
 */
export function parseRepoInput(input) {
  if (typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Nettoyage des fragments et paramètres de requête
  const cleanInput = trimmed.split('#')[0].split('?')[0];

  const match = cleanInput.match(GITHUB_REPO_REGEX);
  if (!match) {
    return null;
  }

  const owner = match[1];
  let repo = match[2];

  // Nettoyage de l'extension .git si présente
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo };
}

/**
 * Vérifie si une chaîne d'entrée correspond à un format valide de dépôt GitHub.
 * 
 * @param {string} input - Chaîne d'entrée à tester.
 * @returns {boolean} - true si l'entrée est valide, sinon false.
 */
export function isValidRepoInput(input) {
  return parseRepoInput(input) !== null;
}
