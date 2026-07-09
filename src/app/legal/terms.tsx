import { LegalScreen } from '@/components/legal/LegalScreen';
import { TERMS } from '@/features/legal/content';

export default function TermsScreen() {
  return <LegalScreen doc={TERMS} />;
}
