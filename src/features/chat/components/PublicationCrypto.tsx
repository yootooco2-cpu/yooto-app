import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

/**
 * Cryptogrammes éditoriaux YOOTOO — SIGNATURE VISUELLE propriétaire des types de publication.
 * Chaque emblème reprend fidèlement la silhouette de la collection validée (étoile scintillante,
 * diable, étiquette, verre, étal, panier, calendrier-étoile, cœur, rosette, toque, pousse,
 * mégaphone, médaille, cadeau, horloge, porte, appareil photo, sceau-coche).
 *
 * Glyphes MONOCHROMES rendus dans la couleur d'accent de la catégorie → le système de couleurs des
 * chips reste intact, et l'emblème reste net et reconnaissable de 16 à 20 px. Présentation pure.
 */
export type CryptoId =
  | 'nouveaute'
  | 'arrivage'
  | 'offre'
  | 'degustation'
  | 'marche'
  | 'recolte'
  | 'evenement'
  | 'coup_de_coeur'
  | 'bon_plan'
  | 'menu_du_jour'
  | 'produit_local'
  | 'information'
  | 'artisan'
  | 'offre_speciale'
  | 'duree_limitee'
  | 'ouverture'
  | 'coulisses'
  | 'engagement';

/** Rendu du glyphe (hérite stroke/fill du <Svg> ; les formes pleines forcent fill + stroke none). */
function Glyph({ id, color }: { id: CryptoId; color: string }) {
  const solid = { fill: color, stroke: 'none' } as const;
  switch (id) {
    case 'nouveaute': // Étoile scintillante à 4 branches + éclats
      return (
        <>
          <Polygon points="12,2.5 13.9,10.1 21.5,12 13.9,13.9 12,21.5 10.1,13.9 2.5,12 10.1,10.1" {...solid} />
          <Polygon points="19.4,4.2 19.9,5.3 21,5.8 19.9,6.3 19.4,7.4 18.9,6.3 17.8,5.8 18.9,5.3" {...solid} />
          <Polygon points="5.2,16.6 5.6,17.5 6.5,17.9 5.6,18.3 5.2,19.2 4.8,18.3 3.9,17.9 4.8,17.5" {...solid} />
        </>
      );
    case 'arrivage': // Diable (chariot) + colis
      return (
        <>
          <Rect x={8} y={5} width={8} height={8} rx={1} />
          <Line x1={6.7} y1={3.5} x2={6.7} y2={18} />
          <Line x1={6.7} y1={18} x2={12.6} y2={18} />
          <Circle cx={8.6} cy={19.4} r={1.8} />
        </>
      );
    case 'offre': // Étiquette avec %
      return (
        <>
          <Path d="M20.6 12.5 L12.5 20.6 C11.9 21.2 10.9 21.2 10.3 20.6 L3.4 13.7 C3.1 13.4 3 13 3 12.6 L3 5 C3 4 3.8 3.2 4.8 3.2 L12.4 3.2 C12.8 3.2 13.2 3.4 13.5 3.7 L20.6 10.8 C21.2 11.4 21.2 11.9 20.6 12.5 Z" />
          <Circle cx={7.7} cy={7.7} r={1.5} />
          <Line x1={9.6} y1={15} x2={15} y2={9.6} />
          <Circle cx={10.1} cy={10.4} r={1.05} {...solid} />
          <Circle cx={14.4} cy={14.2} r={1.05} {...solid} />
        </>
      );
    case 'degustation': // Verre de dégustation
      return (
        <>
          <Path d="M7.5 3.5 L16.5 3.5 C16.5 8.2 14.3 11 12 11 C9.7 11 7.5 8.2 7.5 3.5 Z" />
          <Path d="M8.4 5.4 L15.6 5.4 C15.1 8.3 13.6 10.2 12 10.2 C10.4 10.2 8.9 8.3 8.4 5.4 Z" {...solid} />
          <Line x1={12} y1={11} x2={12} y2={18.5} />
          <Line x1={8.5} y1={18.7} x2={15.5} y2={18.7} />
        </>
      );
    case 'marche': // Étal de marché (auvent + comptoir + produits)
      return (
        <>
          <Polygon points="4,8 20,8 18.3,4.5 5.7,4.5" />
          <Line x1={5.2} y1={8} x2={5.2} y2={19.5} />
          <Line x1={18.8} y1={8} x2={18.8} y2={19.5} />
          <Rect x={5.2} y={13} width={13.6} height={6.5} />
          <Circle cx={9} cy={11.8} r={1} {...solid} />
          <Circle cx={12} cy={11.4} r={1} {...solid} />
          <Circle cx={15} cy={11.8} r={1} {...solid} />
        </>
      );
    case 'recolte': // Panier de récolte + feuillage
      return (
        <>
          <Polygon points="7,13.5 17,13.5 15.6,20 8.4,20" />
          <Line x1={6.3} y1={13.5} x2={17.7} y2={13.5} />
          <Path d="M12 12.5 C9.5 12.5 7.5 11 7 8.5 C9.5 8.7 11.5 10 12 12.5 Z" {...solid} />
          <Path d="M12 11.5 C14.5 11.5 16.5 10 17 7.5 C14.5 7.7 12.5 9 12 11.5 Z" {...solid} />
          <Path d="M12 12 C11 9.5 11.3 7 13 5.5 C13.6 7.8 13.3 10.3 12 12 Z" {...solid} />
        </>
      );
    case 'evenement': // Calendrier avec étoile
      return (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={2} />
          <Line x1={8} y1={3} x2={8} y2={6.5} />
          <Line x1={16} y1={3} x2={16} y2={6.5} />
          <Line x1={4} y1={9.5} x2={20} y2={9.5} />
          <Polygon points="12,11.4 12.88,13.59 15.23,13.75 13.43,15.26 14,17.55 12,16.3 10,17.55 10.57,15.26 8.77,13.75 11.12,13.59" {...solid} />
        </>
      );
    case 'coup_de_coeur': // Cœur
      return (
        <Path d="M12 20 C12 20 3.5 14.5 3.5 8.8 C3.5 6 5.6 4 8.2 4 C10 4 11.3 5 12 6.2 C12.7 5 14 4 15.8 4 C18.4 4 20.5 6 20.5 8.8 C20.5 14.5 12 20 12 20 Z" {...solid} />
      );
    case 'bon_plan': // Étoile dans un médaillon
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} />
          <Polygon points="12,7.6 13.12,10.46 16.18,10.64 13.81,12.59 14.59,15.56 12,13.9 9.41,15.56 10.19,12.59 7.82,10.64 10.88,10.46" {...solid} />
        </>
      );
    case 'menu_du_jour': // Toque de chef
      return (
        <>
          <Path d="M7 20 L17 20 L17 13.5 C19.2 13.5 21 11.7 21 9.5 C21 7.3 19.2 5.5 17 5.5 C16.7 5.5 16.4 5.5 16.1 5.6 C15.4 4.1 13.8 3 12 3 C10.2 3 8.6 4.1 7.9 5.6 C7.6 5.5 7.3 5.5 7 5.5 C4.8 5.5 3 7.3 3 9.5 C3 11.7 4.8 13.5 7 13.5 Z" />
          <Line x1={7} y1={16.5} x2={17} y2={16.5} />
        </>
      );
    case 'produit_local': // Jeune pousse
      return (
        <>
          <Line x1={12} y1={20} x2={12} y2={10.5} />
          <Line x1={8} y1={20} x2={16} y2={20} />
          <Path d="M12 13.5 C9 13.5 6.5 11.5 6 8.5 C9 8.8 11.5 10.5 12 13.5 Z" {...solid} />
          <Path d="M12 12 C15 12 17.5 10 18 7 C15 7.3 12.5 9 12 12 Z" {...solid} />
        </>
      );
    case 'information': // Mégaphone
      return (
        <>
          <Polygon points="4,10 15,6 15,16 4,12" />
          <Line x1={7} y1={13.2} x2={6} y2={17.2} />
          <Path d="M17.3 8.6 C18.8 10.1 18.8 11.9 17.3 13.4" />
          <Path d="M19.3 6.9 C21.7 9.3 21.7 12.7 19.3 15.1" />
        </>
      );
    case 'artisan': // Médaille à ruban + étoile
      return (
        <>
          <Polygon points="9,14 9,21 12,18.5 15,21 15,14" />
          <Circle cx={12} cy={9.5} r={5.2} />
          <Polygon points="12,6.6 12.74,8.49 14.76,8.6 13.19,9.89 13.71,11.85 12,10.75 10.29,11.85 10.81,9.89 9.24,8.6 11.26,8.49" {...solid} />
        </>
      );
    case 'offre_speciale': // Cadeau
      return (
        <>
          <Rect x={4.5} y={10.5} width={15} height={9.5} rx={1} />
          <Rect x={3.5} y={7} width={17} height={3.8} rx={1} />
          <Line x1={12} y1={7} x2={12} y2={20} />
          <Path d="M12 7 C10.5 5.5 7.5 4.5 7.5 6.2 C7.5 7.3 9.8 7 12 7" />
          <Path d="M12 7 C13.5 5.5 16.5 4.5 16.5 6.2 C16.5 7.3 14.2 7 12 7" />
        </>
      );
    case 'duree_limitee': // Horloge
      return (
        <>
          <Circle cx={12} cy={12} r={8.3} />
          <Line x1={12} y1={12} x2={12} y2={6.8} />
          <Line x1={12} y1={12} x2={15.7} y2={13.6} />
        </>
      );
    case 'ouverture': // Porte ouverte
      return (
        <>
          <Line x1={3.5} y1={21} x2={18.5} y2={21} />
          <Line x1={18.5} y1={3.5} x2={18.5} y2={21} />
          <Line x1={15} y1={3} x2={18.5} y2={3.5} />
          <Polygon points="6,21 6,5 15,3 15,21" />
          <Circle cx={13.3} cy={12} r={0.85} {...solid} />
        </>
      );
    case 'coulisses': // Appareil photo
      return (
        <>
          <Rect x={3.5} y={7.5} width={17} height={11.5} rx={2} />
          <Path d="M8 7.5 L9.4 5 L14.6 5 L16 7.5" />
          <Circle cx={12} cy={13.2} r={3.4} />
          <Circle cx={12} cy={13.2} r={1.5} />
          <Circle cx={17.3} cy={10} r={0.85} {...solid} />
        </>
      );
    case 'engagement': // Sceau + coche
      return (
        <>
          <Circle cx={12} cy={12} r={8.3} />
          <Circle cx={12} cy={12} r={6.3} />
          <Path d="M8.2 12.3 L11 15.2 L16.2 9.3" strokeWidth={1.9} />
        </>
      );
  }
}

/**
 * Cryptogramme d'un type de publication, dessiné dans la couleur passée (accent de la catégorie).
 * `size` par défaut 14 → lisible et compact dans la chip (conserve les espacements existants).
 */
export function PublicationCrypto({ id, color, size = 14 }: { id: CryptoId; color: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Glyph id={id} color={color} />
    </Svg>
  );
}
