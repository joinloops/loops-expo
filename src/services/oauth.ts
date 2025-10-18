import { Storage } from '@/utils/cache';
import { get, loginPreflightCheck, postForm } from '@/utils/requests';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export interface OAuthApp {
    client_id: string;
    client_secret: string;
    instance: string;
    client_name: string;
    redirect_uris: array;
}

export interface OAuthToken {
    access_token: string;
    refresh_token: string;
    token_type: string;
    scope: string;
    created_at: number;
    expires_in: number;
}

export interface LoopsUser {
    id: string;
    username: string;
    acct: string;
    display_name: string;
    avatar: string;
    header?: string;
    note?: string;
    followers_count: number;
    following_count: number;
    statuses_count: number;
    [key: string]: any;
}

export class OAuthService {
    private static readonly APP_NAME = `Loops for ${Platform.OS === 'android' ? 'Android' : 'iOS'}`;
    private static readonly DEFAULT_SCOPES = 'user:read user:write video:create video:read';

    private static getRedirectUri(): string {
        return Linking.createURL('oauth-callback');
    }

    /**
     * Initiates the OAuth login flow
     */
    static async login(server: string, enabledScopes?: string): Promise<boolean> {
        try {
            const scopes = enabledScopes || this.DEFAULT_SCOPES;

            // Perform preflight check
            const precheck = await loginPreflightCheck(server);
            if (!precheck) {
                Alert.alert(
                    'Error',
                    'Unable to connect to server. Please check the URL and try again.',
                );
                return false;
            }

            const url = `https://${server}`;
            const REDIRECT_URI = this.getRedirectUri();

            console.log('OAuth Redirect URI:', REDIRECT_URI);

            // Register OAuth application
            const app = await this.registerApp(url, REDIRECT_URI, scopes);
            if (!app) {
                Alert.alert('Error', 'Failed to register application with server.');
                return false;
            }

            // Store app credentials
            this.storeAppCredentials(app);

            // Build authorization URL
            const authUrl =
                `${url}/oauth/authorize` +
                `?client_id=${app.client_id}` +
                `&scope=${scopes.split(' ').join('+')}` +
                `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                `&response_type=code`;

            console.log('Opening auth URL:', authUrl);

            // Open OAuth authorization in browser
            const authResult = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI, {
                showInRecents: true,
                createTask: false,
            });

            console.log('Auth result:', authResult);

            if (authResult.type === 'success') {
                return await this.handleCallback(authResult.url);
            } else if (authResult.type === 'cancel') {
                console.log('User cancelled OAuth flow');
                return false;
            } else {
                Alert.alert('Error', 'Authentication was unsuccessful. Please try again.');
                return false;
            }
        } catch (error) {
            console.error('OAuth login error:', error);
            Alert.alert('Error', 'An error occurred during login. Please try again.');
            return false;
        }
    }

    /**
     * Registers the app with the Loops instance
     */
    private static async registerApp(
        instanceUrl: string,
        redirectUri: string,
        scopes: string,
    ): Promise<OAuthApp | null> {
        try {
            const formBody = {
                client_name: this.APP_NAME,
                redirect_uris: [redirectUri],
                scopes: scopes,
                website: 'https://joinloops.org',
            };

            console.log('Registering app with:', formBody);

            const response = await postForm(`${instanceUrl}/api/v1/apps`, formBody);
            const app = await response.json();

            // Extract server domain from instanceUrl
            const server = instanceUrl.replace('https://', '').replace('http://', '');

            return {
                ...app,
                instance: server,
            };
        } catch (error) {
            console.error('App registration error:', error);
            return null;
        }
    }

    /**
     * Stores app credentials securely
     */
    private static storeAppCredentials(app: OAuthApp): void {
        Storage.set('app.client_id', app.client_id);
        Storage.set('app.client_secret', app.client_secret);
        Storage.set('app.instance', app.instance);
        Storage.set('app.name', app.client_name);
        Storage.set('app.redirect_uri', app.redirect_uris[0]);
    }

    /**
     * Handles the OAuth callback after user authorization
     */
    private static async handleCallback(url: string): Promise<boolean> {
        try {
            console.log('Handling callback URL:', url);

            const { queryParams } = Linking.parse(url);

            // Check for errors in callback
            if (queryParams?.message || queryParams?.error) {
                Alert.alert('Error', (queryParams.message || queryParams.error) as string);
                return false;
            }

            if (!queryParams?.code) {
                Alert.alert('Error', 'Authorization code not received.');
                return false;
            }

            // Retrieve stored app credentials
            const instance = Storage.getString('app.instance');
            const clientId = Storage.getString('app.client_id');
            const clientSecret = Storage.getString('app.client_secret');

            if (!instance || !clientId || !clientSecret) {
                throw new Error('App credentials missing. Please try logging in again.');
            }

            const api = `https://${instance}`;
            const REDIRECT_URI = this.getRedirectUri();

            // Exchange authorization code for access token
            const token = await this.exchangeCodeForToken(
                api,
                clientId,
                clientSecret,
                REDIRECT_URI,
                queryParams.code as string,
            );

            if (!token) {
                Alert.alert('Error', 'Failed to obtain access token.');
                return false;
            }

            // Store token data
            this.storeTokenData(token);

            // Verify credentials and get user profile
            const user = await this.verifyCredentials(api, token.access_token);
            if (!user) {
                Alert.alert('Error', 'Failed to verify user credentials.');
                return false;
            }

            // Store user profile
            Storage.set('user.profile', JSON.stringify(user));
            Storage.set('user.server', instance);
            Storage.set('user.token', token.access_token);

            console.log('OAuth login successful for user:', user.username);

            return true;
        } catch (error) {
            console.error('OAuth callback error:', error);
            Alert.alert('Error', 'Failed to complete login. Please try again.');
            return false;
        }
    }

