'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Estados do perfil
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  
  // Estados de feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    initializeProfile();
  }, []);

  const initializeProfile = async () => {
    try {
      // Verificar sessão
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      // Buscar dados do perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url, name')
        .eq('id', currentUserId)
        .single();

      if (profileError) {
        console.error('[PROFILE] Erro ao buscar perfil:', profileError);
        setError('Erro ao carregar perfil');
      } else if (profile) {
        setAvatarUrl(profile.avatar_url);
        setName(profile.name || '');
      }
    } catch (err: any) {
      console.error('[PROFILE] Erro na inicialização:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Máximo: 5MB.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Gerar nome único: userId/timestamp.ext
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}.${fileExt}`;

      console.log('[PROFILE] Fazendo upload do avatar:', filePath);

      // Upload para o bucket "avatars"
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[PROFILE] Erro no upload:', uploadError);
        throw new Error(uploadError.message);
      }

      console.log('[PROFILE] Upload bem-sucedido:', uploadData);

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      console.log('[PROFILE] URL pública:', publicUrl);

      // Atualizar avatar_url no profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        console.error('[PROFILE] Erro ao atualizar avatar_url:', updateError);
        throw new Error(updateError.message);
      }

      // Atualizar estado local
      setAvatarUrl(publicUrl);
      setSuccess('Avatar atualizado com sucesso!');
      
      console.log('[PROFILE] ✅ Avatar salvo no perfil');
    } catch (err: any) {
      console.error('[PROFILE] Erro ao fazer upload:', err);
      setError(err.message || 'Erro ao fazer upload do avatar');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Meu Perfil</h1>
          <p className="text-gray-600">Personalize sua experiência</p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Erro</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Sucesso</p>
              <p className="text-xs text-green-600 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Card de Avatar */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Foto de Perfil
          </h2>

          <div className="flex flex-col items-center gap-4">
            {/* Preview do Avatar */}
            <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>

            {/* Input de Upload */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
              />
              <div className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                uploading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:shadow-lg'
              }`}>
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Escolher Foto
                  </>
                )}
              </div>
            </label>

            <p className="text-xs text-gray-500 text-center">
              JPG, PNG ou WEBP • Máximo 5MB
            </p>
          </div>
        </div>

        {/* Botão Voltar */}
        <button
          onClick={() => router.push('/home')}
          className="mt-6 w-full px-6 py-3 border-2 border-gray-300 rounded-xl hover:border-gray-400 transition-colors text-gray-700 font-semibold"
        >
          Voltar para Home
        </button>
      </div>
    </div>
  );
}
