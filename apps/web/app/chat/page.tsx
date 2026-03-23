'use client';

import { useState } from 'react';
import { ChatRequestDto } from '@repo/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Using the shared DTO to ensure the request is valid
    const requestData: ChatRequestDto = {
      message: userMessage,
    };

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In a real app, you'd add the Better Auth session token here
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Is the API running and are you authenticated?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white p-4 max-w-2xl mx-auto font-sans">
      <header className="pb-4 border-b border-neutral-800 mb-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
          AI Therapist
        </h1>
        <p className="text-neutral-400 text-sm italic">Clean Architecture Monorepo Demo</p>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-neutral-500">
            Start a therapeutic conversation...
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-neutral-800 text-neutral-200 rounded-tl-none'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 p-3 rounded-2xl rounded-tl-none animate-pulse text-neutral-400">
              AI is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-2 bg-neutral-800 rounded-xl">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="I'm feeling stressed today..."
          className="flex-1 bg-transparent border-none outline-none text-white px-2"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-neutral-900 font-bold px-4 py-2 rounded-lg transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
