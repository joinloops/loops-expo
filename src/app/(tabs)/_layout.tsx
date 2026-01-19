import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

export default function TabsLayout() {
    const { user } = useAuthStore();
    const { badgeCount } = useNotificationStore();
    const { colorScheme } = useTheme();

    const displayBadgeCount = useMemo(() => {
        if (badgeCount == 0) return undefined;
        if (badgeCount > 99) return '99+';
        return badgeCount;
    }, [badgeCount]);

    useNotificationPolling(900000);

    return (
        <Tabs
            initialRouteName="index"
            screenOptions={{
                backBehavior: 'order',
                tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#555' : '#999',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                    borderTopWidth: 1,
                    borderTopColor: colorScheme === 'dark' ? '#1e2939' : '#eee',
                    height: Platform.OS === 'ios' ? 94 : 94,
                    paddingTop: Platform.OS === 'ios' ? 11 : 5,
                    paddingBottom: Platform.OS === 'ios' ? 8 : 5,
                    elevation: 0,
                    shadowColor: '#666',
                    shadowOpacity: 0,
                    shadowOffset: {
                        height: 0,
                    },
                    shadowRadius: 0,
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarAccessibilityLabel: 'Home',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarAccessibilityLabel: 'Explore',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="compass" color={color} />,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: 'Create',
                    tabBarAccessibilityLabel: 'Create',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="video" color={color} />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Notifications',
                    tabBarAccessibilityLabel: 'Notifications',
                    tabBarShowLabel: false,
                    tabBarBadge: displayBadgeCount,
                    tabBarBadgeStyle: { fontSize: 12 },
                    tabBarIcon: ({ color }) => <Feather size={28} name="inbox" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarAccessibilityLabel: 'Profile',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="user" color={color} />,
                }}
            />
        </Tabs>
    );
}
