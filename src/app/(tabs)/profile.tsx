import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';

export default function ProfileScreen() {
  return (
    <YScreen scroll>
      <YText variant="caption" color="primary">
        YOOTOO · Profil
      </YText>

      <YText variant="title">Ton espace</YText>

      <YCard>
        <YText variant="subtitle">Invité</YText>
        <YText variant="body" color="muted">
          Connecte-toi pour retrouver tes commerces favoris, suivre ton budget et débloquer tes
          récompenses.
        </YText>
        <YButton label="Se connecter" />
      </YCard>

      <YCard variant="outline">
        <YText variant="label">Bientôt disponible</YText>
        <YText variant="body" color="muted">
          Préférences, impact écologique et historique de tes achats responsables arriveront
          prochainement.
        </YText>
      </YCard>
    </YScreen>
  );
}
