/** Coordonnées géographiques de l'utilisateur. */
export interface UserCoordinates {
  latitude: number;
  longitude: number;
  /** Précision horizontale du fix (mètres), si fournie par la plateforme. */
  accuracy?: number;
}

/** État du flux de permission de localisation (ponctuelle, jamais persistante). */
export type LocationPermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied';