    /**
     * Exchanges authorization code for access token
     */
    private static async exchangeCodeForToken(
        apiUrl: string,
        clientId: string,
        clientSecret: string,
        redirectUri: string,
        code: string,
    ): Promise<OAuthToken | null> {
        try {
            const tokenRequestBody = {
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
                code: code,
                scope: this.DEFAULT_SCOPES,
            };

            console.log('Exchanging code for token...');

            const response = await postForm(`${apiUrl}/oauth/token`, tokenRequestBody);
            const token = await response.json();

            return token;
        } catch (error) {
            console.error('Token exchange error:', error);
            return null;
        }
    }

    /**
     * Stores OAuth token data
     */
    private static storeTokenData(token: OAuthToken): void {
        Storage.set('app.token', token.access_token);
        Storage.set('app.refresh_token', token.refresh_token);
        Storage.set('app.expires_in', token.expires_in?.toString());
    }

    /**
     * Verifies user credentials and fetches profile
     */
    private static async verifyCredentials(
        apiUrl: string,
        accessToken: string,
    ): Promise<LoopsUser | null> {
        try {
            const response = await get(`${apiUrl}/api/v1/account/info/self`, accessToken);
            const user = await response.json();
            return user.data;
        } catch (error) {
            console.error('Credential verification error:', error);
            return null;
        }
    }

    /**
     * Refreshes the access token using refresh token
     */
    static async refreshToken(): Promise<boolean> {
        try {
            const instance = Storage.getString('app.instance');
            const clientId = Storage.getString('app.client_id');
            const clientSecret = Storage.getString('app.client_secret');
            const refreshToken = Storage.getString('app.refresh_token');

            if (!instance || !clientId || !clientSecret || !refreshToken) {
                return false;
            }

            const api = `https://${instance}`;

            const tokenRequestBody = {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            };

            const response = await postForm(`${api}/oauth/token`, tokenRequestBody);
            const token = await response.json();

            this.storeTokenData(token);
            Storage.set('user.token', token.access_token);

            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    /**
     * Logs out the user by clearing all stored credentials
     */
    static logout(): void {
        // Clear app credentials
        Storage.remove('app.client_id');
        Storage.remove('app.client_secret');
        Storage.remove('app.instance');
        Storage.remove('app.name');
        Storage.remove('app.redirect_uri');
        Storage.remove('app.token');
        Storage.remove('app.refresh_token');
        Storage.remove('app.expires_in');

        // Clear user data
        Storage.remove('user.profile');
        Storage.remove('user.server');
        Storage.remove('user.token');
    }

    /**
     * Gets the current user profile from storage
     */
    static getCurrentUser(): LoopsUser | null {
        const profileJson = Storage.getString('user.profile');
        if (!profileJson) return null;

        try {
            return JSON.parse(profileJson);
        } catch {
            return null;
        }
    }

    /**
     * Gets the current access token
     */
    static getAccessToken(): string | null {
        return Storage.getString('user.token') || Storage.getString('app.token') || null;
    }

    /**
     * Gets the current server instance
     */
    static getCurrentServer(): string | null {
        return Storage.getString('user.server') || Storage.getString('app.instance') || null;
    }

    /**
     * Checks if user is currently authenticated
     */
    static isAuthenticated(): boolean {
        const token = this.getAccessToken();
        const user = this.getCurrentUser();
        return !!(token && user);
    }
}
