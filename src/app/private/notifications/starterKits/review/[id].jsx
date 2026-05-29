import { useTheme } from '@/contexts/ThemeContext';
import { fetchStarterKit, fetchStarterKitMembership, fetchStarterKitMembershipDecide } from '@/utils/requests';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import tw from 'twrnc';

const STUB_KIT = {
    id: 1,
    title: 'Fediverse Photographers',
    description: 'A curated collection of the best photography accounts on the fediverse. Great for anyone who loves film, street, and nature photography.',
    hashtags: ['photography', 'film', 'nature'],
    approved_accounts: 24,
    uses: 312,
    creator: {
        username: 'dansup',
        name: 'Daniel Sup',
        avatar: 'https://i.pravatar.cc/150?u=dansup',
    },
    accounts: [
        { id: 1, name: 'Alice Frames', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice', follower_count: 1840, kit_status: 1 },
        { id: 2, name: 'Bruno Lens', username: 'bruno', avatar: 'https://i.pravatar.cc/150?u=bruno', follower_count: 920, kit_status: 1 },
        { id: 3, name: 'Clara Shot', username: 'clara', avatar: 'https://i.pravatar.cc/150?u=clara', follower_count: 3100, kit_status: 1 },
    ],
}

type Decision = 'approved' | 'rejected'

const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

export default function StarterKitInviteScreen() {
    const { colorScheme } = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pendingDecision, setPendingDecision] = useState(null)
    const [decisionMade, setDecisionMade] = useState(false)
    const [decision, setDecision] = useState(null)

    const isDark = colorScheme === 'dark'

    const bg             = isDark ? '#0A0A0A' : '#ffffff'
    const border         = isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'
    const divider        = isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'
    const textPrimary    = isDark ? '#ffffff' : '#000'
    const textSub        = isDark ? '#9ca3af' : '#6b7280'
    const textMuted      = isDark ? '#6b7280' : '#9ca3af'
    const tagBg          = isDark ? '#1f2937' : '#f3f4f6'
    const tagText        = isDark ? '#9ca3af' : '#4b5563'
    const badgeBg        = isDark ? 'rgba(217,119,6,0.15)' : '#fffbeb'
    const badgeBorder    = isDark ? 'rgba(217,119,6,0.3)'  : '#fde68a'
    const badgeText      = isDark ? '#fbbf24' : '#92400e'
    const btnPrimary     = isDark ? '#ffffff' : '#000'
    const btnPrimaryText = isDark ? '#000' : '#ffffff'
    const btnLight       = isDark ? '#1f2937' : '#f3f4f6'
    const btnLightText   = isDark ? '#d1d5db' : '#374151'

    const previewAccounts = STUB_KIT.accounts.filter(a => a.kit_status === 1).slice(0, 3)

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
    });

    const {
        data: membership,
        isLoading: membershipLoading,
        error: membershipError,
    } = useQuery({
        queryKey: ['fetchStarterKitMembership', id?.toString()],
        queryFn: async () => {
            const res = await fetchStarterKitMembership(id.toString());
            return res.data;
        },
        enabled: !!id,
    });

    const handleDecision = useMutation({
        mutationFn: async (choice: string) => {
            setIsSubmitting(true)
            setPendingDecision(choice)
            return await fetchStarterKitMembershipDecide(kit.id, choice);
        },
        onMutate: async (choice) => {
            setDecision(choice)
        },
        onError: (err, choice, context) => {
            setDecision(choice)
        },
        onSettled: () => {
            setDecisionMade(true)
            setIsSubmitting(false)
            setPendingDecision(null)
        },
    });

    if(isLoading || membershipLoading) {
        return (<ActivityIndicator />)
    }

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Starter Kits',
                    headerBackTitle: 'Back',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
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
                    )
                 }} />
        <ScrollView
            style={{ flex: 1, backgroundColor: bg }}
            contentContainerStyle={tw`pb-12`}
            showsVerticalScrollIndicator={false}
        >
            <View style={[tw`px-4 py-5`, { borderBottomWidth: 1, borderBottomColor: border }]}>
                <View style={[
                    tw`self-start flex-row items-center gap-1.5 px-2.5 py-1 rounded-full mb-4`,
                    { backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder },
                ]}>
                    <Feather name="clock" size={13} color={badgeText} />
                    <Text style={[tw`text-xs font-semibold`, { color: badgeText }]}>
                        Invitation Pending Your Response
                    </Text>
                </View>
                <Text style={[tw`text-2xl font-bold mb-1.5 leading-tight`, { color: textPrimary }]}>
                    You've been added to a Starter Kit
                </Text>
                <Text style={[tw`text-sm leading-relaxed`, { color: textSub }]}>
                    Review the Starter Kit below and choose to accept or decline your inclusion.
                </Text>
            </View>

            <View style={[tw`px-4 py-5`, { borderBottomWidth: 1, borderBottomColor: border }]}>
                <Text style={[tw`text-xl font-bold mb-1.5 leading-snug`, { color: textPrimary }]}>
                    {kit.title}
                </Text>
                <Text style={[tw`text-sm leading-relaxed mb-3`, { color: textSub }]}>
                    {kit.description}
                </Text>

                <View style={tw`flex-row flex-wrap gap-1.5 mb-4`}>
                    {kit.hashtags.map(tag => (
                        <View key={tag} style={[tw`px-2.5 py-1 rounded-full`, { backgroundColor: tagBg }]}>
                            <Text style={[tw`text-xs font-medium`, { color: tagText }]}>#{tag}</Text>
                        </View>
                    ))}
                </View>

                {/* Meta */}
                <View style={tw`flex-row items-center flex-wrap gap-x-3 gap-y-1`}>
                    <View style={tw`flex-row items-center gap-1.5`}>
                        <Image
                            source={{ uri: kit.creator.avatar }}
                            style={tw`w-4 h-4 rounded-full`}
                        />
                        <Text style={[tw`text-xs font-semibold`, { color: textSub }]}>
                            @{kit.creator.username}
                        </Text>
                    </View>
                    <Text style={{ color: divider, fontSize: 14 }}>·</Text>
                    <View style={tw`flex-row items-center gap-1`}>
                        <Feather name="users" size={11} color={textMuted} />
                        <Text style={[tw`text-xs`, { color: textMuted }]}>
                            {formatCount(kit.approved_accounts)} accounts
                        </Text>
                    </View>
                    <Text style={{ color: divider, fontSize: 14 }}>·</Text>
                    <Text style={[tw`text-xs`, { color: textMuted }]}>
                        {formatCount(kit.uses)} uses
                    </Text>
                </View>
            </View>

            <View style={[tw`px-4 py-5`, { borderBottomWidth: 1, borderBottomColor: border }]}>
                <Text style={[tw`text-xs font-semibold uppercase mb-3`, { color: textMuted, letterSpacing: 1 }]}>
                    Also in this Kit
                </Text>
                {kit.accounts.map((account, idx) => (
                    <View
                        key={account.id}
                        style={[
                            tw`flex-row items-center gap-3 py-2.5`,
                            idx > 0 && { borderTopWidth: 1, borderTopColor: divider },
                        ]}
                    >
                        <Image source={{ uri: account.avatar }} style={tw`w-9 h-9 rounded-full`} />
                        <View style={tw`flex-1`}>
                            <Text
                                style={[tw`text-sm font-semibold leading-tight`, { color: textPrimary }]}
                                numberOfLines={1}
                            >
                                {account.name}
                            </Text>
                            <Text style={[tw`text-xs leading-tight`, { color: textMuted }]}>
                                @{account.username}
                            </Text>
                        </View>
                        <View style={tw`flex-row items-center gap-1`}>
                            <Feather name="users" size={11} color={textMuted} />
                            <Text style={[tw`text-xs`, { color: textMuted }]}>
                                {formatCount(account.follower_count)}
                            </Text>
                        </View>
                    </View>
                ))}
                {kit.approved_accounts > kit.accounts.length && (
                    <Text style={[tw`text-center text-xs pt-4`, { color: textMuted }]}>
                        + {STUB_KIT.approved_accounts - previewAccounts.length} more accounts
                    </Text>
                )}
            </View>

            <View style={tw`px-4 pt-6`}>
                {membership.used || decisionMade ? (
                    <View style={tw`items-center py-6`}>
                        <View style={[
                            tw`w-14 h-14 rounded-2xl items-center justify-center mb-4`,
                            {
                                borderWidth: 1,
                                backgroundColor: decision === 'approved'
                                    ? isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4'
                                    : isDark ? '#000' : '#f9fafb',
                                borderColor: decision === 'approved'
                                    ? isDark ? 'rgba(34,197,94,0.2)' : '#bbf7d0'
                                    : isDark ? '#1f2937' : '#e5e7eb',
                            },
                        ]}>
                            {decision === 'approved'
                                ? <Ionicons name="checkmark-circle" size={28} color={isDark ? '#4ade80' : '#22c55e'} />
                                : <Ionicons name="close-circle" size={28} color={isDark ? '#6b7280' : '#9ca3af'} />
                            }
                        </View>
                        <Text style={[tw`text-base font-semibold mb-1`, { color: textPrimary }]}>
                            {decision === 'approved' ? "You're In!" : 'Invitation Declined'}
                        </Text>
                        <Text style={[tw`text-sm text-center mb-5`, { color: textSub }]}>
                            {decision === 'approved'
                                ? 'Your profile is now visible in this Starter Kit.'
                                : "You won't appear in this Starter Kit."}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.75}
                            style={[tw`px-5 py-2.5 rounded-xl`, { backgroundColor: btnLight }]}
                            onPress={() => { router.push(`/private/kits/show/${kit.id.toString()}`) }}
                        >
                            <Text style={[tw`text-sm font-semibold`, { color: btnLightText }]}>View Kit</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <Text style={[tw`text-base font-medium mb-4`, { color: textSub }]}>
                            Do you want to be included in{' '}
                            <Text style={[tw`font-bold`, { color: textPrimary }]}>{kit.title}</Text>?
                        </Text>

                        <View style={tw`flex-row gap-3 mb-3`}>
                            <TouchableOpacity
                                onPress={() => handleDecision.mutate('approved')}
                                disabled={isSubmitting}
                                activeOpacity={0.75}
                                style={[
                                    tw`flex-1 rounded-xl py-3.5 items-center justify-center`,
                                    { backgroundColor: btnPrimary, opacity: isSubmitting ? 0.7 : 1 },
                                ]}
                            >
                                {isSubmitting && pendingDecision === 'approved' ? (
                                    <ActivityIndicator size="small" color={btnPrimaryText} />
                                ) : (
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <Ionicons name="checkmark-circle-outline" size={18} color={btnPrimaryText} />
                                        <Text style={[tw`text-sm font-semibold`, { color: btnPrimaryText }]}>
                                            Accept Invitation
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleDecision.mutate('rejected')}
                                disabled={isSubmitting}
                                activeOpacity={0.75}
                                style={[
                                    tw`flex-1 rounded-xl py-3.5 items-center justify-center`,
                                    { backgroundColor: btnLight, opacity: isSubmitting ? 0.7 : 1 },
                                ]}
                            >
                                {isSubmitting && pendingDecision === 'rejected' ? (
                                    <ActivityIndicator size="small" color={btnLightText} />
                                ) : (
                                    <View style={tw`flex-row items-center gap-2`}>
                                        <Feather name="x" size={18} color={btnLightText} />
                                        <Text style={[tw`text-sm font-semibold`, { color: btnLightText }]}>
                                            Decline
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <Text style={[tw`text-xs text-center mb-4`, { color: textMuted }]}>
                            You can change your mind later and remove yourself at any time.
                        </Text>

                        <View style={tw`flex-row justify-center items-center gap-8`}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => { /* TODO: open report modal */ }}
                            >
                                <View style={tw`flex-row items-center gap-1`}>
                                    <Feather name="flag" size={12} color="#f87171" />
                                    <Text style={tw`text-xs font-medium text-red-400`}>Report Starter Kit</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
        </View>
    )
}