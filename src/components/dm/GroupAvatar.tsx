import { StackText } from '@/components/ui/Stack';
import type { DmParticipant } from '@/types/dm';
import { Image, View } from 'react-native';
import tw from 'twrnc';

interface GroupAvatarProps {
    participants: DmParticipant[];
    size?: number;
}

export const GroupAvatar = ({ participants, size = 56 }: GroupAvatarProps) => {
    const shown = participants.slice(0, participants.length > 2 ? 1 : 2);
    const overflow = participants.length - shown.length;
    const solo = shown.length === 1 && overflow === 0;
    const item = Math.round(size * 0.66);

    const slotStyle = (index: number) =>
        solo
            ? { top: 0, left: 0, width: size, height: size, borderRadius: size / 2 }
            : index === 0
                ? { top: 0, left: 0, width: item, height: item, borderRadius: item / 2 }
                : { bottom: 0, right: 0, width: item, height: item, borderRadius: item / 2 };

    const renderSlot = (participant: DmParticipant | null, index: number, label?: string) => {
        if (participant?.avatar && !label) {
            return (
                <Image
                    key={participant.id ?? index}
                    source={{ uri: participant.avatar }}
                    style={[
                        tw`absolute border-2 border-white dark:border-black`,
                        slotStyle(index),
                    ]}
                />
            );
        }

        const initial = label ?? (participant?.username ?? '?').charAt(0).toUpperCase();

        return (
            <View
                key={participant?.id ?? `slot-${index}`}
                style={[
                    tw`absolute bg-gray-200 dark:bg-gray-800 items-center justify-center border-2 border-white dark:border-black`,
                    slotStyle(index),
                ]}>
                <StackText
                    fontSize={solo ? '$4' : '$1'}
                    fontWeight="semibold"
                    textColor="text-gray-500 dark:text-gray-400">
                    {initial}
                </StackText>
            </View>
        );
    };

    return (
        <View style={{ width: size, height: size }}>
            {shown.map((participant, index) => renderSlot(participant, index))}
            {overflow > 0 && renderSlot(null, 1, `+${overflow}`)}
        </View>
    );
};