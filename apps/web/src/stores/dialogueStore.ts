import { create } from 'zustand';

type DialogueMode = 'plan' | 'ask' | 'auto';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DialogueState {
  mode: DialogueMode;
  messages: Message[];
  isProcessing: boolean;
  setMode: (mode: DialogueMode) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setProcessing: (processing: boolean) => void;
  clearMessages: () => void;
}

export const useDialogueStore = create<DialogueState>((set) => ({
  mode: 'ask',
  messages: [],
  isProcessing: false,
  setMode: (mode) => set({ mode }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
  setProcessing: (processing) => set({ isProcessing: processing }),
  clearMessages: () => set({ messages: [] }),
}));
