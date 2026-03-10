import { useEffect, useState, useSyncExternalStore } from 'react';
import { conversationStore, type Message } from '../store/conversationStore';

/**
 * Hook to access global conversation state
 * This hook ensures components re-render when conversation state changes
 */
export function useConversationStore() {
  const messages = useSyncExternalStore(
    (callback) => conversationStore.subscribe(callback),
    () => conversationStore.getMessages(),
    () => conversationStore.getMessages()
  );

  const lastTopic = useSyncExternalStore(
    (callback) => conversationStore.subscribe(callback),
    () => conversationStore.getLastTopic(),
    () => conversationStore.getLastTopic()
  );

  return {
    messages,
    lastTopic,
    addMessage: (message: Message) => conversationStore.addMessage(message),
    updateMessage: (index: number, message: Message) => conversationStore.updateMessage(index, message),
    setMessages: (messages: Message[]) => conversationStore.setMessages(messages),
    setLastTopic: (topic: string) => conversationStore.setLastTopic(topic),
    clearConversation: () => conversationStore.clearConversation(),
    getConversationHistory: (maxMessages?: number) => conversationStore.getConversationHistory(maxMessages),
  };
}
