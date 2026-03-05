'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import AppNavbar from '@/components/AppNavbar';
import ConversationList from '@/components/messaging/ConversationList';
import ChatWindow from '@/components/messaging/ChatWindow';
import PersonDetails from '@/components/messaging/PersonDetails';
import {
  mockBrandConversations,
  mockCreatorConversations,
  CURRENT_USER_ID,
} from '@/components/messaging/mockData';
import { Conversation } from '@/components/messaging/types';
import { getUserRole } from '@/lib/auth';

function buildConversations(isBrand: boolean, creatorName: string | null, searchParams: URLSearchParams) {
  const baseConversations = isBrand
    ? mockBrandConversations
    : mockCreatorConversations;

  if (!creatorName) {
    return {
      conversations: baseConversations,
      selectedId: baseConversations[0]?.id || '',
    };
  }

  const existing = baseConversations.find(
    (c) => c.person.name.toLowerCase() === creatorName.toLowerCase()
  );

  if (existing) {
    return { conversations: baseConversations, selectedId: existing.id };
  }

  const newConv: Conversation = {
    id: `new-${Date.now()}`,
    person: {
      id: `p-new-${Date.now()}`,
      name: creatorName,
      subtitle: searchParams.get('niche') || (isBrand ? 'Creator' : 'Brand'),
      avatar: '',
      location: searchParams.get('city') || '',
      company: '',
      role: isBrand ? 'Content Creator' : 'Brand',
      email: '',
      niche: searchParams.get('niche') || '',
      followers: searchParams.get('followers') || '',
      joined: '',
      bio: '',
    },
    messages: [
      {
        id: `m-welcome-${Date.now()}`,
        senderId: CURRENT_USER_ID,
        text: `Hi ${creatorName}! I found your profile on ReachEzy and would love to connect!`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      },
    ],
    lastMessage: `Hi ${creatorName}! I found your profile on ReachEzy and would love to connect!`,
    lastMessageTime: 'Just now',
  };

  return {
    conversations: [newConv, ...baseConversations],
    selectedId: newConv.id,
  };
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const creatorName = searchParams.get('name');

  // Defer role check to avoid hydration mismatch (localStorage not available on server)
  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const role = getUserRole();
    const isBrand = role === 'brand';
    const result = buildConversations(isBrand, creatorName, searchParams);
    setConversations(result.conversations);
    setSelectedId(result.selectedId);
    setReady(true);
  }, [creatorName, searchParams]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  const handleSendMessage = (text: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== selectedId) return conv;
        return {
          ...conv,
          messages: [
            ...conv.messages,
            {
              id: `m-${Date.now()}`,
              senderId: CURRENT_USER_ID,
              text,
              timestamp,
            },
          ],
          lastMessage: text,
          lastMessageTime: timestamp,
        };
      })
    );
  };

  if (!ready || !selectedConversation) {
    return (
      <div className="flex h-screen flex-col">
        <AppNavbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <AppNavbar />
      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={setSelectedId}
        />
        <ChatWindow
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
        />
        <PersonDetails person={selectedConversation.person} />
      </div>
    </div>
  );
}
