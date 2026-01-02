import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, createProject } from '@/services/api';
import { Project } from '@/types';

export const useProjects = (clientId?: string) => {
    const queryClient = useQueryClient();

    const projectsQuery = useQuery({
        queryKey: ['projects', clientId],
        queryFn: () => fetchProjects(clientId),
    });

    const createProjectMutation = useMutation({
        mutationFn: async (newProject: Partial<Project>) => {
            return await createProject(newProject);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    return {
        projects: projectsQuery.data || [],
        isLoading: projectsQuery.isLoading,
        isError: projectsQuery.isError,
        createProject: createProjectMutation.mutateAsync,
        isCreating: createProjectMutation.isPending,
    };
};
