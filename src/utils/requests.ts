import { Storage } from '@/utils/cache';
import { Alert } from 'react-native';

// ============================================================================
// UTILITY HELPERS
// ============================================================================

export function getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
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

    Object.keys(obj).forEach(key =>
        form.append(key, obj[key])
    );

    return form;
}

// ============================================================================
// LOW-LEVEL HTTP METHODS (Keep unchanged as requested)
// ============================================================================

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

    return resp;
}

export async function postForm(
    url: string,
    data?: { [key: string | number]: any },
    token?: string,
    contentType?: string,
) {
    // Send a POST request with data formatted with FormData returning JSON
    let headers: { [key: string]: string } = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (contentType) headers['Content-Type'] = contentType;

    const resp = await fetch(url, {
        method: 'POST',
        body: data ? objectToForm(data) : undefined,
        headers,
    });

    return resp;
}

// ============================================================================
// ADDITIONAL HTTP METHODS
// ============================================================================

export async function post(url: string, token?: string): Promise<Response> {
    const resp = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return resp;
}

export async function postFormFile(
    url: string,
    data?: { [key: string | number]: any },
    token?: string,
    contentType?: string,
): Promise<Response> {
    let headers: { [key: string]: string } = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (contentType) headers['Content-Type'] = contentType;

    const resp = await fetch(url, {
        method: 'POST',
        body: data ? arrayToForm(data) : undefined,
        headers,
    });

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

    return resp.json();
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

    let reqHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

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

    let reqHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    if (customHeaders) {
        reqHeaders = { ...reqHeaders, ...customHeaders };
    }

    return Promise.race([
        fetch(completeURL, {
            method: 'GET',
            redirect: 'follow',
            headers: reqHeaders,
        }),
        new Promise<Response>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request for ${url} timed out after ${timeout} milliseconds`));
            }, timeout);
        }),
    ]);
}

// ============================================================================
// SELF API HELPERS (Uses stored instance and token)
// ============================================================================

export async function _selfGet(
    path: string,
    params?: any,
    customHeaders?: { [key: string]: string } | false,
): Promise<any> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return getJSON(url, token, params, customHeaders || undefined);
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

export async function _selfPostForm(
    path: string,
    params?: any,
): Promise<Response> {
    const instance = Storage.getString('app.instance');
    const token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return postFormFile(url, params, token, 'multipart/form-data');
}

// ============================================================================
// AUTHENTICATION & SERVER VALIDATION
// ============================================================================

export async function loginPreflightCheck(server: string): Promise<boolean> {
    const url = 'https://' + server + '/nodeinfo/2.1';

    try {
        const res = await getJsonWithTimeout(url, undefined, undefined, undefined, 5000);
        const json = await res.json();
        
        if (!json) {
            Alert.alert('Error', 'This server is not compatible or is unavailable.');
            return false;
        }

        if (
            !json.software ||
            !json.software.name ||
            !json.software.version ||
            !json.software.repository
        ) {
            Alert.alert('Error', 'Cannot reach server. Invalid software');
            return false;
        }

        if (json.software.name !== 'loops') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
            return false;
        }

        if (json.software.repository !== 'https://github.com/joinloops/loops-server') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
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

export async function fetchAccountState(id: string): Promise<any> {
    return await _selfGet(`api/v1/account/state/${id}`);
}

export async function fetchAccountEmail(): Promise<any> {
    return await _selfGet('api/v1/account/settings/email');
}

// ============================================================================
// ACCOUNT RELATIONSHIPS
// ============================================================================

export async function fetchAccountFollowing({ 
    queryKey, 
    pageParam = false 
}: { 
    queryKey: any[]; 
    pageParam?: string | false;
}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/following/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/following/${queryKey[1]}`;
    return await _selfGet(url);
}

export async function fetchAccountFollowers({ 
    queryKey, 
    pageParam = false 
}: { 
    queryKey: any[]; 
    pageParam?: string | false;
}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/followers/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/followers/${queryKey[1]}`;
    return await _selfGet(url);
}

// ============================================================================
// FEED & CONTENT
// ============================================================================

export async function fetchSelfAccountVideos({ 
    pageParam = false 
}: { 
    pageParam?: string | false;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/feed/account/self?cursor=${pageParam}`
        : `api/v1/feed/account/self`;
    return await _selfGet(url);
}

export async function fetchNotifications({ 
    pageParam = false 
}: { 
    pageParam?: string | false;
} = {}): Promise<any> {
    const url = pageParam
        ? `api/v1/account/notifications?cursor=${pageParam}`
        : `api/v1/account/notifications`;
    return await _selfGet(url);
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

export async function updateAccountAvatar(params: any): Promise<Response> {
    return await _selfPostForm('api/v1/account/settings/update-avatar', params);
}