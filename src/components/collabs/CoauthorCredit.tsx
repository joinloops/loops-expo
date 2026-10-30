import type { CollabAccount } from '@/types/collab';
import { Text, TextStyle } from 'react-native';

interface Props {
    coauthors?: CollabAccount[] | null;
    style?: TextStyle | TextStyle[];
    onPressAccount: (account: CollabAccount) => void;
}

/**
 * "with @user" credit for coauthored videos. Renders nothing when the video
 * has no coauthors.
 */
export default function CoauthorCredit({ coauthors, style, onPressAccount }: Props) {
    const accounts = (coauthors ?? []).filter((a) => a && a.username);

    if (!accounts.length) return null;

    return (
        <Text style={style} accessibilityRole="text">
            <Text style={{ fontWeight: '400', opacity: 0.85 }}>with </Text>
            {accounts.map((account, idx) => (
                <Text key={account.id}>
                    <Text
                        onPress={() => onPressAccount(account)}
                        accessibilityRole="link"
                        accessibilityLabel={`View @${account.username}'s profile`}>
                        @{account.username}
                    </Text>
                    {idx < accounts.length - 1 ? ', ' : ''}
                </Text>
            ))}
        </Text>
    );
}
