'use client';

import { useState } from 'react';
import { Search, Send, Paperclip, MoreVertical } from 'lucide-react';

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isYou: boolean;
}

interface Conversation {
  id: number;
  project: string;
  consultant: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  initials: string;
}

export default function InboxPage() {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [messageInput, setMessageInput] = useState('');

  const conversations: Conversation[] = [
    {
      id: 1,
      project: 'HubSpot CRM Implementation',
      consultant: 'Sarah Mitchell',
      lastMessage: 'I\'ve completed the initial setup. Ready for review.',
      timestamp: '2 hours ago',
      unread: true,
      initials: 'SM',
    },
    {
      id: 2,
      project: 'Sales Process Design',
      consultant: 'James Peterson',
      lastMessage: 'The pipeline structure looks good. Should we schedule a call?',
      timestamp: '5 hours ago',
      unread: false,
      initials: 'JP',
    },
    {
      id: 3,
      project: 'Custom API Integration',
      consultant: 'Emily Chen',
      lastMessage: 'API endpoints are now live in staging.',
      timestamp: 'Yesterday',
      unread: false,
      initials: 'EC',
    },
    {
      id: 4,
      project: 'Data Enrichment Setup',
      consultant: 'Michael Brown',
      lastMessage: 'Thanks! I\'ll start working on this tomorrow.',
      timestamp: '2 days ago',
      unread: false,
      initials: 'MB',
    },
  ];

  const messages: Message[] = [
    {
      id: 1,
      sender: 'Sarah Mitchell',
      content: 'Hi! I wanted to give you an update on the HubSpot CRM implementation project.',
      timestamp: '10:24 AM',
      isYou: false,
    },
    {
      id: 2,
      sender: 'Sarah Mitchell',
      content: 'I\'ve finished setting up the custom objects and the data model. The user permissions are also configured according to your requirements.',
      timestamp: '10:25 AM',
      isYou: false,
    },
    {
      id: 3,
      sender: 'You',
      content: 'That\'s great! Could you walk me through the lifecycle stages you\'ve set up?',
      timestamp: '10:32 AM',
      isYou: true,
    },
    {
      id: 4,
      sender: 'Sarah Mitchell',
      content: 'Of course! I\'ve set up 5 main stages: Subscriber, Lead, MQL, SQL, and Opportunity. Each stage has automatic scoring triggers based on engagement.',
      timestamp: '10:35 AM',
      isYou: false,
    },
    {
      id: 5,
      sender: 'You',
      content: 'Perfect. When can we schedule a demo?',
      timestamp: '11:20 AM',
      isYou: true,
    },
    {
      id: 6,
      sender: 'Sarah Mitchell',
      content: 'I\'ve completed the initial setup. Ready for review.',
      timestamp: '1:45 PM',
      isYou: false,
    },
  ];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Handle sending message
      setMessageInput('');
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="fixed inset-0 left-64 top-16 bg-gray-50">
      <div className="h-full flex">
        {/* Left sidebar - Conversations list */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Inbox</h1>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`w-full p-4 border-b border-gray-100 text-left transition-colors hover:bg-gray-50 ${
                  selectedConversation === conversation.id ? 'bg-gray-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#bfe937]">
                    <span className="text-sm font-semibold text-gray-900">{conversation.initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{conversation.project}</h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{conversation.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{conversation.consultant}</p>
                    <p className={`text-sm truncate ${conversation.unread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread && (
                    <div className="h-2 w-2 flex-shrink-0 rounded-full bg-[#bfe937] mt-1"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right side - Chat interface (2/3) */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat header */}
          {selectedConv && (
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#bfe937]">
                  <span className="text-sm font-semibold text-gray-900">{selectedConv.initials}</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedConv.project}</h2>
                  <p className="text-sm text-gray-600">{selectedConv.consultant}</p>
                </div>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-50">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isYou ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${message.isYou ? 'order-2' : ''}`}>
                  {!message.isYou && (
                    <p className="text-xs font-medium text-gray-900 mb-1">{message.sender}</p>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.isYou
                        ? 'bg-[#bfe937] text-gray-900'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{message.timestamp}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message input */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-end gap-3">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-50">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  rows={1}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm resize-none focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#bfe937] text-gray-900 transition-colors hover:bg-[#acd829]"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
