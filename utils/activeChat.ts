let activeConversationId: string | null = null;

export function setActiveConversationId(conversationId: string | null) {
  activeConversationId = conversationId;
}

export function getActiveConversationId() {
  return activeConversationId;
}

export function shouldSuppressChatNotification(conversationId?: string | null) {
  if (!conversationId || !activeConversationId) return false;
  return conversationId === activeConversationId;
}
