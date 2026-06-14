import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, View } from 'react-native';
import tw from 'twrnc';

export type NotificationFilter =
    | 'activity'
    | 'followers'
    | 'videoLike'
    | 'videoShare'
    | 'comments'
    | 'commentLike'
    | 'commentShare';

export const NOTIFICATION_FILTERS: {
    type: NotificationFilter;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { type: 'activity', label: 'All Activity', icon: 'pulse-outline' },
    { type: 'followers', label: 'Followers', icon: 'person-add-outline' },
    { type: 'videoLike', label: 'Video Likes', icon: 'heart-outline' },
    { type: 'videoShare', label: 'Video Shares', icon: 'arrow-redo-outline' },
    { type: 'comments', label: 'Comments', icon: 'chatbubble-outline' },
    { type: 'commentLike', label: 'Comment Likes', icon: 'heart-circle-outline' },
    { type: 'commentShare', label: 'Comment Shares', icon: 'share-social-outline' },
];

type Props = {
    visible: boolean;
    selected: NotificationFilter;
    onClose: () => void;
    onSelect: (filter: NotificationFilter) => void;
    onMarkAllRead: () => void;
    markAllDisabled?: boolean;
};

export function NotificationFilterModal({
    visible,
    selected,
    onClose,
    onSelect,
    onMarkAllRead,
    markAllDisabled,
}: Props) {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const iconColor = isDark ? '#e5e5e5' : '#1f1f1f';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={tw`flex-1 bg-black/40 justify-end`} onPress={onClose}>
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    style={tw`bg-white dark:bg-zinc-900 rounded-t-3xl pb-10`}>
                    <View style={tw`items-center pt-3 pb-2`}>
                        <View style={tw`w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700`} />
                    </View>

                    <PressableHaptics
                        onPress={onMarkAllRead}
                        disabled={markAllDisabled}
                        style={tw.style(
                            'flex-row items-center justify-center gap-2 mx-4 mt-2 mb-3 py-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800',
                            markAllDisabled && 'opacity-40',
                        )}>
                        <Ionicons name="checkmark-done-outline" size={20} color="#F02C56" />
                        <StackText style={tw`text-[15px] font-semibold text-[#F02C56]`}>
                            Mark all as read
                        </StackText>
                    </PressableHaptics>

                    <View style={tw`h-px bg-zinc-100 dark:bg-zinc-800 mx-4 mb-1`} />

                    <View style={tw`px-2`}>
                        {NOTIFICATION_FILTERS.map((opt) => {
                            const active = opt.type === selected;
                            return (
                                <PressableHaptics
                                    key={opt.type}
                                    onPress={() => {
                                        onSelect(opt.type);
                                        onClose();
                                    }}
                                    style={tw.style(
                                        'flex-row items-center px-4 py-3.5 rounded-2xl',
                                        active && 'bg-zinc-100 dark:bg-zinc-800',
                                    )}>
                                    <Ionicons
                                        name={opt.icon}
                                        size={22}
                                        color={active ? '#F02C56' : iconColor}
                                    />
                                    <StackText
                                        style={tw.style(
                                            'flex-1 ml-3 text-[15px] text-black dark:text-white',
                                            active && 'font-semibold',
                                        )}>
                                        {opt.label}
                                    </StackText>
                                    {active && (
                                        <Ionicons name="checkmark" size={20} color="#F02C56" />
                                    )}
                                </PressableHaptics>
                            );
                        })}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}