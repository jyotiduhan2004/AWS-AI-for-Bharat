'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import ConversationList from '@/components/messaging/ConversationList';
import ChatWindow from '@/components/messaging/ChatWindow';
import PersonDetails from '@/components/messaging/PersonDetails';
import { Conversation } from '@/components/messaging/types';
import { getUserSession, getToken } from '@/lib/auth';
import { useDashboard } from '@/contexts/DashboardContext';

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const targetCreatorId = searchParams.get('creator_id');
  const targetName = searchParams.get('name');
  const targetAvatar = searchParams.get('avatar');
  const convParam = searchParams.get('conv');

  const { setPageTitle } = useDashboard();

  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    setPageTitle('Messages');
  }, [setPageTitle]);

  const makeCreatorStub = useCallback((id: string, name: string, avatar: string): Conversation => ({
    id: `new-${id}`,
    person: {
      id,
      name,
      subtitle: 'Creator',
      avatar: avatar || '',
      location: '',
      company: '',
      role: 'Creator',
      email: '',
      niche: '',
      followers: '',
      joined: '',
      bio: '',
    },
    messages: [],
    lastMessage: 'Start a conversation',
    lastMessageTime: '',
  }), []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', { headers: authHeaders() });
      if (!res.ok) return;
      let data: Conversation[] = await res.json();

      // Map API shape → Conversation type
      let list: Conversation[] = data.map((c: any) => ({
        ...c,
        messages: [],
        person: { ...c.person, subtitle: c.person.niche || c.person.role },
      }));

      // If opened via "Message" button, ensure that creator is first in list
      if (targetCreatorId) {
        const exists = list.some((c) => c.person.id === targetCreatorId || c.id === `new-${targetCreatorId}`);
        if (!exists) {
          list = [makeCreatorStub(targetCreatorId, targetName || 'Creator', targetAvatar || ''), ...list];
        }
      }

      setConversations(list);

      // Auto-select once
      setSelectedId((prev) => {
        if (prev) return prev; // already selected, keep it
        if (convParam) return convParam;
        if (targetCreatorId) {
          const match = list.find((c) => c.person.id === targetCreatorId || c.id === `new-${targetCreatorId}`);
          if (match) return match.id;
        }
        return list[0]?.id || '';
      });
    } catch (e) {
      console.error(e);
    }
  }, [targetCreatorId, targetName, convParam, makeCreatorStub]);

  const fetchMessages = useCallback(async (convId: string) => {
    if (!convId || convId.startsWith('new-')) return;
    try {
      const res = await fetch(`/api/messages/${convId}`, { headers: authHeaders() });
      if (!res.ok) return;
      const msgs = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, messages: msgs } : c))
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Bootstrap
  useEffect(() => {
    const session = getUserSession();
    if (session?.user_id) setUserId(session.user_id);
    else if (session?.creator_id) setUserId(session.creator_id);
    fetchConversations().then(() => setReady(true));
  }, [fetchConversations]);

  // Poll for new messages every 5 s when a real conversation is selected
  useEffect(() => {
    if (!selectedId || selectedId.startsWith('new-')) return;
    fetchMessages(selectedId);
    const interval = setInterval(() => fetchMessages(selectedId), 5000);
    return () => clearInterval(interval);
  }, [selectedId, fetchMessages]);

  const handleSendMessage = async (text: string) => {
    const conv = conversations.find((c) => c.id === selectedId);
    if (!conv) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text, target_id: conv.person.id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const msg = data.message;
      const realConvId: string = msg.conversation_id;

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== selectedId) return c;
          return {
            ...c,
            id: realConvId,           // swap stub id → real UUID
            messages: [...c.messages, msg],
            lastMessage: text,
            lastMessageTime: msg.timestamp,
          };
        })
      );
      // If it was a stub, update selectedId to the real UUID
      if (selectedId.startsWith('new-')) setSelectedId(realConvId);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelect={setSelectedId}
      />
      {selectedConversation ? (
        <>
          <ChatWindow
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            currentUserId={userId}
          />
          <PersonDetails person={selectedConversation.person} />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50 text-slate-400">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl mb-3 opacity-30 block">chat</span>
            <p className="text-sm">Select a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
