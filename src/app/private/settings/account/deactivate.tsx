import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { useNotificationStore } from '@/utils/notificationStore';
import { deactivateAccount } from '@/utils/requests';
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


export default function DisableAccountScreen() {
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
            const res = await deactivateAccount(data);
            return res;
        },
        onSuccess: async (res) => {
            if (res.message === 'The password is incorrect.' || res.error) {
                setPasswordError(res.message || 'The password is incorrect.');
                Alert.alert('Error', res.message || 'The password is incorrect.');
                return;
            }

            Alert.alert(
                'Account Deactivated',
                'Your account has been temporarily disabled. Simply log in to reactivate it anytime.',
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
            const errorMessage = error.response?.data?.message || error.message || 'Failed to disable account. Please try again.';
            setPasswordError(errorMessage);
            Alert.alert('Error', errorMessage);
        },
    });

    const handleDisable = useCallback(() => {
        setPasswordError('');
        
        Alert.alert(
            'Temporarily Deactivate Account?',
            'Your account will be hidden and can be reactivated anytime by logging in.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: () => mutation.mutate({ password: password }),
                },
            ]
        );
    }, [mutation, password]);

    const isConfirmed = password.length >= 8;

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Deactivate Account',
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
                    <View style={tw`bg-orange-50 dark:bg-orange-950 p-4 rounded-lg mb-6`}>
                        <Text style={tw`text-orange-800 dark:text-orange-200 font-semibold text-base mb-2`}>
                            Temporarily deactivate your account
                        </Text>
                        <Text style={tw`text-orange-700 dark:text-orange-300 text-sm`}>
                            Your account will be hidden but can be easily reactivated by logging in.
                        </Text>
                    </View>

                    <View style={tw`mb-6 px-3`}>
                        <Text style={tw`text-gray-900 dark:text-white text-lg font-semibold mb-4`}>
                            What happens when you deactivate
                        </Text>

                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-900 dark:text-white font-semibold text-base mb-1`}>
                                Your profile will be hidden
                            </Text>
                            <Text style={tw`text-gray-600 dark:text-gray-400 text-sm`}>
                                Others won't be able to find or view your profile, videos, or comments.
                            </Text>
                        </View>

                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-900 dark:text-white font-semibold text-base mb-1`}>
                                Your videos will be private
                            </Text>
                            <Text style={tw`text-gray-600 dark:text-gray-400 text-sm`}>
                                All your videos will become temporarily unavailable to others.
                            </Text>
                        </View>

                        <View style={tw`mb-4`}>
                            <Text style={tw`text-gray-900 dark:text-white font-semibold text-base mb-1`}>
                                Followers won't see new content
                            </Text>
                            <Text style={tw`text-gray-600 dark:text-gray-400 text-sm`}>
                                Your followers will stop receiving notifications and won't see your content in their feed.
                            </Text>
                        </View>

                        <View style={tw`mb-0`}>
                            <Text style={tw`text-gray-900 dark:text-white font-semibold text-base mb-1`}>
                                Your data is preserved
                            </Text>
                            <Text style={tw`text-gray-600 dark:text-gray-400 text-sm`}>
                                All your content, followers, and account data will be saved and restored when you reactivate.
                            </Text>
                        </View>
                    </View>

                    <View style={tw`bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-6`}>
                        <Text style={tw`text-green-800 dark:text-green-200 font-semibold text-base mb-1`}>
                            Easy to reactivate
                        </Text>
                        <Text style={tw`text-green-700 dark:text-green-300 text-sm`}>
                            Simply log in with your email and password to reactivate your account. Everything will be restored exactly as you left it.
                        </Text>
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
                        onPress={handleDisable}
                        disabled={!isConfirmed || mutation.isPending}
                        style={[
                            tw`py-4 px-6 rounded-lg items-center`,
                            isConfirmed && !mutation.isPending
                                ? tw`bg-orange-600`
                                : tw`bg-gray-300 dark:bg-gray-700`,
                        ]}>
                        <Text
                            style={[
                                tw`text-base font-semibold`,
                                isConfirmed && !mutation.isPending
                                    ? tw`text-white`
                                    : tw`text-gray-500`,
                            ]}>
                            {mutation.isPending ? 'Disabling...' : 'Disable My Account'}
                        </Text>
                    </Pressable>

                    <View style={tw`mt-6 items-center`}>
                        <Text style={tw`text-sm text-gray-500 text-center mb-2`}>
                            Changed your mind?
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text style={tw`text-blue-500 text-base font-medium`}>
                                Keep My Account Active
                            </Text>
                        </Pressable>
                    </View>

                    <View style={tw`mt-50`}>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}