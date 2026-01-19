import {
    Divider,
    SectionHeader,
    SettingsItem,
    SettingsStatusItem,
} from '@/components/settings/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchAccountSecurityConfig, openLocalLink } from '@/utils/requests';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import * as MediaLibrary from 'expo-media-library';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import tw from 'twrnc';

export default function SecurityScreen() {
    const router = useRouter();
    const [twoFactor, setTwoFactor] = useState(false);
    const { colorScheme } = useTheme();

    const [cameraPermission, setCameraPermission] = useState(null);
    const [microphonePermission, setMicrophonePermission] = useState(null);
    const [photosPermission, setPhotosPermission] = useState(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['securitySettings'],
        queryFn: fetchAccountSecurityConfig,
    });

    useEffect(() => {
        if (data?.data?.two_factor_enabled !== undefined) {
            setTwoFactor(data.data.two_factor_enabled);
        }
    }, [data]);

    const handleTwoFactorSetup = async () => {
        await openLocalLink('/dashboard/account/security');
    };

    const checkPermissions = async () => {
        const cameraStatus = await Camera.getCameraPermissionStatus();
        const microphoneStatus = await Camera.getMicrophonePermissionStatus();
        const mediaLibrary = await MediaLibrary.getPermissionsAsync();

        setCameraPermission(cameraStatus);
        setMicrophonePermission(microphoneStatus);
        setPhotosPermission(mediaLibrary.status);
    };

    useFocusEffect(
        useCallback(() => {
            checkPermissions();
        }, []),
    );

    const openAppSettings = () => {
        Alert.alert(
            'Permission Required',
            'This permission has been denied. Please enable it in your device settings.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Settings',
                    onPress: () => Linking.openSettings(),
                },
            ],
        );
    };

    const handleCameraPermission = async () => {
        if (cameraPermission === 'granted') {
            openAppSettings();
            return;
        }

        if (cameraPermission === 'denied' || cameraPermission === 'restricted') {
            openAppSettings();
            return;
        }

        const status = await Camera.requestCameraPermission();
        setCameraPermission(status);

        if (status === 'denied') {
            openAppSettings();
        }
    };

    const handleMicrophonePermission = async () => {
        if (microphonePermission === 'granted') {
            openAppSettings();
            return;
        }

        if (microphonePermission === 'denied' || microphonePermission === 'restricted') {
            openAppSettings();
            return;
        }

        const status = await Camera.requestMicrophonePermission();
        setMicrophonePermission(status);

        if (status === 'denied') {
            openAppSettings();
        }
    };

    const handlePhotosPermission = async () => {
        if (photosPermission === 'granted') {
            openAppSettings();
            return;
        }

        if (photosPermission === 'denied') {
            openAppSettings();
            return;
        }

        const { status } = await MediaLibrary.requestPermissionsAsync();
        setPhotosPermission(status);

        if (status === 'denied') {
            openAppSettings();
        }
    };

    const getPermissionLabel = (status) => {
        if (!status) return 'Checking...';

        switch (status) {
            case 'granted':
                return null;
            case 'denied':
            case 'restricted':
                return 'Denied';
            case 'not-determined':
                return 'Allow';
            default:
                return 'Unknown';
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-100 dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Security & permissions',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <SectionHeader title="Security" />
                <SettingsItem
                    icon="key-outline"
                    label="Change password"
                    onPress={() => router.push('/private/settings/security/password')}
                />
                <Divider />
                <SettingsStatusItem
                    icon="shield-outline"
                    label="Two-factor authentication"
                    isActive={twoFactor}
                    onPress={handleTwoFactorSetup}
                />

                <SectionHeader title="App Permissions" />
                <SettingsStatusItem
                    icon="camera-outline"
                    label="Camera"
                    isActive={cameraPermission === 'granted'}
                    inactiveText={getPermissionLabel(cameraPermission)}
                    onPress={handleCameraPermission}
                    activeIconColor="#10b981"
                />
                <Divider />
                <SettingsStatusItem
                    icon="mic-outline"
                    label="Microphone"
                    isActive={microphonePermission === 'granted'}
                    inactiveText={getPermissionLabel(microphonePermission)}
                    onPress={handleMicrophonePermission}
                    activeIconColor="#10b981"
                />
                <Divider />
                <SettingsStatusItem
                    icon="images-outline"
                    label="Media Library"
                    isActive={photosPermission === 'granted'}
                    inactiveText={getPermissionLabel(photosPermission)}
                    onPress={handlePhotosPermission}
                    activeIconColor="#10b981"
                />
            </ScrollView>
        </View>
    );
}
