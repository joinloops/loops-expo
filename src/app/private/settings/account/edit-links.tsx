import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { getAccountLinks, updateAddAccountLink, updateDeleteAccountLink } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

export default function EditLinksScreen() {
    const { colorScheme } = useTheme();
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [urlError, setUrlError] = useState('');

    const queryClient = useQueryClient();

    const {
        data: links,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['accountLinks'],
        queryFn: getAccountLinks,
        onError: (error) => {
            console.log('Account links endpoint not available:', error);
        },
    });

    const addMutation = useMutation({
        mutationFn: async (url) => {
            const res = await updateAddAccountLink({ url });
            return res;
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['accountLinks']);
            queryClient.invalidateQueries(['fetchAccount', res.data.id]);
            queryClient.invalidateQueries(['fetchSelfAccount', 'self']);
            setNewLinkUrl('');
            setUrlError('');
        },
        onError: (error) => {
            const message =
                error?.response?.error?.message || error.message || 'Failed to add link';
            Alert.alert('Error', message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (linkId) => {
            const res = await updateDeleteAccountLink(linkId);
            return res;
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries(['accountLinks']);
            queryClient.invalidateQueries(['fetchAccount', res.data.id]);
            queryClient.invalidateQueries(['fetchSelfAccount', 'self']);
        },
        onError: (error) => {
            const message =
                error?.response?.data?.error?.message || error.message || 'Failed to delete link';
            Alert.alert('Error', message);
        },
    });

    const validateUrl = (url) => {
        const trimmedUrl = url.trim();

        if (!trimmedUrl) {
            return 'URL is required';
        }

        if (!trimmedUrl.startsWith('https://')) {
            return 'URL must start with https://';
        }

        if (trimmedUrl.length > 120) {
            return 'URL must be 120 characters or less';
        }

        try {
            new URL(trimmedUrl);
        } catch {
            return 'Please enter a valid URL';
        }

        return null;
    };

    const handleAddLink = () => {
        const error = validateUrl(newLinkUrl);

        if (error) {
            setUrlError(error);
            return;
        }

        setUrlError('');
        addMutation.mutate(newLinkUrl.trim());
    };

    const handleDeleteLink = (link) => {
        Alert.alert('Delete Link', `Are you sure you want to remove this link?\n\n${link.url}`, [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteMutation.mutate(link.id),
            },
        ]);
    };

    const handleUrlChange = (text) => {
        setNewLinkUrl(text);
        if (urlError) {
            setUrlError('');
        }
    };

    if (!isLoading && (isError || !links?.data)) {
        return (
            <View style={tw`flex-1 bg-white dark:bg-black`}>
                <Stack.Screen
                    options={{
                        title: 'Edit Links',
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
                    }}
                />
                <View style={tw`flex-1 items-center justify-center p-6`}>
                    <Ionicons
                        name="link-outline"
                        size={64}
                        color={colorScheme === 'dark' ? '#666' : '#ccc'}
                    />
                    <Text
                        style={tw`text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 text-center`}>
                        Profile Links Not Available
                    </Text>
                    <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mt-2 text-center`}>
                        This feature requires a server update. Please check back later.
                    </Text>
                </View>
            </View>
        );
    }

    const linksData = links?.data;
    const hasExistingLinks = linksData?.links && linksData.links.length > 0;
    const needsFollowers = !linksData?.can_add && linksData?.total_allowed === 0;
    const maxLinksReached =
        !linksData?.can_add && linksData?.available_slots === 0 && hasExistingLinks;
    const canAdd = linksData?.can_add && linksData?.available_slots > 0;
    const isAddingDisabled = !canAdd || addMutation.isPending || !newLinkUrl.trim();

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Edit Links',
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
                }}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={tw`flex-1`}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                {isLoading ? (
                    <View style={tw`flex-1 items-center justify-center`}>
                        <ActivityIndicator
                            size="large"
                            color={colorScheme === 'dark' ? '#fff' : '#000'}
                        />
                    </View>
                ) : (
                    <ScrollView
                        style={tw`flex-1`}
                        contentContainerStyle={tw`pb-6`}
                        keyboardShouldPersistTaps="handled">
                        <View style={tw`p-5 pb-3`}>
                            <Text style={tw`text-sm text-gray-600 dark:text-gray-400 mb-1`}>
                                {linksData?.links?.length || 0} of {linksData?.total_allowed || 0}{' '}
                                links used
                            </Text>
                            <Text style={tw`text-xs text-gray-500 dark:text-gray-500`}>
                                Add links to your website, social profiles, or other content
                            </Text>
                        </View>

                        {needsFollowers && (
                            <View style={tw`px-5 pb-4`}>
                                <View
                                    style={tw`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4`}>
                                    <View style={tw`flex-row items-start`}>
                                        <Ionicons
                                            name="people-outline"
                                            size={24}
                                            color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'}
                                            style={tw`mr-3 mt-0.5`}
                                        />
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={tw`text-base font-semibold text-blue-800 dark:text-blue-200 mb-2`}>
                                                Grow Your Audience First
                                            </Text>
                                            <Text
                                                style={tw`text-sm text-blue-700 dark:text-blue-300 leading-5 mb-2`}>
                                                You need at least {linksData?.min_threshold}{' '}
                                                followers before you can add profile link(s).
                                            </Text>
                                            <Text
                                                style={tw`text-xs text-blue-600 dark:text-blue-400 leading-4`}>
                                                Keep creating great content and engaging with the
                                                community to grow your audience!
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        {hasExistingLinks && (
                            <View style={tw`px-5 pb-4`}>
                                <YStack gap="$2">
                                    {linksData.links.map((link) => (
                                        <View
                                            key={link.id}
                                            style={tw`flex-row items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800`}>
                                            <Ionicons
                                                name="link"
                                                size={20}
                                                color={colorScheme === 'dark' ? '#888' : '#666'}
                                                style={tw`mr-3`}
                                            />
                                            <Text
                                                style={tw`flex-1 text-lg text-gray-800 dark:text-gray-200`}
                                                numberOfLines={1}
                                                ellipsizeMode="middle">
                                                {link.url_pretty}
                                            </Text>
                                            <PressableHaptics
                                                onPress={() => handleDeleteLink(link)}
                                                disabled={deleteMutation.isPending}
                                                style={tw`ml-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg`}>
                                                {deleteMutation.isPending ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="#ef4444"
                                                    />
                                                ) : (
                                                    <Ionicons
                                                        name="trash-outline"
                                                        size={18}
                                                        color="#ef4444"
                                                    />
                                                )}
                                            </PressableHaptics>
                                        </View>
                                    ))}
                                </YStack>
                            </View>
                        )}

                        {canAdd ? (
                            <View style={tw`px-5 pt-2`}>
                                <View
                                    style={tw`${hasExistingLinks ? 'border-t border-gray-200 dark:border-gray-800 pt-4' : ''}`}>
                                    <Text
                                        style={tw`text-base font-semibold text-gray-800 dark:text-gray-200 mb-3`}>
                                        Add New Link
                                    </Text>

                                    <View style={tw`mb-3`}>
                                        <TextInput
                                            style={tw`bg-gray-50 dark:bg-gray-900 border ${
                                                urlError
                                                    ? 'border-red-500 dark:border-red-500'
                                                    : 'border-gray-200 dark:border-gray-800'
                                            } rounded-xl px-4 py-3.5 text-gray-800 dark:text-gray-200 text-base`}
                                            placeholder="https://example.com"
                                            placeholderTextColor={
                                                colorScheme === 'dark' ? '#666' : '#999'
                                            }
                                            value={newLinkUrl}
                                            onChangeText={handleUrlChange}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            keyboardType="url"
                                            returnKeyType="done"
                                            onSubmitEditing={handleAddLink}
                                            maxLength={120}
                                        />
                                        {urlError ? (
                                            <Text style={tw`text-xs text-red-500 mt-2 ml-1`}>
                                                {urlError}
                                            </Text>
                                        ) : (
                                            <Text
                                                style={tw`text-xs text-gray-500 dark:text-gray-500 mt-2 ml-1`}>
                                                Must start with https:// (max 120 characters)
                                            </Text>
                                        )}
                                    </View>

                                    <PressableHaptics
                                        onPress={handleAddLink}
                                        disabled={isAddingDisabled}
                                        style={tw`${
                                            isAddingDisabled
                                                ? 'bg-gray-200 dark:bg-gray-800'
                                                : 'bg-blue-500 dark:bg-blue-600'
                                        } rounded-xl py-3.5 items-center justify-center`}>
                                        {addMutation.isPending ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text
                                                style={tw`${
                                                    isAddingDisabled
                                                        ? 'text-gray-400 dark:text-gray-600'
                                                        : 'text-white'
                                                } font-semibold text-base`}>
                                                Add Link
                                            </Text>
                                        )}
                                    </PressableHaptics>
                                </View>
                            </View>
                        ) : maxLinksReached ? (
                            <View style={tw`px-5 pt-2`}>
                                <View
                                    style={tw`border-t border-gray-200 dark:border-gray-800 pt-4`}>
                                    <View
                                        style={tw`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex-row items-start`}>
                                        <Ionicons
                                            name="information-circle"
                                            size={20}
                                            color={colorScheme === 'dark' ? '#fbbf24' : '#d97706'}
                                            style={tw`mr-3 mt-0.5`}
                                        />
                                        <View style={tw`flex-1`}>
                                            <Text
                                                style={tw`text-sm font-medium text-amber-800 dark:text-amber-200 mb-1`}>
                                                Maximum Links Reached
                                            </Text>
                                            <Text
                                                style={tw`text-xs text-amber-700 dark:text-amber-300`}>
                                                You've added the maximum number of profile links.
                                                Delete an existing link to add a new one.
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ) : null}

                        {/* Info Section */}
                        {!needsFollowers && (
                            <View style={tw`px-5 pt-6`}>
                                <YStack gap="$2">
                                    <Text
                                        style={tw`text-xs text-gray-500 dark:text-gray-500 leading-4`}>
                                        • Links must use HTTPS for security
                                    </Text>
                                    <Text
                                        style={tw`text-xs text-gray-500 dark:text-gray-500 leading-4`}>
                                        • Links appear on your profile page
                                    </Text>
                                    <Text
                                        style={tw`text-xs text-gray-500 dark:text-gray-500 leading-4`}>
                                        • Inappropriate links may be removed
                                    </Text>
                                </YStack>
                            </View>
                        )}
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}
