export { CHAT_CATEGORIES, type ChatCategory } from './categories';
export type {
  ChatParticipant,
  ChatParticipantKind,
  ChatMessage,
  ChatConversation,
  ChatConversationView,
} from './types';
export { CURRENT_USER_ID } from './mockData';
export { mockChatRepository, type ChatRepository } from './repository';
export { useChatStore, toConversationView, filterByTab, type ChatTab } from './store';
export { formatChatTime } from './time';
export { ChatCategoryBar } from './components/ChatCategoryBar';
export { ChatAvatar } from './components/ChatAvatar';
export { ChatSegmentedTabs } from './components/ChatSegmentedTabs';
export { ConversationCard } from './components/ConversationCard';
export { MessageBubble } from './components/MessageBubble';
