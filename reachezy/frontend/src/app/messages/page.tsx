'use client';

import { useState, useMemo } from 'react';
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

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const creatorName = searchParams.get('name');
  const role = getUserRole();
  const isBrand = role === 'brand';

  // Brand sees creator conversations; creator sees brand conversations
  const baseConversations = isBrand
    ? mockBrandConversations
    : mockCreatorConversations;

  // If a name is passed via query param (brand clicking "Message" on a creator card),
  // find or create a conversation for them
  const { initialConversations, initialSelectedId } = useMemo(() => {
    if (!creatorName) {
      return {
        initialConversations: baseConversations,
        initialSelectedId: baseConversations[0]?.id || '',
      };
    }

    // Check if a conversation already exists for this person
    const existing = baseConversations.find(
      (c) => c.person.name.toLowerCase() === creatorName.toLowerCase()
    );

    if (existing) {
      return { initialConversations: baseConversations, initialSelectedId: existing.id };
    }

    // Create a new conversation
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
      initialConversations: [newConv, ...baseConversations],
      initialSelectedId: newConv.id,
    };
  }, [creatorName, searchParams, baseConversations, isBrand]);

  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedConversation = conversations.find((c) => c.id === selectedId)!;

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
