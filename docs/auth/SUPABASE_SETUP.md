# YOOTOO — Activation de l'authentification (marche à suivre Supabase)

> Ce que **toi seul** peux faire (je n'ai pas accès à ton dashboard). Le code (migrations,
> client, écran) est prêt et **inerte** tant que ces étapes ne sont pas faites.
> Réf. architecture : `docs/auth/IDENTITY_ENGINE.md`.

## 0. Prérequis
- Variables déjà présentes dans `.env` : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Scheme natif de l'app : **`yootoo://`** (déclaré dans `app.json`).

## 1. Appliquer les migrations
La migration `supabase/migrations/004_identity_core.sql` crée `profiles`, `user_roles`, le trigger
`on_auth_user_created` et la RLS.

```bash
# via CLI (recommandé)
supabase db push
# ou : copier/coller le SQL dans Dashboard → SQL Editor et exécuter.
```
Vérifie ensuite : Table Editor → `profiles` et `user_roles` existent, RLS activée.

## 2. URLs de redirection (Dashboard → Authentication → URL Configuration)
Ajoute dans **Redirect URLs** :
- `yootoo://auth`            (natif iOS/Android)
- `http://localhost:8081/auth`  (dev web)
- `https://<ton-domaine>/auth`  (prod web, quand il existera)

Renseigne aussi **Site URL** (ex. l'URL web de prod).

## 3. Provider Email (lien magique / OTP)
Dashboard → Authentication → Providers → **Email** :
- Activer **Email**.
- Activer **« Enable email confirmations »** / magic link (l'app utilise `signInWithOtp`, sans mot de passe).
- (Optionnel) Personnaliser le template d'email au ton YOOTOO.

## 4. Provider Google
1. Google Cloud Console → **OAuth consent screen** (externe) + **Credentials → OAuth client ID (Web)**.
2. **Authorized redirect URI** = `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Copier **Client ID** + **Client secret**.
4. Dashboard Supabase → Providers → **Google** → activer + coller ID/secret.

> Mobile : le flux passe par le navigateur d'auth (`expo-web-browser`) puis
> `exchangeCodeForSession` (PKCE) — pas besoin de client natif Google pour démarrer.

## 5. Provider Apple
1. Apple Developer → **Identifiers** :
   - App ID (bundle) avec **Sign In with Apple** activé.
   - **Services ID** (identifiant web) → configurer **Return URLs** = `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **Key** (Sign In with Apple) → récupérer `Key ID`, `Team ID`, et le fichier `.p8`.
2. Dashboard Supabase → Providers → **Apple** → activer + renseigner Services ID / Team ID / Key ID / clé.

> Conformité iOS : à terme, remplacer le bouton par le bouton natif
> `expo-apple-authentication` (Human Interface Guidelines). Le flux OAuth navigateur
> fonctionne pour démarrer et sur Android/web.

## 6. (Optionnel, plus tard) Claims de rôle dans le JWT
Pour que la RLS lise les rôles/appartenances directement dans le token :
Dashboard → Authentication → **Hooks** → *Custom Access Token* → fonction qui injecte
`app_metadata.roles` (depuis `user_roles`) et les `memberships` (depuis `merchant_users`).
Voir `IDENTITY_ENGINE.md` §04.

## 7. Tester
- **Web** : `Profil → Se connecter → /auth`. « Continuer avec Google » redirige, revient connecté.
- **Mobile** : le navigateur d'auth s'ouvre puis se referme (deep link `yootoo://auth`), session persistée (SecureStore).
- **Email** : saisir prénom/nom/email → « Recevoir le lien » → email reçu → lien → session.

## Sécurité — rappels
- Ne jamais mettre la clé **`service_role`** dans l'app (uniquement Edge Functions).
- Octroi de rôle / fusion de comptes = flux **SECURITY DEFINER** / admin (jamais côté client).
- MFA (TOTP) à activer pour les rôles sensibles avant l'espace commerçant/admin.
