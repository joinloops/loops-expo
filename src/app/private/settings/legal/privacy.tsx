import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { getInstancePrivacy, openLocalLink } from '@/utils/requests';
import { formatDate } from '@/utils/ui';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import tw from 'twrnc';

export default function PrivacyScreen() {
    const { width } = useWindowDimensions();
    const { colorScheme } = useTheme();

    const { data, isLoading } = useQuery({
        queryKey: ['getInstancePrivacy', 'self'],
        queryFn: async () => {
            const res = await getInstancePrivacy();
            return res.data;
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    if (isLoading) {
        return (
            <View style={tw`flex-1 dark:bg-black justify-center items-center`}>
                <Stack.Screen
                    options={{
                        title: 'Privacy Policy',
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                        headerBackTitle: 'Back',
                        headerShown: true,
                    }}
                />
                <ActivityIndicator />
            </View>
        );
    }

    const openInBrowser = async () => {
        await openLocalLink('privacy', {
            presentationStyle: 'popover',
            showTitle: false,
        });
    };

    const source = {
        html: data?.content || '<p>No content available</p>',
    };

    const tagsStyles = {
        body: {
            color: colorScheme === 'dark' ? '#fff' : '#1f2937',
            fontSize: 16,
            lineHeight: 24,
        },
        p: {
            marginBottom: 12,
        },
        h1: {
            fontSize: 24,
            fontWeight: 'bold',
            marginTop: 16,
            marginBottom: 12,
        },
        h2: {
            fontSize: 20,
            fontWeight: 'bold',
            marginTop: 14,
            marginBottom: 10,
        },
        h3: {
            fontSize: 18,
            fontWeight: 'bold',
            marginTop: 12,
            marginBottom: 8,
        },
        ul: {
            marginBottom: 12,
        },
        ol: {
            marginBottom: 12,
        },
        li: {
            marginBottom: 6,
        },
        a: {
            color: colorScheme === 'dark' ? '#6994ef' : '#2563eb',
            textDecorationLine: 'underline',
        },
    };

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Privacy Policy',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Back',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
                <View style={tw`bg-white dark:bg-black rounded-lg p-4 shadow-sm`}>
                    <YStack>
                        <StackText
                            fontSize="$6"
                            fontWeight="bold"
                            textAlign="center"
                            style={tw`mb-3 pb-2 border-b-2 dark:text-white border-gray-300 dark:border-gray-800`}>
                            {data?.title}
                        </StackText>
                    </YStack>
                    <RenderHtml
                        contentWidth={width - 48}
                        source={source}
                        tagsStyles={tagsStyles}
                        enableExperimentalMarginCollapsing={true}
                    />
                </View>
                <StackText textAlign="center" style={tw`mt-3 text-gray-500`}>
                    Last updated {formatDate(data.updated_at)}
                </StackText>
                <Pressable onPress={() => openInBrowser()}>
                    <StackText textAlign="center" style={tw`mt-3 text-gray-500`}>
                        View in browser
                    </StackText>
                </Pressable>
                <View style={tw`h-20`}></View>
            </ScrollView>
        </View>
    );
}
