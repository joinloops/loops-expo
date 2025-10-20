import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import tw from 'twrnc';

const verifyEmail = async (code: string) => {
    const response = await fetch('/api/v1/account/settings/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid verification code');
    }
    return response.json();
};

const resendCode = async () => {
    const response = await fetch('/api/v1/account/settings/email/resend', {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to resend code');
    return response.json();
};

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [canResend, setCanResend] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const inputRefs = useRef<(TextInput | null)[]>([]);
    const queryClient = useQueryClient();

    useEffect(() => {
        const timer = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const verifyMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
            Alert.alert('Email verified!', 'Your email address has been successfully updated.', [
                {
                    text: 'OK',
                    onPress: () => {
                        router.back();
                        router.back();
                    },
                },
            ]);
        },
        onError: (error: Error) => {
            Alert.alert('Verification failed', error.message);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        },
    });

    const resendMutation = useMutation({
        mutationFn: resendCode,
        onSuccess: () => {
            setCanResend(false);
            setResendTimer(60);
            Alert.alert('Code sent', 'A new verification code has been sent to your email.');
        },
        onError: () => {
            Alert.alert('Error', 'Failed to resend verification code. Please try again.');
        },
    });

    const handleCodeChange = (value: string, index: number) => {
        if (value.length > 1) {
            value = value.slice(-1);
        }

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newCode.every((digit) => digit !== '') && !verifyMutation.isPending) {
            verifyMutation.mutate(newCode.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = () => {
        if (canResend && !resendMutation.isPending) {
            resendMutation.mutate();
        }
    };

    return (
        <View style={tw`flex-1 bg-white`} edges={['top']}>
            <Stack.Screen
                options={{
                    title: 'Verify email',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Back',
                    headerShown: true,
                }}
            />

            <View style={tw`flex-1 p-5`}>
                <View style={tw`items-center mb-8`}>
                    <View
                        style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4`}>
                        <Ionicons name="mail-outline" size={40} color="#3b82f6" />
                    </View>
                    <Text style={tw`text-xl font-semibold text-gray-900 mb-2`}>
                        Check your email
                    </Text>
                    <Text style={tw`text-sm text-gray-600 text-center`}>
                        We sent a 6-digit code to
                    </Text>
                    <Text style={tw`text-sm font-semibold text-gray-900 mt-1`}>{params.email}</Text>
                </View>

                <View style={tw`mb-6`}>
                    <Text style={tw`text-sm text-gray-500 mb-3 text-center`}>
                        Enter verification code
                    </Text>
                    <View style={tw`flex-row justify-center gap-2`}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputRefs.current[index] = ref)}
                                style={tw`w-12 h-14 text-center text-2xl font-semibold border ${
                                    digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                } rounded-lg`}
                                value={digit}
                                onChangeText={(value) => handleCodeChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                editable={!verifyMutation.isPending}
                                autoFocus={index === 0}
                            />
                        ))}
                    </View>
                </View>

                {verifyMutation.isPending && (
                    <View style={tw`flex-row items-center justify-center py-4`}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <Text style={tw`text-sm text-gray-600 ml-2`}>Verifying...</Text>
                    </View>
                )}

                <View style={tw`items-center mt-6`}>
                    <Text style={tw`text-sm text-gray-600 mb-2`}>Didn't receive the code?</Text>
                    <Pressable
                        onPress={handleResend}
                        disabled={!canResend || resendMutation.isPending}
                        style={({ pressed }) => [
                            tw`py-2 px-4`,
                            pressed && canResend && tw`opacity-60`,
                        ]}>
                        <Text
                            style={[
                                tw`text-base font-semibold`,
                                canResend && !resendMutation.isPending
                                    ? tw`text-blue-500`
                                    : tw`text-gray-400`,
                            ]}>
                            {resendMutation.isPending
                                ? 'Sending...'
                                : canResend
                                  ? 'Resend code'
                                  : `Resend code (${resendTimer}s)`}
                        </Text>
                    </Pressable>
                </View>

                <View style={tw`mt-8 p-4 bg-gray-50 rounded-lg`}>
                    <Text style={tw`text-xs text-gray-600 text-center leading-5`}>
                        The code will expire in 10 minutes. Make sure to check your spam folder if
                        you don't see the email.
                    </Text>
                </View>
            </View>
        </View>
    );
}
