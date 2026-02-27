import { supabase } from './supabaseClient';

let cachedApiUrl: string | null = null;

/**
 * Obtém a URL da API dinamicamente, priorizando o Supabase para evitar mudanças constantes no .env
 */
export async function getApiBaseUrl(): Promise<string> {
    // 1. Prioridade: Environment Variable (Build/Production)
    const envUrl = (import.meta as any).env?.VITE_API_URL?.toString()?.trim();
    if (envUrl && envUrl !== 'undefined') {
        let url = envUrl.replace(/\/$/, '');
        if (!url.endsWith('/api')) url += '/api';
        cachedApiUrl = url;
        return url;
    }

    if (cachedApiUrl) return cachedApiUrl;

    try {
        // 2. Fallback: Buscar URL dinâmica no banco (apenas se não houver ENV definido)
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'api_url')
            .single();

        if (!error && data?.value) {
            let candidateUrl = data.value.replace(/\/$/, '');
            if (!candidateUrl.endsWith('/api')) {
                candidateUrl += '/api';
            }

            // Validação de Conectividade (Health Check Rápido)
            // Se a URL do banco for um túnel (ngrok/cloudflare), verifica se está ativa
            if (candidateUrl.includes('ngrok') || candidateUrl.includes('trycloudflare')) {
                try {
                    // Tenta verificar se a URL está viva
                    // Ajuste: timeout de 2s. Se falhar, considera offline.
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);

                    const response = await fetch(`${candidateUrl.replace(/\/api$/, '')}/health`, {
                        method: 'GET',
                        signal: controller.signal
                    }).catch(() => null);

                    clearTimeout(timeoutId);

                    if (!response || !response.ok) {
                        console.warn('[API] URL dinâmica offline ou inválida (Health Check falhou). Ignorando:', candidateUrl);
                        // Força erro para cair no catch e ir p/ fallback
                        throw new Error('Dynamic URL Unreachable');
                    }
                } catch (e) {
                    console.warn('[API] Falha ao validar URL dinâmica:', candidateUrl);
                    throw e; // Lança erro para sair do bloco e usar localhost
                }
            }

            console.log('[API] Usando URL dinâmica do Supabase:', candidateUrl);
            cachedApiUrl = candidateUrl;
            return cachedApiUrl;
        }
    } catch (e) {
        console.warn('[API] Erro ao buscar URL dinâmica, usando fallback localhost', e);
    }

    // 3. Último caso: Localhost
    return 'http://localhost:3001/api';
}

/**
 * Helper centralizado para chamadas à API com autenticação automática
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await getApiBaseUrl();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers as any),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text || response.statusText}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
}

/**
 * Helper para download de arquivos (Blob)
 */
export async function apiDownload(path: string, options: RequestInit = {}): Promise<Blob> {
    const baseUrl = await getApiBaseUrl();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers as any),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Download Error ${response.status}: ${text || response.statusText}`);
    }

    return response.blob();
}
