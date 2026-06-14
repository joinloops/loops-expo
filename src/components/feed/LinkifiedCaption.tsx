import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
    LayoutChangeEvent,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
} from 'react-native';
import { UITextView } from 'react-native-uitextview';

type Mention = {
    username: string;
    profile_id?: string | number;
    is_local?: boolean;
    start_index: number;
    end_index: number;
};

type CaptionLink = {
    type: 'hashtag' | 'mention';
    value: string;
    profileId?: string | number;
    isLocal?: boolean;
    start: number;
    end: number;
};

type LinkifiedCaptionProps = {
    caption?: string;
    tags?: string[];
    mentions?: Mention[];
    style?: StyleProp<TextStyle>;
    numberOfLines?: number;
    onHashtagPress?: (tag: string) => void;
    onMentionPress?: (username: string, profileId?: string | number) => void;
    onMorePress?: () => void;
};

const escapeRegExp = (value: string) => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default function LinkifiedCaption({
    caption = '',
    tags = [],
    mentions = [],
    style,
    numberOfLines,
    onHashtagPress,
    onMentionPress,
    onMorePress,
}: LinkifiedCaptionProps) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [naturalLineCount, setNaturalLineCount] = useState(0);
    const [moreWidth, setMoreWidth] = useState<number | null>(null);

    const links = useMemo<CaptionLink[]>(() => {
        if (!caption) return [];

        const foundLinks: CaptionLink[] = [];

        tags.forEach((tag) => {
            if (!tag) return;

            const escapedTag = escapeRegExp(tag);
            const regex = new RegExp(`#${escapedTag}\\b`, 'gi');

            let match: RegExpExecArray | null;

            while ((match = regex.exec(caption)) !== null) {
                foundLinks.push({
                    type: 'hashtag',
                    value: tag,
                    start: match.index,
                    end: match.index + match[0].length,
                });
            }
        });

        mentions.forEach((mention) => {
            const start = mention.start_index;
            const end = mention.end_index;

            if (
                typeof start !== 'number' ||
                typeof end !== 'number' ||
                start < 0 ||
                end <= start ||
                end > caption.length
            ) {
                return;
            }

            foundLinks.push({
                type: 'mention',
                value: mention.username,
                profileId: mention.profile_id,
                isLocal: mention.is_local,
                start,
                end,
            });
        });

        foundLinks.sort((a, b) => a.start - b.start);

        // Prevent malformed overlapping ranges from breaking the output.
        const nonOverlappingLinks: CaptionLink[] = [];
        let cursor = 0;

        foundLinks.forEach((link) => {
            if (link.start < cursor) return;

            nonOverlappingLinks.push(link);
            cursor = link.end;
        });

        return nonOverlappingLinks;
    }, [caption, tags, mentions]);

    const handleLinkPress = useCallback(
        (link: CaptionLink) => {
            if (link.type === 'hashtag') {
                onHashtagPress?.(link.value);
                return;
            }

            onMentionPress?.(link.value, link.profileId);
        },
        [onHashtagPress, onMentionPress],
    );

    const renderCaptionForText = useCallback(() => {
        if (!caption) return null;

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        links.forEach((link, index) => {
            if (link.start > lastIndex) {
                elements.push(
                    <Text key={`text-${index}`}>
                        {caption.substring(lastIndex, link.start)}
                    </Text>,
                );
            }

            elements.push(
                <Text
                    key={`link-${index}`}
                    style={styles.linkText}
                    onPress={() => handleLinkPress(link)}>
                    {caption.substring(link.start, link.end)}
                </Text>,
            );

            lastIndex = link.end;
        });

        if (lastIndex < caption.length) {
            elements.push(
                <Text key="text-end">
                    {caption.substring(lastIndex)}
                </Text>,
            );
        }

        return elements;
    }, [caption, links, handleLinkPress]);

    const renderCaptionForUITextView = useCallback(() => {
        if (!caption) return null;

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        links.forEach((link, index) => {
            if (link.start > lastIndex) {
                elements.push(caption.substring(lastIndex, link.start));
            }

            elements.push(
                <UITextView
                    key={`link-${index}`}
                    style={styles.linkText}
                    onPress={() => handleLinkPress(link)}>
                    {caption.substring(link.start, link.end)}
                </UITextView>,
            );

            lastIndex = link.end;
        });

        if (lastIndex < caption.length) {
            elements.push(caption.substring(lastIndex));
        }

        return elements;
    }, [caption, links, handleLinkPress]);

    const onMeasureContainer = useCallback((event: LayoutChangeEvent) => {
        setContainerWidth(event.nativeEvent.layout.width);
    }, []);

    const onMeasureNaturalText = useCallback((event: any) => {
        const lines = event.nativeEvent.lines || [];
        setNaturalLineCount(lines.length);
    }, []);

    const onMeasureMore = useCallback((event: LayoutChangeEvent) => {
        setMoreWidth(event.nativeEvent.layout.width);
    }, []);

    const canDecide =
        numberOfLines === 1 &&
        caption.length > 0 &&
        containerWidth > 0 &&
        moreWidth != null &&
        naturalLineCount > 0;

    const needsMore = useMemo(() => {
        if (!canDecide) return false;

        return naturalLineCount > 1;
    }, [canDecide, naturalLineCount]);

    const shouldShowMore = needsMore && !!onMorePress;

    if (numberOfLines === 1) {
        return (
            <View style={styles.container} onLayout={onMeasureContainer}>
                {containerWidth > 0 && (
                    <Text
                        style={[
                            style,
                            styles.measurementText,
                            { width: containerWidth },
                        ]}
                        onTextLayout={onMeasureNaturalText}>
                        {renderCaptionForText()}
                    </Text>
                )}

                <View style={styles.measureRow}>
                    <View style={styles.measureItem} onLayout={onMeasureMore}>
                        <Text style={styles.moreText}>more</Text>
                        <Ionicons
                            name="chevron-down"
                            size={13}
                            style={styles.moreIconMeasure}
                        />
                    </View>
                </View>

                <View style={styles.inlineRow}>
                    <Text
                        style={[
                            style,
                            styles.captionInlineText,
                            shouldShowMore && {
                                maxWidth: Math.max(
                                    0,
                                    containerWidth - (moreWidth || 0),
                                ),
                            },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {renderCaptionForText()}
                    </Text>

                    {shouldShowMore && (
                        <Pressable onPress={onMorePress} style={styles.moreInline}>
                            <Text style={styles.moreText}>more</Text>
                            <Ionicons
                                name="chevron-down"
                                size={13}
                                style={styles.moreIcon}
                            />
                        </Pressable>
                    )}
                </View>
            </View>
        );
    }

    return (
        <UITextView style={style} selectable uiTextView>
            {renderCaptionForUITextView()}
        </UITextView>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },

    measurementText: {
        position: 'absolute',
        opacity: 0,
        zIndex: -1,
        includeFontPadding: false,
    },

    measureRow: {
        position: 'absolute',
        opacity: 0,
        zIndex: -1,
        flexDirection: 'row',
    },

    measureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    inlineRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'nowrap',
    },

    captionInlineText: {
        flexShrink: 1,
        minWidth: 0,
    },

    linkText: {
        fontWeight: '700',
    },

    moreInline: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginLeft: 4,
        flexShrink: 0,
    },

    moreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        opacity: 0.7,
    },

    moreIcon: {
        marginLeft: 2,
        opacity: 0.7,
        paddingTop: 2,
        color: '#fff',
    },

    moreIconMeasure: {
        marginLeft: 2,
        opacity: 0.7,
        color: '#fff',
    },
});