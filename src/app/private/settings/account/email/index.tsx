import { useTheme } from '@/contexts/ThemeContext';
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

const InfoRow = ({ icon, label, value, valueColor = 'text-gray-900 dark:text-white' }) => (
    <View style={tw`flex-row items-start py-4 px-5 bg-white dark:bg-black`}>
        <Ionicons name={icon} size={22} color="#666" style={tw`mt-0.5 mr-4`} />
        <View style={tw`flex-1`}>
            <Text style={tw`text-sm text-gray-500 dark:text-gray-300 mb-1`}>{label}</Text>
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
    const { colorScheme } = useTheme();
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
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
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
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
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
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Email',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <View style={tw`mt-4 bg-white dark:bg-black`}>
                    <View style={tw`px-5 py-3 border-b border-gray-100 dark:border-gray-800`}>
                        <Text style={tw`text-sm font-semibold text-gray-500 uppercase`}>
                            Current Email
                        </Text>
                    </View>

                    <InfoRow
                        icon="mail-outline"
                        label="Email address"
                        value={emailData?.current_email}
                    />

                    <View style={tw`h-px bg-gray-100 dark:bg-gray-800`} />

                    <InfoRow
                        icon={emailData?.email_verified ? 'checkmark-circle' : 'alert-circle'}
                        label="Verification status"
                        value={emailData?.email_verified ? 'Verified' : 'Not verified'}
                        valueColor={
                            emailData?.email_verified ? 'text-green-600' : 'text-orange-600'
                        }
                    />

                    <View style={tw`h-px bg-gray-100 dark:bg-gray-800`} />

                    <InfoRow
                        icon="calendar-outline"
                        label="Added on"
                        value={emailData?.email_added_date}
                    />
                </View>

                <View style={tw`p-5`}>
                    <Text
                        style={tw`text-xs text-gray-500 dark:text-gray-400 text-center leading-5`}>
                        Your email is used for account recovery and important notifications. Keep it
                        secure and up to date.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
