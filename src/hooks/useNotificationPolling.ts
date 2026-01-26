import { useNotificationStore } from '@/utils/notificationStore';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useNotificationPolling(intervalMs: number = 900000) {
    const { fetchBadgeCount } = useNotificationStore();
    const appState = useRef(AppState.currentState);
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchBadgeCount();

        const startPolling = () => {
            if (pollInterval.current) return;
            
            pollInterval.current = setInterval(() => {
                fetchBadgeCount();
            }, intervalMs);
        };

        const stopPolling = () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
                pollInterval.current = null;
            }
        };

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            const currentState = appState.current;

            // Handle null case - treat null as if app was in background
            if (currentState && currentState.match(/inactive|background/) && nextAppState === 'active') {
                fetchBadgeCount();
                startPolling();
            } else if (nextAppState.match(/inactive|background/)) {
                stopPolling();
            }
            appState.current = nextAppState;
        });

        startPolling();

        return () => {
            stopPolling();
            subscription.remove();
        };
    }, [fetchBadgeCount, intervalMs]);
}
