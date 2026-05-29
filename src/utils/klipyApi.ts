export type KlipyMediaType = 'gifs' | 'stickers' | 'memes' | 'clips';

export interface KlipyMediaFormat {
    url: string;
    width: number;
    height: number;
    size: number;
}

export interface KlipyItem {
    id: number | string;
    slug: string;
    title: string;
    type: string;
    preview: KlipyMediaFormat;
    full: KlipyMediaFormat;
    mp4: KlipyMediaFormat;
    webm: KlipyMediaFormat;
    blur_preview?: string;
    width: number;
    height: number;
    is_ad: boolean;
}

export interface KlipyResponse {
    items: KlipyItem[];
    page: number;
    per_page: number;
    has_next: boolean;
    meta: {
        item_min_width: number;
        ad_max_resize_percent: number;
    };
}

export async function fetchKlipyTrending(
    type: KlipyMediaType,
    page: number = 1,
): Promise<KlipyResponse> {
    const res = await api.get(`/api/v1/klipy/${type}/trending`, {
        params: { type, page },
    });
    return res.data;
}

export async function fetchKlipySearch(
    type: KlipyMediaType,
    query: string,
    page: number = 1,
): Promise<KlipyResponse> {
    const res = await api.get(`/api/v1/klipy/${type}/search`, {
        params: { type, query, page },
    });
    return res.data;
}

export async function commentPostMedia(payload: {
    videoId: string;
    parentId?: string | null;
    comment?: string | null;
    type: KlipyMediaType;
    item: KlipyItem;
}) {
    const { videoId, parentId, comment, type, item } = payload;

    const res = await api.post(`/api/v1/video/comments/${videoId}/media`, {
        parent_id: parentId ?? undefined,
        comment: comment ?? undefined,
        type,
        item: {
            id: item.id,
            slug: item.slug,
            title: item.title,
            width: item.width,
            height: item.height,
            full: { url: item.full.url },
            mp4: { url: item.mp4.url },
            webm: { url: item.webm.url },
            preview: { url: item.preview.url },
        },
    });
    return res.data;
}
