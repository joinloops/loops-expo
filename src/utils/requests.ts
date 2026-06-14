import { triggerAuthFailure } from '@/utils/authEvents';
import { Storage } from '@/utils/cache';
import { File, UploadType } from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

// ============================================================================
// UTILITY HELPERS
// ============================================================================

let _authFailureTriggered = false;

type UploadFilePart = { uri: string; name?: string; type?: string };

function isFilePart(value: any): value is UploadFilePart {
    return (
        !!value &&
        typeof value === 'object' &&
        typeof value.uri === 'string' &&
        value.uri.length > 0
    );
}

export type UploadProgress = { bytesSent: number; totalBytes: number };
export type UploadExtras = {
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
};

function guardAuthResponse(resp: Response): void {
    // 403 -> account suspended / token revoked
    if (resp.status === 403) {
        if (!_authFailureTriggered) {
            _authFailureTriggered = true;
            triggerAuthFailure('Your account has been suspended.');
        }
        throw new Error('auth_revoked');
    }

    const redirectedToLogin = !!resp.url && resp.url.includes('/login');

    const contentType = resp.headers?.get('content-type') ?? '';
    const isHtml = contentType.includes('text/html');

    if (redirectedToLogin || isHtml) {
        if (!_authFailureTriggered) {
            _authFailureTriggered = true;
            triggerAuthFailure('Your session is no longer valid.');
        }
        throw new Error('auth_revoked');
    }
}

export function resetAuthFailureFlag() {
    _authFailureTriggered = false;
}

const DEFAULT_APP_PREFERENCES = {
    account: { username: 'user', profile_id: null },
    settings: {
        autoplay_videos: true,
        loop_videos: true,
        default_feed: 'local',
        hide_for_you_feed: false,
        mute_on_open: false,
        auto_expand_cw: false,
        appearance: 'light',
    },
};

export async function openBrowser(url, options) {
    await WebBrowser.openBrowserAsync(url, options);
}

export async function openLocalLink(path, options = {}) {
    const instance = Storage.getString('app.instance');
    const url = `https://${instance}/${path}`;
    await WebBrowser.openBrowserAsync(url, options);
}

export function getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
    };
    return mimeTypes[extension] || 'unknown';
}

export function objectToForm(obj: { [key: string | number]: any }): FormData {
    const form = new FormData();

    Object.entries(obj).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach((v) => form.append(`${key}[]`, String(v)));
        } else {
            form.append(String(key), String(value));
        }
    });

    return form;
}

export function arrayToForm(obj: any): FormData {
    const form = new FormData();
    Object.keys(obj).forEach((key) => form.append(key, obj[key]));

    return form;
}

function isMultipartContentType(ct?: string): boolean {
    return !!ct && ct.toLowerCase().includes('multipart/form-data');
}

function buildFormHeaders(token?: string, contentType?: string): { [key: string]: string } {
    const headers: { [key: string]: string } = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (contentType && !isMultipartContentType(contentType)) {
        headers['Content-Type'] = contentType;
    }
    return headers;
}

