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
                tabBarActiveTintColor: '#000',
                animation: 'shift',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#ccc',
                    height: Platform.OS === 'ios' ? 94 : 94,
                    paddingTop: Platform.OS === 'ios' ? 11 : 5,
                    paddingBottom: Platform.OS === 'ios' ? 8 : 5,
                    elevation: 0,
                    shadowColor: '#ccc',
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
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: 'Create',
                    tabBarShowLabel: false,
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="video" color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarShowLabel: false,
                    tabBarIcon: ({ color }) => <Feather size={28} name="user" color={color} />,
                }}
            />
        </Tabs>
    );
}
