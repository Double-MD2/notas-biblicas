'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Verse {
  number: number;
  text: string;
}

interface Chapter {
  number: number;
  verses: Verse[];
}

interface Book {
  name: string;
  chapters: Chapter[];
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const bookName = decodeURIComponent(params.book as string);
  const chapterNumber = parseInt(params.chapter as string);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChapter = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados do arquivo bible-data.json
        const response = await fetch('/bible-data.json');
        
        if (!response.ok) {
          throw new Error('Erro ao carregar dados da Bíblia');
        }

        const bibleData: Book[] = await response.json();
        
        // Encontrar o livro
        const book = bibleData.find(b => b.name === bookName);
        
        if (!book) {
          throw new Error('Livro não encontrado');
        }

        // Encontrar o capítulo
        const chapter = book.chapters.find(c => c.number === chapterNumber);
        
        if (!chapter) {
          throw new Error('Capítulo não encontrado');
        }

        setVerses(chapter.verses);
      } catch (err) {
        console.error('Erro ao carregar capítulo:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [bookName, chapterNumber]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">{bookName}</h1>
                <p className="text-sm text-gray-500">Capítulo {chapterNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
            <p className="text-gray-600">Carregando versículos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-semibold mb-2">Erro ao carregar capítulo</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && verses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="space-y-4">
              {verses.map((verse) => (
                <div key={verse.number} className="flex gap-3 group">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {verse.number}
                  </span>
                  <p className="text-gray-700 leading-relaxed pt-1">
                    {verse.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && verses.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum versículo encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