export async function get(url: string, token?: string, data?: any) {
    let completeURL;
    if (data) {
        let params = new URLSearchParams(data);
        completeURL = `${url}?${params.toString()}`;
    } else {
        completeURL = url;
    }

    const resp = await fetch(completeURL, {
        method: 'GET',
        redirect: 'follow',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    guardAuthResponse(resp);

    return resp;
}

export async function postForm(
    url: string,
    data?: { [key: string | number]: any },
    token?: string,
    contentType?: string,
) {
    const resp = await fetch(url, {
        method: 'POST',
        body: data ? objectToForm(data) : undefined,
        headers: buildFormHeaders(token, contentType),
    });

    guardAuthResponse(resp);

    return resp;
}

export async function postFormArray(
    url: string,
    data?: { [key: string | number]: any },
    token?: string,
    contentType?: string,
) {
    const resp = await fetch(url, {
        method: 'POST',
        body: data ? arrayToForm(data) : undefined,
        headers: buildFormHeaders(token, contentType),
    });

    guardAuthResponse(resp);

    return resp;
}

export async function post(url: string, token?: string): Promise<Response> {
    const resp = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    guardAuthResponse(resp);

    return resp;
}

export async function postFormFile(
    url: string,
    data?: { [key: string | number]: any },
    token?: string,
    contentType?: string,
): Promise<Response> {
    const resp = await fetch(url, {
        method: 'POST',
        body: data ? arrayToForm(data) : undefined,
        headers: buildFormHeaders(token, contentType),
    });

    guardAuthResponse(resp);

    return resp;
}

export async function postJson(
    url: string,
    data?: any,
    token?: string,
    customHeaders?: { [key: string]: string },
): Promise<any> {
    let headers: { [key: string]: string } = customHeaders ? customHeaders : {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';

    const resp = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers,
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok) {
        const err: any = new Error(body?.message || `Request failed (${resp.status})`);
        err.status = resp.status;
        err.data = body;
        err.errors = body?.errors;
        throw err;
    }

    return body;
}

export async function putJson(
    url: string,
    data?: any,
    token?: string,
    customHeaders?: { [key: string]: string },
): Promise<any> {
    let headers: { [key: string]: string } = customHeaders ? customHeaders : {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';

    const resp = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers,
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok) {
        const err: any = new Error(body?.message || `Request failed (${resp.status})`);
        err.status = resp.status;
        err.data = body;
        err.errors = body?.errors;
        throw err;
    }

    return body;
}

export async function deleteJson(
    url: string,
    token?: string,
    customHeaders?: { [key: string]: string },
): Promise<any> {
    let headers: { [key: string]: string } = customHeaders ? customHeaders : {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    headers['Accept'] = 'application/json';
    headers['Content-Type'] = 'application/json';

    const resp = await fetch(url, {
        method: 'DELETE',
        headers,
    });

    const body = await resp.json().catch(() => ({}));

    if (!resp.ok) {
        const err: any = new Error(body?.message || `Request failed (${resp.status})`);
        err.status = resp.status;
        err.data = body;
        err.errors = body?.errors;
        throw err;
    }

    return body;
}

export async function getJSON(
    url: string,
    token?: string,
    data?: any,
    customHeaders?: { [key: string]: string },
): Promise<any> {
    let completeURL;
    if (data) {
        let params = new URLSearchParams(data);
        completeURL = `${url}?${params.toString()}`;
    } else {
        completeURL = url;
    }

    let reqHeaders: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        : { Accept: 'application/json' };

    if (customHeaders) {
        reqHeaders = { ...reqHeaders, ...customHeaders };
    }

    const resp = await fetch(completeURL, {
        method: 'GET',
        redirect: 'follow',
        headers: reqHeaders,
    });

    return resp.json();
}

export function getJsonWithTimeout(
    url: string,
    token?: string,
    data?: any,
    customHeaders?: { [key: string]: string },
    timeout: number = 5000,
): Promise<Response> {
    let completeURL;
    if (data) {
        let params = new URLSearchParams(data);
        completeURL = `${url}?${params.toString()}`;
    } else {
        completeURL = url;
    }

    let reqHeaders: HeadersInit = token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        : { Accept: 'application/json' };

    if (customHeaders) {
        reqHeaders = { ...reqHeaders, ...customHeaders };
    }

    // expo/fetch supports AbortSignal, so we actually cancel the in-flight
    // request on timeout instead of just losing a Promise.race (which left the
    // socket open). Return type and timeout error message are unchanged.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    return fetch(completeURL, {
        method: 'GET',
        redirect: 'follow',
        headers: reqHeaders,
        signal: controller.signal,
    })
        .catch((err) => {
            if (controller.signal.aborted) {
                throw new Error(`Request for ${url} timed out after ${timeout} milliseconds`);
            }
            throw err;
        })
        .finally(() => clearTimeout(timer));
}

async function uploadFileMultipart(
    url: string,
    params: { [key: string]: any },
    token?: string,
    extras?: UploadExtras,
): Promise<Response> {
    let fileFieldName: string | undefined;
    let filePart: UploadFilePart | undefined;
    const parameters: Record<string, string> = {};

    for (const [key, value] of Object.entries(params ?? {})) {
        if (value === undefined || value === null) continue;
        if (!filePart && isFilePart(value)) {
            fileFieldName = key;
            filePart = value;
        } else {
            parameters[key] = String(value);
        }
    }

    if (!filePart) {
        throw new Error('uploadFileMultipart: no file ({ uri }) present in params');
    }

    const file = new File(filePart.uri);

    const result = await file.upload(url, {
        uploadType: UploadType.MULTIPART,
        httpMethod: 'POST',
        fieldName: fileFieldName ?? 'file',
        mimeType: filePart.type || undefined,
        parameters,
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onProgress: extras?.onProgress,
        signal: extras?.signal,
    });

    const nullBody = result.status === 204 || result.status === 205 || result.status === 304;

    const response = new Response(nullBody ? null : result.body, {
        status: result.status,
        headers: result.headers,
    });

    guardAuthResponse(response);

    return response;
}

// ============================================================================
// SELF API HELPERS (Uses stored instance and token)
// ============================================================================

export async function _selfAnonGet(path: string): Promise<any> {
    const instance = Storage.getString('app.instance');
    const url = `https://${instance}/${path}`;
    return await getJSON(url);
}

export async function _selfGet(
    path: string,
    params?: any,
    customHeaders?: { [key: string]: string } | false,
): Promise<any> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return await getJSON(url, token, params, customHeaders || undefined);
}

