export type CollabState = 'pending' | 'approved' | 'declined' | 'expired' | 'removed';

export type CollabPrivacyState = 'off' | 'mutuals' | 'following' | 'everyone';

export interface CollabAccount {
    id: string;
    name: string;
    display_name?: string;
    username: string;
    avatar: string;
}

export interface CollabSearchAccount extends CollabAccount {
    auto_approve: boolean;
}

export interface CollabTrustedAccount extends CollabAccount {
    trusted_at: string | null;
}

export interface CollabVideoPreview {
    id: string;
    caption: string | null;
    thumbnail: string;
    src_url: string | null;
    duration: number | null;
    width: number | null;
    height: number | null;
    is_ready: boolean;
    is_published: boolean;
    url: string | null;
    scheduled_at: string | null;
}

export interface CollabRequest {
    id: string;
    state: CollabState;
    auto_approved: boolean;
    inviter: CollabAccount;
    video: CollabVideoPreview | null;
    expires_at: string | null;
    responded_at: string | null;
    created_at: string | null;
}

export interface StudioCollab {
    id: string;
    state: CollabState;
    auto_approved: boolean;
    account: CollabAccount;
    expires_at: string | null;
    responded_at: string | null;
}

export interface CollabCursorPage<T> {
    data: T[];
    meta?: { next_cursor?: string | null };
    next_cursor?: string | null;
}

export interface CollabSettings {
    state: CollabPrivacyState;
    trusted_count: number;
    enabled: boolean;
}

export const COLLAB_NOTIFICATION_TYPES = [
    'collab.request',
    'collab.accepted',
    'collab.declined',
    'collab.autoAdded',
    'collab.removed',
] as const;

export const isCollabNotification = (type?: string) =>
    !!type && (COLLAB_NOTIFICATION_TYPES as readonly string[]).includes(type);

export const COLLAB_HELD_STATUSES = [
    'awaiting_collab',
    'collab_declined',
    'collab_expired',
] as const;

export const isCollabHeldStatus = (status?: string) =>
    !!status && (COLLAB_HELD_STATUSES as readonly string[]).includes(status);

export const collabErrorMessage = (
    err: any,
    fallback = 'Something went wrong. Please try again.',
) => {
    const errors = err?.errors ?? err?.data?.errors;
    if (errors && typeof errors === 'object') {
        const first = Object.values(errors)[0];
        if (Array.isArray(first) && first.length) return String(first[0]);
        if (typeof first === 'string') return first;
    }
    return err?.data?.message || err?.message || fallback;
};
