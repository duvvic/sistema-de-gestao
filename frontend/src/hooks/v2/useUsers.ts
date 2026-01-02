import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, deactivateUser, updateUser as apiUpdateUser } from '@/services/api';
import { User } from '@/types';

export const useUsers = () => {
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
    });

    const deactivateUserMutation = useMutation({
        mutationFn: deactivateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
            return await apiUpdateUser(userId, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return {
        users: usersQuery.data || [],
        isLoading: usersQuery.isLoading,
        isError: usersQuery.isError,
        deactivateUser: deactivateUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
        isUpdating: updateUserMutation.isPending,
    };
};