export async function _selfPost(
    path: string,
    params?: any,
    customHeaders?: { [key: string]: string } | false,
): Promise<any> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return postJson(url, params, token, customHeaders || undefined);
}

export async function _selfPut(
    path: string,
    params?: any,
    customHeaders?: { [key: string]: string } | false,
): Promise<any> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return putJson(url, params, token, customHeaders || undefined);
}

export async function _selfDelete(
    path: string,
    customHeaders?: { [key: string]: string } | false,
): Promise<any> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return deleteJson(url, token, customHeaders || undefined);
}

export async function _selfPostForm(path: string, params?: any): Promise<Response> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return postFormFile(url, params, token, 'multipart/form-data');
}

// ============================================================================
// AUTHENTICATION & SERVER VALIDATION
// ============================================================================

export async function loginPreflightCheck(server: string): Promise<boolean> {
    const url = 'https://' + server + '/api/v1/config';

    try {
        const res = await getJsonWithTimeout(url, undefined, undefined, undefined, 5000);
        const json = await res.json();

        if (!json) {
            Alert.alert('Error', 'This server is not compatible or is unavailable.');
            return false;
        }

        if (!json.app || !json.app.software || json.app.software != 'loops') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
            return false;
        }
    } catch (_e) {
        Alert.alert('Error', 'This server is not compatible or is unavailable.');
        return false;
    }

    return true;
}

export async function registerPreflightCheck(server: string): Promise<boolean> {
    const url = 'https://' + server + '/api/v1/config';

    try {
        const res = await getJsonWithTimeout(url, undefined, undefined, undefined, 5000);
        const json = await res.json();

        if (!json) {
            Alert.alert('Error', 'This server is not compatible or is unavailable.');
            return false;
        }

        if (!json.app || !json.app.software || json.app.software != 'loops') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
            return false;
        }

        if (!json.registration) {
            Alert.alert('Error', 'Registration is not enabled on this server');
            return false;
        }
    } catch (_e) {
        Alert.alert('Error', 'This server is not compatible or is unavailable.');
        return false;
    }

    return true;
}

export async function verifyCredentials(domain: string, token: string): Promise<any> {
    const resp = await get(`https://${domain}/api/v1/account/info/self`, token);
    return resp.json();
}

// ============================================================================
// SERVER CONFIG & PREFERENCES
// ============================================================================

export async function getConfiguration(): Promise<any> {
    try {
        const server = Storage.getString('app.instance');
        const url = `https://${server}/api/v1/config`;

        const resp = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
        });

        guardAuthResponse(resp);

        if (!resp.ok) {
            console.log('Config endpoint not available, using defaults');
            return { fyf: false };
        }

        const data = await resp.json();
        return data;
    } catch (error) {
        console.log('Error fetching config, using defaults:', error);
        return { fyf: false };
    }
}

