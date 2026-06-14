import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { _selfGet, _selfPost } from '../utils/requests';

const PLAYLIST_VIDEOS_KEY = 'playlist-videos';

async function fetchPlaylistVideos({ playlistId, pageParam }) {
    const res = await _selfGet(`api/v1/playlists/${playlistId}/videos`, {
        params: {
            cursor: pageParam ?? undefined,
            limit: 10,
        },
    });
    return res;
}

export function usePlaylistVideos({ playlistId }) {
    return useInfiniteQuery({
        queryKey: [PLAYLIST_VIDEOS_KEY, playlistId],
        queryFn: ({ pageParam }) => fetchPlaylistVideos({ playlistId, pageParam }),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
        enabled: !!playlistId,
    });
}

async function fetchStudioVideos({ pageParam, search }) {
    const res = await _selfGet('api/v1/studio/playlist-posts', {
        cursor: pageParam ?? undefined,
        search: search || '',
        limit: 10,
    });
    return res;
}

export function useStudioVideos({ search = '', enabled = true }) {
    return useInfiniteQuery({
        queryKey: ['studio-videos', { search }],
        queryFn: ({ pageParam }) => fetchStudioVideos({ pageParam, search }),
        initialPageParam: null,
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
        enabled,
    });
}

export function useAddToPlaylist(playlistId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (videoId) =>
            await _selfPost(`api/v1/studio/playlists/${playlistId}/videos`, { video_id: videoId }),
        onSettled: () => {
            qc.invalidateQueries({ queryKey: [PLAYLIST_VIDEOS_KEY, playlistId] });
        },
    });
}

export function useRemoveFromPlaylist(playlistId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (videoId) =>
            _selfPost(`api/v1/studio/playlists/${playlistId}/videos/${videoId}/delete`),
        onMutate: async (videoId) => {
            await qc.cancelQueries({ queryKey: [PLAYLIST_VIDEOS_KEY, playlistId] });
            const snapshots = qc.getQueriesData({
                queryKey: [PLAYLIST_VIDEOS_KEY, playlistId],
            });
            snapshots.forEach(([key, data]) => {
                if (!data?.pages) return;
                qc.setQueryData(key, {
                    ...data,
                    pages: data.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((v) => v.id !== videoId),
                    })),
                });
            });
            return { snapshots };
        },
        onError: (_err, _videoId, context) => {
            context?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: [PLAYLIST_VIDEOS_KEY, playlistId] });
        },
    });
}
