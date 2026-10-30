import Avatar from '@/components/Avatar';
import { useTheme } from '@/contexts/ThemeContext';
import type { CollabSearchAccount } from '@/types/collab';
import { searchCollabAccounts } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const ACCENT = '#F02C56';

interface Props {
    visible: boolean;
    selected: CollabSearchAccount | null;
    onClose: () => void;
    onSelect: (account: CollabSearchAccount | null) => void;
}

function useDebounced<T>(value: T, delay = 250): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

export default function CollaboratorPickerModal({ visible, selected, onClose, onSelect }: Props) {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const q = useDebounced(query.trim().replace(/^@/, ''));

    const { data, isFetching } = useQuery({
        queryKey: ['collabs', 'search', q],
        queryFn: async () => {
            const res = await searchCollabAccounts(q);
            return (res?.data ?? []) as CollabSearchAccount[];
        },
        enabled: visible && q.length > 0,
        staleTime: 30_000,
    });

    const results = q.length > 0 ? (data ?? []) : [];

    const close = () => {
        setQuery('');
        onClose();
    };

    const pick = (account: CollabSearchAccount) => {
        onSelect(account);
        close();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={close}>
            <SafeAreaView style={tw`flex-1 bg-white dark:bg-black`}>
                <View
                    style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-gray-800`}>
                    <TouchableOpacity onPress={close} accessibilityLabel="Close">
                        <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text style={tw`text-lg font-bold text-black dark:text-white`}>
                        Add collaborator
                    </Text>
                    <View style={tw`w-7`} />
                </View>

                <Text style={tw`text-sm text-gray-600 dark:text-gray-400 px-5 pt-3`}>
                    Credit another creator on this server as a coauthor. Your loop posts once they
                    approve, and shows on both of your profiles.
                </Text>

                {selected ? (
                    <View
                        style={tw`mx-5 mt-4 flex-row items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-2.5`}>
                        <Avatar url={selected.avatar} width={36} />
                        <View style={tw`flex-1`}>
                            <Text
                                style={tw`text-[15px] font-semibold text-gray-900 dark:text-white`}
                                numberOfLines={1}>
                                {selected.name || selected.username}
                            </Text>
                            <Text
                                style={tw`text-xs text-gray-500 dark:text-gray-400`}
                                numberOfLines={1}>
                                @{selected.username}
                            </Text>
                        </View>
                        <Pressable
                            hitSlop={8}
                            onPress={() => onSelect(null)}
                            accessibilityLabel="Remove collaborator">
                            <Text style={tw`text-sm font-semibold text-[#F02C56]`}>Remove</Text>
                        </Pressable>
                    </View>
                ) : null}

                <View
                    style={tw`mx-5 mt-4 flex-row items-center px-3 h-11 rounded-xl bg-gray-100 dark:bg-gray-900`}>
                    <Ionicons name="search" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search people to invite"
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        style={tw`flex-1 ml-2 text-[15px] text-gray-900 dark:text-gray-100`}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus
                        returnKeyType="search"
                    />
                    {isFetching ? <ActivityIndicator size="small" color={ACCENT} /> : null}
                </View>

                <FlatList
                    data={results}
                    keyExtractor={(item) => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : 'never'}
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 8 }}
                    renderItem={({ item }) => {
                        const isSelected = selected?.id === item.id;
                        return (
                            <TouchableOpacity
                                onPress={() => pick(item)}
                                style={tw`flex-row items-center gap-3 px-5 py-3`}
                                accessibilityLabel={`Invite @${item.username}`}>
                                <Avatar url={item.avatar} width={40} />
                                <View style={tw`flex-1`}>
                                    <Text
                                        style={tw`text-[15px] font-semibold text-gray-900 dark:text-white`}
                                        numberOfLines={1}>
                                        {item.name || item.username}
                                    </Text>
                                    <Text
                                        style={tw`text-xs text-gray-500 dark:text-gray-400`}
                                        numberOfLines={1}>
                                        @{item.username}
                                    </Text>
                                </View>
                                {item.auto_approve ? (
                                    <View
                                        style={tw`rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5`}>
                                        <Text
                                            style={tw`text-[10px] font-semibold text-green-800 dark:text-green-200`}>
                                            AUTO-APPROVES
                                        </Text>
                                    </View>
                                ) : null}
                                {isSelected ? (
                                    <Ionicons name="checkmark" size={22} color={ACCENT} />
                                ) : null}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        q.length > 0 && !isFetching ? (
                            <Text
                                style={tw`px-5 py-6 text-sm text-gray-500 dark:text-gray-400 text-center`}>
                                {`No one you can invite matches "${q}".`}
                            </Text>
                        ) : null
                    }
                />
            </SafeAreaView>
        </Modal>
    );
}
