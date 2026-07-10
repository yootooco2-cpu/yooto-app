import { geoScope } from './logic';
import type { ActivityComment, ActivityItem, ChatConversation, ChatMessage, ChatNotification, ChatParticipant, Trend } from './types';

/** Identifiant de l'utilisateur courant (sera l'id Supabase auth plus tard). */
export const CURRENT_USER_ID = 'me';

/** Minutes → ISO relatif (passé). */
const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();
/** Minutes → ISO relatif (futur). */
const soon = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
/** Géo prête à l'emploi à partir d'une distance. */
const geo = (km: number, neighborhood?: string) => ({ distanceKm: km, distanceLabel: km < 1 ? `${Math.round(km * 1000)} m` : `${km.toString().replace('.', ',')} km`, neighborhood, scope: geoScope(km) });

/**
 * Photos de démonstration (Unsplash CDN, vérifiées 200) — pendant les phases de démo, elles
 * incarnent les « vraies » images des commerces (façade / image principale). En production, elles
 * proviendront de la base via la fiche commerçant (`getMerchantCoverPhoto`).
 */
const PH = {
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&q=80',
  veggies: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop&q=80',
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&h=200&fit=crop&q=80',
  pottery: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=200&h=200&fit=crop&q=80',
  wine: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&h=200&fit=crop&q=80',
  bike: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=200&h=200&fit=crop&q=80',
  woman: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces&q=80',
  man: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces&q=80',
};

