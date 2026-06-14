import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import tw from 'twrnc';

const COLLAPSED_LINES = 2;
const MAX_LINES = 15;

export default function ExpandableBio({ bio, textStyle, linkStyle }) {
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const [measured, setMeasured] = useState(false);

    useEffect(() => {
        setMeasured(false);
        setExpanded(false);
    }, [bio]);

    const onMeasure = useCallback((e) => {
        setOverflows(e.nativeEvent.lines.length > COLLAPSED_LINES);
        setMeasured(true);
    }, []);

    if (!bio) return null;

    const baseText =
        textStyle ??
        tw`text-sm leading-5 text-center font-medium text-[#161823] dark:text-gray-300`;

    return (
        <View
            style={tw`w-full px-5`}
            accessible={true}
            accessibilityLabel={`Profile biography: ${bio}`}>
            {!measured && (
                <View style={tw`h-0 overflow-hidden`} pointerEvents="none">
                    <Text style={baseText} onTextLayout={onMeasure}>
                        {bio}
                    </Text>
                </View>
            )}

            <Animated.View layout={LinearTransition.duration(220)}>
                <Text
                    style={baseText}
                    numberOfLines={expanded ? MAX_LINES : COLLAPSED_LINES}
                    ellipsizeMode="tail">
                    {bio}
                </Text>
            </Animated.View>

            {overflows && (
                <Pressable
                    onPress={() => setExpanded((v) => !v)}
                    hitSlop={8}
                    style={tw`self-center mt-1`}
                    accessibilityRole="button">
                    <Text
                        style={
                            linkStyle ?? tw`text-sm font-semibold text-gray-500 dark:text-gray-400`
                        }>
                        {expanded ? 'Show less' : 'Read more'}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}
