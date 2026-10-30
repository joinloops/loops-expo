import { SectionHeader } from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchDmPrivacy, updateDmPrivacy } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

const DM_PRIVACY_OPTIONS = [
    {
        value: 'off',
        label: 'Off',
        description: 'Nobody can message you',
        icon: 'close-circle-outline',
    },
    {
        value: 'following',
        label: 'Mutual followers',
        description: 'People that follow you, and you follow can message you',
        icon: 'people-outline',
    },
    {
        value: 'everyone',
        label: 'Everyone',
        description: 'Anyone can message you',
        icon: 'globe-outline',
    },
];

export default function DirectMessagesPrivacyScreen() {
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();
    const [selected, setSelected] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['dmPrivacy'],
        queryFn: fetchDmPrivacy,
    });

    useEffect(() => {
        if (data?.data?.state) {
            setSelected(data.data.state);
        }
    }, [data]);

    const updateDmPrivacyMutation = useMutation({
        mutationFn: (state) => updateDmPrivacy(state),
        onMutate: async (state) => {
            await queryClient.cancelQueries({ queryKey: ['dmPrivacy'] });
            const previous = queryClient.getQueryData(['dmPrivacy']);

            queryClient.setQueryData(['dmPrivacy'], (old) => ({
                ...old,
                data: { ...old?.data, state },
            }));

            return { previous };
        },
        onError: (err, state, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['dmPrivacy'], context.previous);
                setSelected(context.previous?.data?.state ?? null);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dmPrivacy'] });
        },
    });

    const handleSelect = (value) => {
        if (value === selected || updateDmPrivacyMutation.isPending) return;
        setSelected(value);
        updateDmPrivacyMutation.mutate(value);
    };

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Direct Messages',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Privacy',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pb-10`}>
                <SectionHeader title="Who can direct message you?" />

                {isLoading && !selected ? (
                    <View style={tw`py-10 items-center`}>
                        <ActivityIndicator color={colorScheme === 'dark' ? '#fff' : '#000'} />
                    </View>
                ) : (
                    <View style={tw`px-4 gap-3`}>
                        {DM_PRIVACY_OPTIONS.map((option) => {
                            const isActive = selected === option.value;
                            return (
                                <Pressable
                                    key={option.value}
                                    onPress={() => handleSelect(option.value)}
                                    style={tw.style(
                                        `flex-row items-center gap-3 rounded-xl border-2 px-4 py-3.5`,
                                        isActive
                                            ? `bg-white dark:bg-[#F02C56]/10 border-[#F02C56]`
                                            : `bg-white dark:bg-[#111] border-transparent`
                                    )}
                                >
                                    <Ionicons
                                        name={option.icon}
                                        size={22}
                                        color={
                                            isActive
                                                ? '#F02C56'
                                                : colorScheme === 'dark'
                                                    ? '#9ca3af'
                                                    : '#6b7280'
                                        }
                                    />

                                    <View style={tw`flex-1`}>
                                        <Text
                                            style={tw`text-[15px] font-semibold text-gray-900 dark:text-white`}
                                        >
                                            {option.label}
                                        </Text>
                                        <Text
                                            style={tw`text-xs text-gray-600 dark:text-gray-400 mt-0.5`}
                                        >
                                            {option.description}
                                        </Text>
                                    </View>

                                    <View
                                        style={tw.style(
                                            `w-5.5 h-5.5 rounded-full border-2 items-center justify-center`,
                                            isActive
                                                ? `border-[#F02C56]`
                                                : `border-gray-300 dark:border-gray-600`
                                        )}
                                    >
                                        {isActive ? (
                                            <View
                                                style={tw`w-2.5 h-2.5 rounded-full bg-[#F02C56]`}
                                            />
                                        ) : null}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                <Text style={tw`px-5 pt-4 text-xs text-gray-500 dark:text-gray-400 leading-5`}>
                    This applies to new conversations. People you already have a conversation with
                    can still reach you.
                </Text>

                {error ? (
                    <Text style={tw`px-5 pt-4 text-xs text-red-500`}>
                        Could not load your message settings. Pull back and try again.
                    </Text>
                ) : null}
            </ScrollView>
        </View>
    );
}