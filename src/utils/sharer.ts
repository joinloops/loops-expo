import { Platform, Share } from 'react-native';

interface ShareParams {
    message: string;
    url?: string;
}

export const shareContent = async ({ message, url }: ShareParams) => {
    try {
        const shareContent = Platform.select({
            ios: {
                message,
                url,
            },
            android: {
                message: url ? `${message}\n\n${url}` : message,
            },
            default: {
                message: url ? `${message}\n\n${url}` : message,
            },
        });

        const result = await Share.share(shareContent);
        return result;
    } catch (error) {
        console.error('Share error:', error);
        throw error;
    }
};