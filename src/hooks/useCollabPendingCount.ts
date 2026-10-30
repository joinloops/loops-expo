import type { CollabCursorPage, CollabRequest } from '@/types/collab';
import { fetchCollabRequests } from '@/utils/requests';
import { useQuery } from '@tanstack/react-query';

export function useCollabPendingCount(enabled = true) {
    const query = useQuery({
        queryKey: ['collabs', 'pendingCount'],
        queryFn: async () => {
            const res: CollabCursorPage<CollabRequest> = await fetchCollabRequests({
                state: 'pending',
            });
            return {
                count: Array.isArray(res?.data) ? res.data.length : 0,
                hasMore: !!res?.meta?.next_cursor,
            };
        },
        enabled,
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });

    return {
        count: query.data?.count ?? 0,
        hasMore: query.data?.hasMore ?? false,
        label: query.data ? `${query.data.count}${query.data.hasMore ? '+' : ''}` : '0',
        refetch: query.refetch,
    };
}
