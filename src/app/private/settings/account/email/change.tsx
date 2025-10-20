import { updateAccountEmail } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

export default function ChangeEmailScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: updateAccountEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
            Alert.alert(
                'Verification code sent',
                'Please check your new email address for the verification code.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            router.back();
                            router.push({
                                pathname: '/private/settings/account/email/verify',
                                params: { email },
                            });
                        },
                    },
                ],
            );
        },
        onError: (error: Error) => {
            Alert.alert('Error', error.message);
        },
    });

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setEmailError('Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = (password: string) => {
        if (!password) {
            setPasswordError('Password is required');
            return false;
        }
        if (password.length < 6) {
            setPasswordError('Password is too short');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleContinue = () => {
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);

        if (isEmailValid && isPasswordValid) {
            mutation.mutate({ email, password });
        }
    };

    return (
        <View style={tw`flex-1 bg-white`} edges={['top']}>
            <Stack.Screen
                options={{
                    title: 'Change email',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}>
                <View style={tw`flex-1 p-5`}>
                    <View style={tw`flex-row items-center mb-6 p-4 bg-blue-50 rounded-lg`}>
                        <Ionicons
                            name="information-circle"
                            size={24}
                            color="#3b82f6"
                            style={tw`mr-3`}
                        />
                        <Text style={tw`flex-1 text-sm text-gray-700`}>
                            We'll send a verification code to your new email address
                        </Text>
                    </View>

                    <Text style={tw`text-sm text-gray-500 mb-3`}>New email address</Text>

                    <TextInput
                        style={tw`text-base text-gray-900 py-3 px-4 bg-gray-50 rounded-lg border ${
                            emailError ? 'border-red-500' : 'border-gray-200'
                        }`}
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text.toLowerCase().trim());
                            setEmailError('');
                        }}
                        placeholder="your.email@example.com"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                        editable={!mutation.isPending}
                    />

                    {emailError && (
                        <View style={tw`flex-row items-center mt-2`}>
                            <Ionicons name="alert-circle" size={16} color="#ef4444" />
                            <Text style={tw`text-sm text-red-500 ml-1`}>{emailError}</Text>
                        </View>
                    )}

                    <Text style={tw`text-sm text-gray-500 mb-3 mt-6`}>Current password</Text>

                    <View style={tw`relative`}>
                        <TextInput
                            style={tw`text-base text-gray-900 py-3 px-4 pr-12 bg-gray-50 rounded-lg border ${
                                passwordError ? 'border-red-500' : 'border-gray-200'
                            }`}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setPasswordError('');
                            }}
                            placeholder="Enter your password"
                            placeholderTextColor="#999"
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="password"
                            editable={!mutation.isPending}
                        />
                        <Pressable
                            onPress={() => setShowPassword(!showPassword)}
                            style={tw`absolute right-3 top-3`}
                            disabled={mutation.isPending}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={24}
                                color="#999"
                            />
                        </Pressable>
                    </View>

                    {passwordError && (
                        <View style={tw`flex-row items-center mt-2`}>
                            <Ionicons name="alert-circle" size={16} color="#ef4444" />
                            <Text style={tw`text-sm text-red-500 ml-1`}>{passwordError}</Text>
                        </View>
                    )}

                    <View style={tw`mt-6`}>
                        <Pressable
                            onPress={handleContinue}
                            disabled={
                                !email ||
                                !password ||
                                !!emailError ||
                                !!passwordError ||
                                mutation.isPending
                            }
                            style={({ pressed }) => [
                                tw`flex-row items-center justify-center py-4 rounded-lg`,
                                email &&
                                password &&
                                !emailError &&
                                !passwordError &&
                                !mutation.isPending
                                    ? tw`bg-blue-500`
                                    : tw`bg-gray-200`,
                                pressed &&
                                    email &&
                                    password &&
                                    !emailError &&
                                    !passwordError &&
                                    !mutation.isPending &&
                                    tw`opacity-80`,
                            ]}>
                            {mutation.isPending ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons
                                        name="send-outline"
                                        size={20}
                                        color={
                                            email && password && !emailError && !passwordError
                                                ? 'white'
                                                : '#999'
                                        }
                                        style={tw`mr-2`}
                                    />
                                    <Text
                                        style={[
                                            tw`text-base font-semibold`,
                                            email && password && !emailError && !passwordError
                                                ? tw`text-white`
                                                : tw`text-gray-500`,
                                        ]}>
                                        Send verification code
                                    </Text>
                                </>
                            )}
                        </Pressable>
                    </View>

                    <View style={tw`mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200`}>
                        <View style={tw`flex-row items-start`}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={20}
                                color="#f59e0b"
                                style={tw`mr-2 mt-0.5`}
                            />
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-sm font-medium text-gray-900 mb-1`}>
                                    Security verification
                                </Text>
                                <Text style={tw`text-xs text-gray-700 leading-5`}>
                                    Your password is required to verify your identity and prevent
                                    unauthorized changes to your account.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