export async function getPreferences(): Promise<any> {
    try {
        const server = Storage.getString('app.instance');
        const token = Storage.getString('app.token');

        const url = `https://${server}/api/v1/app/preferences`;

        const resp = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        guardAuthResponse(resp);

        if (!resp.ok) {
            console.log('App preferences endpoint not available, using defaults');
            return DEFAULT_APP_PREFERENCES;
        }

        const data = await resp.json();
        return data.data;
    } catch (error) {
        if (error?.message === 'auth_revoked') throw error;
        console.log('Error fetching config, using defaults:', error);
        return DEFAULT_APP_PREFERENCES;
    }
}

export async function updatePreferences(preferences: {
    autoplay_videos?: boolean;
    loop_videos?: boolean;
    default_feed?: 'local' | 'following' | 'forYou';
    hide_for_you_feed?: boolean;
    mute_on_open?: boolean;
    auto_expand_cw?: boolean;
    appearance?: 'light' | 'dark' | 'system';
}): Promise<any> {
    try {
        const server = Storage.getString('app.instance');
        const token = Storage.getString('app.token');

        if (!server || !token) {
            console.log('No server or token available');
            return null;
        }

        const url = `https://${server}/api/v1/app/preferences`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preferences),
        });

        guardAuthResponse(resp);

        if (!resp.ok) {
            console.log('Failed to update preferences on server');
            return null;
        }

        const data = await resp.json();
        return data.data;
    } catch (error) {
        if (error?.message === 'auth_revoked') throw error;
        console.error('Error updating preferences:', error);
        return null;
    }
}

// ============================================================================
// GENERIC API QUERY
// ============================================================================

export async function queryApi(endpoint: string, params: any = null): Promise<any> {
    const server = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${server}/${endpoint}`;

    return await getJSON(url, token, params);
}

// ============================================================================
// ACCOUNT ENDPOINTS
// ============================================================================

export async function fetchAccount(id: string): Promise<any> {
    const url = `api/v1/account/info/${id}`;
    return await _selfGet(url);
}

export async function fetchSelfAccount(): Promise<any> {
    const url = `api/v1/account/info/self`;
    return await _selfGet(url);
}

export async function fetchUserVideos({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const [, id, sort] = queryKey;

    let url = `api/v1/feed/account/${id}`;

    const params = new URLSearchParams();

    if (pageParam) {
        params.append('cursor', pageParam);
    }

    if (sort) {
        params.append('sort', sort);
    }

    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    return await _selfGet(url);
}

export async function fetchUserVideoCursor({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const url = pageParam
        ? `api/v1/feed/account/${queryKey[1]}/cursor?id=${queryKey[2]}&cursor=${pageParam}`
        : `api/v1/feed/account/${queryKey[1]}/cursor?id=${queryKey[2]}`;
    return await _selfGet(url);
}

export async function fetchAccountState(id: string): Promise<any> {
    return await _selfGet(`api/v1/account/state/${id}`);
}

export async function fetchAccountEmail(): Promise<any> {
    return await _selfGet('api/v1/account/settings/email');
}

export async function fetchAccountBirthdate(): Promise<any> {
    return await _selfGet('api/v1/account/settings/birthdate');
}

export async function fetchAccountPrivacy(): Promise<any> {
    return await _selfGet('api/v1/account/settings/privacy');
}

export async function fetchAccountSecurityConfig(): Promise<any> {
    return await _selfGet('api/v1/account/settings/security-config');
}

export async function fetchAccountBlocks(): Promise<any> {
    return await _selfGet('api/v1/account/settings/blocked-accounts');
}

export async function searchAccountBlocks(query, cursor): Promise<any> {
    const params = { q: query };
    if (cursor) params.cursor = cursor;
    const res = await _selfGet('api/v1/account/settings/blocked-accounts', params);
    return res;
}

// ============================================================================
// ACCOUNT RELATIONSHIPS
// ============================================================================

export async function fetchAccountFollowing({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const [, accountId, search] = queryKey;

    let url = `api/v1/account/following/${accountId}`;
    const params = new URLSearchParams();

    if (pageParam) {
        params.append('cursor', pageParam);
    }

    if (search) {
        params.append('search', search);
    }

    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    return await _selfGet(url);
}

export async function fetchAccountFollowers({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const [, accountId, search] = queryKey;

    let url = `api/v1/account/followers/${accountId}`;
    const params = new URLSearchParams();

    if (pageParam) {
        params.append('cursor', pageParam);
    }

    if (search) {
        params.append('search', search);
    }

    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    return await _selfGet(url);
}

export async function fetchAccountFriends({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/friends/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/friends/${queryKey[1]}`;
    return await _selfGet(url);
}

