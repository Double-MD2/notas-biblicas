'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Heart, ShoppingCart, MessageCircle, Menu, X } from 'lucide-react';
import Sidebar from '@/components/custom/sidebar';

interface DailyContent {
  id: string;
  title: string;
  verse: string;
  content: string;
  day: number;
}

const mockContents: DailyContent[] = [
  {
    id: '1',
    title: 'A Paz de Deus',
    verse: 'Filipenses 4:7',
    content: 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.',
    day: 0,
  },
  {
    id: '2',
    title: 'O Amor de Cristo',
    verse: 'João 15:13',
    content: 'Ninguém tem maior amor do que este: de dar alguém a própria vida em favor dos seus amigos.',
    day: 1,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contents, setContents] = useState<DailyContent[]>(mockContents);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'account' | 'contribute' | 'frequency' | 'store'>('account');

  const currentContent = contents.find(content => content.day === selectedDay) || contents[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Diário Espiritual</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Daily Content */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentContent.title}</h2>
              <p className="text-lg text-amber-600 font-semibold">{currentContent.verse}</p>
            </div>
            <div className="prose prose-lg mx-auto text-gray-700 leading-relaxed">
              <p className="text-center text-xl">{currentContent.content}</p>
            </div>
          </div>
        </div>

        {/* Quick Access Buttons */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
              <Book className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 text-center">Bíblia</span>
          </button>

          <button
            onClick={() => { setSidebarOpen(true); setSidebarTab('contribute'); }}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 text-center">Contribuir</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 text-center">Shop</span>
          </button>

          <button className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700 text-center">Chat</span>
          </button>
        </div>

        {/* Weekly Calendar */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Conteúdo Semanal</h3>
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedDay(index)}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedDay === index
                    ? 'bg-amber-400 text-white shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="text-sm font-semibold">{day}</div>
                <div className="text-xs mt-1">{index + 1}</div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={sidebarTab}
      />
    </div>
  );
}