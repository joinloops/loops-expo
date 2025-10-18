import { LoopsUser, OAuthService } from '@/services/oauth';
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
    loginWithOAuth: (server: string, scopes?: string) => Promise<boolean>;
    refreshAccessToken: () => Promise<boolean>;
    logOut: () => void;
    completeOnboarding: () => void;
    resetOnboarding: () => void;
    setHasHydrated: (value: boolean) => void;
    setUser: (user: LoopsUser, server: string) => void;
    clearUser: () => void;
    syncAuthState: () => void;
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

            /**
             * Initiates OAuth login flow with a Loops instance
             */
            loginWithOAuth: async (server: string, scopes?: string) => {
                try {
                    const success = await OAuthService.login(server, scopes);

                    if (success) {
                        // After successful OAuth, sync the auth state
                        get().syncAuthState();
                    }

                    return success;
                } catch (error) {
                    console.error('OAuth login failed:', error);
                    return false;
                }
            },

            /**
             * Refreshes the OAuth access token
             */
            refreshAccessToken: async () => {
                try {
                    const success = await OAuthService.refreshToken();

                    if (success) {
                        // Sync auth state after token refresh
                        get().syncAuthState();
                    } else {
                        // If refresh fails, log out the user
                        get().logOut();
                    }

                    return success;
                } catch (error) {
                    console.error('Token refresh failed:', error);
                    get().logOut();
                    return false;
                }
            },

            /**
             * Syncs auth state from storage (called after OAuth success or app restart)
             */
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
             * Sets user data in the store
             */
            setUser: (user: LoopsUser, server: string) => {
                set((state) => ({
                    ...state,
                    user,
                    server,
                    isLoggedIn: true,
                }));
            },

            /**
             * Clears user data from the store
             */
            clearUser: () => {
                set((state) => ({
                    ...state,
                    user: null,
                    server: null,
                    isLoggedIn: false,
                }));
            },

            logOut: () => {
                // Clear OAuth credentials
                OAuthService.logout();

                // Clear store state
                set((state) => ({
                    ...state,
                    isLoggedIn: false,
                    user: null,
                    server: null,
                }));
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

                // After hydration, sync auth state from storage
                if (value) {
                    get().syncAuthState();
                }
            },
        }),
        {
            name: 'auth-store',
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
            // Don't persist user data in Zustand since it's in MMKV
            partialize: (state) => ({
                shouldCreateAccount: state.shouldCreateAccount,
                hasCompletedOnboarding: state.hasCompletedOnboarding,
            }),
        },
    ),
);
