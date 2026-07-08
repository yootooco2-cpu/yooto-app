import type { ChatConversation, ChatMessage, ChatParticipant } from './types';

/** Identifiant de l'utilisateur courant (sera l'id Supabase auth plus tard). */
export const CURRENT_USER_ID = 'me';

/** Minutes → ISO relatif à maintenant (données « fraîches » à chaque lancement). */
const ago = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

export const MOCK_PARTICIPANTS: ChatParticipant[] = [
  { id: CURRENT_USER_ID, kind: 'particulier', name: 'Vous', avatarUrl: null },
  // Professionnels
  { id: 'pro_boulangerie', kind: 'professionnel', name: 'Boulangerie du Marché', distanceLabel: '400 m', merchantId: 'm_boulangerie' },
  { id: 'pro_ferme', kind: 'professionnel', name: 'La Ferme de Lucie', distanceLabel: '3,2 km', merchantId: 'm_ferme' },
  { id: 'pro_cafe', kind: 'professionnel', name: 'Café des Arceaux', distanceLabel: '650 m', merchantId: 'm_cafe' },
  { id: 'pro_ceramique', kind: 'professionnel', name: 'Atelier Terracotta', distanceLabel: '900 m', merchantId: 'm_ceramique' },
  { id: 'pro_cave', kind: 'professionnel', name: 'Cave des Cévennes', distanceLabel: '1,1 km', merchantId: 'm_cave' },
  // Particuliers
  { id: 'part_camille', kind: 'particulier', name: 'Camille R.', distanceLabel: '300 m' },
  { id: 'part_leo', kind: 'particulier', name: 'Léo M.', distanceLabel: '1,4 km' },
  { id: 'part_sofia', kind: 'particulier', name: 'Sofia B.', distanceLabel: '2,0 km' },
  { id: 'part_karim', kind: 'particulier', name: 'Karim T.', distanceLabel: '750 m' },
];

export const MOCK_CONVERSATIONS: ChatConversation[] = [
  { id: 'c1', title: 'Nouvel arrivage de pains au levain 🥖', authorId: 'pro_boulangerie', categoryId: 'producteurs', participantIds: [CURRENT_USER_ID, 'pro_boulangerie'], joined: true, unreadCount: 0, createdAt: ago(220), updatedAt: ago(8) },
  { id: 'c2', title: 'Une bonne adresse pour dîner ce soir ?', authorId: 'part_camille', categoryId: 'questions', participantIds: [CURRENT_USER_ID, 'part_camille', 'part_sofia'], joined: true, unreadCount: 2, createdAt: ago(180), updatedAt: ago(24) },
  { id: 'c3', title: 'Marché de producteurs samedi matin', authorId: 'pro_ferme', categoryId: 'evenements', participantIds: ['pro_ferme'], joined: false, unreadCount: 0, createdAt: ago(600), updatedAt: ago(95) },
  { id: 'c4', title: 'Recrutement serveur·se pour le week-end', authorId: 'pro_cafe', categoryId: 'emploi', participantIds: ['pro_cafe'], joined: false, unreadCount: 1, createdAt: ago(300), updatedAt: ago(140) },
  { id: 'c5', title: 'Atelier poterie découverte — 2 places', authorId: 'pro_ceramique', categoryId: 'artisanat', participantIds: ['pro_ceramique'], joined: false, unreadCount: 0, createdAt: ago(720), updatedAt: ago(300) },
  { id: 'c6', title: 'Bon plan paniers de légumes bio', authorId: 'part_leo', categoryId: 'bons-plans', participantIds: [CURRENT_USER_ID, 'part_leo'], joined: true, unreadCount: 0, createdAt: ago(500), updatedAt: ago(70) },
  { id: 'c7', title: 'Dégustation de vins nature vendredi', authorId: 'pro_cave', categoryId: 'evenements', participantIds: ['pro_cave'], joined: false, unreadCount: 3, createdAt: ago(430), updatedAt: ago(150) },
  { id: 'c8', title: 'Covoiturage vers Nîmes dimanche ?', authorId: 'part_karim', categoryId: 'mobilite', participantIds: ['part_karim'], joined: false, unreadCount: 0, createdAt: ago(260), updatedAt: ago(200) },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  // c1
  { id: 'c1_m1', conversationId: 'c1', senderId: 'pro_boulangerie', body: 'Bonjour à tous ! Fournée spéciale de pains au levain longue fermentation ce matin. 🥖', createdAt: ago(220) },
  { id: 'c1_m2', conversationId: 'c1', senderId: CURRENT_USER_ID, body: 'Super, vous en avez encore vers 12h ?', createdAt: ago(30) },
  { id: 'c1_m3', conversationId: 'c1', senderId: 'pro_boulangerie', body: 'Oui, je vous en mets un de côté 😉', createdAt: ago(8) },
  // c2
  { id: 'c2_m1', conversationId: 'c2', senderId: 'part_camille', body: 'On cherche un resto sympa pour 4 ce soir, plutôt centre-ville. Des idées ?', createdAt: ago(180) },
  { id: 'c2_m2', conversationId: 'c2', senderId: 'part_sofia', body: 'Le petit bistrot rue de l’Aiguillerie est top !', createdAt: ago(60) },
  { id: 'c2_m3', conversationId: 'c2', senderId: 'part_camille', body: 'Merci ! Quelqu’un a testé récemment ?', createdAt: ago(24) },
  // c3
  { id: 'c3_m1', conversationId: 'c3', senderId: 'pro_ferme', body: 'Marché de producteurs samedi 9h-13h, place de la mairie. Fruits, légumes, fromages et miel. 🍯', createdAt: ago(95) },
  // c4
  { id: 'c4_m1', conversationId: 'c4', senderId: 'pro_cafe', body: 'On recrute un·e serveur·se motivé·e pour les week-ends. Expérience appréciée, ambiance familiale ☕', createdAt: ago(140) },
  // c5
  { id: 'c5_m1', conversationId: 'c5', senderId: 'pro_ceramique', body: 'Atelier découverte tournage samedi 14h. Il reste 2 places, débutants bienvenus !', createdAt: ago(300) },
  // c6
  { id: 'c6_m1', conversationId: 'c6', senderId: 'part_leo', body: 'La ferme de Lucie fait des paniers à 12€ cette semaine, vraiment généreux.', createdAt: ago(500) },
  { id: 'c6_m2', conversationId: 'c6', senderId: CURRENT_USER_ID, body: 'Merci du tuyau, j’y file !', createdAt: ago(70) },
  // c7
  { id: 'c7_m1', conversationId: 'c7', senderId: 'pro_cave', body: 'Dégustation de vins nature vendredi 18h, entrée libre. On parle terroir et petites cuvées 🍷', createdAt: ago(150) },
  // c8
  { id: 'c8_m1', conversationId: 'c8', senderId: 'part_karim', body: 'Je vais à Nîmes dimanche matin, 2 places dispo si ça intéresse quelqu’un.', createdAt: ago(200) },
];
