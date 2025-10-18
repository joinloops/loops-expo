import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

export default function EditUsernameScreen() {
    const params = useLocalSearchParams();
    const [username, setUsername] = useState(params.username || '');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const checkUsername = async () => {
            if (!username || username === params.username) {
                setError('');
                setIsAvailable(true);
                return;
            }

            // Validate username format
            if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
                setError('Username can only contain letters, numbers, dots, and underscores');
                setIsAvailable(false);
                return;
            }

            if (username.length < 3) {
                setError('Username must be at least 3 characters');
                setIsAvailable(false);
                return;
            }

            setIsChecking(true);
            setError('');

            // Simulate API check
            await new Promise((resolve) => setTimeout(resolve, 500));

            // TODO: Check username availability with backend
            const available = Math.random() > 0.3;
            setIsAvailable(available);
            if (!available) {
                setError('This username is already taken');
            }

            setIsChecking(false);
        };

        const debounce = setTimeout(checkUsername, 500);
        return () => clearTimeout(debounce);
    }, [username]);

    const handleSave = () => {
        if (!isAvailable || !username.trim()) return;
        // TODO: Save username to backend
        router.back();
    };

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Edit Username',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Account',
                    headerShown: true,
                    headerRight: () => (
                        <Pressable onPress={handleSave} disabled={!username.trim()}>
                            <Text
                                style={[
                                    tw`text-base font-semibold`,
                                    username.trim() ? tw`text-blue-500` : tw`text-gray-400`,
                                ]}>
                                Save
                            </Text>
                        </Pressable>
                    ),
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}>
                <View style={tw`p-5`}>
                    <Text style={tw`text-sm text-gray-500 mb-3`}>
                        Your username is unique and appears in your profile URL. You can only change
                        it once every 30 days.
                    </Text>

                    <View style={tw`relative`}>
                        <View
                            style={tw`flex-row items-center bg-gray-50 rounded-lg border border-gray-200`}>
                            <Text style={tw`text-base text-gray-400 pl-4`}>@</Text>
                            <TextInput
                                style={tw`flex-1 text-base text-gray-900 py-3 px-2`}
                                value={username}
                                onChangeText={(text) =>
                                    setUsername(text.toLowerCase().replace(/[^a-zA-Z0-9_.]/g, ''))
                                }
                                placeholder="username"
                                placeholderTextColor="#999"
                                maxLength={30}
                                autoFocus
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            {isChecking && (
                                <ActivityIndicator size="small" color="#999" style={tw`mr-3`} />
                            )}
                            {!isChecking && username && username !== params.username && (
                                <Ionicons
                                    name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                                    size={20}
                                    color={isAvailable ? '#22c55e' : '#ef4444'}
                                    style={tw`mr-3`}
                                />
                            )}
                        </View>
                    </View>

                    {error && (
                        <View style={tw`flex-row items-center mt-2`}>
                            <Ionicons name="alert-circle" size={16} color="#ef4444" />
                            <Text style={tw`text-sm text-red-500 ml-1`}>{error}</Text>
                        </View>
                    )}

                    <Text style={tw`text-sm text-gray-400 mt-2 text-right`}>
                        {username.length}/30
                    </Text>

                    <View style={tw`mt-4 p-3 bg-blue-50 rounded-lg`}>
                        <Text style={tw`text-xs text-gray-600`}>
                            Your profile will be available at:
                        </Text>
                        <Text style={tw`text-sm font-medium text-gray-900 mt-1`}>
                            loops.video/@{username || 'username'}
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
