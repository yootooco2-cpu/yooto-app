import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';

export default function HomeScreen() {
  return (
    <YScreen center>
      <YText variant="caption" color="primary">
        YOOTOO · GreenTech locale
      </YText>

      <YText variant="title">Mieux consommer. Soutenir le local. Être récompensé.</YText>

      <YText variant="body" color="muted">
        YOOTOO t’aide à découvrir les commerces indépendants autour de toi, suivre ton budget et
        réduire ton impact écologique grâce à une carte intelligente.
      </YText>

      <YCard>
        <YText variant="subtitle">Première mission</YText>
        <YText variant="body" color="muted">
          Active ta position pour découvrir les commerces responsables proches de toi.
        </YText>
      </YCard>

      <YButton label="Découvrir autour de moi" fullWidth />
    </YScreen>
  );
}
