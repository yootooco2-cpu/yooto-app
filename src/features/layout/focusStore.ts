import { create } from 'zustand';

interface FocusState {
  /** Source de vérité UNIQUE du mode « Focus Commerce » (desktop). */
  isFocus: boolean;
  setFocus: (value: boolean) => void;
}

/**
 * État unique du mode « Focus Commerce ». TOUTES les conséquences visuelles en découlent :
 * panneau latéral affiché, bottom sheet masqué, tab bar masquée.
 * Écrit à UN SEUL endroit (l'écran carte) ; lu par la carte ET le layout des tabs → la barre
 * de navigation n'est jamais manipulée à plusieurs endroits.
 */
export const useFocusStore = create<FocusState>((set) => ({
  isFocus: false,
  // Idempotent : aucun re-render si la valeur est inchangée.
  setFocus: (value) => set((state) => (state.isFocus === value ? state : { isFocus: value })),
}));