export async function fetchAccountSuggested({
    queryKey,
    pageParam = false,
}: {
    queryKey: any[];
    pageParam?: string | false;
}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/suggested/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/suggested/${queryKey[1]}`;
    return await _selfGet(url);
}

export async function blockAccount(id): Promise<any> {
    return await _selfPost(`api/v1/account/block/${id}`);
}

export async function unblockAccount(id): Promise<any> {
    return await _selfPost(`api/v1/account/unblock/${id}`);
}

export async function followAccount(id): Promise<any> {
    return await _selfPost(`api/v1/account/follow/${id}`);
}

export async function unfollowAccount(id): Promise<any> {
    return await _selfPost(`api/v1/account/unfollow/${id}`);
}

export async function cancelFollowRequest(id): Promise<any> {
    return await _selfPost(`api/v1/account/undo-follow-request/${id}`);
}

export async function fetchAccountPlaylists(id) {
    return await _selfGet(`api/v1/account/playlists/${id}`);
}

export async function fetchPlaylistVideos(id) {
    return await _selfGet(`api/v1/playlists/${id}/videos`);
}

export async function fetchPlaylistDetails(id) {
    const res = await _selfGet(`api/v1/playlists/${id}`);
    return res?.data;
}

export async function updatePlaylist(id, params) {
    return await _selfPut(`api/v1/studio/playlists/${id}`, params);
}

export async function deletePlaylist(id) {
    return await _selfDelete(`api/v1/studio/playlists/${id}`);
}

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

export async function fetchReportRules(): Promise<any> {
    return await _selfAnonGet('api/v1/web/report-rules');
}

export async function submitReport({
    id,
    key,
    type,
    comment,
}: {
    id: string;
    key: string;
    type: string;
    comment?: string | null;
}) {
    return await _selfPost('api/v1/report', {
        type,
        id,
        key,
        comment,
    });
}

// ============================================================================
// STARTER KIT ENDPOINTS
// ============================================================================

export async function fetchStarterKit(id): Promise<any> {
    return await _selfGet(`api/v1/starter-kits/details/${id}`);
}

export async function fetchStarterKitBrowse({ pageParam = false }): Promise<any> {
    const url = pageParam
        ? `api/v1/starter-kits/browse?cursor=${pageParam}`
        : `api/v1/starter-kits/browse`;
    const res = await _selfGet(url);
    return res;
}

export async function fetchStarterKitUsed(id): Promise<any> {
    return await _selfGet(`api/v1/starter-kits/details/${id}/used`);
}

export async function fetchStarterKitAccounts(id): Promise<any> {
    return await _selfGet(`api/v1/starter-kits/details/${id}/accounts`);
}

export async function fetchStarterKitMembership(id): Promise<any> {
    return await _selfGet(`api/v1/starter-kits/details/${id}/membership`);
}

export async function fetchStarterKitMembershipDecide(id, choice): Promise<any> {
    return await _selfPost(`api/v1/starter-kits/details/${id}/membership`, { decision: choice });
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

export async function fetchPushNotifyStatus(): Promise<any> {
    return await _selfGet('api/v1/account/settings/push-notifications/status');
}

export async function enablePushNotifications(params): Promise<any> {
    return await _selfPost('api/v1/account/settings/push-notifications/enable', params);
}

export async function disablePushNotifications(): Promise<any> {
    return await _selfPost('api/v1/account/settings/push-notifications/disable');
}

// ============================================================================
// CAMERA & COMPOSE
// ============================================================================

export async function composeAutocompleteTags(q): Promise<any> {
    return await _selfGet(`api/v1/autocomplete/tags?q=${q}`);
}

export async function composeAutocompleteMentions(q): Promise<any> {
    return await _selfGet(`api/v1/autocomplete/accounts?q=${q}`);
}

export async function uploadVideo(params: any, extras?: UploadExtras): Promise<Response> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/api/v1/studio/upload`;
    return uploadFileMultipart(url, params, token, extras);
}

