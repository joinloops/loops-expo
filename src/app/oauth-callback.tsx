import { useAuthStore } from '@/utils/authStore';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function OAuthCallbackScreen() {
    const params = useLocalSearchParams();
    const syncAuthState = useAuthStore((state) => state.syncAuthState);

    useEffect(() => {
        handleCallback();
    }, []);

    const handleCallback = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        syncAuthState();

        const isLoggedIn = useAuthStore.getState().isLoggedIn;

        if (isLoggedIn) {
            router.replace('/(tabs)');
        } else {
            router.replace('/sign-in');
        }
    };

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.text}>Completing sign in...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
    },
});
