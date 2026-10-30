import { dmDisplayName } from '@/components/dm/dmHelpers';
import type { DmConversation, DmParticipant } from '@/types/dm';

export const isGroupConversation = (conversation?: DmConversation | null): boolean =>
    conversation?.type === 'group';

export const conversationParticipants = (
    conversation?: DmConversation | null,
): DmParticipant[] => {
    if (!conversation) return [];
    if (Array.isArray(conversation.participants) && conversation.participants.length) {
        return conversation.participants;
    }
    return conversation.participant ? [conversation.participant] : [];
};

export const activeConversationParticipants = (
    conversation?: DmConversation | null,
): DmParticipant[] =>
    conversationParticipants(conversation).filter((p) => (p.state ?? 'active') !== 'left');

export const conversationMemberCount = (conversation?: DmConversation | null): number =>
    activeConversationParticipants(conversation).length + 1;

export const senderShortName = (participant?: DmParticipant | null): string =>
    participant?.username || participant?.name || '';

export const conversationDisplayName = (conversation?: DmConversation | null): string => {
    if (!conversation) return '';
    if (!isGroupConversation(conversation)) return dmDisplayName(conversation.participant);
    if (conversation.title) return conversation.title;
    const names = activeConversationParticipants(conversation)
        .map((p) => senderShortName(p))
        .filter(Boolean);
    if (!names.length) return 'Group conversation';
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
};

export const conversationSenderFor = (
    conversation: DmConversation | null | undefined,
    senderId: string | number | null | undefined,
): DmParticipant | null => {
    if (senderId == null) return null;
    const id = String(senderId);
    return conversationParticipants(conversation).find((p) => String(p.id) === id) ?? null;
};

export const groupPreviewPrefix = (
    conversation: DmConversation | null | undefined,
    selfId?: string | null,
): string => {
    if (!isGroupConversation(conversation) || !conversation?.last_message) return '';
    const senderId = String(conversation.last_message.sender_id ?? '');
    if (!senderId || (selfId && senderId === String(selfId))) return '';
    const name = senderShortName(conversationSenderFor(conversation, senderId));
    return name ? `${name}: ` : '';
};