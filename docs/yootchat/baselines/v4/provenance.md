# YootChat v4 — provenance de la baseline

Date de capture : 2026-07-18 (Europe/Paris)

## Source

- Projet Supabase : `YOOTOO`
- Project ref : `zdssiposdphjfumsmxaj`
- Région : `eu-west-2`
- Edge Function : `yootchat`
- ID de déploiement : `eb9d2b93-2a57-4c69-83a9-694125bdaf3e`
- Version : `4`
- Statut observé : `ACTIVE`
- Vérification JWT : `true`
- Bundle Supabase `ezbr_sha256` : `cfb54a4bd9bd0790b0891b1c932e355994cf297a7c175ed96090b03fec110bbd`
- `created_at` Supabase : `1784389583322`
- `updated_at` Supabase : `1784389755528`

La capture a été obtenue par lecture de la fonction effectivement déployée. Aucun appel HTTP à la fonction et aucun appel OpenAI n'ont été exécutés.

## Destination Git

- Dépôt : `yootooco2-cpu/yooto-app`
- Branche source : `feat/edit-profile`
- Commit source : `7db6f9e3ac6ec86e7d7f8e920e30a72e4a831b55`
- Branche locale de sauvegarde : `chore/yootchat-v4-baseline`

## Empreintes

| Fichier | SHA-256 de la source déployée | État de comparaison |
|---|---|---|
| `supabase/functions/yootchat/index.ts` | `f2a0d38fce91ecd1e9f448893a6fc50602f8eb72ef58be086b980cd1f620efc2` | Identique caractère pour caractère et octet pour octet |
| `supabase/functions/yootchat/deno.json` | `1a34f72bfe343cd7089f9f5680bd349c7b3b8013187b8ad96da096583dafd69c` | Contenu identique; le fichier Git local possède un LF terminal supplémentaire |

Le SHA-256 du `deno.json` local avec son LF terminal est `d9d2c11d8c5965380645b32c57202bf40bb6b3cda1d718dfece746bb1c1dd624`.

## Limitation de certification

`index.ts`, qui porte toute la logique fonctionnelle, est strictement identique au déploiement. `deno.json` diffère uniquement par un retour à la ligne final ajouté par l'outil de patch; son JSON et sa sémantique sont identiques. Cette différence est explicitement conservée dans les preuves et interdit le verdict `BASELINE_CERTIFIED` sans réserve.

## Garanties du lot

- aucune modification fonctionnelle;
- aucun changement de `monia-chat`;
- aucun changement du Chat social;
- aucun secret copié depuis Supabase;
- aucun déploiement;
- aucune modification Supabase;
- aucun appel OpenAI;
- aucun push GitHub.
