import Avatar from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { openBrowser } from '@/utils/requests';
import { shareContent } from '@/utils/sharer';
import { prettyCount } from '@/utils/ui';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import tw from 'twrnc';
import ExpandableBio from './ExpandableBio';

function Stat({ count, label, precision = 0 }) {
    return (
        <YStack alignItems="start">
            <StackText
                fontSize="$5"
                fontWeight="bold"
                textColor="text-black dark:text-white"
                lineHeight={1}
                numberOfLines={1}
                style={tw`-mb-1`}>
                {prettyCount(count || 0, { precision })}
            </StackText>
            <StackText fontSize="$2" textColor="text-gray-500 dark:text-gray-400" lineHeight={1}>
                {label}
            </StackText>
        </YStack>
    );
}

export default function AccountHeader(props) {
    const { colorScheme } = useTheme();

    const isOwner = props?.is_owner || props.user?.is_owner;

    const state = props?.userState;

    const handleShare = async () => {
        try {
            await shareContent({
                message: `Check out my account on Loops!`,
                url: props.user?.url,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const openLink = async (path) => {
        await openBrowser(path, { presentationStyle: 'popover', showTitle: false });
    };

    return (
        <YStack padding="$3" gap="$3">
            <XStack
                alignItems="center"
                justifyContent="between"
                gap="$3"
                width="100%"
                paddingHorizontal="$3">
                <YStack gap="$3" style={tw`flex-1`}>
                    <YStack>
                        <StackText
                            fontWeight="bold"
                            fontSize="$7"
                            textColor="text-black dark:text-white"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={tw`flex-shrink`}>
                            {props.user?.name || 'User'}
                        </StackText>
                        <StackText fontSize="$2" textColor="text-gray-500 dark:text-gray-400">
                            {props.user?.username ? '@' + props.user?.username : ''}
                        </StackText>
                    </YStack>

                    <XStack alignItems="center" gap="$6">
                        {props.user?.id ? (
                            <Link
                                href={`/private/profile/followers/${props.user?.id}?username=${props.user?.username}&followersCount=${props.user?.follower_count}&followingCount=${props.user?.following_count}`}
                                asChild>
                                <Pressable>
                                    <Stat
                                        count={props.user?.following_count}
                                        label="Following"
                                        precision={props.user?.following_count > 1000 ? 1 : 0}
                                    />
                                </Pressable>
                            </Link>
                        ) : (
                            <Stat
                                count={props.user?.following_count}
                                label="Following"
                                precision={props.user?.following_count > 1000 ? 1 : 0}
                            />
                        )}

                        {props.user?.id ? (
                            <Link
                                href={`/private/profile/followers/${props.user?.id}?username=${props.user?.username}&followersCount=${props.user?.follower_count}&followingCount=${props.user?.following_count}`}
                                asChild>
                                <Pressable>
                                    <Stat
                                        count={props.user?.follower_count}
                                        label="Followers"
                                        precision={props.user?.follower_count > 1000 ? 1 : 0}
                                    />
                                </Pressable>
                            </Link>
                        ) : (
                            <Stat
                                count={props.user?.follower_count}
                                label="Followers"
                                precision={props.user?.follower_count > 1000 ? 1 : 0}
                            />
                        )}

                        <View accessible={true}>
                            <Stat
                                count={props.user?.likes_count}
                                label="Likes"
                                precision={props.user?.likes_count > 1000 ? 1 : 0}
                            />
                        </View>
                    </XStack>
                </YStack>

                <Avatar url={props.user?.avatar} theme="xl" />
            </XStack>

            <XStack alignItems="center" gap="$2" width="100%" paddingHorizontal="$3">
                {isOwner ? (
                    props.showActions ? (
                        <>
                            <Link href="/private/settings/account/edit" role="button" asChild>
                                <Button title="Edit profile" theme="light" style={tw`flex-1`} />
                            </Link>
                            <Button
                                title="Share profile"
                                theme="light"
                                onPress={handleShare}
                                style={tw`flex-1`}
                            />
                        </>
                    ) : null
                ) : (
                    <>
                        {state?.blocking ? (
                            <Button
                                title="Unblock"
                                theme="primary"
                                loading={!state}
                                onPress={props.onUnblockPress}
                                style={tw`flex-1`}
                            />
                        ) : (
                            <>
                                <Button
                                    title={
                                        state?.following && state?.followed_by
                                            ? 'Friends'
                                            : state?.following
                                              ? 'Following'
                                              : state?.followed_by
                                                ? 'Follow back'
                                                : 'Follow'
                                    }
                                    theme={state?.following ? 'light' : 'primary'}
                                    loading={!state}
                                    onPress={props.onFollowPress}
                                    style={tw`flex-1`}
                                />
                                {props.onMessagePress && props.user?.accepts_dms && (
                                    <Button
                                        title="Message"
                                        theme="light"
                                        onPress={props.onMessagePress}
                                        loading={props.messageLoading}
                                        accessibilityLabel="Message"
                                        accessibilityHint="Send a direct message to this account"
                                        accessibilityRole="button"
                                        style={tw`flex-1`}
                                    />
                                )}
                            </>
                        )}

                        <Button
                            onPress={props.onMenuPress}
                            theme="light"
                            accessibilityLabel="More options"
                            accessibilityHint="To share, block, or report this profile"
                            accessibilityRole="button"
                            title={
                                <MaterialIcons
                                    name="keyboard-arrow-down"
                                    size={26}
                                    color={colorScheme === 'dark' ? '#ccc' : '#333'}
                                />
                            }></Button>
                    </>
                )}
            </XStack>

            {props.user?.bio && props.user?.bio?.length ? (
                <XStack width="100%" paddingHorizontal="$3">
                    <ExpandableBio bio={props.user?.bio} />
                </XStack>
            ) : null}

            {isOwner && props.user?.bio?.length === 0 && (
                <XStack width="100%" paddingHorizontal="$3">
                    <Button
                        theme="light"
                        size="small"
                        title="Add bio"
                        onPress={props.onEditBio}
                        style={tw`px-10 py-1 rounded-2xl`}></Button>
                </XStack>
            )}

            {props.user?.links && props.user?.links?.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 12,
                    }}>
                    {props.user?.links?.slice(0, 4).map((link, index) => (
                        <Pressable
                            key={index}
                            onPress={() => openLink(link.link)}
                            style={tw`bg-gray-100 dark:bg-gray-800 p-1 rounded-xl px-3`}>
                            <XStack gap="$1" alignItems="center">
                                <Ionicons
                                    name="link"
                                    size={14}
                                    color="#fb2c36"
                                    style={{ transform: [{ rotate: '-40deg' }] }}
                                />
                                <StackText
                                    fontSize="$2"
                                    fontWeight="semibold"
                                    textColor="text-gray-600 dark:text-gray-300"
                                    textDecorationLine="underline">
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
