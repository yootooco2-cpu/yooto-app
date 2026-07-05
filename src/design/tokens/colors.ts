export const colors = {
  background: '#F7F4EC',
  surface: '#FFFFFF',
  text: '#17201A',
  mutedText: '#6F7A72',
  primary: '#1F7A4D',
  primaryDark: '#145A37',
  accent: '#D6A85A',
  border: '#E4DDCF',
  success: '#2E8B57',
  warning: '#C9822B',
};

/**
 * Couleurs d'onglet ACTIF de la barre de navigation inférieure — extension de l'identité
 * couleur des catégories YOOTOO. Un seul onglet coloré à la fois (l'actif) ; tous les
 * inactifs restent en gris neutre (`colors.mutedText`). La barre reste blanche.
 * Contraste vérifié ≥ 4.5:1 sur surface blanche (WCAG AA texte) — l'ambre et l'olive
 * « conseillés » ont été légèrement assombris pour atteindre ce seuil sans changer de teinte.
 * Identique sur iOS / Android / Web (aucune variante par plateforme).
 */
export const tabActiveColors = {
  index: '#4E5652', // Accueil — gris foncé (7.56:1)
  explore: '#1F5891', // Carte — bleu Coopératives profond (7.33:1)
  merchants: '#9C6B24', // Commerçants — ambre (4.62:1)
  'de-saison': '#627D2F', // De saison — vert olive (4.67:1)
  profile: '#2E2E2E', // Profil — noir mat (13.58:1)
} as const;
