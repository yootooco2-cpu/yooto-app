export const YOOTCHAT_TOPICS = [
  'DISCOVER_LOCAL',
  'COMPARE_OPTIONS',
  'MERCHANT_DETAILS',
  'ACCESSIBILITY',
  'ROUTE_AND_MOBILITY',
  'CLARIFICATION',
  'NO_RESULT',
  'OUT_OF_SCOPE',
] as const;

export type YootChatTopic = (typeof YOOTCHAT_TOPICS)[number];

export const isYootChatTopic = (value: unknown): value is YootChatTopic =>
  typeof value === 'string' && (YOOTCHAT_TOPICS as readonly string[]).includes(value);
