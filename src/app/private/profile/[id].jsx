import AccountHeader from '@/components/profile/AccountHeader';
import AccountTabs from '@/components/profile/AccountTabs';
import VideoGrid from '@/components/profile/VideoGrid';
import { StackText, YStack } from '@/components/ui/Stack';
import { fetchAccount, fetchAccountState, fetchUserVideos } from '@/utils/requests';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import tw from 'twrnc';

export default function ProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('videos');

    const { data: user, isLoading: userLoading } = useQuery({
        queryKey: ['fetchAccount', id.toString()],
        queryFn: async () => {
            const res = await fetchAccount(id.toString());
            return res.data;
        },
    });

    const { data: userState } = useQuery({
        queryKey: ['fetchAccountState', id.toString()],
        queryFn: async () => {
            const res = await fetchAccountState(id.toString());
            return res.data;
        },
        enabled: !!user,
    });

    const { data: videos, isLoading: videosLoading } = useQuery({
        queryKey: ['userVideos', id.toString(), activeTab],
        queryFn: async () => {
            const res = await fetchUserVideos(id.toString(), activeTab);
            return res.data;
        },
        enabled: !!user,
    });

    const handleVideoPress = (video) => {
        router.push(`/private/video/${video.id}`);
    };

    const renderEmpty = () => (
        <YStack paddingY="$8" alignItems="center" justifyContent="center">
            <StackText fontSize="$4" color="#86878B">
                {activeTab === 'videos' && 'No videos yet'}
                {activeTab === 'favorites' && 'No favorites yet'}
                {activeTab === 'reblogs' && 'No reblogs yet'}
            </StackText>
        </YStack>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Profile',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#000',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        color: '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    headerShown: true,
                    headerTitle: user?.name ? `${user.name}` : 'Profile',
                }}
            />

            <FlatList
                data={videos || []}
                numColumns={3}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <>
                        <AccountHeader user={user} userState={userState} />
                        <AccountTabs activeTab={activeTab} onTabChange={setActiveTab} />
                    </>
                }
                renderItem={({ item }) => <VideoGrid video={item} onPress={handleVideoPress} />}
                ListEmptyComponent={
                    videosLoading ? (
                        <YStack paddingY="$8" alignItems="center">
                            <ActivityIndicator size="large" color="#FE2C55" />
                        </YStack>
                    ) : (
                        renderEmpty()
                    )
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    flexGrow: 1,
                }}
            />
        </View>
    );
}
