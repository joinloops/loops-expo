import { dmDisplayName, dmLastMessagePreview, dmTimeAgo } from '@/components/dm/dmHelpers';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText } from '@/components/ui/Stack';
import type { DmConversation } from '@/types/dm';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, View } from 'react-native';
import tw from 'twrnc';

const ACCENT = '#F02C56';

interface ConversationRowProps {
    conversation: DmConversation;
    selfId?: string | null;
    onPress: (conversation: DmConversation) => void;
    onLongPress?: (conversation: DmConversation) => void;
    mode?: 'default' | 'request';
    onAccept?: (id: string) => void;
    onDecline?: (id: string) => void;
    isAccepting?: boolean;
    isDeclining?: boolean;
}

export const ConversationRow = ({
    conversation,
    selfId,
    onPress,
    onLongPress,
    mode = 'default',
    onAccept,
    onDecline,
    isAccepting = false,
    isDeclining = false,
}: ConversationRowProps) => {
    const unread = mode === 'default' && conversation.unread;
    const name = dmDisplayName(conversation.participant);
    const preview = dmLastMessagePreview(conversation, selfId);
    const time = dmTimeAgo(conversation.updated_at);

    return (
        <PressableHaptics
            onPress={() => onPress(conversation)}
            onLongPress={onLongPress ? () => onLongPress(conversation) : undefined}
            style={({ pressed }) => [
                tw`flex-row items-center px-4 py-3`,
                pressed && tw`bg-gray-50 dark:bg-gray-900`,
            ]}>
            {conversation.participant?.avatar ? (
                <Image
                    source={{ uri: conversation.participant.avatar }}
                    style={tw`w-14 h-14 rounded-full mr-3`}
                />
            ) : (
                <View
                    style={tw`w-14 h-14 rounded-full mr-3 bg-gray-200 dark:bg-gray-800 items-center justify-center`}>
                    <StackText
                        fontSize="$5"
                        fontWeight="semibold"
                        textColor="text-gray-500 dark:text-gray-400">
                        {name.charAt(0).toUpperCase()}
                    </StackText>
                </View>
            )}

            <View style={tw`flex-1 mr-3`}>
                <View style={tw`flex-row items-center`}>
                    <StackText
                        fontSize="$4"
                        fontWeight={unread ? 'bold' : 'semibold'}
                        textColor="text-black dark:text-white"
                        numberOfLines={1}>
                        {name}
                    </StackText>
                    {conversation.participant?.is_remote && (
                        <Ionicons
                            name="planet-outline"
                            size={14}
                            color="#999"
                            style={tw`ml-1.5`}
                        />
                    )}
                    {conversation.muted && (
                        <Ionicons
                            name="notifications-off-outline"
                            size={14}
                            color="#999"
                            style={tw`ml-1.5`}
                        />
                    )}
                </View>
                <StackText
                    fontSize="$3"
                    fontWeight={unread ? 'semibold' : 'normal'}
                    textColor={
                        unread
                            ? 'text-black dark:text-gray-300'
                            : 'text-gray-600 dark:text-gray-500'
                    }
                    numberOfLines={1}>
                    {time ? `${preview} · ${time}` : preview}
                </StackText>
            </View>

            {mode === 'request' ? (
                <View style={tw`flex-row items-center gap-2`}>
                    <PressableHaptics
                        onPress={() => onAccept?.(conversation.id)}
                        disabled={isAccepting || isDeclining}
                        style={({ pressed }) => [
                            tw`rounded-2xl px-5 py-2`,
                            { backgroundColor: ACCENT },
                            (pressed || isAccepting) && tw`opacity-70`,
                        ]}>
                        {isAccepting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <StackText fontSize="$3" textColor="text-white" fontWeight="semibold">
                                Accept
                            </StackText>
                        )}
                    </PressableHaptics>

                    <PressableHaptics
                        onPress={() => onDecline?.(conversation.id)}
                        disabled={isAccepting || isDeclining}
                        style={({ pressed }) => [tw`p-2`, pressed && tw`opacity-50`]}>
                        {isDeclining ? (
                            <ActivityIndicator size="small" color="#666" />
                        ) : (
                            <Ionicons name="close-circle-outline" size={24} color="#999" />
                        )}
                    </PressableHaptics>
                </View>
            ) : unread ? (
                <View style={[tw`w-2.5 h-2.5 rounded-full`, { backgroundColor: ACCENT }]} />
            ) : null}
        </PressableHaptics>
    );
};
