import { notificationBadgeCount } from '@/utils/requests';
import { create } from 'zustand';

interface NotificationState {
    badgeCount: number;
    isLoading: boolean;
    lastFetched: number | null;
    refetchBadgeCount: () => Promise<void>;
    fetchBadgeCount: () => Promise<void>;
    resetBadgeCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    badgeCount: 0,
    isLoading: false,
    lastFetched: null,

    fetchBadgeCount: async () => {
        const now = Date.now();
        const { lastFetched } = get();
        if (lastFetched && now - lastFetched < 30000) {
            return;
        }

        set({ isLoading: true });
        try {
            const count = await notificationBadgeCount();
            set({ badgeCount: count.data.unread_count, lastFetched: now, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch badge count:', error);
            set({ isLoading: false });
        }
    },

    refetchBadgeCount: async () => {
        const now = Date.now();

        set({ isLoading: true });
        try {
            const count = await notificationBadgeCount();
            set({ badgeCount: count.data.unread_count, lastFetched: now, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch badge count:', error);
            set({ isLoading: false });
        }
    },

    resetBadgeCount: () => set({ badgeCount: 0 }),
}));