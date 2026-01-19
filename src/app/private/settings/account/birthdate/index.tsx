import { useTheme } from '@/contexts/ThemeContext';
import { fetchAccountBirthdate, updateAccountBirthdate } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

export default function BirthdateSettingsScreen() {
    const { colorScheme } = useTheme();
    const queryClient = useQueryClient();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date(2025, 0, 1));
    const [errorMessage, setErrorMessage] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['birthdateSettings'],
        queryFn: fetchAccountBirthdate,
    });

    const parseMinAgeFromError = (message) => {
        const dateMatch = message.match(/(\d{4})-(\d{2})-(\d{2})/);

        if (dateMatch) {
            const [, year, month, day] = dateMatch;
            const minDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const today = new Date();

            const ageInYears = today.getFullYear() - minDate.getFullYear();

            return `You must be at least ${ageInYears} years old to use this app.`;
        }

        return message;
    };

    const updateBirthdateMutation = useMutation({
        mutationFn: (birthdate) => updateAccountBirthdate({ birth_date: birthdate }),
        onSuccess: (data) => {
            console.log('Response data:', data);

            if (data?.error?.code != 'ok') {
                const errors = data?.errors;
                if (errors?.birth_date && errors.birth_date.length > 0) {
                    const message = errors.birth_date[0];
                    if (message.includes('must be a date before')) {
                        setErrorMessage(parseMinAgeFromError(message));
                    } else {
                        setErrorMessage(message);
                    }
                } else if (data?.message) {
                    setErrorMessage(data.message);
                }
                return;
            }

            queryClient.invalidateQueries({ queryKey: ['birthdateSettings'] });
            setShowDatePicker(false);
            setErrorMessage(null);
        },
        onError: (error) => {
            console.log('Mutation error:', error);
            setErrorMessage('Failed to save birthdate. Please try again.');
        },
    });

    const handleDateChange = (event, date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (date) {
            setSelectedDate(date);
            setErrorMessage(null);

            if (Platform.OS === 'android' && event.type === 'set') {
                const formattedDate = date.toISOString().split('T')[0];
                updateBirthdateMutation.mutate(formattedDate);
            }
        }
    };

    const handleSetBirthdate = () => {
        setErrorMessage(null);

        if (Platform.OS === 'ios') {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            updateBirthdateMutation.mutate(formattedDate);
        } else {
            setShowDatePicker(true);
        }
    };

    if (isLoading) {
        return (
            <View style={tw`flex-1 bg-white`}>
                <Stack.Screen
                    options={{
                        title: 'Birthdate',
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
                        title: 'Birthdate',
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                        headerBackTitle: 'Account',
                        headerShown: true,
                    }}
                />
                <View style={tw`flex-1 items-center justify-center p-5`}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
                    <Text style={tw`text-base text-gray-600 mt-4 text-center`}>
                        Failed to load birthdate settings
                    </Text>
                </View>
            </View>
        );
    }

    const hasBirthdate = data?.data?.has_birthdate;

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Birthdate',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <View style={tw`mt-8 items-center`}>
                    {hasBirthdate ? (
                        <>
                            <View
                                style={tw`w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4`}>
                                <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
                            </View>
                            <Text style={tw`text-2xl font-bold text-gray-900 dark:text-white mb-2`}>
                                Birthdate Set
                            </Text>
                            <Text
                                style={tw`text-base text-gray-600 dark:text-gray-300 text-center px-6`}>
                                Your birthdate has been securely saved. This helps us provide
                                age-appropriate content and features.
                            </Text>
                        </>
                    ) : (
                        <>
                            <View
                                style={tw`w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4`}>
                                <Ionicons name="calendar-outline" size={48} color="#3b82f6" />
                            </View>
                            <Text style={tw`text-2xl font-bold text-gray-900 dark:text-white mb-2`}>
                                Set Your Birthdate
                            </Text>
                            <Text
                                style={tw`text-base text-gray-600 dark:text-gray-300 text-center px-6 mb-6`}>
                                Help us create a safer experience by confirming your age. Your
                                birthdate is kept private and never shared.
                            </Text>

                            <View style={tw`w-full px-6`}>
                                {Platform.OS === 'ios' && (
                                    <View
                                        style={tw`items-center mb-4 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800`}>
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleDateChange}
                                            maximumDate={new Date()}
                                            minimumDate={new Date(1900, 0, 1)}
                                            style={{ height: 200, width: '100%' }}
                                            textColor={colorScheme === 'dark' ? '#fff' : '#000'}
                                            themeVariant="light"
                                        />
                                    </View>
                                )}

                                {showDatePicker && Platform.OS === 'android' && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                        maximumDate={new Date()}
                                        minimumDate={new Date(1900, 0, 1)}
                                    />
                                )}

                                {errorMessage && (
                                    <View
                                        style={tw`bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center`}>
                                        <Ionicons
                                            name="alert-circle"
                                            size={20}
                                            color="#ef4444"
                                            style={tw`mr-2 mt-0.5`}
                                        />
                                        <Text style={tw`text-red-700 text-sm flex-1`}>
                                            {errorMessage}
                                        </Text>
                                    </View>
                                )}

                                <Pressable
                                    style={tw`bg-blue-500 rounded-full py-4 px-6 items-center ${
                                        updateBirthdateMutation.isPending ? 'opacity-50' : ''
                                    }`}
                                    onPress={handleSetBirthdate}
                                    disabled={updateBirthdateMutation.isPending}>
                                    {updateBirthdateMutation.isPending ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={tw`text-white text-base font-semibold`}>
                                            {Platform.OS === 'ios'
                                                ? 'Confirm Birthdate'
                                                : 'Select Birthdate'}
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>

                <View style={tw`p-6 mt-8`}>
                    <View style={tw`bg-gray-50 dark:bg-gray-900 rounded-xl p-4`}>
                        <Text
                            style={tw`text-sm font-semibold text-gray-900 dark:text-gray-300 mb-2`}>
                            Why we need this
                        </Text>
                        <Text style={tw`text-xs text-gray-600 dark:text-gray-400 leading-5`}>
                            Your birthdate helps us comply with age requirements and ensure you have
                            access to age-appropriate content. We never display your actual
                            birthdate publicly and keep this information secure.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
