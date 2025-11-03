import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { UITextView } from 'react-native-uitextview';

export default function LinkifiedCaption({
    caption,
    tags = [],
    mentions = [],
    style,
    numberOfLines,
    onHashtagPress,
    onMentionPress,
    onMorePress
}) {
    const [containerWidth, setContainerWidth] = useState(0);
    const [fullTextWidth, setFullTextWidth] = useState<number | null>(null);
    const [moreWidth, setMoreWidth] = useState<number | null>(null);

    const renderCaptionForText = () => {
        if (!caption) return null;
        const links: Array<any> = [];

        tags.forEach(tag => {
            const regex = new RegExp(`#${tag}\\b`, 'gi');
            let match;
            while ((match = regex.exec(caption)) !== null) {
                links.push({
                    type: 'hashtag',
                    value: tag,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        });

        mentions.forEach(mention => {
            links.push({
                type: 'mention',
                value: mention.username,
                profileId: mention.profile_id,
                isLocal: mention.is_local,
                start: mention.start_index,
                end: mention.end_index
            });
        });

        links.sort((a, b) => a.start - b.start);

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        links.forEach((link, index) => {
            if (link.start > lastIndex) {
                elements.push(
                    <Text key={`text-${index}`}>{caption.substring(lastIndex, link.start)}</Text>
                );
            }

            const linkText = caption.substring(link.start, link.end);
            elements.push(
                <Text
                    key={`link-${index}`}
                    style={styles.linkText}
                    onPress={() => {
                        if (link.type === 'hashtag') {
                            onHashtagPress?.(link.value);
                        } else {
                            onMentionPress?.(link.value, link.profileId);
                        }
                    }}
                >
                    {linkText}
                </Text>
            );

            lastIndex = link.end;
        });

        if (lastIndex < caption.length) {
            elements.push(<Text key="text-end">{caption.substring(lastIndex)}</Text>);
        }

        return elements;
    };

    const renderCaptionForUITextView = () => {
        if (!caption) return null;
        const links: Array<any> = [];

        tags.forEach(tag => {
            const regex = new RegExp(`#${tag}\\b`, 'gi');
            let match;
            while ((match = regex.exec(caption)) !== null) {
                links.push({
                    type: 'hashtag',
                    value: tag,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        });

        mentions.forEach(mention => {
            links.push({
                type: 'mention',
                value: mention.username,
                profileId: mention.profile_id,
                isLocal: mention.is_local,
                start: mention.start_index,
                end: mention.end_index
            });
        });

        links.sort((a, b) => a.start - b.start);

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        links.forEach((link, index) => {
            if (link.start > lastIndex) {
                elements.push(caption.substring(lastIndex, link.start));
            }

            const linkText = caption.substring(link.start, link.end);
            elements.push(
                <UITextView
                    key={`link-${index}`}
                    style={styles.linkText}
                    onPress={() => {
                        if (link.type === 'hashtag') {
                            onHashtagPress?.(link.value);
                        } else {
                            onMentionPress?.(link.value, link.profileId);
                        }
                    }}
                >
                    {linkText}
                </UITextView>
            );

            lastIndex = link.end;
        });

        if (lastIndex < caption.length) {
            elements.push(caption.substring(lastIndex));
        }

        return elements;
    };

    const onMeasureContainer = useCallback((e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    }, []);

    const onMeasureFullText = useCallback((e: any) => {
        const firstLine = e.nativeEvent.lines?.[0];
        if (firstLine?.width) {
            setFullTextWidth(firstLine.width);
        }
    }, []);

    const moreMeasured = useRef(false);
    const onMeasureMore = useCallback((e: LayoutChangeEvent) => {
        if (!moreMeasured.current) {
            setMoreWidth(e.nativeEvent.layout.width);
            moreMeasured.current = true;
        }
    }, []);

    const canDecide =
        numberOfLines === 1 &&
        containerWidth > 0 &&
        moreWidth != null &&
        fullTextWidth != null;

    const needsMore = useMemo(() => {
        if (!canDecide) return false;
        return fullTextWidth! > (containerWidth - (moreWidth as number));
    }, [canDecide, fullTextWidth, containerWidth, moreWidth]);

    if (numberOfLines === 1) {
        return (
            <View style={styles.container} onLayout={onMeasureContainer}>
                <Text
                    style={[style, styles.measurementText]}
                    numberOfLines={1}
                    onTextLayout={onMeasureFullText}
                >
                    {caption || ''}
                </Text>

                <View style={styles.measureRow}>
                    <View style={styles.measureItem} onLayout={onMeasureMore}>
                        <Text style={styles.moreText}>more</Text>
                        <Ionicons name="chevron-down" size={13} style={styles.moreIconMeasure} />
                    </View>
                </View>

                <View style={styles.inlineRow}>
                    <Text
                        style={[
                            style,
                            needsMore && { maxWidth: Math.max(0, containerWidth - (moreWidth || 0)) }
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {renderCaptionForText()}
                    </Text>

                    {needsMore && onMorePress && (
                        <Pressable onPress={onMorePress} style={styles.moreInline}>
                            <Text style={styles.moreText}>more</Text>
                            <Ionicons name="chevron-down" size={13} style={styles.moreIcon} />
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
        position: 'relative'
    },

    measurementText: {
        position: 'absolute',
        opacity: 0,
        zIndex: -1,
        includeFontPadding: false
    },
    measureRow: {
        position: 'absolute',
        opacity: 0,
        zIndex: -1,
        flexDirection: 'row'
    },
    measureItem: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    moreIconMeasure: {
        marginLeft: 2,
        opacity: 0.7
    },

    inlineRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        flexWrap: 'nowrap'
    },
    linkText: {
        fontWeight: '700'
    },
    moreInline: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginLeft: 4
    },
    moreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        opacity: 0.7
    },
    moreIcon: {
        marginLeft: 2,
        opacity: 0.7,
        paddingTop: 2,
        color: '#fff'
    }
});