export async function uploadDuet(params: any, extras?: UploadExtras): Promise<Response> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/api/v1/studio/duet/upload`;
    return uploadFileMultipart(url, params, token, extras);
}

// ============================================================================
// FEED & CONTENT
// ============================================================================

export async function fetchLocalFeed({
    pageParam = false,
}: {
    pageParam?: string | false;
} = {}): Promise<any> {
    const url = pageParam ? `api/v1/feed/for-you?cursor=${pageParam}` : `api/v1/feed/for-you`;
    return await _selfGet(url);
}

export async function fetchForYouFeed({
    pageParam = false,
}: {
    pageParam?: string | false;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v0/feed/recommended?cursor=${pageParam}`
        : `api/v0/feed/recommended`;
    return await _selfGet(url);
}

export async function fetchFollowingFeed({
    pageParam = false,
}: {
    pageParam?: string | false;
} = {}): Promise<any> {
    const url = pageParam ? `api/v1/feed/following?cursor=${pageParam}` : `api/v1/feed/following`;
    return await _selfGet(url);
}

export async function fetchSelfAccountVideos({
    queryKey,
    pageParam = false,
}: {
    queryKey?: any[];
    pageParam?: string | false;
} = {}): Promise<any> {
    const sort = queryKey?.[1];

    const params = new URLSearchParams();

    if (pageParam) {
        params.append('cursor', pageParam);
    }

    if (sort) {
        params.append('sort', sort);
    }

    const queryString = params.toString();
    const url = queryString
        ? `api/v1/feed/account/self?${queryString}`
        : `api/v1/feed/account/self`;

    return await _selfGet(url);
}

export async function fetchVideo(id): Promise<any> {
    return await _selfGet(`api/v1/video/${id}`);
}

export async function updateVideoEdit(id, params): Promise<any> {
    return await _selfPost(`api/v1/video/edit/${id}`, params);
}

export async function fetchVideoComments(id, pageParam = false): Promise<any> {
    const url = pageParam
        ? `api/v1/video/comments/${id}?cursor=${pageParam}`
        : `api/v1/video/comments/${id}`;
    return await _selfGet(url);
}

export async function fetchVideoReplies(vid, id, pageParam = false): Promise<any> {
    const url = pageParam
        ? `api/v1/video/comments/${vid}/replies?cr=${id}&cursor=${pageParam}`
        : `api/v1/video/comments/${vid}/replies?cr=${id}`;
    return await _selfGet(url);
}

export async function videoLike(id): Promise<any> {
    return await _selfPost(`api/v1/video/like/${id}`);
}

export async function videoUnlike(id): Promise<any> {
    return await _selfPost(`api/v1/video/unlike/${id}`);
}

export async function videoBookmark(id): Promise<any> {
    return await _selfPost(`api/v1/video/bookmark/${id}`);
}

export async function videoUnbookmark(id): Promise<any> {
    return await _selfPost(`api/v1/video/unbookmark/${id}`);
}

export async function commentPost({ id, commentText, parentId }): Promise<any> {
    const params = parentId
        ? {
              comment: commentText,
              parent_id: parentId,
          }
        : {
              comment: commentText,
          };
    return await _selfPost(`api/v1/video/comments/${id}`, params);
}

export async function commentLike({ videoId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/like/${videoId}/${commentId}`);
}

export async function commentUnlike({ videoId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/unlike/${videoId}/${commentId}`);
}

export async function commentReplyLike({ videoId, parentId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/like/${videoId}/${parentId}/${commentId}`);
}

export async function commentReplyUnlike({ videoId, parentId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/unlike/${videoId}/${parentId}/${commentId}`);
}

