import { timeAgo } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import tw from 'twrnc';

interface Actor {
    id: string;
    name: string;
    username: string;
    avatar: string;
}

interface NotificationItemProps {
    item: {
        id: string;
        type: string;
        video_pid?: string;
        video_id?: string;
        video_thumbnail?: string;
        actor: Actor;
        url?: string;
        read_at: string | null;
        created_at: string;
    };
    onPress: (item: any) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ item, onPress }) => {
    const isUnread = item.read_at === null;

    const getNotificationText = () => {
        switch (item.type) {
            case 'video.like':
                return 'liked your video.';
            case 'video.commentReply':
                return 'replied to your comment.';
            case 'video.comment':
                return 'commented on your video.';
            case 'profile.view':
                return 'viewed your profile.';
            case 'video.repost':
                return 'reposted your video.';
            default:
                return 'interacted with your content.';
        }
    };

    const getBadgeIcon = () => {
        switch (item.type) {
            case 'video.like':
                return <Ionicons name="heart" size={16} color="#FF2D55" />;
            case 'video.commentReply':
            case 'video.comment':
                return <Ionicons name="chatbubble" size={16} color="#007AFF" />;
            default:
                return null;
        }
    };

    //const showActionButtons = item.type === 'video.commentReply' || item.type === 'video.comment';
    const showActionButtons = false;

    return (
        <Pressable
            onPress={() => onPress(item)}
            style={[
                tw`flex-row items-center py-3 px-4`,
                styles.notificationItem
            ]}
        >
            {isUnread && (
                <View style={tw`w-2 h-2 rounded-full bg-blue-500 mr-2 mt-1.5`} />
            )}

            <View style={tw`relative mr-3`}>
                <Image
                    source={{ uri: item.actor.avatar }}
                    style={tw`w-12 h-12 rounded-full`}
                />
                {getBadgeIcon() && (
                    <View style={[
                        tw`absolute -bottom-1 -right-1 rounded-full p-1`,
                        { backgroundColor: 'white' }
                    ]}>
                        {getBadgeIcon()}
                    </View>
                )}
            </View>

            <View style={tw`flex-1 mr-2`}>
                <Text style={tw`text-base`}>
                    <Text style={tw`font-semibold`}>{item.actor.name}</Text>
                    <Text style={tw`text-gray-700`}> {getNotificationText()}</Text>
                </Text>

                <Text style={tw`text-gray-500 text-sm mt-0.5`}>
                    {timeAgo(item.created_at)}
                </Text>

                {showActionButtons && (
                    <View style={tw`flex-row mt-2 gap-4`}>
                        <Pressable style={tw`flex-row items-center gap-1`}>
                            <Ionicons name="chatbubble-outline" size={18} color="#666" />
                            <Text style={tw`text-gray-600`}>Reply</Text>
                        </Pressable>
                        <Pressable style={tw`flex-row items-center gap-1`}>
                            <Ionicons name="heart-outline" size={18} color="#666" />
                            <Text style={tw`text-gray-600`}>Like</Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {item.video_thumbnail && (
                <Image
                    source={{ uri: item.video_thumbnail }}
                    style={tw`w-14 h-14 rounded-lg`}
                />
            )}

            <Ionicons name="chevron-forward" size={20} color="#999" style={tw`ml-2`} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    notificationItem: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5E5',
    }
});