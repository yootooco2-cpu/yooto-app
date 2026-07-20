# YootChat - Proposition du prochain lot

## Lot propose

`LOT 5D - tentative LIVE unique avec watchdog strict final`

## Objectif

Executer une seule tentative LIVE encadree par:

- watchdog JSON strict final;
- garde anti-retry;
- enveloppe transport observee;
- classification d'erreurs certifiee;
- rapport anonymise uniquement.

## Preconditions recommandees

- Autorisation humaine explicite.
- Worktree propre.
- Branche et commit certifies.
- `.env.local` ignore par Git.
- Cle publishable publique presente.
- Aucune cle privilegiee.
- Aucun retry.

## Interdictions a conserver

- Aucun push pendant le live.
- Aucun deploiement.
- Aucune ecriture Supabase.
- Aucun RPC.
- Aucun secret affiche.
