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
  ChatMessageStatus,
  ChatConversation,
  ChatConversationView,
  ChatVisibility,
  ReactionEmoji,
  ReactionSummary,
  HelpfulKind,
  ActivityItem,
  ActivityKind,
  ActivitySource,
  ActivityComment,
  Trend,
  ChatNotification,
  NotificationKind,
} from './types';
export { CURRENT_USER_ID } from './mockData';
export { type ChatMerchant } from './merchantContent';
export { mockChatRepository, type ChatRepository } from './repository';
export { aiProvider, noopAIProvider, type AIProvider } from './ai';
export { REACTIONS, reactionLabel } from './reactions';
export { shareService, noopShareService, SHARE_TARGET_LABELS, type ShareTarget, type ShareService, type ShareRef } from './share';
export {
  geoScope,
  actorKindLabel,
  isTerritoryActor,
  isTrusted,
  reputationScore,
  walkMinutes,
  bikeMinutes,
  proximityHint,
  isLiveNow,
  isFresh,
  avatarUri,
  presence,
  type Presence,
} from './logic';
export {
  useChatStore,
  toConversationView,
  selectDiscussions,
  selectPrivateMessages,
  unreadPrivateCount,
  unreadNotifications,
  highlightActivity,
  type ChatSpace,
} from './store';
export { formatChatTime } from './time';
export { ChatCategoryBar } from './components/ChatCategoryBar';
export { ChatSpaceSwitcher } from './components/ChatSpaceSwitcher';
export { ChatAvatar } from './components/ChatAvatar';
export { ActivityCard } from './components/ActivityCard';
export { ChatCardSkeleton } from './components/ChatCardSkeleton';
export { ActivityActions } from './components/ActivityActions';
export { FollowPill } from './components/FollowPill';
export { TrendsStrip } from './components/TrendsStrip';
export { HighlightCard } from './components/HighlightCard';
export { ConversationCard } from './components/ConversationCard';
export { MessageBubble } from './components/MessageBubble';
