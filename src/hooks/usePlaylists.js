import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

async function fetchPlaylists({ pageParam, search, sortField, sortDirection }) {
    const { data } = await api.get('/api/v1/studio/playlists', {
        params: {
            cursor: pageParam ?? undefined,
            search: search || undefined,
            sort_field: sortField,
            sort_direction: sortDirection,
            limit: 10,
        },
    });
    return data;
}

export function usePlaylists({
    search = '',
    sortField = 'order_column',
    sortDirection = 'asc',
} = {}) {
    return useInfiniteQuery({
        queryKey: ['studio-playlists', { search, sortField, sortDirection }],
        queryFn: ({ pageParam }) => fetchPlaylists({ pageParam, search, sortField, sortDirection }),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
    });
}
