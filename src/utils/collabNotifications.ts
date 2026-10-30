import { isCollabNotification } from '@/types/collab';

export function collabNotificationText(item: any): string | null {
    switch (item?.type) {
        case 'collab.request':
            return 'invited you to collaborate on a video.';
        case 'collab.accepted':
            return 'accepted your collaboration invite.';
        case 'collab.declined':
            return item.reason === 'expired'
                ? "didn't answer your collaboration invite in time."
                : 'declined your collaboration invite.';
        case 'collab.autoAdded':
            return 'added you as a collaborator on a video.';
        case 'collab.removed':
            return item.by === 'coauthor'
                ? 'left your collaboration.'
                : 'removed you from a collaboration.';
        default:
            return null;
    }
}

export function collabNotificationRoute(item: any, selfId?: string | number | null): string | null {
    if (!isCollabNotification(item?.type)) return null;

    if (item.type === 'collab.request') {
        return item.collab_id
            ? `/private/collabs?id=${encodeURIComponent(String(item.collab_id))}`
            : '/private/collabs';
    }

    if (item.type === 'collab.declined') {
        return '/private/studio/posts';
    }

    if (!item.url || !item.video_id) {
        return item.type === 'collab.accepted'
            ? '/private/studio/posts'
            : '/private/collabs?tab=all';
    }

    const ownVideo =
        item.type === 'collab.accepted' ||
        (item.type === 'collab.removed' && item.by === 'coauthor');
    const authorId = ownVideo ? selfId : item.actor?.id;

    if (!authorId) return null;

    return `/private/profile/feed/${item.video_id}?profileId=${authorId}`;
}
