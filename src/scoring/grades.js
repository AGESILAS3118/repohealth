/**
 * Module de conversion des scores numériques en mentions / grades qualitatifs.
 * Échelle conforme au PRD RepoHealth :
 * - 90 à 100    : A+
 * - 80 à 89.99  : A
 * - 70 à 79.99  : B
 * - 60 à 69.99  : C
 * - 50 à 59.99  : D
 * - Moins de 50 : F
 */

/**
 * Grille de conversion ordonnée du score en lettre de notation.
 */
export const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 0, grade: 'F' }
];

/**
 * Détermine le grade correspondant à un score donné.
 * Les seuils sont appliqués à la valeur exacte (non arrondie prématurément).
 * 
 * @param {number} score - Note numérique entre 0 et 100.
 * @returns {'A+' | 'A' | 'B' | 'C' | 'D' | 'F'} Grade calculé.
 */
export function getGrade(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'F';
  }

  // Borner entre 0 et 100 pour la conversion
  const clamped = Math.max(0, Math.min(100, score));

  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (clamped >= min) {
      return grade;
    }
  }

  return 'F';
}
