import { memo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const PlaylistIcon = memo(function PlaylistIcon({
    size = 19,
    color = '#1f2937',
    bgColor = '#f3f4f6',
    filled = false,
}) {
    if (filled) {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <Rect
                    x="7.5"
                    y="3"
                    width="13.5"
                    height="13.5"
                    rx="3"
                    stroke={color}
                    strokeWidth="2"
                />
                <Rect x="3" y="7.5" width="13.5" height="13.5" rx="3" fill={color} />
                <Path d="M8 11.4v6.2l5.2-3.1Z" fill={bgColor} />
            </Svg>
        );
    }
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="7.5" y="3" width="13.5" height="13.5" rx="3" stroke={color} strokeWidth="2" />
            <Rect
                x="3"
                y="7.5"
                width="13.5"
                height="13.5"
                rx="3"
                fill={bgColor}
                stroke={color}
                strokeWidth="2"
            />
            <Path d="M8 11.4v6.2l5.2-3.1Z" fill={color} />
        </Svg>
    );
});

export default PlaylistIcon;
