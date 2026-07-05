import type { Map as MapboxMap } from 'mapbox-gl';

/**
 * Sprites d'arbres 2.5D GÉNÉRIQUES (aucune donnée géographique ici) — dessinés au runtime
 * sur canvas, sans aucun asset externe/lourd. Partagés par tout rendu végétal (national).
 * 5 essences méditerranéennes/tempérées plausibles en France ; silhouettes sobres, ombre
 * bakée (ancrage), teintes désaturées + reflet lumière → jamais cartoon, jamais clone.
 */
export type TreeSpecies = 'platane' | 'micocoulier' | 'pin' | 'olivier' | 'cypres';

export const TREE_SPECIES: TreeSpecies[] = ['platane', 'micocoulier', 'pin', 'olivier', 'cypres'];

interface SpeciesStyle {
  crown: string;
  crownLight: string;
  trunk: string;
  shape: 'round' | 'umbrella' | 'spire' | 'soft';
}
const SPECIES_STYLE: Record<TreeSpecies, SpeciesStyle> = {
  platane: { crown: '#6E8A46', crownLight: '#8CA862', trunk: '#9A7B54', shape: 'round' },
  micocoulier: { crown: '#54703F', crownLight: '#6E8C52', trunk: '#8A6E4C', shape: 'round' },
  pin: { crown: '#3F5C34', crownLight: '#5C7A46', trunk: '#8A6A44', shape: 'umbrella' },
  olivier: { crown: '#6E8352', crownLight: '#8A9A6E', trunk: '#9A8560', shape: 'soft' },
  cypres: { crown: '#33502E', crownLight: '#4A6640', trunk: '#7E6242', shape: 'spire' },
};

const SPRITE_W = 64;
const SPRITE_H = 84;
const SPRITE_RATIO = 2;

export const treeImageId = (sp: TreeSpecies): string => `tree-${sp}`;

function drawSprite(species: TreeSpecies): ImageData | null {
  const st = SPECIES_STYLE[species];
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_W * SPRITE_RATIO;
  canvas.height = SPRITE_H * SPRITE_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SPRITE_RATIO, SPRITE_RATIO);
  const cx = SPRITE_W / 2;
  const groundY = SPRITE_H - 6;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#1E2416';
  ctx.beginPath();
  ctx.ellipse(cx + 3, groundY, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = st.trunk;
  ctx.fillRect(cx - 1.6, groundY - 20, 3.2, 20);

  const crownCY = groundY - 32;
  const blob = (bx: number, by: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(bx, by, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  if (st.shape === 'spire') {
    ctx.fillStyle = st.crown;
    ctx.beginPath();
    ctx.ellipse(cx, crownCY - 4, 9, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.crownLight;
    ctx.beginPath();
    ctx.ellipse(cx - 2, crownCY - 8, 5.5, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.shape === 'umbrella') {
    ctx.fillStyle = st.crown;
    ctx.beginPath();
    ctx.ellipse(cx, crownCY - 2, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    blob(cx - 4, crownCY - 8, 15, st.crownLight);
  } else {
    const r = st.shape === 'soft' ? 15 : 18;
    blob(cx, crownCY, r, st.crown);
    blob(cx - r * 0.55, crownCY + 3, r * 0.62, st.crown);
    blob(cx + r * 0.55, crownCY + 3, r * 0.62, st.crown);
    blob(cx - r * 0.2, crownCY - r * 0.45, r * 0.66, st.crownLight);
  }
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Ajoute les sprites au style (idempotent). */
export function ensureTreeSprites(map: MapboxMap): void {
  TREE_SPECIES.forEach((sp) => {
    const id = treeImageId(sp);
    if (map.hasImage(id)) return;
    const data = drawSprite(sp);
    if (data) map.addImage(id, data, { pixelRatio: SPRITE_RATIO });
  });
}

/** Retire les sprites (réversibilité). */
export function removeTreeSprites(map: MapboxMap): void {
  TREE_SPECIES.forEach((sp) => {
    const id = treeImageId(sp);
    if (map.hasImage(id)) map.removeImage(id);
  });
}
