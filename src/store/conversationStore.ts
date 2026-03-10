/**
 * Global conversation store for maintaining chat history across tab navigation
 * This ensures conversation context persists when users switch between AI Tutor, Chat, Voice, etc.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  isQuiz?: boolean;
  isAudioPlaying?: boolean;
}

interface ConversationState {
  messages: Message[];
  lastExplanationTopic: string;
  listeners: Set<() => void>;
}

class ConversationStore {
  private state: ConversationState = {
    messages: [
      {
        role: 'assistant',
        text: "Hi! I'm your AI tutor. Ask me any concept or doubt you have, either by typing or speaking. I'm here to help you understand!",
        timestamp: Date.now(),
      },
    ],
    lastExplanationTopic: '',
    listeners: new Set(),
  };

  // Get current messages
  getMessages(): Message[] {
    return this.state.messages;
  }

  // Set messages (replace entire history)
  setMessages(messages: Message[]): void {
    this.state.messages = messages;
    this.notifyListeners();
  }

  // Add a single message
  addMessage(message: Message): void {
    this.state.messages.push(message);
    this.notifyListeners();
  }

  // Update a message at specific index
  updateMessage(index: number, message: Message): void {
    if (index >= 0 && index < this.state.messages.length) {
      this.state.messages[index] = message;
      this.notifyListeners();
    }
  }

  // Get last explanation topic
  getLastTopic(): string {
    return this.state.lastExplanationTopic;
  }

  // Set last explanation topic
  setLastTopic(topic: string): void {
    this.state.lastExplanationTopic = topic;
    this.notifyListeners();
  }

  // Clear conversation
  clearConversation(): void {
    this.state.messages = [
      {
        role: 'assistant',
        text: "Hi! I'm your AI tutor. Ask me any concept or doubt you have, either by typing or speaking. I'm here to help you understand!",
        timestamp: Date.now(),
      },
    ];
    this.state.lastExplanationTopic = '';
    this.notifyListeners();
  }

  // Subscribe to changes
  subscribe(listener: () => void): () => void {
    this.state.listeners.add(listener);
    return () => {
      this.state.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.state.listeners.forEach((listener) => listener());
  }

  // Get conversation history for LLM context (last N messages)
  getConversationHistory(maxMessages: number = 10): Array<{ role: string; content: string }> {
    return this.state.messages
      .slice(-maxMessages)
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.text,
      }));
  }
}

// Export singleton instance
export const conversationStore = new ConversationStore();
