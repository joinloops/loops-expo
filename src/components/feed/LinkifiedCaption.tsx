import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text
} from 'react-native';
import { UITextView } from "react-native-uitextview";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LinkifiedCaption({ caption, tags = [], mentions = [], style, numberOfLines, onHashtagPress, onMentionPress, onMorePress }) {
    const [isTruncated, setIsTruncated] = useState(false);

    const renderCaption = () => {
        if (!caption) return null;

        const links = [];

        tags.forEach(tag => {
            const regex = new RegExp(`#${tag}\\b`, 'gi');
            let match;
            while ((match = regex.exec(caption)) !== null) {
                links.push({
                    type: 'hashtag',
                    value: tag,
                    start: match.index,
                    end: match.index + match[0].length,
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
                end: mention.end_index,
            });
        });

        links.sort((a, b) => a.start - b.start);

        const elements = [];
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

    return (
        <>
            <UITextView
                style={style}
                numberOfLines={numberOfLines}
                selectable
                uiTextView
                onTextLayout={(e) => {
                    if (numberOfLines && e.nativeEvent.lines.length > numberOfLines) {
                        setIsTruncated(true);
                    }
                }}
            >
                {renderCaption()}
            </UITextView>
            {isTruncated && numberOfLines && onMorePress && (
                <PressableHaptics onPress={onMorePress} style={styles.moreButton}>
                    <Text style={styles.moreText}>more</Text>
                    <Ionicons name="chevron-down" size={14} color="white" />
                </PressableHaptics>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    linkText: {
        fontWeight: '700',
    },
    moreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 2,
    },
    moreText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    }
});