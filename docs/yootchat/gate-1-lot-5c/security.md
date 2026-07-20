# YootChat - Lot 5C rapport securite et confidentialite

## Absences confirmees

- Supabase live: 0.
- SELECT reel: 0.
- OpenAI: 0.
- Mapbox: 0.
- n8n: 0.
- API externe: 0.
- Deploiement: 0.
- Migration: 0.
- Lecture `.env`: 0.
- Donnees reelles: 0.

## Rejets prouves

- Champ personnel interdit: candidat rejete.
- Champ secret ou interne: candidat rejete.
- Identifiant invente: sortie refusee.
- Service invente: sortie refusee.
- Equipement invente: sortie refusee.
- Engagement officiel non prouve: sortie refusee.
- Preuve MEDIUM: jamais promue en certitude.
- Preuve FORBIDDEN: non publiable par le validateur.

## Watchdog

- JSON invalide: rejete.
- Tableau racine: rejete.
- JSON tronque: rejete.
- Bruit stdout/stderr: non retransmis.
- Reliquat stdout/stderr: parse puis reconstruit, jamais transmis brut.
