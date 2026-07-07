import { useState } from 'react';

import { continueWithProvider, signInWithEmailLink, type AuthProvider } from '@/lib/supabase/authActions';

/** Cible en cours (bouton en chargement) : un provider OAuth ou l'envoi du lien email. */
export type AuthBusy = null | AuthProvider | 'email';

/**
 * SOURCE UNIQUE du flux d'inscription/connexion (Google · Apple · Email). Encapsule la
 * machine à états UI (busy / erreur / lien envoyé / saisie email) et délègue toute la logique
 * providers à la couche `authActions` (aucune duplication entre les surfaces qui l'utilisent :
 * feuille d'auth, écran Profil, …). Zéro formulaire lourd : l'email seul suffit (lien magique).
 *
 * @param onDone appelé quand une connexion aboutit **sans** redirection web (succès natif).
 */
export function useAuthFlow(onDone?: () => void) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<AuthBusy>(null);
  const [error, setError] = useState<string | null>(null);

  const continueWith = async (provider: AuthProvider) => {
    if (busy) return;
    setError(null);
    setBusy(provider);
    const res = await continueWithProvider(provider);
    setBusy(null);
    // Web : redirection en cours (rien à faire). Natif succès → on notifie l'appelant.
    if (res.ok && !res.pendingRedirect) onDone?.();
    else if (!res.ok && res.error !== 'cancelled') {
      setError(res.error === 'not-configured' ? 'Connexion bientôt disponible.' : 'Connexion impossible, réessayez.');
    }
  };

  const sendEmailLink = async () => {
    if (busy || !email.trim()) return;
    setError(null);
    setBusy('email');
    const res = await signInWithEmailLink(email);
    setBusy(null);
    if (res.ok) setSent(true);
    else setError(res.error === 'not-configured' ? 'Connexion bientôt disponible.' : 'Envoi impossible, vérifiez l’email.');
  };

  return { showEmail, setShowEmail, email, setEmail, sent, busy, error, continueWith, sendEmailLink };
}
