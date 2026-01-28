import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { deleteAccount } from '@/utils/requests';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';


export default function DeleteAccountScreen() {
    const { logOut } = useAuthStore();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const notificationStore = useNotificationStore();
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();

    const performLogOut = async () => {
        queryClient.clear();
        notificationStore.resetBadgeCount();
        logOut();
        router.replace('/');
    };

    const mutation = useMutation({
        mutationFn: async (data) => {
            const res = await deleteAccount(data);
            return res;
        },
        onSuccess: async (res) => {
            if (res.message === 'The password is incorrect.' || res.error) {
                setPasswordError(res.message || 'The password is incorrect.');
                Alert.alert('Error', res.message || 'The password is incorrect.');
                return;
            }

            Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted.',
                [
                    {
                        text: 'OK',
                        onPress: () => performLogOut(),
                    },
                ],
                { cancelable: false }
            );
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to delete account. Please try again.';
            setPasswordError(errorMessage);
            Alert.alert('Error', errorMessage);
        },
    });

    const handleDelete = useCallback(() => {
        setPasswordError('');
        
        Alert.alert(
            'Delete Account?',
            'This action cannot be undone. Your account and all associated data will be permanently deleted.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => mutation.mutate({ password }),
                },
            ]
        );
    }, [mutation, password]);

    const isConfirmed = password.length >= 8;

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Delete Account',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}>
                <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-5`}>
                    <View style={tw`bg-red-50 dark:bg-red-950 p-4 rounded-lg mb-6`}>
                        <Text style={tw`text-red-800 dark:text-red-200 font-semibold text-base mb-2`}>
                            Warning: This action is permanent
                        </Text>
                        <Text style={tw`text-red-700 dark:text-red-300 text-sm`}>
                            Deleting your account will permanently remove all your data, including:
                        </Text>
                    </View>

                    <View style={tw`mb-6`}>
                        <View style={tw`flex-row items-start mb-3`}>
                            <Text style={tw`text-gray-900 dark:text-white text-base mr-2`}>•</Text>
                            <Text style={tw`text-gray-900 dark:text-white text-base flex-1`}>
                                Your profile and account information
                            </Text>
                        </View>
                        <View style={tw`flex-row items-start mb-3`}>
                            <Text style={tw`text-gray-900 dark:text-white text-base mr-2`}>•</Text>
                            <Text style={tw`text-gray-900 dark:text-white text-base flex-1`}>
                                All your posts and videos
                            </Text>
                        </View>
                        <View style={tw`flex-row items-start mb-3`}>
                            <Text style={tw`text-gray-900 dark:text-white text-base mr-2`}>•</Text>
                            <Text style={tw`text-gray-900 dark:text-white text-base flex-1`}>
                                Your followers and following
                            </Text>
                        </View>
                        <View style={tw`flex-row items-start mb-3`}>
                            <Text style={tw`text-gray-900 dark:text-white text-base mr-2`}>•</Text>
                            <Text style={tw`text-gray-900 dark:text-white text-base flex-1`}>
                                Comments, likes, and interactions
                            </Text>
                        </View>
                    </View>

                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm text-gray-700 dark:text-gray-300 mb-3`}>
                            Enter your current password to continue:
                        </Text>
                        <View style={tw`relative`}>
                            <TextInput
                                style={tw`text-gray-900 dark:text-white py-3 px-4 pr-20 bg-gray-50 dark:bg-gray-900 rounded-lg border ${
                                    passwordError
                                        ? 'border-red-500'
                                        : 'border-gray-200 dark:border-gray-800'
                                }`}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setPasswordError('');
                                }}
                                placeholder="Current password"
                                placeholderTextColor="#999"
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Pressable
                                onPress={() => setShowPassword(!showPassword)}
                                style={tw`absolute right-4 top-3.5`}>
                                <Text style={tw`text-blue-500 text-sm font-medium`}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </Pressable>
                        </View>
                        {passwordError ? (
                            <Text style={tw`text-red-500 text-sm mt-2`}>
                                {passwordError}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={handleDelete}
                        disabled={!isConfirmed || mutation.isPending}
                        style={[
                            tw`py-4 px-6 rounded-lg items-center`,
                            isConfirmed && !mutation.isPending
                                ? tw`bg-red-600`
                                : tw`bg-gray-300 dark:bg-gray-700`,
                        ]}>
                        <Text
                            style={[
                                tw`text-base font-semibold`,
                                isConfirmed && !mutation.isPending
                                    ? tw`text-white`
                                    : tw`text-gray-500`,
                            ]}>
                            {mutation.isPending ? 'Deleting...' : 'Delete My Account'}
                        </Text>
                    </Pressable>

                    <View style={tw`mt-6 items-center`}>
                        <Text style={tw`text-sm text-gray-500 text-center mb-2`}>
                            Changed your mind?
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text style={tw`text-blue-500 text-base font-medium`}>
                                Keep My Account
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
