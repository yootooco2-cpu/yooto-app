import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/design/theme/ThemeProvider';
import type { Merchant } from '@/features/merchants';
import { isVerifiedMerchant } from '@/features/merchants/verification';

/**
 * SCEAU « IDENTITÉ VÉRIFIÉE » (Sprint 1/J4) — le signal de confiance diffusé partout
 * (cartes, listes, mini-fiche carte). Un seul glyphe, universellement compris
 * (check-decagram), en vert primaire, petit : le commerce reste le héros, la preuve
 * reste un signal. Ne rend RIEN si non vérifié — le silence est la règle, le sceau
 * l'exception qui se mérite (jamais d'état « non vérifié » affiché).
 * La preuve détaillée (registre officiel, indépendance, NAF) vit sur la fiche.
 */
export function VerifiedMark({
  merchant,
  size = 14,
}: {
  merchant: Pick<Merchant, 'siret' | 'sireneEtat'>;
  size?: number;
}) {
  const { colors } = useTheme();
  if (!isVerifiedMerchant(merchant)) return null;
  return (
    <MaterialCommunityIcons
      name="check-decagram"
      size={size}
      color={colors.primary}
      accessibilityLabel="Identité vérifiée — registre officiel"
    />
  );
}
