export interface Person {
  id: string;
  name: string;
  username?: string;
  subtitle: string;
  avatar: string;
  location: string;
  company: string;
  role: string;
  email: string;
  niche: string;
  followers: string;
  joined: string;
  bio: string;
  website?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  person: Person;
  messages: Message[];
  lastMessage: string;
  lastMessageTime: string;
}
