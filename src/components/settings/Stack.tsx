import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import tw from 'twrnc';

export const SettingsItem = ({ icon, label, onPress, showChevron = true }) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            tw`flex-row items-center py-4 px-5 bg-white`,
            pressed && tw`bg-gray-50`,
        ]}>
        <Ionicons name={icon} size={24} color="#333" style={tw`mr-4`} />
        <Text style={tw`flex-1 text-base font-medium text-gray-900`}>{label}</Text>
        {showChevron && <Ionicons name="chevron-forward" size={20} color="#999" />}
    </Pressable>
);

export const SectionHeader = ({ title }) => (
    <View style={tw`px-5 py-2 bg-gray-50`}>
        <Text style={tw`text-sm font-semibold text-gray-500 uppercase`}>{title}</Text>
    </View>
);

export const Divider = () => <View style={tw`h-px bg-gray-200 ml-14`} />;

export const SettingsToggleItem = ({ icon, label, value, onValueChange }) => (
    <View style={tw`flex-row items-center py-4 px-5 bg-white`}>
        <Ionicons name={icon} size={24} color="#333" style={tw`mr-4`} />
        <Text style={tw`flex-1 text-base font-medium text-gray-900`}>{label}</Text>
        <Switch value={value} onValueChange={onValueChange} />
    </View>
);
