import axios from 'axios';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL?.toString()?.trim();

    if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost')) {
        return envUrl;
    }

    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return `${window.location.origin}/api`;
    }
    return envUrl || 'http://localhost:3001/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('supabase.auth.token'); // Adjust key if needed, or use auth context pattern
    // The user says "com header Authorization: Bearer <access_token>"
    // Assuming we can get it from localStorage or we need to pass it.
    // Given the project structure, I might need to check how other services get the token.
    // Usually it's in localStorage under specific key for Supabase or handled by a wrapper.
    // Let's assume standard supabase key or rely on what's available.
    // Checking `useAuth` hook usage in MainLayout suggests `currentUser`.
    // I'll check `frontend/src/contexts/AuthContext.tsx` or similar to see where token is stored.
    // For now, I'll attempt to get 'sb-access-token' or similar.

    // Better: let's not hardcode here if we can avoid it, but axios needs it.
    // Most existing services might accept token as arg or get it.
    // Let's assume a common pattern exists. I'll read `frontend/src/services/api.ts` (if exists) or `authService.ts`.
    // But to progress, I will write generic code and check context later.

    // Quick fix: Retrieve locally or let the caller handle it?
    // User requirement: "GET ... com header Authorization: Bearer <access_token>"
    const sbSession = localStorage.getItem('sb-bxscznvqudkaqphjwsry-auth-token'); // Example Supabase key
    // Actually, let's look for a generic `api.ts` first.
    return config;
});

export interface NoteTab {
    key: string;
    label: string;
    slug: string;
    type: string;
    url: string;
}

export interface NotesResponse {
    base_slug: string;
    tabs: NoteTab[];
}

export const getNotesLinks = async (token: string): Promise<NotesResponse> => {
    const response = await api.get('/notes/links', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};

export const syncNotes = async (token: string, tabs: Omit<NoteTab, 'url'>[]): Promise<{ ok: boolean, tabs: NoteTab[] }> => {
    const response = await api.post('/notes/sync', { tabs }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};
