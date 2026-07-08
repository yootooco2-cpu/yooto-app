export { CHAT_CATEGORIES, chatCategoryById, type ChatCategory } from './categories';
export type {
  ChatParticipant,
  ChatParticipantKind,
  ChatMessage,
  ChatConversation,
  ChatConversationView,
  ChatVisibility,
  ActivityItem,
  ActivityKind,
} from './types';
export { CURRENT_USER_ID } from './mockData';
export { mockChatRepository, type ChatRepository } from './repository';
export {
  useChatStore,
  toConversationView,
  selectDiscussions,
  selectPrivateMessages,
  unreadPrivateCount,
  type ChatSpace,
} from './store';
export { formatChatTime } from './time';
export { ChatCategoryBar } from './components/ChatCategoryBar';
export { ChatSpaceSwitcher } from './components/ChatSpaceSwitcher';
export { ChatAvatar } from './components/ChatAvatar';
export { ActivityCard } from './components/ActivityCard';
export { ConversationCard } from './components/ConversationCard';
export { MessageBubble } from './components/MessageBubble';
