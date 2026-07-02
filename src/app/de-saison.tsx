import { SaisonScreen } from '@/features/carnet/components/SaisonScreen';

/**
 * Rubrique « De saison » du Carnet — route NON-onglet (destination secondaire, pas un
 * onglet principal). Accessible via /de-saison (ou router.push) ; à rattacher au Carnet.
 */
export default function DeSaisonRoute() {
  return <SaisonScreen />;
}
