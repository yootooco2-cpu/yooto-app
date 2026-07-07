/**
 * Couche de SERVICES YOOTOO — toute la logique métier / accès données passe par ici.
 * Règle d'architecture : aucun composant n'appelle Supabase (ou un stockage) directement ;
 * il consomme ces services. Chaque service a une responsabilité unique.
 */
export { AppearanceService } from './AppearanceService';
export { SettingsService } from './SettingsService';
export { PreferenceService, type MarkerVisibilityInput } from './PreferenceService';
export { NotificationService } from './NotificationService';
export { ProfileService, type ProfileData, type ProfilePatch, type ServiceResult } from './ProfileService';
export { StorageService } from './StorageService';
export { PrivacyService } from './PrivacyService';
