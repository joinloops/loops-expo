import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Switch, Text, View } from 'react-native';
import tw from 'twrnc';
import { XStack, YStack } from '../ui/Stack';

export const SettingsItem = ({ icon, label, onPress, showChevron = true }) => {
    const { colorScheme } = useTheme();
    const iconColor = colorScheme === 'dark' ? '#fff' : '#6b7280';
    const chevronColor = colorScheme === 'dark' ? '#9ca3af' : '#999';

    return (
        <PressableHaptics
            onPress={onPress}
            accessibilityLabel={label}
            accessibilityRole="button"
            style={({ pressed }) => [
                tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`,
                pressed && tw`bg-gray-50 dark:bg-gray-800`,
            ]}>
            <Ionicons name={icon} size={24} color={iconColor} style={tw`mr-4`} />
            <Text style={tw`flex-1 text-base font-medium text-gray-900 dark:text-white`}>
                {label}
            </Text>
            {showChevron && <Ionicons name="chevron-forward" size={20} color={chevronColor} />}
        </PressableHaptics>
    );
};

export const SectionHeader = ({ title }) => (
    <View style={tw`px-5 py-2 bg-gray-50 dark:bg-black`}>
        <Text style={tw`text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase`}>
            {title}
        </Text>
    </View>
);

export const Divider = () => <View style={tw`h-px bg-gray-200 dark:bg-gray-800`} />;

export const SettingsToggleItem = ({ icon, label, value, onValueChange }) => {
    const { colorScheme } = useTheme();
    const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

    return (
        <View style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
            <Ionicons name={icon} size={24} color={iconColor} style={tw`mr-4`} />
            <Text style={tw`flex-1 text-base font-medium text-gray-900 dark:text-white`}>
                {label}
            </Text>
            <Switch value={value} onValueChange={onValueChange} ios_backgroundColor="#ccc" />
        </View>
    );
};

export const SettingsToggleItemDescription = ({
    icon,
    label,
    description,
    value,
    onValueChange,
}) => {
    const { colorScheme } = useTheme();
    const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

    return (
        <View style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
            <XStack flex={1}>
                <YStack flex={1}>
                    <XStack style={tw`mt-1`}>
                        {icon && (
                            <Ionicons name={icon} size={24} color={iconColor} style={tw`mr-4`} />
                        )}
                        <YStack>
                            <Text
                                style={tw`flex-1 text-base font-medium text-gray-900 dark:text-white`}>
                                {label}
                            </Text>
                            <Text style={tw`flex-1 mt-3 text-sm text-gray-500 dark:text-gray-400`}>
                                {description}
                            </Text>
                        </YStack>
                    </XStack>
                </YStack>
                <Switch value={value} onValueChange={onValueChange} ios_backgroundColor="#ccc" />
            </XStack>
        </View>
    );
};

export const SettingsStatusItem = ({
    icon,
    label,
    isActive,
    onPress,
    activeIcon = 'checkmark-circle',
    activeIconColor = '#10b981',
    inactiveText = 'Setup',
    showChevronWhenInactive = true,
}) => {
    const { colorScheme } = useTheme();
    const iconColor = colorScheme === 'dark' ? '#fff' : '#333';
    const chevronColor = colorScheme === 'dark' ? '#9ca3af' : '#999';
    const inactiveTextColor = colorScheme === 'dark' ? '#9ca3af' : '#4b5563';

    const content = (
        <View style={tw`flex-row items-center py-4 px-5 bg-white dark:bg-black`}>
            <Ionicons name={icon} size={24} color={iconColor} style={tw`mr-4`} />
            <Text style={tw`flex-1 text-base font-medium text-gray-900 dark:text-white`}>
                {label}
            </Text>

            {isActive ? (
                <Ionicons name={activeIcon} size={24} color={activeIconColor} />
            ) : (
                <View style={tw`flex-row items-center`}>
                    <Text style={[tw`text-base mr-1`, { color: inactiveTextColor }]}>
                        {inactiveText}
                    </Text>
                    {showChevronWhenInactive && (
                        <Ionicons name="chevron-forward" size={20} color={chevronColor} />
                    )}
                </View>
            )}
        </View>
    );

    if (!isActive && onPress) {
        return (
            <PressableHaptics
                onPress={onPress}
                style={({ pressed }) => [pressed && tw`bg-gray-50 dark:bg-gray-800`]}>
                {content}
            </PressableHaptics>
        );
    }

    return content;
};
