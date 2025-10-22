import { useAuthStore } from '@/utils/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2 } },
});

export default function RootLayout() {
    const { isLoggedIn, shouldCreateAccount, hasCompletedOnboarding, _hasHydrated } =
        useAuthStore();

    useEffect(() => {
        if (_hasHydrated) {
            SplashScreen.hideAsync();
        }
    }, [_hasHydrated]);

    if (!_hasHydrated) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
                <React.Fragment>
                    <StatusBar style="auto" />
                    <Stack>
                        <Stack.Protected guard={isLoggedIn}>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="private" />
                            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                        </Stack.Protected>
                        <Stack.Protected guard={!isLoggedIn && hasCompletedOnboarding}>
                            <Stack.Screen
                                name="sign-in"
                                options={{ headerShown: false, gestureEnabled: false }}
                            />
                            <Stack.Protected guard={shouldCreateAccount}>
                                <Stack.Screen name="create-account" />
                            </Stack.Protected>
                        </Stack.Protected>
                        <Stack.Protected guard={!hasCompletedOnboarding}>
                            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                        </Stack.Protected>
                    </Stack>
                </React.Fragment>
            </QueryClientProvider>
        </SafeAreaProvider>
    );
}
