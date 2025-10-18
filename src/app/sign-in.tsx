import { useAuthStore } from '@/utils/authStore';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignInScreen() {
    const [serverUrl, setServerUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const loginWithOAuth = useAuthStore((state) => state.loginWithOAuth);

    const handleLogin = async () => {
        if (!serverUrl.trim()) {
            Alert.alert('Error', 'Please enter a Loops server URL');
            return;
        }

        let cleanedUrl = serverUrl.trim().toLowerCase();
        cleanedUrl = cleanedUrl.replace(/^https?:\/\//, '');
        cleanedUrl = cleanedUrl.replace(/\/$/, '');

        setIsLoading(true);

        try {
            const success = await loginWithOAuth(cleanedUrl);

            if (success) {
                router.replace('/(tabs)');
            } else {
                Alert.alert(
                    'Login Failed',
                    'Unable to complete login. Please check the server URL and try again.',
                );
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome to Loops</Text>
                    <Text style={styles.subtitle}>Enter your Loops instance to get started</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Server URL</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.prefix}>https://</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="loops.video"
                                placeholderTextColor="#999"
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                                editable={!isLoading}
                            />
                        </View>
                        <Text style={styles.hint}>Example: loops.video or your.loops.instance</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Continue</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        You'll be redirected to your Loops instance to authorize this app
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
    },
    form: {
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 16,
    },
    prefix: {
        fontSize: 16,
        color: '#666',
        marginRight: 4,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#fff',
    },
    hint: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
    },
    button: {
        backgroundColor: '#007AFF',
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
    },
});
