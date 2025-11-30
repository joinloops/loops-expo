import { useAuthStore } from '@/utils/authStore';
import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabsLayout() {
    const { user } = useAuthStore();

    return (
        <Tabs
            screenOptions={{
                initialRouteName: 'index',
                backBehavior: 'order',
                tabBarActiveTintColor: '#fff',
                tabBarInactiveTintColor: '#555',
                animation: 'shift',
                tabBarStyle: {
                    backgroundColor: '#000',
                    borderTopWidth: 1,
                    borderTopColor: '#333',
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
                    tabBarAccessibilityLabel: "Home",
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: 'Create',
                    tabBarAccessibilityLabel: "Create",
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="video" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarAccessibilityLabel: "Profile",
                    tabBarShowLabel: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="user" color={color} />,
                }}
            />
        </Tabs>
    );
}
