import { StackText, YStack } from '@/components/ui/Stack';
import { getInstanceTerms, openLocalLink } from '@/utils/requests';
import { formatDate } from '@/utils/ui';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import tw from 'twrnc';

export default function TermsScreen() {
    const { width } = useWindowDimensions();

    const { data, isLoading } = useQuery({
        queryKey: ['getInstanceTerms', 'self'],
        queryFn: async () => {
            const res = await getInstanceTerms();
            return res.data;
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    if(isLoading) {
        return (
            <View style={tw`flex-1 justify-center items-center`}>
                <ActivityIndicator />
            </View>
        )
    }

    const openInBrowser = async () => {
        await openLocalLink('terms')
    }

    const source = {
        html: data?.content || '<p>No content available</p>'
    };

    const tagsStyles = {
        body: {
            color: '#1f2937',
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
            color: '#2563eb',
            textDecorationLine: 'underline',
        },
    };

    return (
        <View style={tw`flex-1 bg-gray-100`}>
            <Stack.Screen
                options={{
                    title: 'Terms of Service',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Back',
                    headerShown: true,
                }}
            />

            <ScrollView 
                style={tw`flex-1`}
                contentContainerStyle={tw`p-4`}
            >
                <View style={tw`bg-white rounded-lg p-4 shadow-sm`}>
                    <YStack>
                        <StackText fontSize='$6' fontWeight="bold" textAlign="center" style={tw`mb-3 pb-2 border-b-2 border-gray-300`}>{ data?.title }</StackText>
                    </YStack>
                    <RenderHtml
                        contentWidth={width - 48}
                        source={source}
                        tagsStyles={tagsStyles}
                        enableExperimentalMarginCollapsing={true}
                    />
                </View>
                <StackText textAlign="center" style={tw`mt-3 text-gray-500`}>Last updated { formatDate(data.updated_at) }</StackText>
                <Pressable onPress={() => openInBrowser()}>
                    <StackText textAlign="center" style={tw`mt-3 text-gray-500`}>View in browser</StackText>
                </Pressable>
                <View style={tw`h-20`}></View>
            </ScrollView>
        </View>
    );
}