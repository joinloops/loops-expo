export interface CommentsResponse {
    data: CommentData[];
    links: Links;
    meta: Meta;
}

export interface CommentData {
    id: string;
    v_id: string;
    account: Account;
    caption: string;
    replies: number;
    children: any[];
    tags: any[];
    mentions: any[];
    likes: number;
    shares: number;
    liked: boolean;
    url: string;
    remote_url: any;
    tombstone: boolean;
    is_edited: boolean;
    is_hidden: boolean;
    is_owner: boolean;
    created_at: string;
}

export interface Account {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

export interface Links {
    first: any;
    last: any;
    prev: any;
    next: any;
}

export interface Meta {
    path: string;
    per_page: number;
    next_cursor: any;
    prev_cursor: any;
}

export interface CommentReplyResponse {
    data: CommentReplyData[];
    links: Links;
    meta: Meta;
}

export interface CommentReplyData {
    id: string;
    v_id: string;
    p_id: string;
    account: Account;
    caption: string;
    likes: number;
    shares: number;
    tags: any[];
    mentions: Mention[];
    liked: boolean;
    url: string;
    remote_url: any;
    tombstone: boolean;
    is_edited: boolean;
    is_hidden: boolean;
    is_owner: boolean;
    created_at: string;
}

export interface Mention {
    username: string;
    start_index: number;
    end_index: number;
    is_local: boolean;
    profile_id: string;
}

export interface VideoResource {
    id: string;
    account: Account;
    caption: string;
    url: string;
    is_owner: boolean;
    is_sensitive: boolean;
    media: Media;
    pinned: boolean;
    likes: number;
    shares: number;
    comments: number;
    bookmarks: number;
    has_liked: boolean;
    has_bookmarked: boolean;
    is_edited: boolean;
    lang: string;
    tags: string[];
    mentions: any[];
    permissions: Permissions;
    audio: Audio;
    meta: VideoMeta;
    created_at: string;
}

export interface Media {
    thumbnail: string;
    src_url: string;
    hls_url: any;
    alt_text: string;
    duration: number;
}

export interface Permissions {
    can_comment: boolean;
    can_download: boolean;
    can_duet: boolean;
    can_stitch: boolean;
}

export interface Audio {
    has_audio: boolean;
    id: string;
    count: number;
    key: string;
    sound_id: any;
}

export interface VideoMeta {
    contains_ai: boolean;
    contains_ad: boolean;
}

export interface CommentPostResponse {
    data: CommentData[];
}

export interface CommentPostRequest {
    comment: string;
    parent_id?: string;
}

export interface ServiceResponse {
    data: any[]; // Empty array
    error: Error;
}

export interface Error {
    code: string | number;
    message: string;
}

export interface VideoBookmarkResponse {
    data: VideoResource[];
    links: Links;
    meta: Meta;
}

export interface ApiV1VideoResponse {
    data: VideoResource;
}
