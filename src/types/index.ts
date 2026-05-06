export type Tab = 'translate' | 'summarize' | 'sentiment' | 'augmentation' | 'codeswitch' | 'video' | 'sign' | 'idioms' | 'docubridge' | 'transliterate' | 'dialect' | 'conversation';

export interface HistoryItem {
  id: string;
  type: Tab;
  input: string;
  output: any;
  timestamp: number;
}

export interface Message {
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  pronunciation?: string;
}
