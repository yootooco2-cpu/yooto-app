import { SectionScreen } from '@/components/theme/SectionScreen';
import { SaisonScreen } from '@/features/carnet/components/SaisonScreen';

/** Onglet « De saison » (Carte de saison du Carnet) — univers vert olive. */
export default function DeSaisonTab() {
  return (
    <SectionScreen section="saison">
      <SaisonScreen />
    </SectionScreen>
  );
}
