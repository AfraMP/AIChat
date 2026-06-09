export type MessageRole = 'user' | 'assistant' | 'system';

export type ModelId = 'llama-3.3-70b-versatile';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: boolean;
}

export interface ModelOption {
  id: ModelId;
  label: string;
  description?: string;
  contextWindow?: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'llama-3.3-70b-versatile'
  }
]

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  selectedModel: ModelId;
  error: string | null;
}

export interface ChatApiRequest {
  messages: Pick<ChatMessage, 'role' | 'content'>[];
  model: ModelId;
}
