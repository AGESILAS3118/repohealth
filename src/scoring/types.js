/**
 * @file types.js
 * @description Documentation JSDoc des structures de données du moteur de scoring de RepoHealth.
 */

/**
 * Statut de vérifiabilité d'une sous-vérification.
 * @typedef {'passed' | 'failed' | 'not_verifiable' | 'insufficient_data'} CheckStatus
 */

/**
 * Priorité d'une recommandation d'amélioration.
 * @typedef {'high' | 'medium' | 'low'} RecommendationPriority
 */

/**
 * Détail d'une sous-vérification individuelle au sein d'un pilier.
 * @typedef {Object} CheckResult
 * @property {string} id - Identifiant unique de la vérification (ex: 'readme_present').
 * @property {string} labelKey - Clé de traduction i18n associée au libellé du contrôle.
 * @property {boolean} passed - Indique si le contrôle est validé ou non.
 * @property {CheckStatus} status - Résultat ou niveau de vérifiabilité du contrôle.
 * @property {number} weight - Pondération / points maximaux attribués à ce contrôle (ex: 15).
 * @property {number} points - Points effectivement obtenus (égal à weight si passed, 0 sinon).
 * @property {string|null} [detail] - Détail contextuel optionnel sur la détection.
 */

/**
 * Recommandation d'amélioration formulée lorsqu'un contrôle échoue.
 * @typedef {Object} Recommendation
 * @property {string} id - Identifiant de la recommandation (ex: 'rec_readme_present').
 * @property {string} labelKey - Clé de traduction i18n associée au conseil d'amélioration.
 * @property {number} points - Nombre de points à gagner si l'action est réalisée.
 * @property {RecommendationPriority} priority - Niveau de priorité ('high' >= 15 pts, 'medium' = 10 pts, 'low' < 10 pts).
 */

/**
 * Résultat calculé pour un pilier d'évaluation spécifique.
 * @typedef {Object} PillarResult
 * @property {string} id - Identifiant unique du pilier (ex: 'documentation').
 * @property {string} labelKey - Clé de traduction i18n pour le nom du pilier.
 * @property {number} weight - Poids du pilier dans la note globale (en pourcentage, ex: 20).
 * @property {number|null} score - Note obtenue par le pilier, ou null si non évaluable.
 * @property {'scored' | 'not_verifiable' | 'insufficient_data'} [status] - Statut du pilier.
 * @property {number} maxScore - Score maximal possible sur l'échelle du pilier (100).
 * @property {CheckResult[]} checks - Liste des sous-vérifications exécutées.
 * @property {Recommendation[]} recommendations - Recommandations issues des contrôles non satisfaits.
 */

/**
 * Rapport complet généré par le moteur de scoring.
 * @typedef {Object} ScoreReport
 * @property {number|null} score - Score global calculé, ou null si aucun pilier n'est évaluable.
 * @property {string|null} grade - Mention qualitative, ou null si aucun score n'est disponible.
 * @property {PillarResult[]} pillars - Liste ordonnée des résultats de chaque pilier.
 * @property {{id: string, labelKey: string, reason: string}[]} unverifiablePillars - Piliers sans score.
 * @property {string} [message] - Message explicatif si aucun pilier n'a pu être évalué.
 * @property {string} engineVersion - Version sémantique du moteur de calcul (ex: '0.1.0').
 * @property {string} computedAt - Horodatage ISO 8601 du calcul du rapport.
 */

// Export vide pour permettre l'importation ES Module si nécessaire
export {};
