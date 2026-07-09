/**
 * Seam PARTAGE — architecture préparée, comportements branchés plus tard. Une publication pourra
 * être partagée dans une discussion, à un ami, ou via un lien. Aujourd'hui : impl inerte qui
 * expose seulement les cibles disponibles ; demain : partage réel (deep-link, feuille native…).
 */
export type ShareTarget = 'discussion' | 'friend' | 'link';

export interface ShareRef {
  type: 'activity' | 'conversation';
  id: string;
}

export interface ShareService {
  /** Cibles proposées à l'utilisateur (ordre d'affichage). */
  targets(): ShareTarget[];
  /** Exécute un partage (no-op aujourd'hui — retourne false = non branché). */
  share(ref: ShareRef, target: ShareTarget): Promise<boolean>;
}

export const noopShareService: ShareService = {
  targets() {
    return ['discussion', 'friend', 'link'];
  },
  async share() {
    return false; // pas encore branché
  },
};

export const SHARE_TARGET_LABELS: Record<ShareTarget, string> = {
  discussion: 'Partager dans une discussion',
  friend: 'Partager à un ami',
  link: 'Copier le lien',
};

export const shareService: ShareService = noopShareService;
