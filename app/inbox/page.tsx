'use client';

import { useEffect, useMemo, useState } from 'react';
import { Paperclip, MoreVertical } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import type { ConversationSummary, MessageRow, ConversationOption } from '@/types/messaging';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString();
}

export default function InboxPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const consultantName = searchParams.get('consultantName');

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [options, setOptions] = useState<ConversationOption[]>([]);
  const [selectedProjectForNew, setSelectedProjectForNew] = useState<string>('');
  const [selectedContactForNew, setSelectedContactForNew] = useState<string>('');
  const [extraParticipantsInput, setExtraParticipantsInput] = useState('');
  const [showExtraParticipants, setShowExtraParticipants] = useState(false);

  const selectedConv = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((c) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const selectedProjectContacts = useMemo(
    () => options.find((option) => option.projectId === selectedProjectForNew)?.contacts ?? [],
    [options, selectedProjectForNew]
  );

  const draftParticipants = useMemo(() => {
    const parsed = extraParticipantsInput
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    return Array.from(new Set([selectedContactForNew, ...parsed].filter(Boolean)));
  }, [selectedContactForNew, extraParticipantsInput]);

  const getConversationLabel = (conversation: ConversationSummary): string => {
    const participants = conversation.participant_names?.filter(Boolean) ?? [];
    if (participants.length === 0) return conversation.consultant_name;
    if (participants.length === 1) return participants[0];
    return `${participants[0]} +${participants.length - 1}`;
  };

  useEffect(() => {
    async function loadOptions() {
      if (authLoading || !user) return;
      try {
        const res = await fetch('/api/conversations/options');
        if (!res.ok) throw new Error('Failed to load options');
        const data = await res.json();
        const loaded: ConversationOption[] = data.options ?? [];
        setOptions(loaded);
      } catch (e) {
        console.error(e);
      }
    }

    loadOptions();
  }, [authLoading, user]);

  useEffect(() => {
    async function loadConversations() {
      if (authLoading || !user) return;

      setError(null);
      setLoadingConversations(true);

      try {
        const qs = new URLSearchParams();
        if (projectId) qs.set('projectId', projectId);

        const res = await fetch(`/api/conversations?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to load conversations');

        const data = await res.json();
        let list: ConversationSummary[] = data.conversations ?? [];

        // If we arrived here from a project context and there is no thread yet,
        // create the conversation so the user can immediately send a message.
        if (list.length === 0 && projectId && consultantName) {
          const createRes = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, consultantName }),
          });

          if (createRes.ok) {
            const createdData = await createRes.json();
            const created: ConversationSummary | null = createdData.conversation ?? null;
            if (created) list = [created];
          }
        }

        setConversations(list);
        setSelectedConversationId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch (e) {
        console.error(e);
        setError('Unable to load inbox conversations.');
      } finally {
        setLoadingConversations(false);
      }
    }

    loadConversations();
  }, [authLoading, user, projectId, consultantName]);

  useEffect(() => {
    setExtraParticipantsInput('');
    setShowExtraParticipants(false);
    if (!selectedProjectForNew) {
      setSelectedContactForNew('');
      return;
    }

    const project = options.find((option) => option.projectId === selectedProjectForNew);
    if (!project || project.contacts.length === 0) {
      setSelectedContactForNew('');
      return;
    }

    setSelectedContactForNew(project.contacts[0].name);
  }, [selectedProjectForNew, options]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedConversationId || authLoading || !user) return;

      setError(null);
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/conversations/${selectedConversationId}/messages`);
        if (!res.ok) throw new Error('Failed to load messages');

        const data = await res.json();
        const list: MessageRow[] = data.messages ?? [];
        setMessages(list);
      } catch (e) {
        console.error(e);
        setError('Unable to load messages for this conversation.');
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConversationId, authLoading, user]);

  const sendMessage = async (content: string) => {
    if (authLoading || !user) return;
    if (!selectedConversationId) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    setError(null);
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      const data = await res.json();
      const created: MessageRow | null = data.message ?? null;
      if (created) setMessages((prev) => [...prev, created]);
    } catch (e) {
      console.error(e);
      setError('Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    const content = messageInput;
    setMessageInput('');
    await sendMessage(content);
  };

  const handleCreateConversation = async () => {
    if (!selectedProjectForNew || !selectedContactForNew) return;

    setCreatingConversation(true);
    setError(null);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectForNew,
          consultantName: selectedContactForNew,
          participantNames: draftParticipants,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create conversation');
      }

      const created: ConversationSummary | null = data?.conversation ?? null;
      if (created) {
        setConversations((prev) => {
          const without = prev.filter((conversation) => conversation.id !== created.id);
          return [created, ...without];
        });
        setSelectedConversationId(created.id);
        setExtraParticipantsInput('');
      }
    } catch (e) {
      console.error(e);
      setError('Unable to start a new conversation.');
    } finally {
      setCreatingConversation(false);
    }
  };

  return (
    <div className="fixed inset-0 left-64 top-16 bg-gray-50">
      <div className="h-full flex">
        {/* Left sidebar - Conversations list */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Start a conversation</p>
              <p className="mt-1 text-xs text-gray-600">Choose a project and person to message.</p>

              <label className="mt-4 mb-1 block text-xs font-medium text-gray-700">Project</label>
              <select
                value={selectedProjectForNew}
                onChange={(e) => setSelectedProjectForNew(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="">Select project</option>
                {options.map((option) => (
                  <option key={option.projectId} value={option.projectId}>
                    {option.projectName}
                  </option>
                ))}
              </select>

              <label className="mt-3 mb-1 block text-xs font-medium text-gray-700">Contact</label>
              <select
                value={selectedContactForNew}
                onChange={(e) => setSelectedContactForNew(e.target.value)}
                disabled={!selectedProjectForNew}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-60"
              >
                <option value="">Select contact</option>
                {selectedProjectContacts.map((contact) => (
                  <option key={`${selectedProjectForNew}:${contact.name}`} value={contact.name}>
                    {contact.name}
                  </option>
                ))}
              </select>

              {selectedProjectForNew && (
                <button
                  type="button"
                  onClick={() => setShowExtraParticipants((value) => !value)}
                  className="mt-3 text-xs font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
                >
                  {showExtraParticipants ? 'Hide extra participants' : 'Add extra participants (optional)'}
                </button>
              )}

              {showExtraParticipants && (
                <input
                  value={extraParticipantsInput}
                  onChange={(e) => setExtraParticipantsInput(e.target.value)}
                  placeholder="Comma-separated names"
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white py-2.5 px-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              )}

              <button
                onClick={() => void handleCreateConversation()}
                disabled={!selectedProjectForNew || !selectedContactForNew || creatingConversation}
                className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
              >
                {creatingConversation ? 'Starting…' : 'New message'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="p-4 text-sm text-red-700 border-b border-red-100 bg-red-50">
                {error}
              </div>
            )}

            {loadingConversations ? (
              <div className="p-6 text-sm text-gray-500">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full p-4 border-b border-gray-100 text-left transition-colors hover:bg-gray-50 ${
                    selectedConversationId === conversation.id ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#bfe937]">
                      <span className="text-sm font-semibold text-gray-900">
                        {conversation.consultant_initials}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {conversation.project_name ?? 'Project'}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTimestamp(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{getConversationLabel(conversation)}</p>
                      <p className="text-sm truncate text-gray-700">
                        {conversation.last_message ?? 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right side - Chat interface */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConv ? (
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bfe937]">
                  <span className="text-sm font-semibold text-gray-900">{selectedConv.consultant_initials}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedConv.project_name ?? 'Project'}</h2>
                  <p className="text-sm text-gray-600">{getConversationLabel(selectedConv)}</p>
                </div>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-50">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {draftParticipants.length > 0
                  ? `New conversation with ${draftParticipants.join(', ')}`
                  : 'Select a conversation'}
              </h2>
              {draftParticipants.length === 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  Use the left panel to start a new conversation.
                </p>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingMessages ? (
              <div className="text-sm text-gray-500">Loading messages…</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet.</div>
            ) : (
              messages.map((message) => {
                const isYou = user?.id && message.sender_id === user.id;
                const isPing = message.content.trim().toLowerCase() === '🔔 ping';
                return (
                  <div key={message.id} className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isYou ? 'order-2' : ''}`}>
                      {!isYou && <p className="text-xs font-medium text-gray-900 mb-1">{message.sender_name}</p>}
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          isYou ? 'bg-[#bfe937] text-gray-900' : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {isPing ? (
                          <p className="text-sm font-semibold whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{formatTimestamp(message.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message input */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-50"
                disabled
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <button
                onClick={() => void handleSendMessage()}
                disabled={!selectedConversationId || sending}
                className="flex h-10 min-w-[88px] items-center justify-center rounded-xl bg-[#bfe937] px-4 text-sm font-medium text-gray-900 transition-colors hover:bg-[#acd829] disabled:opacity-60"
                aria-label="Send message"
              >
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

