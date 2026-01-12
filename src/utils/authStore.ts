import { LoopsUser, OAuthService } from '@/services/oauth';
import { useNotificationStore } from '@/utils//notificationStore';
import { getPreferences, updatePreferences } from '@/utils/requests';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type UserState = {
    isLoggedIn: boolean;
    shouldCreateAccount: boolean;
    hasCompletedOnboarding: boolean;
    _hasHydrated: boolean;
    user: LoopsUser | null;
    server: string | null;
    hideForYouFeed: boolean;
    defaultFeed: 'following' | 'local' | 'forYou';
    autoplayVideos: boolean;
    loopVideos: boolean;
    muteOnOpen: boolean;
    autoExpandCw: boolean;
    appearance: 'light' | 'dark' | 'system';
    loginWithOAuth: (server: string, scopes?: string) => Promise<boolean>;
    registerWithWebBrowser: (server: string) => Promise<boolean>;
    refreshAccessToken: () => Promise<boolean>;
    logOut: () => void;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
    setHasHydrated: (value: boolean) => void;
    setUser: (user: LoopsUser, server: string) => void;
    clearUser: () => void;
    syncAuthState: () => void;
    syncPreferencesFromServer: () => Promise<void>;
    setHideForYouFeed: (value: boolean) => Promise<void>;
    setDefaultFeed: (feed: 'following' | 'local' | 'forYou') => Promise<void>;
    updatePreference: (key: string, value: any) => Promise<void>;
};

export const useAuthStore = create(
    persist<UserState>(
        (set, get) => ({
            isLoggedIn: false,
            shouldCreateAccount: false,
            hasCompletedOnboarding: false,
            _hasHydrated: false,
            user: null,
            server: null,
            hideForYouFeed: false,
            defaultFeed: 'local',
            autoplayVideos: true,
            loopVideos: true,
            muteOnOpen: false,
            autoExpandCw: false,
            appearance: 'light',

            loginWithOAuth: async (server: string, scopes?: string) => {
                try {
                    const success = await OAuthService.login(server, scopes);

                    if (success) {
                        get().syncAuthState();
                        await get().syncPreferencesFromServer();
                        await useNotificationStore.getState().refetchBadgeCount();
                    }

                    return success;
                } catch (error) {
                    console.error('OAuth login failed:', error);
                    return false;
                }
            },

            registerWithWebBrowser: async (server: string) => {
                try {
                    const success = await OAuthService.registerWithWebBrowser(server);

                    if (success) {
                        get().syncAuthState();
                        await get().syncPreferencesFromServer();
                        await useNotificationStore.getState().refetchBadgeCount();
                    }

                    return success;
                } catch (error) {
                    console.error('Registration failed:', error);
                    return false;
                }
            },

            refreshAccessToken: async () => {
                try {
                    const success = await OAuthService.refreshToken();

                    if (success) {
                        get().syncAuthState();
                    } else {
                        get().logOut();
                    }

                    return success;
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    get().logOut();
                    return false;
                }
            },

            syncAuthState: () => {
                const user = OAuthService.getCurrentUser();
                const server = OAuthService.getCurrentServer();
                const isAuthenticated = OAuthService.isAuthenticated();

                set((state) => ({
                    ...state,
                    isLoggedIn: isAuthenticated,
                    user: user,
                    server: server,
                }));
            },

            /**
             * Syncs preferences from the server
             */
            syncPreferencesFromServer: async () => {
                try {
                    const prefs = await getPreferences();
                    
                    if (prefs && prefs.settings) {
                        set((state) => ({
                            ...state,
                            hideForYouFeed: prefs.settings.hide_for_you_feed ?? state.hideForYouFeed,
                            defaultFeed: prefs.settings.default_feed ?? state.defaultFeed,
                            autoplayVideos: prefs.settings.autoplay_videos ?? state.autoplayVideos,
                            loopVideos: prefs.settings.loop_videos ?? state.loopVideos,
                            muteOnOpen: prefs.settings.mute_on_open ?? state.muteOnOpen,
                            autoExpandCw: prefs.settings.auto_expand_cw ?? state.autoExpandCw,
                            appearance: prefs.settings.appearance ?? state.appearance,
                        }));
                    }
                } catch (error) {
                    console.error('Failed to sync preferences from server:', error);
                }
            },

            /**
             * Updates a preference both locally and on the server
             */
            updatePreference: async (key: string, value: any) => {
                set((state) => ({
                    ...state,
                    [key]: value,
                }));

                const keyMap: Record<string, string> = {
                    hideForYouFeed: 'hide_for_you_feed',
                    defaultFeed: 'default_feed',
                    autoplayVideos: 'autoplay_videos',
                    loopVideos: 'loop_videos',
                    muteOnOpen: 'mute_on_open',
                    autoExpandCw: 'auto_expand_cw',
                    appearance: 'appearance',
                };

                const apiKey = keyMap[key] || key;
                
                try {
                    await updatePreferences({ [apiKey]: value });
                } catch (error) {
                    console.error('Failed to update preference on server:', error);
                }
            },

            setHideForYouFeed: async (value: boolean) => {
                await get().updatePreference('hideForYouFeed', value);
            },

            setDefaultFeed: async (feed: 'following' | 'local' | 'forYou') => {
                await get().updatePreference('defaultFeed', feed);
            },

            setUser: (user: LoopsUser, server: string) => {
                set((state) => ({
                    ...state,
                    user,
                    server,
                    isLoggedIn: true,
                }));
            },

            clearUser: () => {
                set((state) => ({
                    ...state,
                    user: null,
                    server: null,
                    isLoggedIn: false,
                }));
            },

            logOut: (onComplete?: () => void) => {
                // Clear OAuth credentials
                OAuthService.logout();

                // Cear store state
                set((state) => ({
                    ...state,
                    isLoggedIn: false,
                    user: null,
                    server: null,
                }));

                onComplete?.();
            },

            completeOnboarding: () => {
                set((state) => ({
                    ...state,
                    hasCompletedOnboarding: true,
                }));
            },

            resetOnboarding: () => {
                set((state) => ({
                    ...state,
                    hasCompletedOnboarding: false,
                }));
            },

            setHasHydrated: (value: boolean) => {
                set((state) => ({
                    ...state,
                    _hasHydrated: value,
                }));

                if (value) {
                    get().syncAuthState();
                    if (get().isLoggedIn) {
                        get().syncPreferencesFromServer();
                    }
                }
            },
        }),
        {
            name: 'auth-store.v0.4',
            storage: createJSONStorage(() => ({
                setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
                getItem: (key: string) => SecureStore.getItemAsync(key),
                removeItem: (key: string) => SecureStore.deleteItemAsync(key),
            })),
            onRehydrateStorage: () => {
                return (state) => {
                    state?.setHasHydrated(true);
                };
            },

            partialize: (state) => ({
                shouldCreateAccount: state.shouldCreateAccount,
                hasCompletedOnboarding: state.hasCompletedOnboarding,
                hideForYouFeed: state.hideForYouFeed,
                defaultFeed: state.defaultFeed,
                autoplayVideos: state.autoplayVideos,
                loopVideos: state.loopVideos,
                muteOnOpen: state.muteOnOpen,
                autoExpandCw: state.autoExpandCw,
                appearance: state.appearance,
            }),
        },
    ),
);
