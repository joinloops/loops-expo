import { dmDisplayName } from '@/components/dm/dmHelpers';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import type { DmConversation, DmMessage, DmParticipant } from '@/types/dm';
import { useAuthStore } from '@/utils/authStore';
import {
    dmCreateGroup,
    dmSearchAccounts,
    dmSendMessage,
    fetchDmSuggestedRecipients
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    TextInput,
    View
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const ACCENT = '#F02C56';
const MAX_SELECTED = 11;
const MAX_BODY_LENGTH = 500;

export default function NewMessageScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const { colorScheme } = useTheme();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DmParticipant[]>([]);
    const [searching, setSearching] = useState(false);
    const [restricted, setRestricted] = useState(false);
    const [selected, setSelected] = useState<DmParticipant[]>([]);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [createdConversationId, setCreatedConversationId] = useState<string | null>(null);

    const selfId = user?.id ? String(user.id) : null;
    const showSearchResults = query.trim().length >= 2;

    const [keyboardUp, setKeyboardUp] = useState(false);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const suggestedQuery = useQuery({
        queryKey: ['dm', 'suggested-recipients'],
        queryFn: fetchDmSuggestedRecipients,
        staleTime: 60000,
    });

    const suggested: DmParticipant[] = useMemo(() => {
        const raw = suggestedQuery.data;
        const accounts: DmParticipant[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        return accounts.filter((a) => !selfId || String(a.id) !== selfId);
    }, [suggestedQuery.data, selfId]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await dmSearchAccounts(q);
                const accounts: DmParticipant[] = Array.isArray(res) ? res : (res?.data ?? []);
                if (!cancelled) {
                    setRestricted(Boolean((res as any)?.meta?.restricted));
                    setResults(
                        accounts.filter((a) => !selfId || String(a.id) !== selfId),
                    );
                }
            } catch {
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, selfId]);

    const selectedKey = selected.map((a) => String(a.id)).join(',');

    useEffect(() => {
        setCreatedConversationId(null);
        setError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedKey]);

    const isSelected = (account: DmParticipant) =>
        selected.some((a) => String(a.id) === String(account.id));

    const limitReached = selected.length >= MAX_SELECTED;

    const toggle = (account: DmParticipant) => {
        if (isSelected(account)) {
            setSelected((prev) => prev.filter((a) => String(a.id) !== String(account.id)));
            return;
        }
        if (limitReached) return;
        setSelected((prev) => [...prev, account]);
    };

    const sendMutation = useMutation({
        mutationFn: async () => {
            const body = draft.trim();

            if (selected.length === 1 && !createdConversationId) {
                const res = await dmSendMessage({
                    type: 'text',
                    body,
                    recipient_id: String(selected[0].id),
                });
                const message = (res?.data ?? res) as DmMessage;
                return String(message.conversation_id);
            }

            let conversationId = createdConversationId;

            if (!conversationId) {
                const res = await dmCreateGroup(selected.map((a) => String(a.id)));
                const conversation = (res?.data ?? res) as DmConversation;
                conversationId = String(conversation.id);
                setCreatedConversationId(conversationId);
            }

            await dmSendMessage({
                type: 'text',
                body,
                conversation_id: conversationId,
            });

            return conversationId;
        },
        onSuccess: (conversationId) => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
            router.replace(`/private/messages/${conversationId}` as any);
        },
        onError: (err: any) => {
            setError(err?.response?.data?.message ?? "Couldn't send your message.");
        },
    });

    const canSend = !sendMutation.isPending && selected.length > 0 && !!draft.trim();

    const listData = showSearchResults ? results : suggested;

    const renderAccount = ({ item }: { item: DmParticipant }) => {
        const active = isSelected(item);
        const disabled = limitReached && !active;

        return (
            <PressableHaptics
                onPress={() => toggle(item)}
                disabled={disabled}
                style={({ pressed }) => [
                    tw`flex-row items-center px-4 py-3`,
                    pressed && tw`bg-gray-50 dark:bg-gray-900`,
                    disabled && tw`opacity-40`,
                ]}>
                {item.avatar ? (
                    <Image
                        source={{ uri: item.avatar }}
                        style={tw`w-11 h-11 rounded-full mr-3`}
                    />
                ) : (
                    <View
                        style={tw`w-11 h-11 rounded-full mr-3 bg-gray-200 dark:bg-gray-800 items-center justify-center`}>
                        <StackText
                            fontSize="$4"
                            fontWeight="semibold"
                            textColor="text-gray-500 dark:text-gray-400">
                            {(item.username ?? '?').charAt(0).toUpperCase()}
                        </StackText>
                    </View>
                )}

                <View style={tw`flex-1 mr-3`}>
                    <StackText
                        fontSize="$4"
                        fontWeight="semibold"
                        textColor="text-black dark:text-white"
                        numberOfLines={1}>
                        {dmDisplayName(item)}
                    </StackText>
                    <StackText
                        fontSize="$2"
                        textColor="text-gray-600 dark:text-gray-500"
                        numberOfLines={1}>
                        @{item.username}
                    </StackText>
                </View>

                <View
                    style={[
                        tw`w-6 h-6 rounded-full border-2 items-center justify-center`,
                        active
                            ? { borderColor: ACCENT, backgroundColor: ACCENT }
                            : tw`border-gray-300 dark:border-gray-700`,
                    ]}>
                    {active && <View style={tw`w-2 h-2 rounded-full bg-white`} />}
                </View>
            </PressableHaptics>
        );
    };

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'New message',
                    title: 'New message',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerShadowVisible: false,
                    headerShown: true,
                    headerLeft: () => (
                        <Pressable
                            onPress={() => router.back()}
                            hitSlop={8}
                            style={({ pressed }) => [pressed && tw`opacity-50`]}>
                            <Ionicons
                                name="chevron-back"
                                size={26}
                                color={colorScheme === 'dark' ? '#fff' : '#000'}
                            />
                        </Pressable>
                    ),
                }}
            />

            <KeyboardAvoidingView
                style={tw`flex-1`}
                behavior="padding"
                keyboardVerticalOffset={headerHeight}>
                <View style={tw`px-4 pt-3 pb-2`}>
                    <View
                        style={tw`flex-row items-center rounded-xl px-3 py-2 bg-gray-100 dark:bg-gray-800`}>
                        <Ionicons name="search-outline" size={16} color="#999" />
                        <TextInput
                            style={[
                                tw`flex-1 ml-2 text-black dark:text-white`,
                                { fontSize: 15, paddingVertical: 0 },
                            ]}
                            placeholder="Search people"
                            placeholderTextColor="#999"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searching && <ActivityIndicator size="small" />}
                    </View>
                </View>

                {selected.length > 0 && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={tw`px-4 pb-2 gap-2`}
                        style={{ flexGrow: 0 }}>
                        {selected.map((account) => (
                            <PressableHaptics
                                key={account.id}
                                onPress={() => toggle(account)}
                                style={({ pressed }) => [
                                    tw`flex-row items-center rounded-full pl-3 pr-2 py-1.5 bg-gray-100 dark:bg-gray-800`,
                                    pressed && tw`opacity-60`,
                                ]}>
                                <StackText
                                    fontSize="$2"
                                    fontWeight="semibold"
                                    textColor="text-black dark:text-white">
                                    @{account.username}
                                </StackText>
                                <Ionicons
                                    name="close"
                                    size={14}
                                    color="#999"
                                    style={tw`ml-1`}
                                />
                            </PressableHaptics>
                        ))}
                    </ScrollView>
                )}

                <View style={tw`flex-row items-center justify-between px-4 pb-1`}>
                    <StackText fontSize="$2" textColor="text-gray-500">
                        {showSearchResults ? `Select up to ${MAX_SELECTED} people` : 'Suggested'}
                    </StackText>
                    <StackText
                        fontSize="$2"
                        fontWeight={limitReached ? 'semibold' : 'normal'}
                        textColor={limitReached ? 'text-[#F02C56]' : 'text-gray-500'}>
                        {selected.length}/{MAX_SELECTED}
                    </StackText>
                </View>

                <FlatList
                    data={listData}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderAccount}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    style={tw`flex-1`}
                    ListEmptyComponent={
                        showSearchResults ? (
                            searching ? null : (
                                <StackText
                                    fontSize="$2"
                                    textColor="text-gray-500"
                                    style={tw`px-4 py-3`}>
                                    {restricted
                                        ? 'No mutual followers matched. Some accounts, like yours, can only message mutuals.'
                                        : 'No people found. Try a full address like user@server.tld.'}
                                </StackText>
                            )
                        ) : suggestedQuery.isLoading ? (
                            <YStack alignItems="center" style={tw`py-8`}>
                                <ActivityIndicator />
                            </YStack>
                        ) : (
                            <StackText
                                fontSize="$2"
                                textColor="text-gray-500"
                                style={tw`px-4 py-3`}>
                                Search for people to message.
                            </StackText>
                        )
                    }
                />

                {!!error && (
                    <StackText fontSize="$2" textColor="text-red-500" style={tw`px-4 pb-1`}>
                        {error}
                    </StackText>
                )}

                {selected.length > 1 && (
                    <StackText
                        fontSize="$1"
                        textColor="text-gray-500"
                        style={tw`px-4 pb-1 text-center`}>
                        This starts a group conversation with {selected.length} people.
                    </StackText>
                )}

                <View
                    style={[
                        tw`flex-row items-end px-3 pt-2 border-t border-gray-100 dark:border-gray-800`,
                        { paddingBottom: keyboardUp ? 8 : insets.bottom + 8 },
                    ]}>
                    <TextInput
                        style={[
                            tw`flex-1 rounded-3xl px-4 py-2.5 mr-2 bg-gray-100 dark:bg-gray-800 text-black dark:text-white`,
                            { maxHeight: 110, fontSize: 16 },
                        ]}
                        placeholder="Write a message..."
                        placeholderTextColor="#999"
                        multiline
                        maxLength={MAX_BODY_LENGTH}
                        value={draft}
                        onChangeText={setDraft}
                    />
                    <PressableHaptics
                        onPress={() => sendMutation.mutate()}
                        disabled={!canSend}
                        style={({ pressed }) => [
                            tw`w-10 h-10 rounded-full items-center justify-center`,
                            {
                                backgroundColor: canSend
                                    ? ACCENT
                                    : colorScheme === 'dark'
                                        ? '#374151'
                                        : '#D1D5DB',
                            },
                            pressed && tw`opacity-70`,
                        ]}>
                        {sendMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="paper-plane" size={18} color="#fff" />
                        )}
                    </PressableHaptics>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}