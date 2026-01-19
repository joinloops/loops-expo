import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { updateAccountBio } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

export default function EditBioScreen() {
    const { colorScheme } = useTheme();
    const params = useLocalSearchParams();
    const [bio, setBio] = useState(params.bio || '');
    const MAX_LENGTH = 80;

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data) => {
            const res = await updateAccountBio(data);
            return res;
        },
        onSuccess: (res) => {
            queryClient.setQueryData(['fetchAccount', res.data.id], res.data);
            queryClient.setQueryData(['fetchSelfAccount', 'self'], res.data);
            router.back();
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    const handleSave = useCallback(() => {
        const trimmedBio = bio.trim();
        if (trimmedBio !== bio) {
            setBio(trimmedBio);
            return;
        }
        mutation.mutate({ bio: trimmedBio });
    }, [bio, mutation]);

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Edit Bio',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                    headerLeft: () => (
                        <PressableHaptics
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.push('/(tabs)');
                                }
                            }}
                            style={tw`px-1`}>
                            <Ionicons
                                name="chevron-back"
                                size={24}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </PressableHaptics>
                    ),
                    headerRight: () => (
                        <Pressable onPress={handleSave}>
                            <Text
                                style={[
                                    tw`text-base font-semibold`,
                                    bio.trim() ? tw`text-blue-500` : tw`text-gray-400`,
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
                    <Text style={tw`text-sm text-gray-500 dark:text-gray-300 mb-3`}>
                        Tell people a little about yourself. This will appear on your profile.
                    </Text>
                    <TextInput
                        style={tw`text-gray-900 dark:text-white py-3 px-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 min-h-32`}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Add a bio..."
                        placeholderTextColor="#999"
                        maxLength={MAX_LENGTH}
                        multiline
                        textAlignVertical="top"
                        autoFocus
                    />
                    <View style={tw`flex-row justify-between items-center mt-2`}>
                        <Text style={tw`text-xs text-gray-600 dark:text-gray-400`}>
                            Emojis and hashtags are supported
                        </Text>
                        <Text
                            style={[
                                tw`text-sm font-medium`,
                                bio.length > MAX_LENGTH - 20
                                    ? tw`text-orange-500`
                                    : tw`text-gray-600`,
                            ]}>
                            {bio.length}/{MAX_LENGTH}
                        </Text>
                    </View>
                    <YStack paddingY="$3" gap="$2">
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            - Choose a bio that reflects your identity or content.
                        </Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            - Keep it easy to read and remember.
                        </Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            - If you have a brand or online presence, try to keep your bio
                            consistent across platforms.
                        </Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                            - Be respectful and avoid using offensive or inappropriate language.
                        </Text>
                    </YStack>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
