# YOOTOO — Fondations transverses (`src/features/system`)

> Composants **transverses**, **parcours-agnostiques**, **sans logique métier**. Ils sont
> *consommés* par les features (onboarding, i18n, notifications, analytics, récompenses, IA…),
> jamais modifiés par elles. Deux fondations aujourd'hui : **Device Context (A)** et
> **Launch/Milestones (B)**.

## A · Device Context — `deviceContext.ts`

**Rôle** : décrire ce que l'OS expose. **Purement descriptif** — aucune décision produit,
aucun défaut « métier ». Si l'OS ne fournit rien → `null` (le consommateur choisit son repli).

### Contrat
```ts
interface DeviceContext {
  locale: string | null;       // 'fr-FR'
  language: string | null;     // 'fr'
  region: string | null;       // 'FR'
  timeZone: string | null;     // 'Europe/Paris'
  currency: string | null;     // 'EUR' (correspondance FACTUELLE région→ISO-4217, null si inconnue)
  colorScheme: 'light' | 'dark' | null;  // null = aucune préférence exprimée
}
useDeviceContext(): DeviceContext        // hook (lecture OS + thème réactif)
resolveDeviceContext(input): DeviceContext  // PUR (testé)
currencyForRegion(region): string | null   // PUR (descriptif)
```
Sans dépendance native : `Intl.DateTimeFormat().resolvedOptions()` + `useColorScheme()`.

### Garanties
- **Ne décide rien** : ni thème appliqué, ni langue choisie, ni devise imposée.
- **Ne jette jamais** : lecture OS défensive.
- **Nullable** : « inconnu » est représenté explicitement.

### Réutilisations (au-delà de l'onboarding)
| Contexte | Usage |
|---|---|
| i18n / internationalisation | `language` / `locale` pour choisir la langue (le repli est décidé par l'i18n) |
| Préférences | pré-remplir sans demander (langue, thème) |
| Personnalisation | `region` / `timeZone` pour adapter contenus |
| Notifications | `timeZone` pour planifier au bon moment |
| Analytics | dimensions `region` / `locale` / `colorScheme` |
| Récompenses | `currency` pour formater les montants |
| Future IA | contexte utilisateur (langue/région/fuseau) en entrée |

## B · Launch / Milestones — `launchLogic.ts` (pur) + `launchState.ts` (store persisté)

**Rôle** : piloter des **états** et **transitions** de cycle de vie. **Aucune logique métier**
(ni auth, ni onboarding) baked-in. « onboarding » n'est qu'un *milestone* parmi d'autres,
choisi par l'appelant.

### Contrat
```ts
type LaunchStatus = 'unknown' | 'first-launch' | 'returning';
milestoneKey(name): string                 // PUR — 'yootoo.milestone.<name>.v1'
deriveLaunchStatus(hasSeen): LaunchStatus   // PUR (testé)

useLaunchStore(): {
  status: LaunchStatus; hydrated: boolean; milestones: Record<string, boolean>;
  hydrate(): Promise<void>;                 // lit le drapeau de lancement
  markLaunched(): Promise<void>;            // prochain démarrage = 'returning'
  checkMilestone(name): Promise<boolean>;   // état d'un milestone générique
  markMilestone(name): Promise<void>;       // marque un milestone atteint
}
```
Persistance : `expo-secure-store` (natif) / `localStorage` (web), garde-fous, non bloquant.

### Garanties
- **Parcours-agnostique** : un changement complet du parcours d'onboarding **ne touche pas** ce module (il appellera juste `markMilestone('onboarding')`).
- **Générique** : sert aussi « Nouveautés », intros de features, coach-marks, cohortes.
- **Parties natives isolées** → logique **pure testée** sans mock.

### Réutilisations
premier lancement · écran *What's New* versionné · intro contextuelle d'une feature ·
gating d'un tutoriel · segmentation returning/first pour analytics.

## Règles d'usage (invariants)
1. Ces modules **n'importent aucune feature** (aucune dépendance descendante) → réutilisables partout.
2. Le **Device Context ne décide pas** ; les consommateurs appliquent leur repli.
3. Le **Launch orchestrator ne connaît pas** l'auth/onboarding ; il pilote des drapeaux nommés.
4. Toute nouvelle donnée OS / tout nouveau type de milestone s'ajoute **sans casser** l'existant (clés versionnées, champs nullable).

## Statut
Officialisés comme **fondations YOOTOO** (PR #77). Non câblés à ce jour : les brancher est la
responsabilité des features consommatrices (à commencer par le futur parcours d'inscription).
