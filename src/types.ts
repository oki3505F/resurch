export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface MarketingReport {
  id: string;
  type: 'trends' | 'competitor' | 'strategy' | 'content';
  title: string;
  data: any;
  createdAt: number;
}
