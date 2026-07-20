export type DmConversationState = 'active' | 'request' | 'left';

export type DmMessageType = 'text' | 'loop_share' | 'media';

export type DmMediaType = 'image' | 'video' | 'gif' | 'audio' | 'unknown';

export type DmConversationFilter = 'primary' | 'requests' | 'hidden';

export interface DmParticipant {
    id: string;
    username: string;
    name: string;
    avatar: string | null;
    domain: string | null;
    is_remote: boolean;
}

export interface DmMediaEntity {
    id: string;
    type: DmMediaType;
    mime_type: string | null;
    url: string;
    preview_url: string | null;
    width: number | null;
    height: number | null;
    blurhash: string | null;
    description: string | null;
}

export interface DmSharedVideoAccount {
    id: string;
    name: string;
    display_name: string;
    username: string;
    avatar: string | null;
}

export interface DmSharedVideoMedia {
    duration: number;
    width: number;
    height: number;
    thumbnail: string | null;
    src_url: string;
}

export interface DmSharedVideo {
    id: string;
    hid: string;
    account: DmSharedVideoAccount;
    caption: string | null;
    url: string;
    is_sensitive: boolean;
    is_local: boolean;
    media: DmSharedVideoMedia | null;
}

export interface DmMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    type: DmMessageType;
    body: string | null;
    video?: DmSharedVideo;
    media: DmMediaEntity[];
    created_at: string;
    edited_at: string | null;
}

export interface DmOptimisticMessage extends DmMessage {
    pending?: boolean;
    failed?: boolean;
    klipy?: {
        type: string;
        item: Record<string, unknown>;
    };
}

export interface DmConversation {
    id: string;
    state: DmConversationState;
    muted: boolean;
    hidden: boolean;
    pending_acceptance: boolean;
    unread: boolean;
    last_read_message_id: string | null;
    participant: DmParticipant | null;
    last_message: DmMessage | null;
    updated_at: string | null;
}

export interface DmSuggestedRecipient {
    id: string;
    username: string;
    name: string;
    avatar: string | null;
    domain: string | null;
    is_remote: boolean;
}

export interface DmCursorMeta {
    path: string;
    per_page: number;
    next_cursor: string | null;
    prev_cursor: string | null;
}

export interface DmCursorPage<T> {
    data: T[];
    meta: DmCursorMeta;
}

export interface DmSearchMeta extends DmCursorMeta {
    restricted: boolean;
}

export interface DmSearchPage<T> {
    data: T[];
    meta: DmSearchMeta;
}

export interface DmSendTextPayload {
    type: 'text';
    body: string;
    conversation_id?: string;
    recipient_id?: string;
}

export interface DmSendLoopSharePayload {
    type: 'loop_share';
    video_id: string;
    body?: string;
    conversation_id?: string;
    recipient_id?: string;
}

export type DmSendPayload = DmSendTextPayload | DmSendLoopSharePayload;

export interface DmSendMediaPayload {
    type: 'gifs' | 'stickers' | 'memes' | 'clips';
    item: Record<string, unknown>;
    body?: string;
    conversation_id?: string;
    recipient_id?: string;
}

export interface DmSocketMessageCreated {
    conversation_id: string;
    message: DmMessage;
}

export interface DmSocketMessageDeleted {
    conversation_id: string;
    message_id: string;
}
