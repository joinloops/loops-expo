import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text, ViewStyle } from 'react-native';
import tw from 'twrnc';

type ButtonSize = 'small' | 'medium' | 'large' | 'xlarge';

type ButtonTheme =
    | 'primary'
    | 'action'
    | 'light'
    | 'primary-outlined'
    | 'action-outlined'
    | 'light-outlined';

type ButtonProps = {
    title: string;
    onPress?: () => void;
    theme?: ButtonTheme;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    full?: boolean;
    style?: ViewStyle;
} & Omit<PressableProps, 'style'>;

const COLORS = {
    primary: '#F02C56',
    action: '#0095f6',
    light: '#f1f1f1',
    white: '#ffffff',
    black: '#000000',
    gray: '#8e8e8e',
    transparent: 'transparent',
};

const sizeConfig = {
    small: {
        paddingX: 'px-3',
        paddingY: 'py-2',
        textSize: 'text-sm',
        rounded: 'rounded-md',
    },
    medium: {
        paddingX: 'px-4',
        paddingY: 'py-3',
        textSize: 'text-base',
        rounded: 'rounded-lg',
    },
    large: {
        paddingX: 'px-6',
        paddingY: 'py-4',
        textSize: 'text-lg',
        rounded: 'rounded-lg',
    },
    xlarge: {
        paddingX: 'px-8',
        paddingY: 'py-5',
        textSize: 'text-xl',
        rounded: 'rounded-xl',
    },
};

const themeConfig: Record<
    ButtonTheme,
    {
        bg: string;
        border: string;
        text: string;
        pressedBg?: string;
        disabledBg?: string;
        disabledText?: string;
    }
> = {
    primary: {
        bg: `bg-[${COLORS.primary}]`,
        border: `border-[${COLORS.primary}]`,
        text: 'text-white',
        pressedBg: 'bg-[#d02647]',
        disabledBg: 'bg-[#f59db3]',
    },
    action: {
        bg: `bg-[${COLORS.action}]`,
        border: `border-[${COLORS.action}]`,
        text: 'text-white',
        pressedBg: 'bg-[#0077cc]',
        disabledBg: 'bg-[#7fc7fa]',
    },
    light: {
        bg: `bg-[${COLORS.light}]`,
        border: `border-[${COLORS.light}]`,
        text: 'text-black',
        pressedBg: 'bg-[#e0e0e0]',
        disabledBg: 'bg-[#f8f8f8]',
    },
    'primary-outlined': {
        bg: 'bg-transparent',
        border: `border-[${COLORS.primary}]`,
        text: `text-[${COLORS.primary}]`,
        pressedBg: 'bg-[#fef0f3]',
        disabledBg: 'bg-transparent',
        disabledText: 'text-[#f59db3]',
    },
    'action-outlined': {
        bg: 'bg-transparent',
        border: `border-[${COLORS.action}]`,
        text: `text-[${COLORS.action}]`,
        pressedBg: 'bg-[#e6f5ff]',
        disabledBg: 'bg-transparent',
        disabledText: 'text-[#7fc7fa]',
    },
    'light-outlined': {
        bg: 'bg-transparent',
        border: `border-[${COLORS.gray}]`,
        text: 'text-gray-800',
        pressedBg: 'bg-[#f8f8f8]',
        disabledBg: 'bg-transparent',
        disabledText: 'text-gray-400',
    },
};

export function Button({
    title,
    onPress,
    theme = 'primary-outlined',
    size = 'medium',
    disabled = false,
    loading = false,
    full = false,
    style,
    ...rest
}: ButtonProps) {
    const isDisabled = disabled || loading;
    const safeTheme = themeConfig[theme] ? theme : 'primary';
    const themeStyles = themeConfig[safeTheme];
    const sizeStyles = sizeConfig[size];

    const getSpinnerColor = (): string => {
        if (safeTheme.includes('outlined')) {
            if (safeTheme === 'primary-outlined') return COLORS.primary;
            if (safeTheme === 'action-outlined') return COLORS.action;
            return COLORS.gray;
        }
        return safeTheme === 'light' ? COLORS.black : COLORS.white;
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                tw.style(
                    'flex-row items-center justify-center border-[1px]',
                    sizeStyles.paddingX,
                    sizeStyles.paddingY,
                    sizeStyles.rounded,
                    themeStyles.bg,
                    themeStyles.border,
                    pressed && !isDisabled && themeStyles.pressedBg,
                    isDisabled && themeStyles.disabledBg,
                    isDisabled && 'opacity-60',
                    full && 'flex-1',
                ),
                style,
            ]}
            {...rest}>
            {loading ? (
                <ActivityIndicator size="small" color={getSpinnerColor()} />
            ) : (
                <Text
                    style={tw.style(
                        'font-semibold tracking-wide',
                        sizeStyles.textSize,
                        themeStyles.text,
                        isDisabled && themeStyles.disabledText,
                    )}>
                    {title}
                </Text>
            )}
        </Pressable>
    );
}
