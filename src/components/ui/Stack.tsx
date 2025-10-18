import { useThemeStore } from '@/components/ui/useThemeStore';
import React from 'react';
import { Text, TextStyle, View, ViewProps, ViewStyle } from 'react-native';
import tw from 'twrnc';

type JustifyContent =
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';

type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

type ThemeVariant = 'transparent' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

// Tamagui-style font sizes
type FontSize = '$1' | '$2' | '$3' | '$4' | '$5' | '$6' | '$7' | '$8' | '$9' | '$10';

// Tamagui-style spacing tokens
type SpacingToken = '$1' | '$2' | '$3' | '$4' | '$5' | '$6' | '$7' | '$8' | '$9' | '$10';
type Spacing = number | SpacingToken;

// Font weights
type FontWeight =
    | 'thin'
    | 'light'
    | 'normal'
    | 'medium'
    | 'semibold'
    | 'bold'
    | 'extrabold'
    | 'black'
    | number;

// Text alignment
type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface StackProps extends Omit<ViewProps, 'style'> {
    children?: React.ReactNode;
    justifyContent?: JustifyContent;
    alignItems?: AlignItems;
    gap?: Spacing;
    flexDirection?: FlexDirection;
    theme?: ThemeVariant;
    padding?: Spacing;
    paddingX?: Spacing;
    paddingY?: Spacing;
    rounded?: boolean;
    flex?: number;
    style?: ViewStyle;
}

const justifyContentMap: Record<JustifyContent, string> = {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    center: 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
};

const alignItemsMap: Record<AlignItems, string> = {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    center: 'items-center',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
};

const flexDirectionMap: Record<FlexDirection, string> = {
    row: 'flex-row',
    column: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'column-reverse': 'flex-col-reverse',
};

const fontSizeMap: Record<FontSize, string> = {
    $1: 'text-xs', // ~12px
    $2: 'text-sm', // ~14px
    $3: 'text-base', // ~16px
    $4: 'text-lg', // ~18px
    $5: 'text-xl', // ~20px
    $6: 'text-2xl', // ~24px
    $7: 'text-3xl', // ~30px
    $8: 'text-4xl', // ~36px
    $9: 'text-5xl', // ~48px
    $10: 'text-6xl', // ~60px
};

const spacingMap: Record<SpacingToken, number> = {
    $1: 2, // 8px
    $2: 3, // 12px
    $3: 4, // 16px
    $4: 5, // 20px
    $5: 6, // 24px
    $6: 7, // 28px
    $7: 8, // 32px
    $8: 10, // 40px
    $9: 12, // 48px
    $10: 14, // 56px
};

const fontWeightMap: Record<string, string> = {
    thin: 'font-thin', // 100
    light: 'font-light', // 300
    normal: 'font-normal', // 400
    medium: 'font-medium', // 500
    semibold: 'font-semibold', // 600
    bold: 'font-bold', // 700
    extrabold: 'font-extrabold', // 800
    black: 'font-black', // 900
};

const textAlignMap: Record<TextAlign, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
};

const resolveSpacing = (value: Spacing | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
        return spacingMap[value];
    }
    return value;
};

export const Stack: React.FC<StackProps> = ({
    children,
    justifyContent = 'flex-start',
    alignItems = 'stretch',
    gap = 0,
    flexDirection = 'column',
    theme = 'transparent',
    padding,
    paddingX,
    paddingY,
    rounded = false,
    flex,
    style,
    ...props
}) => {
    const { theme: appTheme } = useThemeStore();

    const classes: string[] = [];

    // Flex direction
    classes.push(flexDirectionMap[flexDirection]);

    // Justify content
    classes.push(justifyContentMap[justifyContent]);

    // Align items
    classes.push(alignItemsMap[alignItems]);

    // Gap (support both number and $token)
    const resolvedGap = resolveSpacing(gap);
    if (resolvedGap && resolvedGap > 0) {
        classes.push(`gap-${resolvedGap}`);
    }

    // Flex
    if (flex !== undefined) {
        classes.push(`flex-${flex}`);
    }

    // Padding (support both number and $token)
    const resolvedPadding = resolveSpacing(padding);
    if (resolvedPadding !== undefined) {
        classes.push(`p-${resolvedPadding}`);
    }

    const resolvedPaddingX = resolveSpacing(paddingX);
    if (resolvedPaddingX !== undefined) {
        classes.push(`px-${resolvedPaddingX}`);
    }

    const resolvedPaddingY = resolveSpacing(paddingY);
    if (resolvedPaddingY !== undefined) {
        classes.push(`py-${resolvedPaddingY}`);
    }

    // Rounded
    if (rounded) {
        classes.push('rounded-lg');
    }

    // Theme
    if (theme !== 'transparent') {
        const themeColors = appTheme[theme];
        classes.push(themeColors.bg);
    }

    return (
        <View style={[tw`${classes.join(' ')}`, style]} {...props}>
            {children}
        </View>
    );
};

export const YStack: React.FC<StackProps> = (props) => {
    return <Stack flexDirection="column" {...props} />;
};

export const XStack: React.FC<StackProps> = (props) => {
    return <Stack flexDirection="row" {...props} />;
};

export interface StackTextProps {
    children: React.ReactNode;
    theme?: ThemeVariant;
    secondary?: boolean;
    fontSize?: FontSize;
    fontWeight?: FontWeight;
    textAlign?: TextAlign;
    textColor?: string;
    lineHeight?: 'none' | 'tight' | 'snug' | 'normal' | 'relaxed' | 'loose';
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    style?: TextStyle;
}

const lineHeightMap: Record<string, string> = {
    none: 'leading-none',
    tight: 'leading-tight',
    snug: 'leading-snug',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
};

export const StackText: React.FC<StackTextProps> = ({
    children,
    theme,
    secondary = false,
    fontSize = '$3', // default to base size
    fontWeight,
    textAlign,
    textColor,
    lineHeight,
    italic = false,
    underline = false,
    strikethrough = false,
    numberOfLines,
    ellipsizeMode,
    style,
}) => {
    const { theme: appTheme } = useThemeStore();

    const classes: string[] = [];

    // Font size (Tamagui style)
    classes.push(fontSizeMap[fontSize]);

    // Text color
    if (textColor) {
        // Custom color provided
        classes.push(textColor);
    } else if (theme && theme !== 'transparent') {
        // Theme-based color
        classes.push(appTheme[theme].text);
    } else {
        // Default text color (primary or secondary)
        classes.push(secondary ? appTheme.textSecondary : appTheme.text);
    }

    // Font weight
    if (fontWeight !== undefined) {
        if (typeof fontWeight === 'string') {
            classes.push(fontWeightMap[fontWeight]);
        } else {
            // If numeric weight provided, use inline style
            // We'll handle this in the style prop
        }
    }

    // Text alignment
    if (textAlign) {
        classes.push(textAlignMap[textAlign]);
    }

    // Line height
    if (lineHeight) {
        classes.push(lineHeightMap[lineHeight]);
    }

    // Text decorations
    if (italic) {
        classes.push('italic');
    }
    if (underline) {
        classes.push('underline');
    }
    if (strikethrough) {
        classes.push('line-through');
    }

    // Build inline styles for numeric font weight
    const inlineStyles: TextStyle = {};
    if (typeof fontWeight === 'number') {
        inlineStyles.fontWeight = String(fontWeight) as any;
    }

    return (
        <Text
            style={[tw`${classes.join(' ')}`, inlineStyles, style]}
            numberOfLines={numberOfLines}
            ellipsizeMode={ellipsizeMode}>
            {children}
        </Text>
    );
};