export const MOCK_PARTICIPANTS: ChatParticipant[] = [
  { id: CURRENT_USER_ID, kind: 'particulier', name: 'Vous', avatarUrl: null, neighborhood: 'Écusson' },
  // Professionnels & producteurs (comptes vérifiés + vraies photos = crédibilité, présence réaliste).
  // Pas de `merchantId` figé ici : le vrai identifiant de fiche est injecté par `hydrateFromMerchants`
  // depuis les commerces réels. Sans hydratation → aucun lien mort (le bloc commerçant reste inerte).
  { id: 'pro_boulangerie', kind: 'professionnel', name: 'Boulangerie du Marché', coverUrl: PH.bread, verified: true, online: true, neighborhood: 'Écusson', distanceLabel: '400 m', geo: geo(0.4, 'Écusson'), badges: [{ kind: 'verified_pro', label: 'Commerçant vérifié' }], reputation: { helpfulScore: 42, acceptedAnswers: 3, confirmedRecos: 6 } },
  { id: 'pro_ferme', kind: 'producteur', name: 'La Ferme de Lucie', coverUrl: PH.veggies, verified: true, lastActiveAt: ago(8), distanceLabel: '3,2 km', geo: geo(3.2), badges: [{ kind: 'producteur_local', label: 'Producteur local' }], reputation: { helpfulScore: 55, acceptedAnswers: 2, confirmedRecos: 11 } },
  { id: 'pro_cafe', kind: 'professionnel', name: 'Café des Arceaux', coverUrl: PH.cafe, verified: true, online: true, distanceLabel: '650 m', geo: geo(0.65), badges: [{ kind: 'verified_pro', label: 'Commerçant vérifié' }], reputation: { helpfulScore: 30, acceptedAnswers: 1, confirmedRecos: 4 } },
  { id: 'pro_ceramique', kind: 'professionnel', name: 'Atelier Terracotta', coverUrl: PH.pottery, verified: false, lastActiveAt: ago(18), distanceLabel: '900 m', geo: geo(0.9), badges: [] },
  { id: 'pro_cave', kind: 'professionnel', name: 'Cave des Cévennes', coverUrl: PH.wine, verified: true, lastActiveAt: ago(190), distanceLabel: '1,1 km', geo: geo(1.1), badges: [{ kind: 'verified_pro', label: 'Commerçant vérifié' }] },
  { id: 'assoc_velo', kind: 'association', name: 'Vélo-Cité Montpellier', coverUrl: PH.bike, verified: true, lastActiveAt: ago(45), distanceLabel: '1,3 km', geo: geo(1.3), badges: [{ kind: 'association', label: 'Association locale' }] },
  // Particuliers (réputation = utilité, jamais popularité)
  { id: 'part_camille', kind: 'particulier', name: 'Camille R.', avatarUrl: PH.woman, online: true, distanceLabel: '300 m', geo: geo(0.3, 'Écusson'), badges: [{ kind: 'bon_conseiller', label: 'Bon conseiller' }], reputation: { helpfulScore: 64, acceptedAnswers: 9, confirmedRecos: 7 } },
  { id: 'part_leo', kind: 'particulier', name: 'Léo M.', distanceLabel: '1,4 km', geo: geo(1.4) },
  { id: 'part_sofia', kind: 'particulier', name: 'Sofia B.', distanceLabel: '2,0 km', geo: geo(2.0), badges: [{ kind: 'ambassadeur_quartier', label: 'Ambassadrice de quartier' }], reputation: { helpfulScore: 51, acceptedAnswers: 4, confirmedRecos: 9 } },
  { id: 'part_karim', kind: 'particulier', name: 'Karim T.', avatarUrl: PH.man, distanceLabel: '750 m', geo: geo(0.75) },
];

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  { id: 'c1', title: 'Nouvel arrivage de pains au levain 🥖', visibility: 'public', authorId: 'pro_boulangerie', categoryId: 'producteurs', participantIds: [CURRENT_USER_ID, 'pro_boulangerie'], joined: true, unreadCount: 0, createdAt: ago(220), updatedAt: ago(8), geo: geo(0.4, 'Écusson') },
  { id: 'c2', title: 'Une bonne adresse pour dîner ce soir ?', visibility: 'public', authorId: 'part_camille', categoryId: 'restaurants', participantIds: [CURRENT_USER_ID, 'part_camille', 'part_sofia'], joined: true, unreadCount: 2, createdAt: ago(180), updatedAt: ago(24), resolved: false, geo: geo(0.3, 'Écusson') },
  { id: 'c3', title: 'Marché de producteurs samedi matin', visibility: 'public', authorId: 'pro_ferme', categoryId: 'evenements', participantIds: ['pro_ferme'], joined: false, unreadCount: 0, createdAt: ago(600), updatedAt: ago(95), geo: geo(3.2) },
  { id: 'c4', title: 'Recrutement serveur·se pour le week-end', visibility: 'public', authorId: 'pro_cafe', categoryId: 'emploi', participantIds: ['pro_cafe'], joined: false, unreadCount: 1, createdAt: ago(300), updatedAt: ago(140), geo: geo(0.65) },
  { id: 'c5', title: 'Atelier poterie découverte — 2 places', visibility: 'public', authorId: 'pro_ceramique', categoryId: 'artisanat', participantIds: ['pro_ceramique'], joined: false, unreadCount: 0, createdAt: ago(720), updatedAt: ago(300), geo: geo(0.9) },
  { id: 'c6', title: 'Bon plan paniers de légumes bio', visibility: 'public', authorId: 'part_leo', categoryId: 'bons-plans', participantIds: [CURRENT_USER_ID, 'part_leo'], joined: true, unreadCount: 0, createdAt: ago(500), updatedAt: ago(70), geo: geo(1.4) },
  { id: 'c7', title: 'Covoiturage vers Nîmes dimanche ?', visibility: 'public', authorId: 'part_karim', categoryId: 'mobilite', participantIds: ['part_karim'], joined: false, unreadCount: 0, createdAt: ago(260), updatedAt: ago(200), geo: geo(0.75) },
  { id: 'c8', title: 'Sortie rando familiale au Pic Saint-Loup', visibility: 'public', authorId: 'part_sofia', categoryId: 'nature', participantIds: ['part_sofia'], joined: false, unreadCount: 0, createdAt: ago(340), updatedAt: ago(210), geo: geo(2.0) },
  // Messages privés
  { id: 'dm1', title: 'Boulangerie du Marché', visibility: 'private', authorId: 'pro_boulangerie', participantIds: [CURRENT_USER_ID, 'pro_boulangerie'], joined: true, unreadCount: 1, createdAt: ago(120), updatedAt: ago(12) },
  { id: 'dm2', title: 'Camille R.', visibility: 'private', authorId: 'part_camille', participantIds: [CURRENT_USER_ID, 'part_camille'], joined: true, unreadCount: 0, createdAt: ago(400), updatedAt: ago(180) },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'c1_m1', conversationId: 'c1', senderId: 'pro_boulangerie', body: 'Bonjour à tous ! Fournée spéciale de pains au levain longue fermentation ce matin. 🥖', createdAt: ago(220) },
  { id: 'c1_m2', conversationId: 'c1', senderId: CURRENT_USER_ID, body: 'Super, vous en avez encore vers 12h ?', createdAt: ago(30) },
  { id: 'c1_m3', conversationId: 'c1', senderId: 'pro_boulangerie', body: 'Oui, je vous en mets un de côté 😉', createdAt: ago(8) },
  { id: 'c2_m1', conversationId: 'c2', senderId: 'part_camille', body: 'On cherche un resto sympa pour 4 ce soir, plutôt centre-ville. Des idées ?', createdAt: ago(180) },
  { id: 'c2_m2', conversationId: 'c2', senderId: 'part_sofia', body: 'Le petit bistrot rue de l’Aiguillerie est top !', createdAt: ago(60) },
  { id: 'c2_m3', conversationId: 'c2', senderId: 'part_camille', body: 'Merci ! Quelqu’un a testé récemment ?', createdAt: ago(24) },
  { id: 'c3_m1', conversationId: 'c3', senderId: 'pro_ferme', body: 'Marché de producteurs samedi 9h-13h, place de la mairie. Fruits, légumes, fromages et miel. 🍯', createdAt: ago(95) },
  { id: 'c4_m1', conversationId: 'c4', senderId: 'pro_cafe', body: 'On recrute un·e serveur·se motivé·e pour les week-ends. Expérience appréciée, ambiance familiale ☕', createdAt: ago(140) },
  { id: 'c5_m1', conversationId: 'c5', senderId: 'pro_ceramique', body: 'Atelier découverte tournage samedi 14h. Il reste 2 places, débutants bienvenus !', createdAt: ago(300) },
  { id: 'c6_m1', conversationId: 'c6', senderId: 'part_leo', body: 'La ferme de Lucie fait des paniers à 12€ cette semaine, vraiment généreux.', createdAt: ago(500) },
  { id: 'c6_m2', conversationId: 'c6', senderId: CURRENT_USER_ID, body: 'Merci du tuyau, j’y file !', createdAt: ago(70) },
  { id: 'c7_m1', conversationId: 'c7', senderId: 'part_karim', body: 'Je vais à Nîmes dimanche matin, 2 places dispo si ça intéresse quelqu’un.', createdAt: ago(200) },
  { id: 'c8_m1', conversationId: 'c8', senderId: 'part_sofia', body: 'Petite rando tranquille dimanche au Pic Saint-Loup, ouverte aux familles 🥾', createdAt: ago(210) },
  { id: 'dm1_m1', conversationId: 'dm1', senderId: CURRENT_USER_ID, body: 'Bonjour, pourriez-vous me réserver 2 pains au levain pour demain ?', createdAt: ago(120) },
  { id: 'dm1_m2', conversationId: 'dm1', senderId: 'pro_boulangerie', body: 'Bien sûr ! C’est noté pour demain 8h30. À demain 🙂', createdAt: ago(12) },
  { id: 'dm2_m1', conversationId: 'dm2', senderId: 'part_camille', body: 'Coucou ! On se retrouve au marché samedi ?', createdAt: ago(420) },
  { id: 'dm2_m2', conversationId: 'dm2', senderId: CURRENT_USER_ID, body: 'Avec plaisir, 10h devant le kiosque ?', createdAt: ago(180) },
];

