import { Storage } from '@/utils/cache';
import { Alert } from 'react-native';

export function objectToForm(obj: { [key: string | number]: any }) {
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

export async function postJson(
    url: string,
    data?: any,
    token?: string,
    customHeaders?: { [key: string]: string },
) {
    // Send a POST request with data formatted with FormData returning JSON
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

export async function post(url: string, token?: string) {
    const resp = await fetch(url, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    return resp;
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

    return resp;
}

export async function getJSON(
    url: string,
    token?: string,
    data?: any,
    customHeaders?: { [key: string]: string },
) {
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

export async function _selfGet(path, params, customHeaders = false) {
    let instance = Storage.getString('app.instance');
    let token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return getJSON(url, token, params, customHeaders);
}

export async function _selfPost(path, params, customHeaders = false) {
    let instance = Storage.getString('app.instance');
    let token = Storage.getString('app.token');
    const url = `https://${instance}/${path}`;
    return postJson(url, params, token, customHeaders);
}

export function getJsonWithTimeout(
    url: string,
    token?: string,
    data?: any,
    customHeaders?: { [key: string]: string },
    timeout = 5000,
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

export async function loginPreflightCheck(server: string) {
    let url = 'https://' + server + '/nodeinfo/2.1';

    try {
        let res = await getJsonWithTimeout(url, undefined, false, undefined, 5000);
        let json = await res.json();
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

        if (json.software.name != 'loops') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
            return false;
        }

        if (json.software.repository != 'https://github.com/joinloops/loops-server') {
            Alert.alert('Error', 'Invalid server type, this app is only compatible with Loops');
            return false;
        }
    } catch (_e) {
        Alert.alert('Error', 'This server is not compatible or is unavailable.');
        return false;
    }

    return true;
}

export async function verifyCredentials(domain: string, token: string) {
    const resp = await get(`https://${domain}/api/v1/account/info/self`, token);

    return resp.json();
}

export async function queryApi(endpoint: string, params = null) {
    let server = Storage.getString('app.instance');
    let token = Storage.getString('app.token');

    let url = `https://${server}/${endpoint}`;

    return await getJSON(url, token, params);
}

export async function fetchAccount(id) {
    const url = `api/v1/account/info/${id}`;
    return await _selfGet(url);
}

export async function fetchSelfAccount() {
    const url = `api/v1/account/info/self`;
    return await _selfGet(url);
}

export async function fetchAccountFollowing({ queryKey, pageParam = false }) {
    const url = pageParam
        ? `api/v1/account/following/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/following/${queryKey[1]}`;
    return await _selfGet(url);
}

export async function fetchAccountFollowers({ queryKey, pageParam = false }) {
    const url = pageParam
        ? `api/v1/account/followers/${queryKey[1]}?cursor=${pageParam}`
        : `api/v1/account/followers/${queryKey[1]}`;
    return await _selfGet(url);
}

export async function fetchSelfAccountVideos({ pageParam = false }) {
    const url = pageParam
        ? `api/v1/feed/account/self?cursor=${pageParam}`
        : `api/v1/feed/account/self`;
    return await _selfGet(url);
}

export async function fetchAccountState(id) {
    return await _selfGet(`api/v1/account/state/${id}`);
}

export async function fetchNotifications({ pageParam = false }) {
    const url = pageParam
        ? `api/v1/account/notifications?cursor=${pageParam}`
        : `api/v1/account/notifications`;
    return await _selfGet(url);
}

export async function updateAccountBio(params) {
    return await _selfPost('api/v1/account/settings/bio', params);
}

export async function fetchAccountEmail() {
    return await _selfGet('api/v1/account/settings/email');
}

export async function updateAccountEmail(params) {
    return await _selfPost('api/v1/account/settings/email/update', params);
}
