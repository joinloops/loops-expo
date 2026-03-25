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
    next: string | null;
}

export interface Meta {
    path: string;
    per_page: number;
    next_cursor: string | null;
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
    is_blocking: boolean | null;
    links: Link[];
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

export interface ReportRulesItem {
    key: string;
    message: string;
}

export interface AutoCompleteTagResponse {
    data: AutoCompleteTagData[];
}

export interface AutoCompleteTagData {
    id: number;
    name: string;
    slug: string;
    count: number;
    created_at: string;
}

export interface NotificationResponse {
    data: NotificationData[];
    links: Links;
    meta: NotificationMeta;
}

export interface NotificationData {
    id: string;
    type: string;
    video_pid: string;
    video_id: string;
    video_thumbnail: string;
    actor: Actor;
    url?: string;
    read_at?: string;
    created_at: string;
}

export interface Actor {
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
    links: Link[];
    created_at: string;
}

export interface Link {
    url: string;
    link: string;
    is_verified: boolean;
}

export interface NotificationMeta {
    path: string;
    per_page: number;
    next_cursor: string;
    prev_cursor: any;
    unread_counts: UnreadCounts;
}

export interface UnreadCounts {
    activity: number;
    followers: number;
    system: number;
    starterKits: number;
}

export interface SystemNofiticationsResponse {
    data: SystemNofiticationsData[];
    links: Links;
    meta: Meta;
}

export interface SystemNofiticationsData {
    id: string;
    type: string;
    systemType: string;
    systemMessage: SystemMessage;
    read_at: string;
    created_at: string;
}

export interface SystemMessage {
    id: string;
    title: string;
    summary: string;
    link: string;
    published_at: string;
}

export interface NotificationReadResponse {
    data: NotificationData;
}

export interface NotificationCountResponse {
    data: NotificationCountData;
}

export interface NotificationCountData {
    unread_count: number;
}
export interface SearchResponse {
    data: SearchData;
    links: Links;
    meta: Meta;
}

export interface SearchData {
    hashtags: any[];
    users: Actor[];
    videos: SearchVideo[];
    starter_kits: any[];
}

export interface SearchVideo {
    id: string;
    hid: string;
    account: Account;
    caption: string;
    url: string;
    likes: number;
    comments: number;
    is_sensitive: boolean;
    created_at: string;
    media: Media;
}

export interface SearchMedia {
    duration: number;
    thumbnail: string;
}

export interface SlugResponse {
    data: SlugData;
}

export interface SlugData {
    title: string;
    content: string;
    slug: string;
    created_at: string;
    updated_at: string;
}

export interface Tag {
    id: number;
    name: string;
    count: number;
}

export interface SettingsLinksResponse {
    data: SettingsLinksData;
}

export interface SettingsLinksData {
    id: string;
    min_threshold: number;
    total_allowed: number;
    available_slots: number;
    can_add: boolean;
    links: any[];
}

export interface UpdatePasswordRequest {
    current_password: string;
    password: string;
    password_confirmation: string;
}

export interface NotificationFollowersResponse {
    data: NotificationFollowersData[];
    links: Links;
    meta: NotificationMeta;
}

export interface NotificationFollowersData {
    id: string;
    type: string;
    actor: Actor;
    read_at: string;
    created_at: string;
}
