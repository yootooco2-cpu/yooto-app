import { LegalScreen } from '@/components/legal/LegalScreen';
import { PRIVACY } from '@/features/legal/content';

export default function PrivacyScreen() {
  return <LegalScreen doc={PRIVACY} />;
}
