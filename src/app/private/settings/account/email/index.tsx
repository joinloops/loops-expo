import { fetchAccountEmail } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

const cancelPendingEmail = async () => {
    const response = await fetch('/api/v1/account/settings/email/cancel', {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to cancel email change');
    return response.json();
};

const InfoRow = ({ icon, label, value, valueColor = 'text-gray-900' }) => (
    <View style={tw`flex-row items-start py-4 px-5 bg-white`}>
        <Ionicons name={icon} size={22} color="#666" style={tw`mt-0.5 mr-4`} />
        <View style={tw`flex-1`}>
            <Text style={tw`text-sm text-gray-500 mb-1`}>{label}</Text>
            <Text style={tw`text-base font-medium ${valueColor}`}>{value}</Text>
        </View>
    </View>
);

const ActionButton = ({ icon, label, onPress, variant = 'default', disabled = false }) => {
    const getColors = () => {
        if (disabled) return { bg: 'bg-gray-100', text: 'text-gray-400', icon: '#999' };
        switch (variant) {
            case 'primary':
                return { bg: 'bg-blue-500', text: 'text-white', icon: 'white' };
            case 'danger':
                return { bg: 'bg-red-500', text: 'text-white', icon: 'white' };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-900', icon: '#333' };
        }
    };

    const colors = getColors();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                tw`flex-row items-center justify-center py-4 px-5 rounded-lg ${colors.bg}`,
                pressed && !disabled && tw`opacity-80`,
            ]}>
            <Ionicons name={icon} size={20} color={colors.icon} style={tw`mr-2`} />
            <Text style={tw`text-base font-semibold ${colors.text}`}>{label}</Text>
        </Pressable>
    );
};

export default function EmailSettingsScreen() {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['emailSettings'],
        queryFn: fetchAccountEmail,
    });

    const cancelMutation = useMutation({
        mutationFn: cancelPendingEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
            Alert.alert('Success', 'Email change request cancelled');
        },
        onError: () => {
            Alert.alert('Error', 'Failed to cancel email change');
        },
    });

    const handleCancelPending = () => {
        Alert.alert('Cancel email change?', 'This will cancel your pending email change request.', [
            { text: 'Keep it', style: 'cancel' },
            {
                text: 'Cancel request',
                style: 'destructive',
                onPress: () => cancelMutation.mutate(),
            },
        ]);
    };

    if (isLoading) {
        return (
            <View style={tw`flex-1 bg-white`}>
                <Stack.Screen
                    options={{
                        title: 'Email',
                        headerStyle: { backgroundColor: '#fff' },
                        headerBackTitle: 'Account',
                        headerShown: true,
                    }}
                />
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={tw`flex-1 bg-white`}>
                <Stack.Screen
                    options={{
                        title: 'Email',
                        headerStyle: { backgroundColor: '#fff' },
                        headerBackTitle: 'Account',
                        headerShown: true,
                    }}
                />
                <View style={tw`flex-1 items-center justify-center p-5`}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text style={tw`text-base text-gray-600 mt-4 text-center`}>
                        Failed to load email settings
                    </Text>
                </View>
            </View>
        );
    }

    const emailData = data?.data;
    const hasPending = !!emailData?.pending_email;

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Email',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <View style={tw`mt-4 bg-white`}>
                    <View style={tw`px-5 py-3 border-b border-gray-100`}>
                        <Text style={tw`text-sm font-semibold text-gray-500 uppercase`}>
                            Current Email
                        </Text>
                    </View>

                    <InfoRow
                        icon="mail-outline"
                        label="Email address"
                        value={emailData?.current_email}
                    />

                    <View style={tw`h-px bg-gray-100 ml-14`} />

                    <InfoRow
                        icon={emailData?.email_verified ? 'checkmark-circle' : 'alert-circle'}
                        label="Verification status"
                        value={emailData?.email_verified ? 'Verified' : 'Not verified'}
                        valueColor={
                            emailData?.email_verified ? 'text-green-600' : 'text-orange-600'
                        }
                    />

                    <View style={tw`h-px bg-gray-100 ml-14`} />

                    <InfoRow
                        icon="calendar-outline"
                        label="Added on"
                        value={emailData?.email_added_date}
                    />
                </View>

                {/* {hasPending && (
                    <View style={tw`mt-4 bg-white`}>
                        <View style={tw`px-5 py-3 border-b border-gray-100`}>
                            <Text style={tw`text-sm font-semibold text-gray-500 uppercase`}>
                                Pending Change
                            </Text>
                        </View>

                        <View style={tw`p-5`}>
                            <View style={tw`flex-row items-center mb-3`}>
                                <Ionicons
                                    name="time-outline"
                                    size={20}
                                    color="#f59e0b"
                                    style={tw`mr-2`}
                                />
                                <Text style={tw`text-sm font-medium text-gray-900`}>
                                    Verification pending
                                </Text>
                            </View>
                            <Text style={tw`text-sm text-gray-600 mb-1`}>
                                A verification code has been sent to:
                            </Text>
                            <Text style={tw`text-base font-semibold text-gray-900 mb-4`}>
                                {emailData?.pending_email}
                            </Text>

                            <ActionButton
                                icon="mail-outline"
                                label="Enter verification code"
                                variant="primary"
                                onPress={() =>
                                    router.push({
                                        pathname: '/private/settings/account/email/verify',
                                        params: { email: emailData?.pending_email },
                                    })
                                }
                            />

                            <View style={tw`mt-3`}>
                                <ActionButton
                                    icon="close-circle-outline"
                                    label="Cancel email change"
                                    variant="danger"
                                    onPress={handleCancelPending}
                                    disabled={cancelMutation.isPending}
                                />
                            </View>
                        </View>
                    </View>
                )} */}

                {/* {!hasPending && (
                    <View style={tw`mt-4 bg-white p-5`}>
                        <ActionButton
                            icon="pencil-outline"
                            label="Change email address"
                            variant="primary"
                            onPress={() => router.push('/private/settings/account/email/change')}
                        />
                    </View>
                )} */}

                <View style={tw`p-5`}>
                    <Text style={tw`text-xs text-gray-500 text-center leading-5`}>
                        Your email is used for account recovery and important notifications. Keep it
                        secure and up to date.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
