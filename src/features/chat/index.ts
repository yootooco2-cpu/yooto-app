export { CHAT_CATEGORIES, chatCategoryById, type ChatCategory } from './categories';
export { FOUNDING_QUESTION, CHAT_PRINCIPLES, CHAT_ROADMAP, type Principle } from './constitution';
export type {
  ChatParticipant,
  ChatParticipantKind,
  ChatBadge,
  ChatBadgeKind,
  ChatReputation,
  ChatGeo,
  GeoScope,
  ChatMessage,
  ChatConversation,
  ChatConversationView,
  ChatVisibility,
  ReactionEmoji,
  ReactionSummary,
  HelpfulKind,
  ActivityItem,
  ActivityKind,
  ActivitySource,
  ChatNotification,
  NotificationKind,
} from './types';
export { CURRENT_USER_ID } from './mockData';
export { mockChatRepository, type ChatRepository } from './repository';
export { aiProvider, noopAIProvider, type AIProvider } from './ai';
export { geoScope, actorKindLabel, isTerritoryActor, isTrusted, reputationScore } from './logic';
export {
  useChatStore,
  toConversationView,
  selectDiscussions,
  selectPrivateMessages,
  unreadPrivateCount,
  unreadNotifications,
  type ChatSpace,
} from './store';
export { formatChatTime } from './time';
export { ChatCategoryBar } from './components/ChatCategoryBar';
export { ChatSpaceSwitcher } from './components/ChatSpaceSwitcher';
export { ChatAvatar } from './components/ChatAvatar';
export { ActivityCard } from './components/ActivityCard';
export { ConversationCard } from './components/ConversationCard';
export { MessageBubble } from './components/MessageBubble';
