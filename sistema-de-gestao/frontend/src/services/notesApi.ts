import { apiRequest } from './apiClient';

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

export const getNotesLinks = async (_token?: string): Promise<NotesResponse> => {
    // Agora o apiRequest obtém o token automaticamente do Supabase
    return apiRequest('/notes/links');
};

export const syncNotes = async (_token: string, tabs: Omit<NoteTab, 'url'>[]): Promise<{ ok: boolean, tabs: NoteTab[] }> => {
    return apiRequest('/notes/sync', {
        method: 'POST',
        body: JSON.stringify({ tabs })
    });
};
