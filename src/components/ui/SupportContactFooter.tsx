import { Linking, StyleSheet, View } from 'react-native';

import { SUPPORT_EMAIL, supportMailtoUrl } from '@/constants/support';
import { spacing } from '@/design/tokens/spacing';

import { YText } from './YText';

/**
 * Pied de page discret présent en bas des écrans principaux. Donne un accès permanent et
 * professionnel à l'adresse de support (aide, renseignement, problème). L'email est cliquable
 * (ouvre le client mail via `mailto:`). N'a aucun lien avec l'email de profil de l'utilisateur.
 */
export function SupportContactFooter() {
  const openMail = () => {
    void Linking.openURL(supportMailtoUrl());
  };

  return (
    <View style={styles.root}>
      <YText variant="caption" color="muted" style={styles.text}>
        Besoin d’aide ?{' '}
        <YText
          variant="caption"
          color="primary"
          onPress={openMail}
          accessibilityRole="link"
          accessibilityLabel={`Contacter le support à ${SUPPORT_EMAIL}`}
          style={styles.link}>
          {SUPPORT_EMAIL}
        </YText>
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
