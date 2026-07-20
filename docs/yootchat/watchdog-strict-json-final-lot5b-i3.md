# YootChat - Lot 5B-I3 fermeture finale du validateur watchdog

Date: 2026-07-20

## Source et filiation

- Branche source: `fix/yootchat-watchdog-strict-json`
- Commit source: `ae240e1c80a9cf3938c959a52a1d17de8cfb2d7d`
- Branche de correction: `fix/yootchat-watchdog-strict-json-final`

## Objectif

Fermer les derniers interstices du validateur JSON du watchdog avant toute future tentative live.

## Bornes agrégat

- `requestCount`: entier `0..1`.
- `rowCount`: entier `0..5`.
- `acceptedCount`: entier `0..5` et jamais superieur a `rowCount`.
- `quarantinedCount`: entier `0..5` et jamais superieur a `rowCount`.
- Somme de `quarantineReasonCounts`: exactement egale a `quarantinedCount`.
- `recommendationCount`: entier `0..3`.
- `interfaceActionCount`: entier `0..3`, borne par le contrat metier.
- `readOk=true`: impose `readErrorCode=null`.
- `readOk=false`: impose un `readErrorCode` autorise et non nul.

## Bornes transport

- `physicalCallCount`: entier `0..1`.
- `logicalCallCount`: entier positif ou nul.
- `logicalCallCount >= physicalCallCount`.
- `retryBlocked=true`: seulement si `logicalCallCount > physicalCallCount`.
- `retryBlocked=false`: si `logicalCallCount = physicalCallCount`.
- `firstHttpStatus`: `null` ou entier `100..599`.
- Statut `0`: rejete.
- `HTTP_RESPONSE`: impose un statut HTTP non nul.
- Tout autre `firstOutcome`: impose un statut nul.
- `physicalCallCount=0`: impose `firstOutcome=NONE`.
- `physicalCallCount=1`: impose `firstOutcome` different de `NONE`.
- `firstHttpStatusClass`: strictement coherent avec le statut.

## Buffers

- `stdout` et `stderr` disposent chacun d'un forwarder separe.
- Chaque forwarder expose `push(chunk)` et `flush()`.
- A la fermeture, chaque reliquat est traite une seule fois.
- Les reliquats passent par le meme parseur et reconstructeur JSON.
- Aucun texte original du processus enfant n'est retransmis.

## Tests ajoutes

- `requestCount=2`: rejete.
- `rowCount=6`: rejete.
- `acceptedCount > rowCount`: rejete.
- Somme de quarantaines incoherente: rejetee.
- `recommendationCount=4`: rejete.
- `logicalCallCount < physicalCallCount`: rejete.
- `retryBlocked` incoherent: rejete.
- Statut `0`: rejete.
- `HTTP_RESPONSE` avec statut nul: rejete.
- `TYPE_ERROR` avec statut HTTP: rejete.
- Reliquat JSON valide sans retour a la ligne: traite a la fermeture.
- Reliquat invalide: rejete.
- Fragments `stdout`: reconstruits.
- Fragments `stderr`: reconstruits dans un buffer separe.

## Fichiers modifies

- `scripts/yootchat/runtime-live-watchdog.mjs`
- `scripts/yootchat/runtimeLiveHarness.test.ts`
- `docs/yootchat/watchdog-strict-json-final-lot5b-i3.md`

## Validations

- Tests watchdog et harnais: 59/59 verts.
- Tests cibles harnais et transport: 69/69 verts.
- Suite complete Jest: 992 tests verts, 6 ignores.
- TypeScript cible: vert.
- ESLint cible: vert.
- `git diff --check`: conforme.
- Scans secrets/ecritures/RPC/reseau: conformes.
- Processus residuel watchdog/harnais: aucun detecte.
- Aucun LIVE execute.
- Aucun appel reseau.
- Aucun SELECT reel.
- Aucune lecture de `.env.local`.
- Aucune ecriture Supabase.
- Aucun RPC.
- Aucun OpenAI.
- Aucun deploiement.

## Verdict

`YOOTCHAT_WATCHDOG_STRICT_JSON_FINAL_READY`
