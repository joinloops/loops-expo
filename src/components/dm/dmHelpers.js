import type { DmConversation, DmMessage, DmParticipant } from '@/types/dm';

export function dmDisplayName(participant?: DmParticipant | null): string {
    if (!participant) return 'Deleted account';
    return participant.name || participant.username;
}

export function dmHandle(participant?: DmParticipant | null): string | null {
    if (!participant) return null;
    return `@${participant.username}`;
}

export function dmTimeAgo(dateString?: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    if (weeks < 52) return `${weeks}w`;
    return `${Math.floor(weeks / 52)}y`;
}

function mediaPreviewLabel(message: DmMessage, isSelf: boolean): string {
    const prefix = isSelf ? 'You sent' : 'Sent';
    const first = message.media?.[0];

    switch (first?.type) {
        case 'gif':
            return `${prefix} a GIF`;
        case 'image':
            return `${prefix} a photo`;
        case 'video':
            return `${prefix} a video`;
        case 'audio':
            return `${prefix} a voice message`;
        default:
            return `${prefix} an attachment`;
    }
}

export function dmLastMessagePreview(
    conversation: DmConversation,
    selfId?: string | null,
): string {
    const message = conversation.last_message;
    if (!message) return 'No messages yet';

    const isSelf = !!selfId && String(message.sender_id) === String(selfId);

    switch (message.type) {
        case 'text': {
            const body = (message.body ?? '').replace(/\s+/g, ' ').trim();
            return isSelf ? `You: ${body}` : body;
        }
        case 'loop_share':
            return isSelf ? 'You shared a Loop' : 'Shared a Loop';
        case 'media':
            return mediaPreviewLabel(message, isSelf);
        default:
            return isSelf ? 'You sent a message' : 'Sent a message';
    }
}