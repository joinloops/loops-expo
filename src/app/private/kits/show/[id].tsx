import { useTheme } from '@/contexts/ThemeContext';
import { fetchStarterKit, fetchStarterKitUsed } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

interface ProfileLink {
    url: string;
    link: string;
    is_verified: boolean;
}

interface KitAccount {
    id: string;
    name: string;
    avatar: string;
    username: string;
    is_owner: boolean;
    local: boolean;
    bio: string;
    post_count: number;
    follower_count: number;
    following_count: number;
    url: string;
    remote_url: string | null;
    is_blocking: boolean | null;
    links: ProfileLink[];
    created_at: string;
    kit_status: number;
    approved_at: string;
    rejected_at: string | null;
    order: number;
    starter_kit_id: string;
}

interface StarterKit {
    id: string;
    title: string;
    description: string;
    url: string;
    path: string;
    remote_url: string | null;
    is_local: boolean;
    is_discoverable: boolean;
    is_sensitive: boolean;
    created_at: string;
    updated_at: string;
    is_owner: boolean;
    creator: {
        id: string;
        name: string;
        username: string;
        avatar: string;
    };
    uses: number;
    total_accounts: number;
    approved_accounts: number;
    accounts: KitAccount[];
    header_url: string;
    icon_url: string;
    status: number;
    status_text: string;
    hashtags: string[];
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

interface AccountCardProps {
    account: KitAccount;
    onFollow: (id: string) => void;
    isFollowing: boolean;
    isLoading: boolean;
    onPress: (account: KitAccount) => void;
}

function AccountCard({ account, onFollow, isFollowing, isLoading, onPress }: AccountCardProps) {
    return (
        <Pressable
            onPress={() => onPress(account)}
            style={({ pressed }) => [
                tw`flex-row items-start px-4 py-3.5`,
                pressed && tw`bg-white/5`,
            ]}>
            {/* Avatar */}
            <Image
                source={{ uri: account.avatar }}
                style={tw`w-12 h-12 rounded-full bg-gray-800`}
            />

            {/* Info */}
            <View style={tw`flex-1 mx-3`}>
                <View style={tw`flex-row items-center gap-1`}>
                    <Text
                        style={tw`text-black dark:text-white font-semibold text-sm`}
                        numberOfLines={1}>
                        {account.name}
                    </Text>
                </View>
                <Text style={tw`text-gray-700 dark:text-gray-400 text-xs mb-1`}>
                    @{account.username}
                </Text>
                {account.bio ? (
                    <Text
                        style={tw`text-gray-600 dark:text-gray-300 text-xs leading-4`}
                        numberOfLines={2}>
                        {account.bio}
                    </Text>
                ) : null}
                <View style={tw`flex-row items-center gap-3 mt-1.5`}>
                    <Text style={tw`text-gray-500 text-sm`}>
                        <Text style={tw`text-gray-600 dark:text-gray-300 font-semibold`}>
                            {formatCount(account.follower_count)}
                        </Text>{' '}
                        followers
                    </Text>
                    <Text style={tw`text-gray-500 text-sm`}>
                        <Text style={tw`text-gray-600 dark:text-gray-300 font-semibold`}>
                            {formatCount(account.post_count)}
                        </Text>{' '}
                        posts
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

interface Props {
    kit: StarterKit;
    onBack?: () => void;
    onAccountPress?: (account: KitAccount) => void;
    onUseKit?: (kit: StarterKit) => void;
}

export default function StarterKitShow() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { colorScheme } = useTheme();

    const {
        data: kit,
        isLoading,
        error: error,
    } = useQuery({
        queryKey: ['fetchStarterKit', id?.toString()],
        queryFn: async () => {
            const res = await fetchStarterKit(id.toString());
            return res.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });

    const { data: hasUsed } = useQuery({
        queryKey: ['fetchStaterKitHasUsed', id?.toString()],
        queryFn: async () => {
            const res = await fetchStarterKitUsed(id.toString());
            if (res.data.used) {
                setKitUsed(true);
            }
            return res.data;
        },
    });

    const [followState, setFollowState] = useState<Record<string, boolean>>({});
    const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
    const [usingKit, setUsingKit] = useState(false);
    const [kitUsed, setKitUsed] = useState(false);

    const handleAccountOnPress = (account) => {
        router.push(`/private/profile/${account.id}`);
    };

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                message: `Check out "${kit.title}" on Loops — ${kit.url}`,
                url: kit.url,
                title: kit.title,
            });
        } catch {}
    }, [kit]);

    if (isLoading) {
        return (
            <View style={tw`flex-1 bg-white dark:bg-black justify-center items-center`}>
                <Stack.Screen
                    options={{
                        title: 'Starter Kit',
                        headerStyle: tw`bg-white dark:bg-black`,
                        headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                        headerShadowVisible: false,
                        headerShown: true,
                        headerLeft: () => (
                            <TouchableOpacity
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
                            </TouchableOpacity>
                        ),
                    }}
                />
                <ActivityIndicator size="large" color="#F02C56" />
            </View>
        );
    }

    return (
        <View style={[tw`flex-1 bg-white dark:bg-black`]}>
            <Stack.Screen
                options={{
                    title: 'Starter Kit',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    headerShown: true,
                    headerTitle: 'Starter Kit',
                }}
            />

            <ScrollView
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
                {kit.header_url && (
                    <>
                        <View style={tw`relative`}>
                            <Image
                                source={{ uri: kit.header_url }}
                                style={tw`w-full h-48 bg-white dark:bg-gray-900`}
                                resizeMode="cover"
                            />

                            <View style={tw`absolute -bottom-7 left-4`}>
                                <Image
                                    source={{ uri: kit.icon_url }}
                                    style={tw`w-14 h-14 rounded-2xl bg-gray-800 border-2 border-white dark:border-black`}
                                />
                            </View>
                        </View>
                        <View style={tw`pt-7`}></View>
                    </>
                )}

                <View style={tw`px-4 pt-3 pb-4`}>
                    <View style={tw`flex-row items-start justify-between`}>
                        <View style={tw`flex-1 mr-3`}>
                            <Text
                                style={tw`text-black dark:text-white text-2xl font-bold leading-snug`}>
                                {kit.title}
                            </Text>
                            {kit.description ? (
                                <Text
                                    style={tw`text-gray-600 dark:text-gray-400 text-sm mt-1 leading-5`}>
                                    {kit.description}
                                </Text>
                            ) : null}
                        </View>
                        {kit.is_owner && (
                            <View
                                style={tw`bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1 mt-0.5`}>
                                <Text style={tw`text-emerald-400 text-[11px] font-semibold`}>
                                    {kit.status_text}
                                </Text>
                            </View>
                        )}
                    </View>

                    {kit.hashtags.length > 0 && (
                        <View style={tw`flex-row flex-wrap gap-1.5 mt-3`}>
                            {kit.hashtags.map((tag) => (
                                <View
                                    key={tag}
                                    style={tw`bg-gray-100 border border-gray-300 rounded-full px-3 py-1`}>
                                    <Text style={tw`text-gray-600 text-xs font-medium`}>
                                        #{tag}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={tw`flex-row justify-between mt-4`}>
                        <View style={tw`px-5 flex justify-center items-center`}>
                            <Text style={tw`text-black dark:text-white text-xl font-bold`}>
                                {kit.approved_accounts}
                            </Text>
                            <Text style={tw`text-gray-500 text-base`}>accounts</Text>
                        </View>
                        <View style={tw`w-px bg-gray-200 dark:bg-gray-800`} />
                        <View style={tw`px-5 flex justify-center items-center`}>
                            <Text style={tw`text-black dark:text-white text-xl font-bold`}>
                                {formatCount(kit.uses)}
                            </Text>
                            <Text style={tw`text-gray-500 text-base`}>uses</Text>
                        </View>
                        <View style={tw`w-px bg-gray-200 dark:bg-gray-800`} />
                        <View style={tw`px-5 flex justify-center items-center`}>
                            <Text style={tw`text-black dark:text-white text-xl font-bold`}>
                                {kit.total_accounts}
                            </Text>
                            <Text style={tw`text-gray-500 text-base`}>total invited</Text>
                        </View>
                    </View>

                    <Pressable style={tw`flex-row items-center gap-2 mt-4`}>
                        <Image
                            source={{ uri: kit.creator.avatar }}
                            style={tw`w-5 h-5 rounded-full bg-gray-800`}
                        />
                        <Text style={tw`text-gray-600 dark:text-gray-400 text-base`}>
                            Curated by{' '}
                            <Text style={tw`text-black dark:text-gray-200 font-semibold`}>
                                @{kit.creator.username}
                            </Text>
                        </Text>
                    </Pressable>

                    <View style={tw`flex-row gap-2 mt-5`}>
                        <TouchableOpacity
                            disabled={usingKit == true || kitUsed == true || kit.is_owner === true}
                            style={[
                                tw`flex-1 rounded-xl py-4 items-center justify-center`,
                                kitUsed ? tw`bg-[#F02C56]/50` : tw`bg-[#F02C56]`,
                            ]}
                            activeOpacity={0.8}>
                            {usingKit ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={tw`text-white font-bold text-base`}>
                                    {kit?.is_owner
                                        ? 'You created this Kit'
                                        : kitUsed
                                          ? '✓ Kit Applied'
                                          : 'Use Starter Kit'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={tw`h-px bg-gray-200 dark:bg-gray-900 mx-0`} />

                <View style={tw`pt-4`}>
                    {kit.accounts.map((account, index) => (
                        <React.Fragment key={account.id}>
                            <AccountCard
                                account={account}
                                onPress={() => handleAccountOnPress(account)}
                                isFollowing={!!followState[account.id]}
                                isLoading={!!loadingState[account.id]}
                            />
                            {index < kit.accounts.length - 1 && (
                                <View style={tw`h-px bg-gray-200 dark:bg-gray-900/60 mx-4`} />
                            )}
                        </React.Fragment>
                    ))}
                </View>

                <View style={tw`px-4 pt-6`}>
                    <Text style={tw`text-gray-700 text-[11px] text-center`}>
                        {kit.is_discoverable ? 'Public kit · ' : 'Private kit · '}
                        Updated{' '}
                        {new Date(kit.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
