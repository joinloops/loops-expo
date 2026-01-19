import { useTheme } from '@/contexts/ThemeContext';
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

export default function EditNameScreen() {
    const params = useLocalSearchParams();
    const [name, setName] = useState(params.name || '');
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();

    const mutation = useMutation({
        mutationFn: async (data) => {
            const res = await updateAccountBio(data);
            return res;
        },
        onSuccess: (res) => {
            queryClient.setQueryData(['fetchSelfAccount', 'self'], res.data);
            router.back();
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    const handleSave = useCallback(() => {
        const trimmedName = name.trim();
        if (trimmedName !== name) {
            setName(trimmedName);
            return;
        }
        mutation.mutate({ name: trimmedName });
    }, [name, mutation]);

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Edit Name',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                    headerRight: () => (
                        <Pressable onPress={handleSave} disabled={!name.trim()}>
                            <Text
                                style={[
                                    tw`text-base font-semibold`,
                                    name.trim() ? tw`text-blue-500` : tw`text-gray-400`,
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
                        Your name appears on your profile and helps people find you.
                    </Text>
                    <TextInput
                        style={tw`text-gray-900 dark:text-white py-3 px-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800`}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                        placeholderTextColor="#999"
                        maxLength={30}
                        autoFocus
                    />
                    <Text style={tw`text-sm text-gray-400 mt-2 text-right`}>{name.length}/30</Text>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
