import { Storage } from '@/utils/cache';
import { Image, ImageProps } from 'expo-image';
import { router } from 'expo-router';
import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';

/**
 * Reusable Avatar component built on expo-image.
 * - Clickable via `href` (expo-router) or `onPress`.
 * - Theming support for size, radius and border.
 * - Hardcoded fallback URL if loading fails.
 */

// Hardcoded fallback URL
const DEFAULT_FALLBACK_URL = 'https://loopsusercontent.com/avatars/default.jpg?v=1';

// Built-in theme presets.
const THEMES = {
    sm: { size: 32, radius: 9999, borderWidth: 0, borderColor: 'transparent' },
    md: { size: 40, radius: 9999, borderWidth: 0, borderColor: 'transparent' },
    lg: { size: 56, radius: 9999, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
    xl: { size: 120, radius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
} as const;

export type AvatarThemeKey = keyof typeof THEMES;
export type AvatarThemeConfig = {
    size?: number;
    radius?: number;
    borderWidth?: number;
    borderColor?: string;
};

export type AvatarProps = {
    /** Primary image URL */
    url?: string | null;
    /** Shorthand for square size. Height === Width. */
    width?: number; // alias: size
    /** Corner radius (ignored if `rounded` is true). */
    radius?: number;
    /** If true, makes the avatar a perfect circle (default true). */
    rounded?: boolean;
    /** Border width in dp. */
    borderWidth?: number;
    /** Border color. */
    borderColor?: string;
    /** Theme preset name or a custom object. */
    theme?: AvatarThemeKey | AvatarThemeConfig;
    /** Route to push via expo-router (used if onPress is not provided). */
    href?: string;
    /** Optional press callback. Takes precedence over `href`. */
    onPress?: () => void;
    /** Optional long-press callback. */
    onLongPress?: () => void;
    /** Accessibility label for screen readers. */
    accessibilityLabel?: string;
    /** Disable press interactions. */
    disabled?: boolean;
    /** Optional style override. */
    style?: ViewStyle;
    /** Hit area expansion for touch targets. */
    hitSlop?: number | { top?: number; right?: number; bottom?: number; left?: number };
    /** expo-image props passthrough (limited, see pick below). */
    contentFit?: ImageProps['contentFit'];
    transition?: ImageProps['transition'];
    cachePolicy?: ImageProps['cachePolicy'];
    placeholder?: ImageProps['placeholder'];
    /** Optional override for the fallback image URL (defaults to DEFAULT_FALLBACK_URL). */
    fallbackUrl?: string;
    testID?: string;
};

const pickTheme = (theme?: AvatarThemeKey | AvatarThemeConfig) => {
    if (!theme) return THEMES.md;
    if (typeof theme === 'string') return THEMES[theme] ?? THEMES.md;
    return { ...THEMES.md, ...theme };
};

const Avatar = memo(function Avatar({
    url,
    width,
    radius,
    rounded = true,
    borderWidth,
    borderColor,
    theme,
    href,
    onPress,
    onLongPress,
    accessibilityLabel = 'Avatar',
    disabled,
    style,
    hitSlop = 6,
    contentFit = 'cover',
    transition = 120,
    cachePolicy = 'memory-disk',
    placeholder,
    fallbackUrl,
    testID,
}: AvatarProps) {
    const [failed, setFailed] = useState(false);

    const resolvedTheme = useMemo(() => pickTheme(theme), [theme]);

    const size = width ?? resolvedTheme.size ?? 40;

    // If rounded, compute fully circular radius. Otherwise prefer explicit radius, theme radius, or 0.
    const computedRadius = rounded ? Math.ceil(size / 2) : (radius ?? resolvedTheme.radius ?? 0);

    const finalBorderWidth = borderWidth ?? resolvedTheme.borderWidth ?? 0;
    const finalBorderColor = borderColor ?? resolvedTheme.borderColor ?? 'transparent';

    const computedFallbackUrl = useMemo(() => {
        if (fallbackUrl) {
            return fallbackUrl;
        }

        const domain = Storage.getString('app.instance');
        try {
            return `https://${domain}/storage/avatars/default.jpg`;
        } catch (e) {
            return DEFAULT_FALLBACK_URL;
        }
    }, [fallbackUrl]);

    const source =
        failed || !url ? { uri: fallbackUrl || computedFallbackUrl } : { uri: String(url) };

    const pressable = Boolean(onPress || href);

    const child = (
        <Image
            source={source}
            onError={() => setFailed(true)}
            contentFit={contentFit}
            cachePolicy={cachePolicy}
            transition={transition}
            placeholder={placeholder}
            accessibilityLabel={accessibilityLabel}
            style={[
                styles.base,
                {
                    width: size,
                    height: size,
                    borderRadius: computedRadius,
                    borderWidth: finalBorderWidth,
                    borderColor: finalBorderColor,
                },
                style,
            ]}
            testID={testID}
        />
    );

    if (!pressable) return child;

    const handlePress = () => {
        if (disabled) return;
        if (onPress) return onPress();
        if (href) router.push(href);
    };

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            disabled={disabled}
            hitSlop={hitSlop}
            android_ripple={{ borderless: true }}
            accessibilityRole="imagebutton"
            accessibilityLabel={accessibilityLabel}
            style={({ pressed }) => [
                { opacity: pressed ? 0.86 : 1 },
                // Preserve any layout/positioning from consumer's style prop
                // when wrapping with Pressable
                style as ViewStyle,
            ]}>
            {child}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    base: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        overflow: 'hidden',
    },
});

export default Avatar;
