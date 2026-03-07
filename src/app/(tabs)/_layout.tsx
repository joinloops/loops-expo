import Avatar from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Image } from 'react-native';
import props from '@/components/profile/AccountHeader';
import tw from 'twrnc';

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
                tabBarActiveTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#101828',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#99A1AF' : '#6A7282',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                    outlineWidth: 2,
                    outlineColor: colorScheme === 'dark' ? '#1e2939' : '#E5E7EB',
                    height: Platform.OS === 'ios' ? 96 : 96,
                    paddingTop: Platform.OS === 'ios' ? 12 : 6,
                    paddingBottom: Platform.OS === 'ios' ? 9 : 6,
                    elevation: 0,
                    shadowColor: '#666',
                    shadowOpacity: 0,
                    shadowOffset: {
                        height: 0,
                    },
                    shadowRadius: 0,
                    borderRadius: 0,
                    position: Platform.OS === 'ios' ? 'static' : 'absolute',
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarAccessibilityLabel: 'Home',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'home' : 'home-outline';
                        // size = focused ? 32 : 28;

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                    tabBarLabelStyle: {
                        fontWeight: 100,
                    },
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarAccessibilityLabel: 'Explore',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'compass' : 'compass-outline';
                        // size = focused ? 32 : 28;

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: 'Create',
                    tabBarAccessibilityLabel: 'Create',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'plus-box' : 'plus-box-outline';
                        // size = focused ? 32 : 28;

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
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
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'bell' : 'bell-outline';
                        // size = focused ? 32 : 28;

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarAccessibilityLabel: 'Profile',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;
                        let style;

                        iconName = focused ? 'account' : 'account-outline';
                        // size = focused ? 32 : 28;
                        style = focused
                            ? {
                                  outlineWidth: 2.5,
                                  outlineColor: colorScheme === 'dark' ? '#FFFFFF' : '#101828',
                              }
                            : null;

                        return <Avatar url={props.user?.avatar} theme="tab" style={style} />;
                    },
                }}
            />
        </Tabs>
    );
}
