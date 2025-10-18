import { SectionHeader } from '@/components/settings/Stack';
import { Storage } from '@/utils/cache';
import { fetchSelfAccount } from '@/utils/requests';
import { truncate } from '@/utils/ui';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import tw from 'twrnc';

const ProfileItem = ({
    label,
    value,
    onPress,
    placeholder,
    showCopy = false,
    showChevron = true,
}) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            tw`flex-row items-center justify-between py-4 px-5 bg-white border-b border-gray-100`,
            pressed && tw`bg-gray-50`,
        ]}>
        <Text style={tw`text-base text-gray-900`}>{label}</Text>
        <View style={tw`flex-row items-center gap-2`}>
            <Text style={[tw`text-base mr-2`, value ? tw`text-gray-900` : tw`text-gray-400`]}>
                {truncate(value || placeholder, 20)}
            </Text>
            {showCopy ? (
                <Ionicons name="copy-outline" size={20} color="#999" />
            ) : showChevron ? (
                <Ionicons name="chevron-forward" size={20} color="#999" />
            ) : (
                <></>
            )}
        </View>
    </Pressable>
);

export default function EditProfileScreen() {
    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['fetchSelfAccount', 'self'],
        queryFn: async () => {
            const res = await fetchSelfAccount();
            return res.data;
        },
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });

    const server = Storage.getString('app.instance');
    const [profileImage, setProfileImage] = useState(user?.avatar);
    const name = user?.name;
    const username = user?.username;
    const bio = user?.bio;

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            // TODO: Handle API mutation 
            setProfileImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your camera');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleChangePhoto = () => {
        Alert.alert('Change photo', 'Choose a photo from your library or take a new one', [
            { text: 'Take photo', onPress: takePhoto },
            { text: 'Choose from library', onPress: pickImage },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const copyProfileUrl = async () => {
        await Clipboard.setStringAsync(`https://${server}/@${username}`);
        Alert.alert('Copied', 'Profile URL copied to clipboard');
    };

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Edit Profile',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Account',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`}>
                <View style={tw`items-center py-8 bg-white`}>
                    <Pressable onPress={handleChangePhoto}>
                        <View style={tw`relative`}>
                            <View
                                style={tw`w-32 h-32 rounded-full bg-gray-200 items-center justify-center overflow-hidden`}>
                                {profileImage ? (
                                    <Image
                                        source={{ uri: profileImage }}
                                        style={tw`w-full h-full`}
                                    />
                                ) : (
                                    <Ionicons name="person" size={60} color="#999" />
                                )}
                            </View>
                            <View
                                style={tw`absolute inset-0 bg-black bg-opacity-40 rounded-full items-center justify-center`}>
                                <Ionicons name="camera" size={32} color="white" />
                            </View>
                        </View>
                    </Pressable>
                    <Pressable onPress={handleChangePhoto}>
                        <Text style={tw`mt-4 text-base text-gray-900`}>Change photo</Text>
                    </Pressable>
                </View>

                <SectionHeader title="About you" />

                <ProfileItem
                    label="Name"
                    value={name}
                    onPress={() =>
                        router.push({
                            pathname: '/private/settings/account/edit-name',
                            params: { name },
                        })
                    }
                />

                <ProfileItem
                    label="Username"
                    value={username}
                    showChevron={false}
                    onPress={() =>
                        Alert.alert('Unsupported', 'Username changes are not supported yet.')
                    }
                />

                <Pressable
                    onPress={copyProfileUrl}
                    style={({ pressed }) => [
                        tw`flex-row items-center justify-end py-3 px-5 bg-white border-b border-gray-100`,
                        pressed && tw`bg-gray-50`,
                    ]}>
                    <Text style={tw`text-sm text-gray-600 mr-2`}>
                        {server}/@{username}
                    </Text>
                    <Ionicons name="copy-outline" size={18} color="#999" />
                </Pressable>

                <ProfileItem
                    label="Bio"
                    value={bio}
                    onPress={() =>
                        router.push({
                            pathname: '/private/settings/account/edit-bio',
                            params: { bio },
                        })
                    }
                />
            </ScrollView>
        </View>
    );
}
