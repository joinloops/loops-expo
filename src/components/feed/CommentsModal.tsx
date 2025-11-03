import Avatar from '@/components/Avatar';
import LinkifiedCaption from '@/components/feed/LinkifiedCaption';
import { ReportModal } from '@/components/ReportModal';
import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useAuthStore } from '@/utils/authStore';
import { commentDelete, commentLike, commentPost, commentReplyDelete, commentReplyLike, commentReplyUnlike, commentUnlike, fetchVideoComments, fetchVideoReplies } from '@/utils/requests';
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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    parentId?: string
}

type CommentDeletePayload = {
    videoId: string;
    commentId: string;
}

type CommentReplyDeletePayload = {
    videoId: string; 
    parentId: string;
    commentId: string;
}

type CommentLikePayload = {
    likeState: string; 
    videoId: string; 
    commentId: string; 
}

type CommentReplyLikePayload = {
    likeState: string;
    videoId: string;
    commentId: string;
    parentId: string;
}

export default function CommentsModal({ 
    visible, 
    item, 
    onClose, 
    navigation, 
    onNavigate 
}) {
    const [comment, setComment] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [expandedComments, setExpandedComments] = useState(new Set());
    const insets = useSafeAreaInsets();
    const flatListRef = useRef(null);
    const router = useRouter();
    const queryClient = useQueryClient()
    const [showReport, setShowReport] = useState(false);
    const [reportType, setReportType] = useState();
    const [reportContent, setReportContent] = useState();
    const { user } = useAuthStore()
    const canComment = item?.permissions?.can_comment !== false;

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['videoComments', item?.id],
        queryFn: ({ pageParam }) => fetchVideoComments(item.id, pageParam),
        getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor,
        initialPageParam: null,
        enabled: visible && !!item,
    });

    const commentMutation = useMutation({
        mutationFn: async (data: CommentPayload) => {
            return await commentPost(data)
        },
        onSuccess: async (res) => {
            await queryClient.refetchQueries(['videoComments', item?.id], { active: true, exact: true })
        }
    })

    const commentDeleteMutation = useMutation({
        mutationFn: async (data: CommentDeletePayload) => {
            return await commentDelete(data)
        },
        onSuccess: async (res) => {
            await queryClient.refetchQueries(['videoComments', item?.id], { active: true, exact: true })
        }
    })

    const commentReplyDeleteMutation = useMutation({
        mutationFn: async (data: CommentReplyDeletePayload) => {
            return await commentReplyDelete(data)
        },
        onSuccess: async (res) => {
            await queryClient.refetchQueries(['videoComments', item?.id], { active: true, exact: true })
        }
    })

    const commentLikeMutation = useMutation({
        mutationFn: async (data: CommentLikePayload) => {
            if (data.likeState == 'like') {
                return await commentLike(data)
            } else if (data.likeState == 'unlike') {
                return await commentUnlike(data)
            }
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });

            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);

            queryClient.setQueryData(['videoComments', item?.id], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: page.data.map(comment => {
                            if (comment.id === variables.commentId) {
                                const isLiking = variables.likeState === 'like';
                                return {
                                    ...comment,
                                    liked: isLiking,
                                    likes: isLiking ? comment.likes + 1 : comment.likes - 1
                                };
                            }
                            return comment;
                        })
                    }))
                };
            });

            return { previousComments };
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(['videoComments', item?.id], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: page.data.map(comment =>
                            comment.id === variables.commentId
                                ? { ...comment, liked: res.liked, likes: res.likes }
                                : comment
                        )
                    }))
                };
            });
        },
        onError: (err, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['videoComments', item?.id], context.previousComments);
            }
        }
    })

    const commentReplyLikeMutation = useMutation({
        mutationFn: async (data: CommentReplyLikePayload) => {
            console.log(data)
            if (data.likeState == 'like') {
                return await commentReplyLike(data)
            } else if (data.likeState == 'unlike') {
                return await commentReplyUnlike(data)
            }
        },
        onMutate: async (variables) => {
            await queryClient.cancelQueries({ queryKey: ['videoComments', item?.id] });

            const previousComments = queryClient.getQueryData(['videoComments', item?.id]);

            await queryClient.cancelQueries({ 
                queryKey: ['videoReplies', item.id, variables.parentId] 
            });

            const previousReplies = queryClient.getQueryData(['videoReplies', item.id, variables.parentId]);

            queryClient.setQueryData(['videoReplies', item.id, variables.parentId], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: page.data.map(reply => {
                            if (reply.id === variables.replyId) {
                                const isLiking = variables.likeState === 'like';
                                return {
                                    ...reply,
                                    liked: isLiking,
                                    likes: isLiking ? reply.likes + 1 : reply.likes - 1
                                };
                            }
                            return reply;
                        })
                    }))
                };
            });

            return { previousComments, previousReplies };
        },
        onSuccess: (res, variables) => {
            queryClient.setQueryData(['videoReplies', item.id, variables.parentId], (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map(page => ({
                        ...page,
                        data: page.data.map(reply =>
                            reply.id === variables.replyId
                                ? { ...reply, liked: res.liked, likes: res.likes }
                                : reply
                        )
                    }))
                };
            });
        },
        onError: (err, variables, context) => {
            if (context?.previousReplies) {
                queryClient.setQueryData(
                    ['videoReplies', item.id, variables.parentId], 
                    context.previousReplies
                );
            }
        }
    })

    const commentShare = async (item) => {
        try {
            await shareContent({
                message: `Check out this comment on Loops by @${item.account.username}!`,
                url: item?.url
            })
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (!item) return null;

    const allComments = data?.pages?.flatMap(page => page.data) || [];
    const totalComments = item.comments;

    const handleLikeComment = async (commentId, likeState) => {
        commentLikeMutation.mutate({ 
            likeState: likeState ? 'unlike' : 'like', 
            videoId: item.id, 
            commentId: commentId 
        })
    };

    const handleLikeCommentReply = async (replyId, parentId, likeState) => {
        commentReplyLikeMutation.mutate({ 
            likeState: likeState ? 'unlike' : 'like', 
            videoId: item.id, 
            commentId: replyId,
            parentId: parentId
        })
    }

    const handleCommentReport = async(comment) => {
        setReportContent(comment);
        setReportType('comment')
        setShowReport(true)
    }

    const handleReplyReport = async(reply) => {
        setReportContent(reply);
        setReportType('reply')
        setShowReport(true)
    }

    const toggleReplies = (commentId) => {
        setExpandedComments(prev => {
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
        Alert.alert(
            'Confirm Reply Delete',
            'Are you sure you want to delete this comment reply?',
            [
                {
                    text: "Cancel",
                    style: 'cancel'
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => commentDeleteMutation.mutate({videoId: item.id, commentId: reply.id})
                }
            ]
        )
    }
    
    const handleReplyDelete = async (reply) => {
        Alert.alert(
            'Confirm Reply Delete',
            'Are you sure you want to delete this comment reply?',
            [
                {
                    text: "Cancel",
                    style: 'cancel'
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => commentReplyDeleteMutation.mutate({videoId: item.id, parentId: reply.p_id, commentId: reply.id})
                }
            ]
        )
    }

    const cancelReply = () => {
        setReplyingTo(null);
        setComment('');
    };

    const handleCloseReportModal = () => {
        setShowReport(false)
        onClose()
    }

    const handleReportCommunityGuidelines = () => {
        onClose()
        router.push('/private/settings/legal/community')
    }

    const handleProfilePress = (id) => {
        onClose()
        router.push(`/private/profile/${id}`)
    }

    const handleSendComment = async () => {
        if (!comment.trim()) return;

        commentMutation.mutate({ id: item.id, commentText: comment, parentId: replyingTo?.id })
        setComment('');
        setReplyingTo(null);
    };

    const renderReply = ({ item: reply }) => (
        <View style={styles.replyItem}>
            <PressableHaptics onPress={() => handleProfilePress(reply.account?.id)}>
                <Avatar url={reply.account.avatar} size={28} />
            </PressableHaptics>
            <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                    <PressableHaptics onPress={() => handleProfilePress(reply.account?.id)}>
                        <Text style={styles.commentUsername}>{reply.account.username}</Text>
                    </PressableHaptics>
                    <Text style={styles.commentTime}>{timeAgo(reply.created_at)}</Text>
                    { reply.account.id == item.account.id && (
                        <Text style={styles.creatorTag}>Creator</Text>
                    )}
                </View>
                <LinkifiedCaption
                    caption={reply.caption}
                    tags={reply.tags || []}
                    mentions={reply.mentions || []}
                    style={styles.commentText}
                    onHashtagPress={(tag) => {
                        onNavigate?.();
                        onClose();
                        router.push(`/private/search?query=${tag}`)
                    }}
                    onMentionPress={(username, profileId) => {
                        onNavigate?.();
                        onClose();
                        router.push(`/private/search?query=${username}`)
                    }}
                />
                <View style={styles.commentActions}>
                    <PressableHaptics onPress={() => commentShare(reply)}>
                        <Text style={styles.shareButton}>Share</Text>
                    </PressableHaptics>
                    { reply.is_owner && (
                        <PressableHaptics onPress={() => handleReplyDelete(reply)}>
                            <Text style={styles.deleteButton}>Delete</Text>
                        </PressableHaptics>
                    )}
                    { !reply.is_owner && (
                        <PressableHaptics onPress={() => handleReplyReport(reply)}>
                            <Text style={styles.reportButton}>Report</Text>
                        </PressableHaptics>
                    )}
                </View>
            </View>
            <View style={styles.commentLikeContainer}>
                <PressableHaptics onPress={() => handleLikeCommentReply(reply.id, reply.p_id, reply.liked)}>
                    <Ionicons
                        name={reply.liked ? 'heart' : 'heart-outline'}
                        size={16}
                        color={reply.liked ? '#FF2D55' : '#999'}
                    />
                </PressableHaptics>
                {reply.likes > 0 && (
                    <Text style={styles.commentLikeCount}>{reply.likes}</Text>
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

        const replies = repliesData?.pages?.flatMap(page => page.data) || [];

        if (!expandedComments.has(parentComment.id)) return null;

        return (
            <View style={styles.repliesContainer}>
                {isLoadingReplies ? (
                    <ActivityIndicator size="small" color="#999" style={{ marginLeft: 40 }} />
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
                                style={styles.loadMoreReplies}
                            >
                                {isFetchingNextRepliesPage ? (
                                    <ActivityIndicator size="small" color="#999" />
                                ) : (
                                    <Text style={styles.loadMoreText}>Load more replies</Text>
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
            <View style={[
                styles.commentItem,
                expandedComments.has(comment.id) && { paddingBottom: 0 }
            ]}>
                <PressableHaptics onPress={() => handleProfilePress(comment.account?.id)}>
                    <Avatar url={comment.account.avatar} size={36} />
                </PressableHaptics>
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <PressableHaptics onPress={() => handleProfilePress(comment.account?.id)}>
                            <Text style={styles.commentUsername}>{comment.account.username}</Text>
                        </PressableHaptics>
                        <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                        { comment.account.id == item.account.id && (
                            <Text style={styles.creatorTag}>Creator</Text>
                        )}
                    </View>
                    <LinkifiedCaption
                        caption={comment.caption}
                        tags={comment.tags || []}
                        mentions={comment.mentions || []}
                        style={styles.commentText}
                        onHashtagPress={(tag) => {
                            onNavigate?.();
                            onClose();
                            router.push(`/private/search?query=${tag}`)
                        }}
                        onMentionPress={(username, profileId) => {
                            onNavigate?.();
                            onClose();
                            router.push(`/private/search?query=${username}`)
                        }}
                    />
                    <View style={styles.commentActions}>
                        {comment.replies > 0 && (
                            <PressableHaptics onPress={() => toggleReplies(comment.id)}>
                                <Text style={styles.viewRepliesButton}>
                                    {expandedComments.has(comment.id)
                                        ? 'Hide replies'
                                        : `View ${comment.replies} ${comment.replies === 1 ? 'reply' : 'replies'}`}
                                </Text>
                            </PressableHaptics>
                        )}
                        <PressableHaptics onPress={() => handleReply(comment)}>
                            <Text style={styles.replyButton}>Reply</Text>
                        </PressableHaptics>
                        <PressableHaptics onPress={() => commentShare(comment)}>
                            <Text style={styles.shareButton}>Share</Text>
                        </PressableHaptics>
                        { comment.is_owner && (
                            <PressableHaptics onPress={() => handleCommentDelete(comment)}>
                                <Text style={styles.deleteButton}>Delete</Text>
                            </PressableHaptics>
                        )}
                        { !comment.is_owner && (
                            <PressableHaptics onPress={() => handleCommentReport(comment)}>
                                <Text style={styles.reportButton}>Report</Text>
                            </PressableHaptics>
                        )}
                    </View>
                </View>
                <View style={styles.commentLikeContainer}>
                    <PressableHaptics onPress={() => handleLikeComment(comment.id, comment.liked)}>
                        <Ionicons
                            name={comment.liked ? 'heart' : 'heart-outline'}
                            size={18}
                            color={comment.liked ? '#FF2D55' : '#999'}
                        />
                    </PressableHaptics>
                    {comment.likes > 0 && (
                        <Text style={styles.commentLikeCount}>{comment.likes}</Text>
                    )}
                </View>
            </View>
            <RepliesList parentComment={comment} />
        </View>
    );

    const ListHeader = () => (
        <View style={styles.captionContainer}>
            <TouchableOpacity
                style={styles.captionHeader}
                onPress={() => {
                    onNavigate?.();
                    onClose();
                    navigation?.navigate('Profile', {
                        username: item.account.username,
                        profileId: item.account.id
                    });
                }}
            >
                <Avatar url={item.account.avatar} size={36} />
                <View style={styles.captionUserInfo}>
                    <Text style={styles.captionUsername}>{item.account.username}</Text>
                    <Text style={styles.captionTime}>{timeAgo(item.created_at)}</Text>
                </View>
            </TouchableOpacity>
            <LinkifiedCaption
                caption={item.caption}
                tags={item.tags || []}
                mentions={item.mentions || []}
                style={styles.captionText}
                onHashtagPress={(tag) => {
                    onNavigate?.();
                    onClose();
                    router.push(`/private/search?query=${tag}`)
                }}
                onMentionPress={(username, profileId) => {
                    onNavigate?.();
                    onClose();
                    router.push(`/private/search?query=${username}`)
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
        )
    }

    const EmptyList = () => (
        <View style={styles.emptyCommentsContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
            <Text style={styles.noComments}>No comments yet</Text>
            <Text style={styles.noCommentsSubtext}>
                Be the first to share your thoughts!
            </Text>
        </View>
    )

    if (!canComment) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={onClose}
            >
                <View style={styles.modalContainer}>
                    <Pressable style={styles.modalBackdrop} onPress={onClose} />
                    <View style={[styles.actionModalContent, { minHeight: 400, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <View style={[
                            styles.disabledCommentsContainer,
                            { paddingBottom: Math.max(insets.bottom, 16) }
                        ]}>
                            <View style={styles.disabledCommentsInner}>
                                <Feather name="message-circle" size={50} color="#999" />
                                <Text style={styles.disabledCommentsText}>
                                    Comments have been disabled by the creator
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        )
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalContainer}
                keyboardVerticalOffset={0}
            >
                <Pressable style={styles.modalBackdrop} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{totalComments} comments</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingCommentsContainer}>
                            <ActivityIndicator size="large" color="#999" />
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
                                    <ActivityIndicator size="small" color="#999" style={{ marginVertical: 20 }} />
                                ) : null
                            }
                        />
                    )}

                    {replyingTo && (
                        <View style={styles.replyingToContainer}>
                            <Text style={styles.replyingToText}>
                                Replying to @{replyingTo.account.username}
                            </Text>
                            <TouchableOpacity onPress={cancelReply}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={[
                        styles.commentInputContainer,
                        { paddingBottom: Math.max(insets.bottom, 8) }
                    ]}>
                        <Avatar url={user?.avatar} size={32} />
                        <TextInput
                            style={styles.commentInput}
                            placeholder="Add a comment..."
                            placeholderTextColor="#ccc"
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={handleSendComment}
                            disabled={!comment.trim()}
                        >
                            <Feather
                                name="send"
                                size={24}
                                color={comment.trim() ? '#007AFF' : '#CCC'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: '50%',
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    loadingCommentsContainer: {
        flex: 1,
        justifyContent: 'center',
        minHeight: 400,
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyCommentsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    noComments: {
        color: '#999',
        fontSize: 16,
        fontWeight: '600',
    },
    noCommentsSubtext: {
        color: '#CCC',
        fontSize: 14,
        marginTop: 8,
    },
    captionContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    captionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    captionUserInfo: {
        marginLeft: 12,
        flex: 1,
    },
    captionUsername: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
    },
    captionTime: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    captionText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
    },
    commentItem: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    replyItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingLeft: 44,
        paddingRight: 16,
        gap: 8,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    creatorTag: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F02C56'
    },
    commentTime: {
        fontSize: 13,
        color: '#999',
    },
    commentText: {
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
        marginBottom: 8,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
    },
    replyButton: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    shareButton: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    reportButton: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    deleteButton: {
        fontSize: 13,
        fontWeight: '600',
        color: '#d24949',
    },
    viewRepliesButton: {
        fontSize: 13,
        fontWeight: '600',
        color: '#007AFF',
    },
    commentLikeContainer: {
        alignItems: 'center',
        gap: 4,
    },
    commentLikeCount: {
        fontSize: 12,
        color: '#666',
    },
    repliesContainer: {
        marginTop: 8,
    },
    loadMoreReplies: {
        paddingVertical: 8,
        paddingLeft: 56,
    },
    loadMoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#007AFF',
    },
    replyingToContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F5F5F5',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
    },
    replyingToText: {
        fontSize: 14,
        color: '#666',
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        gap: 12,
        backgroundColor: 'white',
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#fff',
        color: '#000',
        placeholderTextColor: '#000',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 15,
    },
    sendButton: {
        padding: 8,
    },
    actionModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
    },
    emptyCommentsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    noComments: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    noCommentsSubtext: {
        fontSize: 15,
        color: '#999',
        textAlign: 'center',
    },
    disabledCommentsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 10,
    },
    disabledCommentsInner: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    disabledCommentsText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        flex: 1,
    }
});