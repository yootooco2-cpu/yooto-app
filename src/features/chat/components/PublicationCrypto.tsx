import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Cryptogrammes éditoriaux YOOTOO — SIGNATURE VISUELLE propriétaire des types de publication.
 * Pictogrammes redessinés dans la grammaire officielle (collection Nature / Culture / Marché…) :
 * formes GÉNÉREUSES, simplifiées, tracé épais et arrondi, homogène — reconnaissables jusqu'à
 * très petite taille. Arrivage, Marché, Récolte et Dans les coulisses sont les versions validées.
 *
 * Rendus MONOCHROMES dans la couleur d'accent de la catégorie → le système de couleurs des chips
 * reste intact (le traitement or + goutte vit sur les marqueurs de la carte). Présentation pure.
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

/** Repère 0..48 (centre 24,24). Tracé ajouré ; détails pleins forcent fill + stroke none. */
function Glyph({ id, color }: { id: CryptoId; color: string }) {
  const solid = { fill: color, stroke: 'none' } as const;
  switch (id) {
    case 'nouveaute': // Étoile scintillante généreuse + éclat
      return (
        <>
          <Path d="M24 3.5 L28.6 19.4 L44.5 24 L28.6 28.6 L24 44.5 L19.4 28.6 L3.5 24 L19.4 19.4 Z" />
          <Path d="M38.5 7.5 L39.9 11.1 L43.5 12.5 L39.9 13.9 L38.5 17.5 L37.1 13.9 L33.5 12.5 L37.1 11.1 Z" />
        </>
      );
    case 'arrivage': // Carton ouvert + flèche d'arrivée (validé)
      return (
        <>
          <Path d="M10 24 L10 40 L38 40 L38 24" />
          <Path d="M10 24 L24 20 L38 24" />
          <Path d="M24 20 L24 40" />
          <Path d="M24 5 L24 15.5" />
          <Path d="M18.7 10.3 L24 15.8 L29.3 10.3" />
        </>
      );
    case 'offre': // Étiquette + %
      return (
        <>
          <Path d="M43 25 L25 43 C23.7 44.3 21.6 44.3 20.3 43 L6 28.7 C5.4 28.1 5 27.2 5 26.3 L5 9 C5 6.8 6.8 5 9 5 L26.3 5 C27.2 5 28.1 5.4 28.7 6 L43 20.3 C44.3 21.6 44.3 23.7 43 25 Z" />
          <Circle cx={15} cy={15} r={3.2} />
          <Path d="M19 34 L34 19" />
          <Circle cx={20} cy={21} r={2.1} {...solid} />
          <Circle cx={32} cy={33} r={2.1} {...solid} />
        </>
      );
    case 'degustation': // Verre de dégustation
      return (
        <>
          <Path d="M14 6 L34 6 C34 17 29 24 24 24 C19 24 14 17 14 6 Z" />
          <Path d="M24 24 L24 40" />
          <Path d="M15 40 L33 40" />
        </>
      );
    case 'marche': // Stand + auvent à festons rayé + cagettes (validé)
      return (
        <>
          <Path d="M8 9 L40 9 L40 16 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 q-2 4 -4 0 Z" />
          <Path d="M16 9 L16 15 M24 9 L24 15 M32 9 L32 15" />
          <Path d="M10 20 L10 40" />
          <Path d="M38 20 L38 40" />
          <Rect x={11} y={30} width={26} height={10} rx={1.5} />
          <Path d="M13 30 C14 25 21 25 22 30" />
          <Path d="M26 30 C27 25 34 25 35 30" />
        </>
      );
    case 'recolte': // Panier bas + grandes feuilles (validé)
      return (
        <>
          <Path d="M9 28 L39 28 L36 40 L12 40 Z" />
          <Path d="M7 28 L41 28" />
          <Path d="M23 28 C14 27 9 20 9 11 C18 12 23 19 23 28 Z" />
          <Path d="M25 28 C34 27 39 20 39 11 C30 12 25 19 25 28 Z" />
        </>
      );
    case 'evenement': // Calendrier + étoile
      return (
        <>
          <Rect x={7} y={9} width={34} height={32} rx={4} />
          <Path d="M15 5 L15 12 M33 5 L33 12" />
          <Path d="M7 18 L41 18" />
          <Path d="M24 22.8 L25.76 27.18 L30.46 27.5 L26.86 30.52 L28 35.1 L24 32.6 L20 35.1 L21.14 30.52 L17.54 27.5 L22.24 27.18 Z" {...solid} />
        </>
      );
    case 'coup_de_coeur': // Cœur
      return (
        <Path d="M24 40 C24 40 7 29 7 17.6 C7 12 11.2 8 16.4 8 C20 8 22.6 10 24 12.4 C25.4 10 28 8 31.6 8 C36.8 8 41 12 41 17.6 C41 29 24 40 24 40 Z" />
      );
    case 'bon_plan': // Médaillon + étoile
      return (
        <>
          <Circle cx={24} cy={24} r={16} />
          <Path d="M24 15.2 L26.24 20.92 L32.36 21.28 L27.62 25.18 L29.18 31.12 L24 27.8 L18.82 31.12 L20.38 25.18 L15.64 21.28 L21.76 20.92 Z" {...solid} />
        </>
      );
    case 'menu_du_jour': // Toque
      return (
        <>
          <Path d="M14 40 L34 40 L34 27 C38.4 27 42 23.4 42 19 C42 14.6 38.4 11 34 11 C33.4 11 32.8 11 32.2 11.2 C30.8 8.2 27.6 6 24 6 C20.4 6 17.2 8.2 15.8 11.2 C15.2 11 14.6 11 14 11 C9.6 11 6 14.6 6 19 C6 23.4 9.6 27 14 27 Z" />
          <Path d="M14 33 L34 33" />
        </>
      );
    case 'produit_local': // Pousse
      return (
        <>
          <Path d="M24 40 L24 21" />
          <Path d="M16 40 L32 40" />
          <Path d="M24 27 C18 27 13 23 12 17 C19 18 24 21 24 27 Z" />
          <Path d="M24 24 C30 24 35 20 36 14 C29 15 24 18 24 24 Z" />
        </>
      );
    case 'information': // Mégaphone
      return (
        <>
          <Path d="M8 20 L30 12 L30 32 L8 24 Z" />
          <Path d="M14 26 L12 34" />
          <Path d="M34 17 C37 20 37 24 34 27" />
          <Path d="M38.5 13.5 C43 18 43 26 38.5 30.5" />
        </>
      );
    case 'artisan': // Médaille à ruban + étoile
      return (
        <>
          <Path d="M18 28 L18 43 L24 37.5 L30 43 L30 28" />
          <Circle cx={24} cy={19} r={10} />
          <Path d="M24 12 L25.6 16.6 L30.5 16.8 L26.6 19.8 L28 24.6 L24 21.8 L20 24.6 L21.4 19.8 L17.5 16.8 L22.4 16.6 Z" {...solid} />
        </>
      );
    case 'offre_speciale': // Cadeau
      return (
        <>
          <Rect x={9} y={21} width={30} height={19} rx={2} />
          <Rect x={7} y={14} width={34} height={7.5} rx={2} />
          <Path d="M24 14 L24 40" />
          <Path d="M24 14 C21 11 15 9 15 12.4 C15 14.6 19.6 14 24 14" />
          <Path d="M24 14 C27 11 33 9 33 12.4 C33 14.6 28.4 14 24 14" />
        </>
      );
    case 'duree_limitee': // Horloge
      return (
        <>
          <Circle cx={24} cy={24} r={16} />
          <Path d="M24 24 L24 13.6" />
          <Path d="M24 24 L31.4 27.2" />
        </>
      );
    case 'ouverture': // Porte ouverte
      return (
        <>
          <Path d="M7 42 L41 42" />
          <Path d="M37 8 L37 42" />
          <Path d="M30 6 L37 8" />
          <Path d="M12 42 L12 11 L30 6 L30 42" />
          <Circle cx={26} cy={24} r={1.7} {...solid} />
        </>
      );
    case 'coulisses': // Rideau de scène entrouvert (validé)
      return (
        <>
          <Path d="M6 9 L42 9" />
          <Circle cx={5.5} cy={9} r={1.8} {...solid} />
          <Circle cx={42.5} cy={9} r={1.8} {...solid} />
          <Path d="M11 9 L11 34 C11 38 13 40.5 14.5 40.5 C16 40.5 17 39 17 37 L17 9" />
          <Path d="M14 12 L14 36" />
          <Path d="M37 9 L37 34 C37 38 35 40.5 33.5 40.5 C32 40.5 31 39 31 37 L31 9" />
          <Path d="M34 12 L34 36" />
        </>
      );
    case 'engagement': // Sceau + coche
      return (
        <>
          <Circle cx={24} cy={24} r={16} />
          <Circle cx={24} cy={24} r={12} />
          <Path d="M16.4 24.6 L22 30.4 L32.4 18.6" strokeWidth={3.8} />
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
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Glyph id={id} color={color} />
    </Svg>
  );
}
