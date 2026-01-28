import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2 } },
});

function AppContent() {
    const { isLoggedIn, shouldCreateAccount, hasCompletedOnboarding } = useAuthStore();
    const { colorScheme } = useTheme();
    const systemColorScheme = useColorScheme();

    const getStatusBarStyle = () => {
        if (colorScheme === 'device') {
            return systemColorScheme === 'dark' ? 'light' : 'dark';
        }
        return colorScheme === 'dark' ? 'light' : 'dark';
    };

    return (
        <React.Fragment>
            <StatusBar style={getStatusBarStyle()} />
            <Stack>
                {/* Show onboarding if not completed, regardless of login status */}
                <Stack.Protected guard={!hasCompletedOnboarding}>
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                </Stack.Protected>

                {/* Show main app only if logged in AND completed onboarding */}
                <Stack.Protected guard={hasCompletedOnboarding && isLoggedIn}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="private" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack.Protected>

                {/* Show auth screens only if completed onboarding but not logged in */}
                <Stack.Protected guard={hasCompletedOnboarding && !isLoggedIn}>
                    <Stack.Screen
                        name="sign-in"
                        options={{ headerShown: false, gestureEnabled: false }}
                    />
                    <Stack.Protected guard={shouldCreateAccount}>
                        <Stack.Screen name="create-account" />
                    </Stack.Protected>
                </Stack.Protected>
            </Stack>
        </React.Fragment>
    );
}

export default function RootLayout() {
    const { _hasHydrated } = useAuthStore();

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
            <KeyboardProvider>
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>
                        <AppContent />
                    </QueryClientProvider>
                </ThemeProvider>
            </KeyboardProvider>
        </SafeAreaProvider>
    );
}
