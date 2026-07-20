# YootChat - Lot 5B-I2 watchdog JSON strict

Date: 2026-07-20

## Source et filiation

- Branche source: `fix/yootchat-transport-envelope-observability`
- Commit source: `a0ea331df27e5d9da886ba846aa8d8728233f3e6`
- Parent source: `b367bff1c48ed5abd2b4e1b55ba73263b11a5fe7`
- Branche de correction: `fix/yootchat-watchdog-strict-json`

## Objectif

Remplacer le filtrage par sous-chaines du watchdog par un validateur JSON ferme avant toute future tentative live.

## Regles appliquees

- Chaque ligne enfant complete est parse avec `JSON.parse`.
- Les JSON invalides sont rejetes.
- Les tableaux racine sont rejetes.
- Toute propriete racine inconnue est rejetee.
- Les objets internes `stage`, `aggregate` et `transport` sont valides avec des cles fermees.
- La sortie est reconstruite dans un nouvel objet borne.
- La ligne originale de l'enfant n'est jamais retransmise.

## Objets autorises

- `stage`: uniquement `{"stage":"HARNESS_*"}` avec une valeur appartenant a la liste fermee du harnais.
- `aggregate`: uniquement les compteurs, booleens, categories et enums deja publies par le harnais.
- `transport`: uniquement `logicalCallCount`, `physicalCallCount`, `retryBlocked`, `firstOutcome`, `firstHttpStatus`, `firstHttpStatusClass`.

## Rejets prouves hors ligne

- Ligne non JSON contenant un nom d'etape: rejetee.
- Tableau JSON racine: rejete.
- Objet `stage` avec propriete supplementaire: rejete.
- Objet `transport` avec propriete supplementaire: rejete.
- Objet `transport` valide mais dans un ordre non canonique: accepte puis reconstruit dans l'ordre autorise.

## Fichiers modifies

- `scripts/yootchat/runtime-live-watchdog.mjs`
- `scripts/yootchat/runtimeLiveHarness.test.ts`
- `docs/yootchat/watchdog-strict-json-lot5b-i2.md`

## Validations

- Tests cibles watchdog/harnais: 45/45 verts.
- Tests cibles harnais et transport: 55/55 verts.
- Suite complete Jest: 978 tests verts, 6 ignores.
- TypeScript cible: vert.
- ESLint cible: vert.
- `git diff --check`: conforme.
- Scans secrets/ecritures/RPC/reseau: conformes.
- Aucun LIVE execute.
- Aucun SELECT reel.
- Aucune lecture de `.env.local`.
- Aucune ecriture Supabase.
- Aucun RPC.
- Aucun OpenAI.
- Aucun deploiement.

## Limites

- Le Lot 5B-H n'est pas requalifie retrospectivement.
- La prochaine tentative live devra encore etre autorisee separement.

## Verdict

`YOOTCHAT_WATCHDOG_STRICT_JSON_READY`
