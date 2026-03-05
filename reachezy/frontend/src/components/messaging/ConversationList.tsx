import { Conversation } from './types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (id: string) => void;
}

function AvatarFallback({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initial = (name || 'U')[0].toUpperCase();
  if (src) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-white border border-slate-200 overflow-hidden flex-shrink-0 ${className || ''}`}>
        <img src={src} alt={name} className="h-full w-full object-contain p-0.5" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-white font-bold flex-shrink-0 ${className || ''}`}
    >
      {initial}
    </div>
  );
}

export default function ConversationList({
  conversations,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelect,
}: ConversationListProps) {
  const filtered = conversations.filter((c) =>
    c.person.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex w-80 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-4">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Messages</h2>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-400">
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                  isSelected
                    ? 'bg-primary/5 border-r-2 border-primary'
                    : ''
                }`}
              >
                <AvatarFallback name={conv.person.name} src={conv.person.avatar} className="size-10 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {conv.person.name}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {conv.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{conv.person.subtitle}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{conv.lastMessage}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
