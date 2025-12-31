import Avatar from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { openBrowser } from '@/utils/requests';
import { shareContent } from '@/utils/sharer';
import { prettyCount } from '@/utils/ui';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import tw from 'twrnc';

export default function AccountHeader(props) {
    const isOwner = props?.is_owner || props.user?.is_owner;

    const state = props?.userState;

    const handleShare = async () => {
        try {
            await shareContent({
                message: `Check out my account on Loops!`,
                url: props.user?.url
            })
        } catch (error) {
            console.error('Share error:', error);
        }
    }

    const openLink = async (path) => {
        await openBrowser(path, { presentationStyle: 'popover', showTitle: false})
    }

    return (
        <YStack paddingX="$5" paddingY="$3" alignItems="center" gap="$3" bg="white">
            <Avatar url={props.user?.avatar} theme="xl" />

            <XStack gap="$2" alignItems="center">
                <StackText fontWeight="bold" fontSize="$6">
                    {props.user?.username ? '@' + props.user?.username : ''}
                </StackText>
            </XStack>

            <XStack justifyContent="center" alignItems="center" gap="$10">
                <Pressable>
                    <YStack justifyContent="center" alignItems="center">
                        <StackText fontSize="$5" fontWeight="bold">
                            { prettyCount(props.user?.post_count || 0)}
                        </StackText>
                        <StackText fontSize="$2" textColor="text-gray-500">
                            Videos
                        </StackText>
                    </YStack>
                </Pressable>

                { props.user?.id ? (<Link href={`/private/profile/followers/${props.user?.id}?username=${props.user?.username}&followersCount=${props.user?.follower_count}&followingCount=${props.user?.following_count}`} asChild>
                    <Pressable>
                        <YStack justifyContent="center" alignItems="center">
                            <StackText fontSize="$5" fontWeight="bold">
                                {prettyCount(props.user?.follower_count, {precision: props.user?.follower_count > 1000 ? 1 : 0})}
                            </StackText>
                            <StackText fontSize="$2" textColor="text-gray-500">
                                Followers
                            </StackText>
                        </YStack>
                    </Pressable>
                </Link>) : (
                    <YStack justifyContent="center" alignItems="center">
                        <StackText fontSize="$5" fontWeight="bold">
                            {prettyCount(props.user?.follower_count, {precision: props.user?.follower_count > 1000 ? 1 : 0})}
                        </StackText>
                        <StackText fontSize="$2" textColor="text-gray-500">
                            Followers
                        </StackText>
                    </YStack>
                )}

                <View accessible={true}>
                    <YStack justifyContent="center" alignItems="center">
                        <StackText fontSize="$5" fontWeight="bold">
                            {prettyCount(props.user?.likes_count, {precision: props.user?.likes_count > 1000 ? 1 : 0})}
                        </StackText>
                        <StackText fontSize="$2" textColor="text-gray-500">
                            Likes
                        </StackText>
                    </YStack>
                </View>
            </XStack>

            <XStack gap="$2" width="100%" paddingHorizontal="$3">
                {isOwner ? (
                    props.showActions ? <>
                    <XStack flex={1} justifyContent='center' alignItems='center' gap="$4">

                        <Link href="/private/settings/account/edit" role="button" asChild>
                            <Button title="Edit profile" theme="light" />
                        </Link>
                        <Button title="Share profile" theme="light" onPress={handleShare}  />
                    </XStack>
                    </> : null
                ) : (
                    <XStack flex={1} justifyContent='center' alignItems='center' gap="$3">
                        <View>
                            { state?.blocking && (
                                <Button
                                    title={'Unblock'}
                                    theme={'danger'}
                                    loading={!state}
                                    onPress={props.onUnblockPress}
                                    style={tw`px-10`}
                                />
                            )}
                            { !state?.blocking && (<Button
                                title={state?.following ? 'Following' : 'Follow'}
                                theme={state?.following ? 'primary-outlined' : 'primary'}
                                loading={!state}
                                style={tw`px-10`}
                                onPress={props.onFollowPress}
                            />
                            )}
                        </View>

                        <Button
                            onPress={props.onMenuPress}
                            theme="light"
                            accessibilityLabel="More options"
                            accessibilityHint="To share, block, or report this profile"
                            accessibilityRole="button"
                            title={<MaterialIcons name="keyboard-arrow-down" size={26} color="#333" />}>
                        </Button>
                    </XStack>
                )}
            </XStack>

            {props.user?.bio && props.user?.bio?.length && (
                <View accessible={true} accessibilityLabel={`Profile biography: ${props.user?.bio}`} style={{ paddingHorizontal: 20 }}>
                    <StackText fontSize="$2" textAlign="center" fontWeight="500" color="#161823">
                        {props.user?.bio}
                    </StackText>
                </View>
            )}

            { isOwner && props.user?.bio?.length === 0 && (
                <Button theme="light" size="small" title="Add bio" onPress={props.onEditBio} style={tw`px-10 py-1 rounded-2xl`}></Button>
            )}

            {props.user?.links && props.user?.links?.length > 0 && (
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: 10,
                        paddingHorizontal: 20 
                    }}
                >
                    {props.user?.links?.slice(0, 4).map((link, index) => (
                        <Pressable key={index} onPress={() => openLink(link.link)} style={tw`bg-gray-100 p-1 rounded-xl px-3`}>
                            <XStack gap="$1" alignItems="center">
                                <Ionicons name="link" size={14} color="#fb2c36" style={{ transform: [{ rotate: '-40deg' }] }} />
                                <StackText fontSize="$2" fontWeight="semibold" color="#86878B" textDecorationLine="underline">
                                    {link?.url?.replace(/^https?:\/\//, '')}
                                </StackText>
                            </XStack>
                        </Pressable>
                    ))}
                </ScrollView>
            )}
        </YStack>
    );
}
