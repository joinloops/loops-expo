import {
    activeConversationParticipants,
    conversationDisplayName,
    conversationMemberCount,
    conversationParticipants,
} from '@/components/dm/dmGroupHelpers';
import { GroupAvatar } from '@/components/dm/GroupAvatar';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { StackText } from '@/components/ui/Stack';
import type { DmConversation, DmParticipant } from '@/types/dm';
import { useAuthStore } from '@/utils/authStore';
import { dmAddParticipants, dmLeaveGroup, dmSearchAccounts } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';
const MAX_GROUP_PARTICIPANTS = 12;

interface GroupInfoSheetProps {
    visible: boolean;
    conversation: DmConversation;
    onClose: () => void;
    onLeft: () => void;
    onOpenProfile: (profileId: string) => void;
}

export const GroupInfoSheet = ({
    visible,
    conversation,
    onClose,
    onLeft,
    onOpenProfile,
}: GroupInfoSheetProps) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DmParticipant[]>([]);
    const [searching, setSearching] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);

    const selfId = user?.id ? String(user.id) : null;
    const members = useMemo(
        () =>
            conversationParticipants(conversation).filter(
                (p) => (p.state ?? 'active') !== 'left',
            ),
        [conversation],
    );
    const memberCount = conversationMemberCount(conversation);
    const canAdd = memberCount < MAX_GROUP_PARTICIPANTS;

    const excludedIds = useMemo(() => {
        const ids = new Set(members.map((p) => String(p.id)));
        if (selfId) ids.add(selfId);
        return ids;
    }, [members, selfId]);

    // reset the search when the sheet closes, so it doesn't reopen mid-query
    useEffect(() => {
        if (!visible) {
            setQuery('');
            setResults([]);
        }
    }, [visible]);

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
                    setResults(accounts.filter((a) => !excludedIds.has(String(a.id))));
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
    }, [query, excludedIds]);

    const addMutation = useMutation({
        mutationFn: async (profileId: string) => {
            setAddingId(profileId);
            return await dmAddParticipants(conversation.id, [profileId]);
        },
        onSuccess: () => {
            setQuery('');
            setResults([]);
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversation', conversation.id] });
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
        },
        onError: () => {
            Alert.alert('Something went wrong', "Couldn't add that person. Please try again.");
        },
        onSettled: () => setAddingId(null),
    });

    const leaveMutation = useMutation({
        mutationFn: async () => dmLeaveGroup(conversation.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dm', 'conversations'] });
            onLeft();
        },
        onError: () => {
            Alert.alert('Something went wrong', "Couldn't leave the group. Please try again.");
        },
    });

    const confirmLeave = () => {
        Alert.alert('Leave group?', "You'll stop receiving messages from this conversation.", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
        ]);
    };

    const showResults = query.trim().length >= 2;

    return (
        <BottomSheetModal
            visible={visible}
            onClose={onClose}
            containerStyle={{ maxHeight: '85%' }}
            cancelSpacing={false}>
            <View style={tw`flex-row items-center px-5 pb-3`}>
                <GroupAvatar
                    participants={activeConversationParticipants(conversation)}
                    size={48}
                />
                <View style={tw`flex-1 ml-3`}>
                    <StackText
                        fontSize="$5"
                        fontWeight="bold"
                        textColor="text-black dark:text-white"
                        numberOfLines={1}>
                        {conversationDisplayName(conversation)}
                    </StackText>
                    <StackText fontSize="$2" textColor="text-gray-600 dark:text-gray-500">
                        {memberCount} members
                    </StackText>
                </View>
            </View>

            {canAdd ? (
                <View style={tw`px-5 pb-2`}>
                    <View
                        style={tw`flex-row items-center rounded-xl px-3 py-2 bg-gray-100 dark:bg-gray-800`}>
                        <Ionicons name="search-outline" size={16} color="#999" />
                        <TextInput
                            style={[
                                tw`flex-1 ml-2 text-black dark:text-white`,
                                { fontSize: 15, paddingVertical: 0 },
                            ]}
                            placeholder="Add people"
                            placeholderTextColor="#999"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>
                </View>
            ) : (
                <View style={tw`px-5 pb-2`}>
                    <StackText fontSize="$2" textColor="text-gray-500">
                        This group is full ({MAX_GROUP_PARTICIPANTS} members max).
                    </StackText>
                </View>
            )}

            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
                {showResults ? (
                    <>
                        {results.map((account) => (
                            <TouchableOpacity
                                key={account.id}
                                disabled={addingId !== null}
                                style={tw`flex-row items-center px-5 py-3`}
                                onPress={() => addMutation.mutate(String(account.id))}>
                                {account.avatar ? (
                                    <Image
                                        source={{ uri: account.avatar }}
                                        style={tw`w-10 h-10 rounded-full mr-3`}
                                    />
                                ) : (
                                    <View
                                        style={tw`w-10 h-10 rounded-full mr-3 bg-gray-200 dark:bg-gray-800`}
                                    />
                                )}
                                <View style={tw`flex-1`}>
                                    <StackText
                                        fontSize="$4"
                                        fontWeight="semibold"
                                        textColor="text-black dark:text-white"
                                        numberOfLines={1}>
                                        {account.name || account.username}
                                    </StackText>
                                    <StackText
                                        fontSize="$2"
                                        textColor="text-gray-600 dark:text-gray-500"
                                        numberOfLines={1}>
                                        @{account.username}
                                    </StackText>
                                </View>
                                {addingId === String(account.id) ? (
                                    <ActivityIndicator size="small" />
                                ) : (
                                    <Ionicons name="add-circle-outline" size={24} color={ACCENT} />
                                )}
                            </TouchableOpacity>
                        ))}
                        {searching && (
                            <View style={tw`py-4 items-center`}>
                                <ActivityIndicator />
                            </View>
                        )}
                        {!searching && !results.length && (
                            <StackText
                                fontSize="$2"
                                textColor="text-gray-500"
                                style={tw`px-5 py-3`}>
                                No people found. Try a full address like user@server.tld.
                            </StackText>
                        )}
                    </>
                ) : (
                    <>
                        <StackText
                            fontSize="$2"
                            fontWeight="semibold"
                            textColor="text-gray-500"
                            style={tw`px-5 pb-1`}>
                            Members
                        </StackText>
                        {members.map((person) => (
                            <TouchableOpacity
                                key={person.id}
                                style={tw`flex-row items-center px-5 py-3`}
                                onPress={() => onOpenProfile(String(person.id))}>
                                {person.avatar ? (
                                    <Image
                                        source={{ uri: person.avatar }}
                                        style={tw`w-10 h-10 rounded-full mr-3`}
                                    />
                                ) : (
                                    <View
                                        style={tw`w-10 h-10 rounded-full mr-3 bg-gray-200 dark:bg-gray-800`}
                                    />
                                )}
                                <View style={tw`flex-1`}>
                                    <StackText
                                        fontSize="$4"
                                        fontWeight="semibold"
                                        textColor="text-black dark:text-white"
                                        numberOfLines={1}>
                                        {person.name || person.username}
                                    </StackText>
                                    <StackText
                                        fontSize="$2"
                                        textColor="text-gray-600 dark:text-gray-500"
                                        numberOfLines={1}>
                                        @{person.username}
                                    </StackText>
                                </View>
                                {person.state === 'request' ? (
                                    <View
                                        style={tw`rounded-full px-2 py-0.5 bg-gray-100 dark:bg-gray-800`}>
                                        <StackText fontSize="$1" textColor="text-gray-500">
                                            Invited
                                        </StackText>
                                    </View>
                                ) : person.is_remote ? (
                                    <Ionicons name="planet-outline" size={16} color="#999" />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </>
                )}
            </ScrollView>

            <TouchableOpacity
                style={tw`mt-2 py-4 items-center border-t border-gray-100 dark:border-gray-800`}
                disabled={leaveMutation.isPending}
                onPress={confirmLeave}>
                {leaveMutation.isPending ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                    <StackText fontSize="$4" fontWeight="semibold" textColor="text-red-500">
                        Leave group
                    </StackText>
                )}
            </TouchableOpacity>
        </BottomSheetModal>
    );
};