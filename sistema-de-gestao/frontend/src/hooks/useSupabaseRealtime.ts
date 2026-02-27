import { useEffect } from 'react';
import { supabase } from '@/services/supabaseClient';

/**
 * Hook para escutar mudanças em tempo real em uma tabela do Supabase.
 * @param {string} table Nome da tabela
 * @param {(payload: any) => void} onChange Callback para tratar o evento
 */
export function useSupabaseRealtime(table, onChange) {
  useEffect(() => {
    if (!table || typeof onChange !== 'function') return;
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onChange]);
}
