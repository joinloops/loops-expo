import { fetchDmSuggestedRecipients, fetchDmSuggestedRecipientsWithGroups } from '@/utils/requests';
import { useQuery } from '@tanstack/react-query';

export type DmRecipient = {
    id: string;
    username: string;
    name?: string;
    avatar: string;
};

export function useDmSuggestedRecipients(enabled: boolean) {
    return useQuery<DmRecipient[]>({
        queryKey: ['dm', 'suggestedRecipients'],
        queryFn: fetchDmSuggestedRecipients,
        enabled,
        staleTime: 1000 * 60 * 5,
    });
}

export function useDmSuggestedRecipientsWithGroups(enabled: boolean) {
    return useQuery<DmRecipient[]>({
        queryKey: ['dm', 'suggestedRecipientsWithGroupChats'],
        queryFn: fetchDmSuggestedRecipientsWithGroups,
        enabled,
        staleTime: 1000 * 60 * 5,
    });
}
