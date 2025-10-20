import {
    SectionHeader,
    SettingsToggleItem
} from '@/components/settings/Stack';
import { fetchAccountPrivacy, updateAccountPrivacy } from '@/utils/requests';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function PrivacyScreen() {
    const [suggestAccount, setSuggestAccount] = useState(true);
    const queryClient = useQueryClient();
    
    const { data, isLoading, error } = useQuery({
        queryKey: ['privacySettings'],
        queryFn: fetchAccountPrivacy,
    });

    useEffect(() => {
        if (data?.data?.discoverable !== undefined) {
            setSuggestAccount(data.data.discoverable);
        }
    }, [data]);

    const updatePrivacyMutation = useMutation({
        mutationFn: (params) => updateAccountPrivacy(params),
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries({ queryKey: ['privacySettings'] });
            const previousSettings = queryClient.getQueryData(['privacySettings']);
            
            queryClient.setQueryData(['privacySettings'], (old) => ({
                ...old,
                ...newSettings,
            }));
            
            return { previousSettings };
        },
        onSuccess: (data) => {
            console.log('Response data:', data);
            queryClient.invalidateQueries({ queryKey: ['privacySettings'] });
        },
        onError: (error, newSettings, context) => {
            console.log('Mutation error:', error);
            if (context?.previousSettings) {
                queryClient.setQueryData(['privacySettings'], context.previousSettings);
                setSuggestAccount(context.previousSettings.discoverable);
            }
        },
    });

    const handleToggleSuggest = (value) => {
        setSuggestAccount(value);
        updatePrivacyMutation.mutate({ discoverable: value });
    };

    return (
        <View style={tw`flex-1 bg-gray-100`}>
            <Stack.Screen
                options={{
                    title: 'Privacy',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SectionHeader title="Account Privacy" />

                <SettingsToggleItem
                    icon="people-outline"
                    label="Suggest account to others"
                    value={suggestAccount}
                    onValueChange={handleToggleSuggest}
                />
            </ScrollView>
        </View>
    );
}