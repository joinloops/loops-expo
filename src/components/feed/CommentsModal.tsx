import Avatar from '@/components/Avatar';
import LinkifiedCaption from '@/components/feed/LinkifiedCaption';
import { ReportModal } from '@/components/ReportModal';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import {
    commentDelete,
    commentLike,
    commentPost,
    commentReplyDelete,
    commentReplyLike,
    commentReplyUnlike,
    commentUnlike,
    fetchVideoComments,
    fetchVideoReplies,
} from '@/utils/requests';
import { shareContent } from '@/utils/sharer';
import { timeAgo } from '@/utils/ui';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 60;

type ReportPayload = {
    id: string;
    key: string;
    type: string;
    comment: string;
};

type CommentPayload = {
    id: string;
    commentText: string;
    parentId?: string;
};

type CommentDeletePayload = {
    videoId: string;
    commentId: string;
};

type CommentReplyDeletePayload = {
    videoId: string;
    parentId: string;
    commentId: string;
};

type CommentLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
};

type CommentReplyLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
    parentId: string;
};

export default function CommentsModal({ visible, item, onClose, navigation, onNavigate }) {
    const [comment, setComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedComments, setExpandedComments] = useState(new Set());
    const insets = useSafeAreaInsets();
    const flatListRef = useRef(null);
    const router = useRouter();
    const queryClient = useQueryClient();
    const [showReport, setShowReport] = useState(false);
    const [reportType, setReportType] = useState();
    const [reportContent, setReportContent] = useState();
    const { user } = useAuthStore();
    const canComment = item?.permissions?.can_comment !== false;
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
        queryKey: ['videoComments', item?.id],
        queryFn: ({ pageParam }) => fetchVideoComments(item.id, pageParam),
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor,
        initialPageParam: null,
        enabled: visible && !!item,
    });

    const commentMutation = useMutation({
        mutationFn: async (data: CommentPayload) => {
            return await commentPost(data);
        },
        onSuccess: async (res) => {
            queryClient.setQueryData(['videoComments', item?.id], (old) => {
                if (!old) return old;
                
                return {
                    ...old,
                    pages: old.pages.map((page, index) => 
                        index === 0
                            ? { ...page, data: [res.data[0], ...page.data] }
                            : page
                    ),
                };
            });
        },
    });

    const commentDeleteMutation = useMutation({
        mutationFn: async (data: CommentDeletePayload) => {
            return await commentDelete(data);
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });
            
            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);
            
            queryClient.setQueryData(['videoComments', item?.id], (old) => {
                if (!old) return old;
                
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((comment) => comment.id !== variables.commentId),
                    })),
                };
            });
            
            return { previousComments };
        },
        onError: (err, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['videoComments', item?.id], context.previousComments);
            }
        },
    });

    const commentReplyDeleteMutation = useMutation({
        mutationFn: async (data: CommentReplyDeletePayload) => {
            return await commentReplyDelete(data);
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });
            await queryClient.cancelQueries({ 
                queryKey: ['videoReplies', item.id, variables.parentId] 
            });
            
            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);
            const previousReplies = queryClient.getQueryData([
                'videoReplies',
                item.id,
                variables.parentId,
            ]);
            
            queryClient.setQueryData(['videoReplies', item.id, variables.parentId], (old) => {
                if (!old) return old;
                
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.filter((reply) => reply.id !== variables.commentId),
                    })),
                };
            });
            
            queryClient.setQueryData(['videoComments', item?.id], (old) => {
                if (!old) return old;
                
                return {
                    ...old,
                    pages: old.pages.map((page) => ({
                        ...page,
                        data: page.data.map((comment) => {
                            if (comment.id === variables.parentId) {
                                return {
                                    ...comment,
                                    replies: Math.max(0, comment.replies - 1),
                                };
                            }
                            return comment;
                        }),
                    })),
                };
            });
            
            return { previousComments, previousReplies };
        },
        onError: (err, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['videoComments', item?.id], context.previousComments);
            }
            if (context?.previousReplies) {
                queryClient.setQueryData(
                    ['videoReplies', item.id, variables.parentId],
                    context.previousReplies,
                );
            }
        },
    });

    const commentLikeMutation = useMutation({
        mutationFn: async (data: CommentLikePayload) => {
            if (data.likeState == 'like') {
                return await commentLike(data);
            } else if (data.likeState == 'unlike') {
                return await commentUnlike(data);
            }
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });

            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);

            queryClient.setQueryData(['videoComments', item?.id], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((comment) => {
                            if (comment.id === variables.commentId) {
                                const isLiking = variables.likeState === 'like';
                                return {
                                    ...comment,
                                    liked: isLiking,
                                    likes: isLiking ? comment.likes + 1 : comment.likes - 1,
                                };
                            }
                            return comment;
                        }),
                    })),
                };
            });

            return { previousComments };
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(['videoComments', item?.id], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((comment) =>
                            comment.id === variables.commentId
                                ? { ...comment, liked: res.liked, likes: res.likes }
                                : comment,
                        ),
                    })),
                };
            });
        },
        onError: (err, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['videoComments', item?.id], context.previousComments);
            }
        },
    });

    const commentReplyLikeMutation = useMutation({
        mutationFn: async (data: CommentReplyLikePayload) => {
            if (data.likeState == 'like') {
                return await commentReplyLike(data);
            } else if (data.likeState == 'unlike') {
                return await commentReplyUnlike(data);
            }
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });

            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);

            await queryClient.cancelQueries({
                queryKey: ['videoReplies', item.id, variables.parentId],
            });

            const previousReplies = queryClient.getQueryData([
                'videoReplies',
                item.id,
                variables.parentId,
            ]);

            queryClient.setQueryData(['videoReplies', item.id, variables.parentId], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((reply) => {
                            if (reply.id === variables.replyId) {
                                const isLiking = variables.likeState === 'like';
                                return {
                                    ...reply,
                                    liked: isLiking,
                                    likes: isLiking ? reply.likes + 1 : reply.likes - 1,
                                };
                            }
                            return reply;
                        }),
                    })),
                };
            });

            return { previousComments, previousReplies };
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(['videoReplies', item.id, variables.parentId], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                        ...page,
                        data: page.data.map((reply) =>
                            reply.id === variables.replyId
                                ? { ...reply, liked: res.liked, likes: res.likes }
                                : reply,
                        ),
                    })),
                };
            });
        },
        onError: (err, variables, context) => {
            if (context?.previousReplies) {
                queryClient.setQueryData(
                    ['videoReplies', item.id, variables.parentId],
                    context.previousReplies,
                );
            }
        },
    });

    const commentShare = async (item) => {
        try {
            await shareContent({
                message: `Check out this comment on Loops by @${item.account.username}!`,
                url: item?.url,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (!item) return null;

    const allComments = data?.pages?.flatMap((page) => page.data) || [];
    const totalComments = item.comments;

    const handleLikeComment = async (commentId, likeState) => {
        commentLikeMutation.mutate({
            likeState: likeState ? 'unlike' : 'like',
            videoId: item.id,
            commentId: commentId,
        });
    };

    const handleLikeCommentReply = async (replyId, parentId, likeState) => {
        commentReplyLikeMutation.mutate({
            likeState: likeState ? 'unlike' : 'like',
            videoId: item.id,
            commentId: replyId,
            parentId: parentId,
        });
    };

    const handleCommentReport = async (comment) => {
        setReportContent(comment);
        setReportType('comment');
        setShowReport(true);
    };

    const handleReplyReport = async (reply) => {
        setReportContent(reply);
        setReportType('reply');
        setShowReport(true);
    };

    const toggleReplies = (commentId) => {
        setExpandedComments((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
            }
            return newSet;
        });
    };

    const handleReply = (comment) => {
        setReplyingTo(comment);
    };

    const handleCommentDelete = async (reply) => {
        Alert.alert('Confirm Reply Delete', 'Are you sure you want to delete this comment reply?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                    commentDeleteMutation.mutate({ videoId: item.id, commentId: reply.id }),
            },
        ]);
    };

    const handleReplyDelete = async (reply) => {
        Alert.alert('Confirm Reply Delete', 'Are you sure you want to delete this comment reply?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                    commentReplyDeleteMutation.mutate({
                        videoId: item.id,
                        parentId: reply.p_id,
                        commentId: reply.id,
                    }),
            },
        ]);
    };

    const cancelReply = () => {
        setReplyingTo(null);
        setComment('');
    };

    const handleCloseReportModal = () => {
        setShowReport(false);
        onClose();
    };

    const handleReportCommunityGuidelines = () => {
        onClose();
        router.push('/private/settings/legal/community');
    };

    const handleProfilePress = (id) => {
        onClose();
        router.push(`/private/profile/${id}`);
    };

    const handleSendComment = async () => {
        if (!comment.trim()) return;

        commentMutation.mutate({ id: item.id, commentText: comment, parentId: replyingTo?.id });
        setComment('');
        setReplyingTo(null);
    };

    const renderReply = ({ item: reply }) => (
        <View style={tw`flex-row py-3 pl-11 pr-4 gap-2`}>
            <PressableHaptics onPress={() => handleProfilePress(reply.account?.id)}>
                <Avatar url={reply.account.avatar} size={28} />
            </PressableHaptics>
            <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center gap-2 mb-1`}>
                    <PressableHaptics onPress={() => handleProfilePress(reply.account?.id)}>
                        <Text style={tw`text-sm font-bold text-black dark:text-white`}>
                            {reply.account.username}
                        </Text>
                    </PressableHaptics>
                    <Text style={tw`text-[13px] text-gray-600 dark:text-gray-400`}>
                        {timeAgo(reply.created_at)}
                    </Text>
                    {reply.account.id == item.account.id && (
                        <Text style={tw`text-xs font-bold text-[#F02C56]`}>Creator</Text>
                    )}
                </View>
                <LinkifiedCaption
                    caption={reply.caption}
                    tags={reply.tags || []}
                    mentions={reply.mentions || []}
                    style={tw`text-[15px] text-black dark:text-white leading-5`}
                    onHashtagPress={(tag) => {
                        onNavigate?.();
                        onClose();
                        router.push(`/private/search?query=${tag}`);
                    }}
                    onMentionPress={(username, profileId) => {
                        onNavigate?.();
                        onClose();
                        router.push(`/private/search?query=${username}`);
                    }}
                />
                <View style={tw`flex-row gap-4 mt-2`}>
                    <PressableHaptics onPress={() => commentShare(reply)}>
                        <Text
                            style={tw`text-[13px] font-semibold text-gray-600 dark:text-gray-400`}>
                            Share
                        </Text>
                    </PressableHaptics>
                    {reply.is_owner && (
                        <PressableHaptics onPress={() => handleReplyDelete(reply)}>
                            <Text
                                style={tw`text-[13px] font-semibold text-red-600 dark:text-red-500`}>
                                Delete
                            </Text>
                        </PressableHaptics>
                    )}
                    {!reply.is_owner && (
                        <PressableHaptics onPress={() => handleReplyReport(reply)}>
                            <Text
                                style={tw`text-[13px] font-semibold text-gray-600 dark:text-gray-400`}>
                                Report
                            </Text>
                        </PressableHaptics>
                    )}
                </View>
            </View>
            <View style={tw`items-center gap-1`}>
                <PressableHaptics
                    onPress={() => handleLikeCommentReply(reply.id, reply.p_id, reply.liked)}>
                    <Ionicons
                        name={reply.liked ? 'heart' : 'heart-outline'}
                        size={16}
                        color={reply.liked ? '#FF2D55' : isDark ? '#999' : '#999'}
                    />
                </PressableHaptics>
                {reply.likes > 0 && (
                    <Text style={tw`text-xs text-gray-600 dark:text-gray-400`}>{reply.likes}</Text>
                )}
            </View>
        </View>
    );

    const RepliesList = ({ parentComment }) => {
        const {
            data: repliesData,
            fetchNextPage: fetchNextRepliesPage,
            hasNextPage: hasNextRepliesPage,
            isFetchingNextPage: isFetchingNextRepliesPage,
            isLoading: isLoadingReplies,
        } = useInfiniteQuery({
            queryKey: ['videoReplies', item.id, parentComment.id],
            queryFn: ({ pageParam }) => fetchVideoReplies(item.id, parentComment.id, pageParam),
            getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor,
            initialPageParam: null,
            enabled: expandedComments.has(parentComment.id),
        });

        const replies = repliesData?.pages?.flatMap((page) => page.data) || [];

        if (!expandedComments.has(parentComment.id)) return null;

        return (
            <View style={tw`mt-2`}>
                {isLoadingReplies ? (
                    <ActivityIndicator
                        size="small"
                        color={isDark ? '#666' : '#999'}
                        style={tw`ml-10`}
                    />
                ) : (
                    <>
                        <FlatList
                            data={replies}
                            renderItem={renderReply}
                            keyExtractor={(reply) => reply.id}
                            scrollEnabled={false}
                        />
                        {hasNextRepliesPage && (
                            <TouchableOpacity
                                onPress={() => fetchNextRepliesPage()}
                                style={tw`py-2 pl-14`}>
                                {isFetchingNextRepliesPage ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={isDark ? '#666' : '#999'}
                                    />
                                ) : (
                                    <Text style={tw`text-[13px] font-semibold text-[#007AFF]`}>
                                        Load more replies
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
        );
    };

    const renderComment = ({ item: comment }) => (
        <View>
            <View
                style={tw.style(`flex-row p-4 gap-3`, expandedComments.has(comment.id) && 'pb-0')}>
                <PressableHaptics onPress={() => handleProfilePress(comment.account?.id)}>
                    <Avatar url={comment.account.avatar} size={36} />
                </PressableHaptics>
                <View style={tw`flex-1`}>
                    <View style={tw`flex-row items-center gap-2 mb-1`}>
                        <PressableHaptics onPress={() => handleProfilePress(comment.account?.id)}>
                            <Text style={tw`text-sm font-bold text-black dark:text-white`}>
                                {comment.account.username}
                            </Text>
                        </PressableHaptics>
                        <Text style={tw`text-[13px] text-gray-600 dark:text-gray-400`}>
                            {timeAgo(comment.created_at)}
                        </Text>
                        {comment.account.id == item.account.id && (
                            <Text style={tw`text-xs font-bold text-[#F02C56]`}>Creator</Text>
                        )}
                    </View>
                    <LinkifiedCaption
                        caption={comment.caption}
                        tags={comment.tags || []}
                        mentions={comment.mentions || []}
                        style={tw`text-[15px] text-black dark:text-white leading-5 mb-2`}
                        onHashtagPress={(tag) => {
                            onNavigate?.();
                            onClose();
                            router.push(`/private/search?query=${tag}`);
                        }}
                        onMentionPress={(username, profileId) => {
                            onNavigate?.();
                            onClose();
                            router.push(`/private/search?query=${username}`);
                        }}
                    />
                    <View style={tw`flex-row gap-4`}>
                        {comment.replies > 0 && (
                            <PressableHaptics onPress={() => toggleReplies(comment.id)}>
                                <Text style={tw`text-[13px] font-semibold text-[#007AFF]`}>
                                    {expandedComments.has(comment.id)
                                        ? 'Hide replies'
                                        : `View ${comment.replies} ${comment.replies === 1 ? 'reply' : 'replies'}`}
                                </Text>
                            </PressableHaptics>
                        )}
                        <PressableHaptics onPress={() => handleReply(comment)}>
                            <Text
                                style={tw`text-[13px] font-semibold text-gray-600 dark:text-gray-400`}>
                                Reply
                            </Text>
                        </PressableHaptics>
                        <PressableHaptics onPress={() => commentShare(comment)}>
                            <Text
                                style={tw`text-[13px] font-semibold text-gray-600 dark:text-gray-400`}>
                                Share
                            </Text>
                        </PressableHaptics>
                        {comment.is_owner && (
                            <PressableHaptics onPress={() => handleCommentDelete(comment)}>
                                <Text
                                    style={tw`text-[13px] font-semibold text-red-600 dark:text-red-500`}>
                                    Delete
                                </Text>
                            </PressableHaptics>
                        )}
                        {!comment.is_owner && (
                            <PressableHaptics onPress={() => handleCommentReport(comment)}>
                                <Text
                                    style={tw`text-[13px] font-semibold text-gray-600 dark:text-gray-400`}>
                                    Report
                                </Text>
                            </PressableHaptics>
                        )}
                    </View>
                </View>
                <View style={tw`items-center gap-1`}>
                    <PressableHaptics onPress={() => handleLikeComment(comment.id, comment.liked)}>
                        <Ionicons
                            name={comment.liked ? 'heart' : 'heart-outline'}
                            size={18}
                            color={comment.liked ? '#FF2D55' : isDark ? '#999' : '#999'}
                        />
                    </PressableHaptics>
                    {comment.likes > 0 && (
                        <Text style={tw`text-xs text-gray-600 dark:text-gray-400`}>
                            {comment.likes}
                        </Text>
                    )}
                </View>
            </View>
            <RepliesList parentComment={comment} />
        </View>
    );

    const ListHeader = () => (
        <View style={tw`p-4 border-b border-gray-200 dark:border-gray-700`}>
            <TouchableOpacity
                style={tw`flex-row items-center mb-3`}
                onPress={() => {
                    onNavigate?.();
                    onClose();
                    navigation?.navigate('Profile', {
                        username: item.account.username,
                        profileId: item.account.id,
                    });
                }}>
                <Avatar url={item.account.avatar} size={36} />
                <View style={tw`ml-3 flex-1`}>
                    <Text style={tw`text-[15px] font-bold text-black dark:text-white`}>
                        {item.account.username}
                    </Text>
                    <Text style={tw`text-[13px] text-gray-600 dark:text-gray-400 mt-0.5`}>
                        {timeAgo(item.created_at)}
                    </Text>
                </View>
            </TouchableOpacity>
            <LinkifiedCaption
                caption={item.caption}
                tags={item.tags || []}
                mentions={item.mentions || []}
                style={tw`text-[15px] text-black dark:text-white leading-5`}
                onHashtagPress={(tag) => {
                    onNavigate?.();
                    onClose();
                    router.push(`/private/search?query=${tag}`);
                }}
                onMentionPress={(username, profileId) => {
                    onNavigate?.();
                    onClose();
                    router.push(`/private/search?query=${username}`);
                }}
            />
        </View>
    );

    if (showReport) {
        return (
            <ReportModal
                visible={visible}
                reportType={reportType}
                item={reportContent}
                onClose={() => handleCloseReportModal()}
                onCommunityGuidelines={() => handleReportCommunityGuidelines()}
            />
        );
    }

    const EmptyList = () => (
        <View style={tw`flex-1 justify-center items-center py-10`}>
            <Ionicons name="chatbubble-outline" size={64} color={isDark ? '#555' : '#ccc'} />
            <Text style={tw`text-gray-600 dark:text-gray-400 text-base font-semibold`}>
                No comments yet
            </Text>
            <Text style={tw`text-gray-400 dark:text-gray-500 text-sm mt-2`}>
                Be the first to share your thoughts!
            </Text>
        </View>
    );

    if (!canComment) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}>
                <View style={tw`flex-1 justify-end`}>
                    <Pressable style={tw`absolute inset-0`} onPress={onClose} />
                    <View
                        style={tw.style(`bg-white dark:bg-gray-900 rounded-t-2xl pt-3`, {
                            minHeight: 400,
                            paddingBottom: insets.bottom + 20,
                        })}>
                        <ListHeader />
                        <View
                            style={tw.style(`flex-1 items-center justify-center px-5`, {
                                paddingBottom: Math.max(insets.bottom, 16),
                            })}>
                            <View
                                style={tw`flex-1 py-4 px-5 flex-col items-center justify-center gap-2.5`}>
                                <Feather
                                    name="message-circle"
                                    size={50}
                                    color={isDark ? '#666' : '#999'}
                                />
                                <Text
                                    style={tw`text-sm text-gray-600 dark:text-gray-400 text-center flex-1`}>
                                    Comments have been disabled by the creator
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding': 'height'}
                style={tw`flex-1 justify-end`}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                <Pressable style={tw`absolute inset-0`} onPress={onClose} />
                <View style={tw`bg-white dark:bg-black rounded-t-2xl min-h-[50%] max-h-[85%]`}>
                    <View
                        style={tw`flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700`}>
                        <Text style={tw`text-lg font-bold text-black dark:text-white`}>
                            {totalComments} { totalComments === 1 ? 'comment' : 'comments'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={tw`flex-1 justify-center items-center py-10`}>
                            <ActivityIndicator size="large" color={isDark ? '#666' : '#999'} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={allComments}
                            renderItem={renderComment}
                            keyExtractor={(comment) => comment.id}
                            ListHeaderComponent={ListHeader}
                            onEndReached={() => {
                                if (hasNextPage && !isFetchingNextPage) {
                                    fetchNextPage();
                                }
                            }}
                            onEndReachedThreshold={0.5}
                            ListEmptyComponent={EmptyList}
                            ListFooterComponent={
                                isFetchingNextPage ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={isDark ? '#666' : '#999'}
                                        style={tw`my-5`}
                                    />
                                ) : null
                            }
                        />
                    )}

                    {replyingTo && (
                        <View
                            style={tw`flex-row justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700`}>
                            <Text style={tw`text-sm text-gray-600 dark:text-gray-400`}>
                                Replying to @{replyingTo.account.username}
                            </Text>
                            <TouchableOpacity onPress={cancelReply}>
                                <Ionicons
                                    name="close-circle"
                                    size={20}
                                    color={isDark ? '#999' : '#999'}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View
                        style={tw.style(
                            `flex-row items-center p-3 border-t border-gray-200 dark:border-gray-700 gap-3 bg-white dark:bg-black`,
                            { paddingBottom: Math.max(insets.bottom, 8) },
                        )}>
                        <Avatar url={user?.avatar} size={32} />
                        <TextInput
                            style={tw`flex-1 bg-white dark:bg-gray-800 text-black dark:text-white rounded-2xl border border-gray-300 dark:border-gray-600 px-4 py-3 max-h-[100px] text-[15px]`}
                            placeholder="Add a comment..."
                            placeholderTextColor={isDark ? '#666' : '#ccc'}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={tw`p-2`}
                            onPress={handleSendComment}
                            disabled={!comment.trim()}>
                            <Feather
                                name="send"
                                size={24}
                                color={comment.trim() ? '#007AFF' : isDark ? '#555' : '#CCC'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
