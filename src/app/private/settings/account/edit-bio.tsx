import { YStack } from '@/components/ui/Stack';
import { updateAccountBio } from '@/utils/requests';
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
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Edit Bio',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Account',
                    headerShown: true,
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
                    <Text style={tw`text-sm text-gray-500 mb-3`}>
                        Tell people a little about yourself. This will appear on your profile.
                    </Text>
                    <TextInput
                        style={tw`text-base text-gray-900 py-3 px-4 bg-gray-50 rounded-lg border border-gray-200 min-h-32`}
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
                        <Text style={tw`text-xs text-gray-600`}>
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
                        <Text style={tw`text-xs text-gray-500`}>
                            - Choose a bio that reflects your identity or content.
                        </Text>
                        <Text style={tw`text-xs text-gray-500`}>
                            - Keep it easy to read and remember.
                        </Text>
                        <Text style={tw`text-xs text-gray-500`}>
                            - If you have a brand or online presence, try to keep your bio
                            consistent across platforms.
                        </Text>
                        <Text style={tw`text-xs text-gray-500`}>
                            - Be respectful and avoid using offensive or inappropriate language.
                        </Text>
                    </YStack>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
