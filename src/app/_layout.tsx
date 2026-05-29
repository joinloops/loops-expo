import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 2 } },
});

function useNotificationObserver() {
    useEffect(() => {
        function redirect(notification: Notifications.Notification) {
            const url = notification.request.content.data?.url;
            if (typeof url === 'string') {
                router.push(url);
            }
        }

        const response = Notifications.getLastNotificationResponse();
        if (response?.notification) {
            redirect(response.notification);
        }

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            redirect(response.notification);
        });

        return () => {
            subscription.remove();
        };
    }, []);
}

function AppContent() {
    const { isLoggedIn, shouldCreateAccount } = useAuthStore();
    const { colorScheme } = useTheme();
    const systemColorScheme = useColorScheme();

    useNotificationObserver();

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
                <Stack.Protected guard={isLoggedIn}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="private" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack.Protected>

                <Stack.Protected guard={!isLoggedIn}>
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
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
                <ThemeProvider>
                    <QueryClientProvider client={queryClient}>
                        <AppContent />
                    </QueryClientProvider>
                </ThemeProvider>
            </KeyboardProvider>
        </GestureHandlerRootView>
    );
}
