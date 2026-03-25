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

export interface ApiResponse {
    data: [];
    error: Error;
}

export interface Error {
    code: string | number;
    message: string;
}

export interface VideoFeedResponse {
    data: VideoResource[];
    links: Links;
    meta: Meta;
}

export interface ApiV1VideoResponse {
    data: VideoResource;
}

export interface AccountInfoResponse {
    data: AccountInfoData;
}

export interface AccountInfoData {
    id: string;
    name: string;
    avatar: string;
    username: string;
    is_owner: boolean;
    local: boolean;
    bio: string;
    post_count: number;
    follower_count: number;
    following_count: number;
    url: string;
    remote_url: any;
    is_blocking: any;
    links: any[];
    created_at: string;
    is_admin: boolean;
    likes_count: number;
}

export interface PublicConfigResponse {
    app: App;
    media: MediaPublicConfig;
    fyf: boolean;
    registration: boolean;
    federation: boolean;
    pushNotifications: boolean;
    starterKits: boolean;
}

export interface App {
    name: string;
    url: string;
    description: string;
    software: string;
    version: string;
}

export interface MediaPublicConfig {
    max_video_size: number;
    max_video_duration: number;
    allowed_video_formats: string[];
}

export interface PreferencesResponse {
    data: PreferencesData;
}

export interface PreferencesData {
    account: PreferencesAccount;
    settings: Settings;
}

export interface PreferencesAccount {
    username: string;
    profile_id: string;
}

export interface Settings {
    autoplay_videos: boolean;
    loop_videos: boolean;
    default_feed: string;
    hide_for_you_feed: boolean;
    mute_on_open: boolean;
    auto_expand_cw: boolean;
    appearance: string;
}

export interface EmailResponse {
    data: EmailData;
}

export interface EmailData {
    current_email: string;
    email_verified: boolean;
    email_added_date: string;
    pending_email: any;
}

export interface BirthdateResponse {
    data: BirthdateData;
}

export interface BirthdateData {
    has_birthdate: boolean;
}

export interface PrivacyResponse {
    data: PrivacyData;
}

export interface PrivacyData {
    discoverable: boolean;
}

export interface SecurityConfigResponse {
    data: SecurityConfigData;
}

export interface SecurityConfigData {
    two_factor_enabled: boolean;
}