/**
 * Fil d'ACTIVITÉ — le fil raconte la VIE DU TERRITOIRE : publications de membres (`member`) ET
 * événements du territoire (`territory`) qui arrivent maintenant (un marché commence, un atelier
 * ouvre, un concert dans 2h, une fermeture exceptionnelle, un établissement rejoint YOOTOO…).
 */
export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: 'a1', photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&h=600&fit=crop&q=80', kind: 'arrivage', source: 'member', emoji: '🥖', authorId: 'pro_boulangerie', title: 'Les baguettes tradition sortent du four', body: 'Fournée de midi prête, encore tièdes.', categoryId: 'producteurs', place: 'à 400 m', geo: geo(0.4, 'Écusson'), createdAt: ago(4), reactions: [{ emoji: '👍', count: 14 }, { emoji: '🌱', count: 5 }] },
  { id: 'a2', kind: 'ouverture', source: 'territory', emoji: '🎨', authorId: 'pro_ceramique', title: 'L’atelier Terracotta ouvre ses portes ce matin', body: 'Démonstration de tournage jusqu’à midi.', categoryId: 'artisanat', place: 'à 900 m', geo: geo(0.9), createdAt: ago(18), reactions: [{ emoji: '❤️', count: 8 }] },
  { id: 'a3', kind: 'marche', source: 'territory', emoji: '🧺', authorId: 'pro_ferme', title: 'Le marché de producteurs vient de commencer', body: 'Place de la mairie jusqu’à 13h — fraises, fromages, miel.', categoryId: 'evenements', place: 'à 3,2 km', geo: geo(3.2), createdAt: ago(35), startsAt: ago(35), endsAt: soon(240), reactions: [{ emoji: '👏', count: 11 }] },
  { id: 'a4', kind: 'offre', source: 'member', emoji: '🎁', authorId: 'pro_cafe', title: 'Offre du jour : -20% sur les pâtisseries après 18h', categoryId: 'bons-plans', place: 'à 650 m', geo: geo(0.65), createdAt: ago(52), reactions: [{ emoji: '👍', count: 22 }, { emoji: '❤️', count: 6 }] },
  { id: 'a5', photoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&h=600&fit=crop&q=80', kind: 'recolte', source: 'territory', emoji: '🍓', authorId: 'pro_ferme', title: 'Les premières fraises sont récoltées', body: 'Gariguettes cueillies ce matin, en quantité limitée.', categoryId: 'producteurs', place: 'à 3,2 km', geo: geo(3.2), createdAt: ago(70), reactions: [{ emoji: '❤️', count: 17 }] },
  { id: 'a6', photoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&h=600&fit=crop&q=80', kind: 'concert', source: 'territory', emoji: '🎵', authorId: 'pro_cafe', title: 'Concert live dans 2 heures', body: 'Trio jazz manouche à 20h, entrée libre.', categoryId: 'culture', place: 'à 650 m', geo: geo(0.65), createdAt: ago(85), startsAt: soon(120), reactions: [{ emoji: '❤️', count: 9 }] },
  { id: 'a7', kind: 'benevolat', source: 'member', emoji: '🤝', authorId: 'assoc_velo', title: 'Vélo-Cité cherche 3 bénévoles pour dimanche', body: 'Atelier de réparation participatif, aucune compétence requise.', categoryId: 'entraide', place: 'à 1,3 km', geo: geo(1.3), createdAt: ago(110) },
  { id: 'a8', kind: 'fermeture', source: 'territory', emoji: '🔒', authorId: 'pro_boulangerie', title: 'Fermeture exceptionnelle cet après-midi', body: 'Réouverture demain 7h. Merci de votre compréhension !', categoryId: 'vie-locale', place: 'à 400 m', geo: geo(0.4, 'Écusson'), createdAt: ago(140) },
  { id: 'a9', kind: 'nouveau_pro', source: 'territory', emoji: '✨', authorId: 'pro_cave', title: 'La Cave des Cévennes rejoint YOOTOO', body: 'Vins nature et cuvées de vignerons du coin.', categoryId: 'vie-locale', place: 'à 1,1 km', geo: geo(1.1), createdAt: ago(200), reactions: [{ emoji: '❤️', count: 6 }] },
];

export const MOCK_NOTIFICATIONS: ChatNotification[] = [
  { id: 'n1', kind: 'reply', actorId: 'part_camille', title: 'Camille R. a répondu à votre discussion', body: '« Une bonne adresse pour dîner ce soir ? »', ref: { type: 'conversation', id: 'c2' }, createdAt: ago(24), read: false },
  { id: 'n2', kind: 'reaction', actorId: 'part_leo', title: 'Léo M. et 11 autres ont réagi à votre publication', ref: { type: 'activity', id: 'a1' }, createdAt: ago(40), read: false },
  { id: 'n3', kind: 'reco', actorId: 'part_sofia', title: 'Un voisin a recommandé la Boulangerie du Marché', ref: { type: 'activity', id: 'a1' }, createdAt: ago(90), read: false },
  { id: 'n4', kind: 'event_reminder', title: 'Concert live ce soir — vous êtes intéressé·e', ref: { type: 'activity', id: 'a6' }, createdAt: ago(120), read: true },
  { id: 'n5', kind: 'follow', actorId: 'part_karim', title: 'Karim T. vous suit désormais', createdAt: ago(300), read: true },
];

/** Réponses aux cartes d'activité — repliées par défaut (« Voir N réponses »). */
export const MOCK_COMMENTS: ActivityComment[] = [
  { id: 'cm1', activityId: 'a1', authorId: 'part_camille', body: 'Vos pains sont les meilleurs du quartier 🙌', createdAt: ago(20) },
  { id: 'cm2', activityId: 'a1', authorId: 'part_leo', body: 'J’arrive dans 10 min !', createdAt: ago(6) },
  { id: 'cm3', activityId: 'a3', authorId: 'part_karim', body: 'Il reste des fraises à cette heure-ci ?', createdAt: ago(15) },
  { id: 'cm4', activityId: 'a4', authorId: 'part_sofia', body: 'Parfait pour le goûter, merci du partage !', createdAt: ago(30) },
  { id: 'cm5', activityId: 'a6', authorId: 'part_camille', body: 'On y sera, hâte !', createdAt: ago(40) },
];

/** Bloc « Tendance près de chez vous » — compact, donne le pouls du territoire. */
export const MOCK_TRENDS: Trend[] = [
  { id: 't1', emoji: '🔥', label: '18 commerces participent au marché aujourd’hui' },
  { id: 't2', emoji: '🥖', label: '12 boulangeries publient leurs fournées' },
  { id: 't3', emoji: '🍷', label: '4 dégustations commencent ce soir' },
  { id: 't4', emoji: '🎵', label: '6 événements dans un rayon de 5 km' },
  { id: 't5', emoji: '🌱', label: '8 producteurs sont présents aujourd’hui' },
];