export async function commentDelete({ videoId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/delete/${videoId}/${commentId}`);
}

export async function commentReplyDelete({ videoId, parentId, commentId }): Promise<any> {
    return await _selfPost(`api/v1/comments/delete/${videoId}/${parentId}/${commentId}`);
}

export async function videoDelete(videoId): Promise<any> {
    return await _selfPost(`api/v1/video/delete/${videoId}`);
}

export async function recordImpression(
    videoId: string,
    watchDuration: number,
    completed: boolean,
): Promise<any> {
    return await _selfPost(`api/v0/feed/recommended/impression`, {
        video_id: videoId,
        watch_duration: Math.floor(watchDuration),
        completed,
    });
}

export async function fetchAccountFavorites({ pageParam }) {
    const url = pageParam
        ? `api/v1/account/favourites?cursor=${pageParam}`
        : `api/v1/account/favourites`;
    return await _selfGet(url);
}

export async function fetchAccountLikes({ pageParam }) {
    const url = pageParam
        ? `api/v1/account/videos/likes?cursor=${pageParam}`
        : `api/v1/account/videos/likes`;
    return await _selfGet(url);
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function fetchNotifications({
    pageParam,
}: {
    pageParam?: string | undefined;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/notifications?cursor=${pageParam}`
        : `api/v1/account/notifications`;
    return await _selfGet(url);
}

export async function fetchActivityNotifications({
    pageParam,
    type = 'activity',
}: {
    pageParam?: string | undefined;
    type?: string;
} = {}): Promise<any> {
    const params = new URLSearchParams({ type });
    if (pageParam) params.append('cursor', pageParam);
    return await _selfGet(`api/v1/account/notifications?${params.toString()}`);
}

export async function fetchFollowerNotifications({
    pageParam,
}: {
    pageParam?: string | undefined;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/notifications?type=followers&cursor=${pageParam}`
        : `api/v1/account/notifications?type=followers`;
    return await _selfGet(url);
}

export async function fetchStarterKitNotifications({
    pageParam,
}: {
    pageParam?: string | undefined;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/notifications?type=starterKits&cursor=${pageParam}`
        : `api/v1/account/notifications?type=starterKits`;
    return await _selfGet(url);
}

export async function fetchSystemNotifications({
    pageParam,
}: {
    pageParam?: string | undefined;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/notifications?type=system&cursor=${pageParam}`
        : `api/v1/account/notifications?type=system`;
    return await _selfGet(url);
}

export async function fetchSystemNotificationItem(id): Promise<any> {
    const url = `api/v1/account/notifications/system/${id}`;
    return await _selfGet(url);
}

export async function notificationMarkAsRead(id) {
    return await _selfPost(`api/v1/account/notifications/${id}/read`);
}

export async function notificationBadgeCount() {
    return await _selfGet(`api/v1/account/notifications/count`);
}

export async function notificationTypeMarkAllAsRead(type): Promise<any> {
    const params = {
        type: type,
    };
    return await _selfPost('api/v1/account/notifications/mark-all-read', params);
}

// ============================================================================
// ACCOUNT UPDATES
// ============================================================================

export async function updateAccountBio(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/bio', params);
}

export async function updateAccountEmail(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/email/update', params);
}

export async function updateAccountBirthdate(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/birthdate', params);
}

export async function updateAccountAvatar(params: any, extras?: UploadExtras): Promise<Response> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/api/v1/account/settings/update-avatar`;
    return uploadFileMultipart(url, params, token, extras);
}

export async function updateAccountPrivacy(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/privacy', params);
}

export async function updateAccountPassword(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/update-password', params);
}

export async function getAccountLinks(): Promise<any> {
    return await _selfGet('api/v1/account/settings/links');
}

export async function getAccountContentSettings(): Promise<any> {
    return await _selfGet('api/v1/account/settings/content');
}

export async function updateAccountContentSettings(params: { hide_ai?: boolean }) {
    const response = await _selfPost('api/v1/account/settings/content', params);
    return response.data;
}

export async function updateAddAccountLink(params: any): Promise<any> {
    return await _selfPost('api/v1/account/settings/links/add', params);
}

export async function updateDeleteAccountLink(id: any): Promise<any> {
    return await _selfPost(`api/v1/account/settings/links/delete/${id}`);
}

export const deactivateAccount = async (data) => {
    return await _selfPost('api/v1/account/settings/account/disable', data);
};

export const deleteAccount = async (data) => {
    return await _selfPost('api/v1/account/settings/account/delete', data);
};

// ============================================================================
// EXPLORE
// ============================================================================

interface Tag {
    id: number;
    name: string;
    count: number;
}

export async function getExploreTags(): Promise<any> {
    const res = await _selfGet('api/v1/explore/tags');
    return res.data as Tag[];
}

interface Account {
    id: string;
    name: string;
    avatar: string;
    username: string;
    bio: string;
    follower_count: number;
}

export async function getExploreAccounts(): Promise<any> {
    const res = await _selfGet('api/v1/accounts/suggested');
    return res.data as Account[];
}

export async function getExploreTagsFeed({
    queryKey,
    pageParam = false,
}: {
    queryKey?: any[];
    pageParam?: string | false;
} = {}): Promise<any> {
    const tag = queryKey?.[2];
    if (!tag) {
        return { data: [], meta: { next_cursor: null } };
    }

    const url = pageParam
        ? `api/v1/explore/tag-feed/${tag}?cursor=${pageParam}`
        : `api/v1/explore/tag-feed/${tag}`;

    return await _selfGet(url);
}

export async function postExploreAccountHideSuggestion(id) {
    const params = { profile_id: id };
    return await _selfPost('api/v1/accounts/suggested/hide', params);
}

// ============================================================================
// LEGAL
// ============================================================================

export async function getInstanceTerms(): Promise<any> {
    return await _selfAnonGet(`api/v1/page/content?slug=terms`);
}

export async function getInstancePrivacy(): Promise<any> {
    return await _selfAnonGet(`api/v1/page/content?slug=privacy`);
}

export async function getInstanceCommunityGuidelines(): Promise<any> {
    return await _selfAnonGet(`api/v1/page/content?slug=community-guidelines`);
}

// ============================================================================
// SEARCH
// ============================================================================

export const searchContent = async (params): Promise<any> => {
    try {
        const typeMap = {
            Top: 'all',
            Users: 'users',
            Videos: 'videos',
            Hashtags: 'hashtags',
        };
        const url = `api/v1/search`;
        const query = {
            query: params.query,
            type: typeMap[params.type],
            limit: 20,
        };
        const res = await _selfGet(url, query);
        return res.data;
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
};

// ============================================================================
// GIF KEYBOARD
// ============================================================================

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
    const res = await _selfGet(`api/v1/klipy/${type}/trending`, {
        page: page,
    });
    return res;
}

export async function fetchKlipySearch(
    type: KlipyMediaType,
    query: string,
    page: number = 1,
): Promise<KlipyResponse> {
    const res = await _selfGet(`api/v1/klipy/${type}/search`, {
        q: query,
        page: page,
    });
    return res;
}

export async function commentPostMedia(payload: {
    videoId: string;
    parentId?: string | null;
    comment?: string | null;
    type: KlipyMediaType;
    item: KlipyItem;
}) {
    const { videoId, parentId, comment, type, item } = payload;

    const res = await _selfPost(`api/v1/video/comments/${videoId}/media`, {
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
    return res;
}

// ============================================================================
// STUDIO
// ============================================================================

export const fetchAnalytics = async (
    metric: 'views' | 'likes' | 'comments' | 'shares' | 'followers',
    range: number,
) => {
    const res = await _selfGet(`api/v1/studio/analytics/${metric}`, {
        range,
    });
    return res;
};

export const fetchStudioPosts = async ({
    cursor,
    search,
    limit = 20,
    filter,
}: {
    cursor: string | null;
    search?: string;
    limit?: number;
    filter?: string;
}) => {
    const res = await _selfGet('api/v1/studio/posts', {
        cursor,
        limit,
        search: search || '',
        sort_field: 'created_at',
        sort_direction: 'desc',
        filter,
    });
    return res;
};

export const fetchProfileLinks = async () => {
    const res = await _selfGet('api/v1/account/settings/links');
    return res;
};

export const fetchProfileLinkAnalytics = async () => {
    const res = await _selfGet('api/v1/studio/analytics/links');
    return res;
};

export const fetchStudioSummary = async () => {
    const res = await _selfGet('api/v1/studio/analytics/summary');
    return res;
};

export const fetchPlaylistLimits = async () => {
    const res = await _selfGet('api/v1/studio/playlists/limits');
    return res.data;
};

export const createPlaylist = async (params) => {
    const res = await _selfPost('api/v1/studio/playlists', params);
    return res.data;
};

export const fetchPlaylists = async ({ cursor, search, sortField, sortDirection }) => {
    const res = await _selfGet('api/v1/studio/playlists', {
        cursor,
        search: search || '',
        sort_field: sortField,
        sort_direction: sortDirection,
        limit: 10,
    });
    return res;
};
