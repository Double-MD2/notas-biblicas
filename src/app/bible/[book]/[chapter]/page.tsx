'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, BookOpen, Type, Bookmark, Share2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Verse {
  number: number;
  text: string;
}

interface Chapter {
  book: string;
  chapter: number;
  verses: Verse[];
}

export default function ChapterPage() {
  const router = useRouter();
  const params = useParams();
  const [chapterData, setChapterData] = useState<Chapter | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChapter = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const bookName = decodeURIComponent(params.book as string);
        const chapterNum = parseInt(params.chapter as string);
        
        // Tenta carregar o arquivo JSON com configurações adicionais
        const response = await fetch('/bible-data.json', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Procura o livro no JSON (case-insensitive)
        const bookData = data.find((b: any) => 
          b.name.toLowerCase() === bookName.toLowerCase() ||
          b.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 
          bookName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        );
        
        if (bookData) {
          // Procura o capítulo específico pelo número
          const chapterFound = bookData.chapters.find((ch: any) => ch.number === chapterNum);
          
          if (chapterFound && chapterFound.verses && chapterFound.verses.length > 0) {
            setChapterData({
              book: bookData.name,
              chapter: chapterNum,
              verses: chapterFound.verses
            });
          } else {
            setError(`Capítulo ${chapterNum} não encontrado em ${bookData.name}`);
            setChapterData({
              book: bookName,
              chapter: chapterNum,
              verses: generateExampleVerses(chapterNum)
            });
          }
        } else {
          setError(`Livro "${bookName}" não encontrado no arquivo JSON`);
          setChapterData({
            book: bookName,
            chapter: chapterNum,
            verses: generateExampleVerses(chapterNum)
          });
        }
      } catch (error) {
        console.error('Erro ao carregar capítulo:', error);
        setError('Não foi possível carregar o arquivo da Bíblia. Usando dados de exemplo.');
        
        // Fallback para dados de exemplo
        const bookName = decodeURIComponent(params.book as string);
        const chapterNum = parseInt(params.chapter as string);
        setChapterData({
          book: bookName,
          chapter: chapterNum,
          verses: generateExampleVerses(chapterNum)
        });
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [params.book, params.chapter]);

  const generateExampleVerses = (chapterNum: number): Verse[] => {
    // Gera versículos de exemplo
    const numVerses = Math.floor(Math.random() * 20) + 10;
    return Array.from({ length: numVerses }, (_, i) => ({
      number: i + 1,
      text: `Este é o versículo ${i + 1} do capítulo ${chapterNum}. O conteúdo completo será carregado do arquivo JSON da Bíblia quando disponível.`
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-amber-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Carregando capítulo...</p>
        </div>
      </div>
    );
  }

  if (!chapterData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Capítulo não encontrado</p>
          {error && (
            <p className="text-sm text-red-500 mt-2 max-w-md mx-auto">{error}</p>
          )}
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  {chapterData.book} {chapterData.chapter}
                </h1>
                <p className="text-sm text-gray-500">
                  {chapterData.verses.length} versículos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bookmark className="w-5 h-5 text-gray-700" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              ⚠️ {error}
            </p>
          </div>
        </div>
      )}

      {/* Font Size Control */}
      <div className="container mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Tamanho do texto</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-semibold"
            >
              A-
            </button>
            <span className="text-sm text-gray-600 w-8 text-center">{fontSize}</span>
            <button
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-semibold"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Chapter Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
          <div className="space-y-4">
            {chapterData.verses.map((verse) => (
              <div
                key={verse.number}
                className="flex gap-3 group hover:bg-amber-50 p-2 rounded-lg transition-colors"
              >
                <span
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 rounded-full text-sm font-semibold"
                >
                  {verse.number}
                </span>
                <p
                  className="text-gray-700 leading-relaxed pt-1"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {verse.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex gap-4">
          {chapterData.chapter > 1 && (
            <button
              onClick={() => router.push(`/bible/${params.book}/${chapterData.chapter - 1}`)}
              className="flex-1 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700 transition-colors"
            >
              ← Capítulo Anterior
            </button>
          )}
          <button
            onClick={() => router.push(`/bible/${params.book}/${chapterData.chapter + 1}`)}
            className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl font-semibold transition-colors"
          >
            Próximo Capítulo →
          </button>
        </div>
      </div>
    </div>
  );
}
