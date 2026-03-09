import Avatar from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Image, StyleSheet } from 'react-native';
import props from '@/components/profile/AccountHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import tw from 'twrnc';

export default function TabsLayout() {
    const { user } = useAuthStore();
    const { badgeCount } = useNotificationStore();
    const { colorScheme } = useTheme();
    const insets = useSafeAreaInsets()

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
                tabBarShowLabel: true,
                headerShown: false,
                tabBarActiveTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#101828',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#99A1AF' : '#6A7282',
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                    borderTopWidth: 2,
                    borderColor: colorScheme === 'dark' ? '#1e2939' : '#E5E7EB',
                    height: (Platform.OS === 'ios' ? 76 : 76) + insets.bottom,
                    paddingTop: Platform.OS === 'ios' ? 12 : 6,
                    paddingBottom: Platform.OS === 'ios' ? 9 : 6,
                    position: 'static',
                },
                tabBarLabelStyle: {
                    marginTop: 1}
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarAccessibilityLabel: 'Home',
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'home' : 'home-outline';

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: 'Explore',
                    tabBarAccessibilityLabel: 'Explore',
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'compass' : 'compass-outline';

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: '',
                    tabBarAccessibilityLabel: 'Create',
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 32;
                        let background = [{backgroundColor: 'red'}];

                        iconName = focused ? 'plus' : 'plus';
                        if (colorScheme === 'dark') {
                            color = focused ? '#000' : '#E5E7EB'
                            background = focused ? [styles.createButton, {backgroundColor: '#E5E7EB'}] : [styles.createButton, {backgroundColor: '#1e2939'}]
                        } else {
                            color = focused ? '#fff' : '#1e2939'
                            background = focused ? [styles.createButton, {backgroundColor: '#1e2939'}] : [styles.createButton, {backgroundColor: '#E5E7EB'}]
                        };

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} style={background} />;
                    },
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Inbox',
                    tabBarAccessibilityLabel: 'Inbox',
                    tabBarBadge: displayBadgeCount,
                    tabBarBadgeStyle: { fontSize: 12 },
                    tabBarIcon: ({ focused, color }) => {
                        let iconName;
                        let size = 28;

                        iconName = focused ? 'bell' : 'bell-outline';

                        return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                    },
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarAccessibilityLabel: 'Profile',
                    tabBarIcon: ({ focused }) => {
                        let style;
                        style = focused
                            ? {
                                outlineWidth: 2.5,
                                outlineColor: colorScheme === 'dark' ? '#FFFFFF' : '#101828',
                                borderWidth: 1.5,
                                borderColor: colorScheme === 'dark' ? '#000' : '#FFFFFF',
                              }
                            : null;
                        return <Avatar url={props.user?.avatar} theme="tab" style={style} />;
                    },
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    createButton: {
        display: 'flex',
        textAlign: 'center',
        height: 40,
        paddingTop: 4,
        width: 44,
        borderRadius: 8,
        marginTop: 13,
    },
});
