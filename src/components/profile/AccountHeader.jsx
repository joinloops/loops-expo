import Avatar from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { prettyCount } from '@/utils/ui';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

export default function AccountHeader(props) {
    const isOwner = props.user?.is_owner;

    const state = props?.userState;

    return (
        <YStack paddingX="$5" paddingY="$3" alignItems="center" gap="$3" bg="white">
            <Avatar url={props.user?.avatar} theme="xl" />

            <XStack gap="$2" alignItems="center">
                <StackText fontWeight="bold" fontSize="$6">
                    {props.user?.username ? '@' + props.user?.username : ''}
                </StackText>
            </XStack>

            <XStack justifyContent="center" alignItems="center" gap="$8">
                <Pressable>
                    <YStack justifyContent="center" alignItems="center">
                        <StackText fontSize="$5" fontWeight="bold">
                            { prettyCount(props.user?.post_count || 0)}
                        </StackText>
                        <StackText fontSize="$3" color="#86878B">
                            Videos
                        </StackText>
                    </YStack>
                </Pressable>

                <Link href={`/private/profile/followers/${props.user?.id}`} asChild>
                    <Pressable>
                        <YStack justifyContent="center" alignItems="center">
                            <StackText fontSize="$5" fontWeight="bold">
                                {prettyCount(props.user?.follower_count, {precision: props.user?.follower_count > 1000 ? 1 : 0})}
                            </StackText>
                            <StackText fontSize="$3" color="#86878B">
                                Followers
                            </StackText>
                        </YStack>
                    </Pressable>
                </Link>

                <YStack justifyContent="center" alignItems="center">
                    <StackText fontSize="$5" fontWeight="bold">
                        {prettyCount(props.user?.likes_count, {precision: props.user?.likes_count > 1000 ? 1 : 0})}
                    </StackText>
                    <StackText fontSize="$3" color="#86878B">
                        Likes
                    </StackText>
                </YStack>
            </XStack>

            <XStack gap="$2" width="100%" paddingHorizontal="$3">
                {isOwner ? (
                    <>
                        <Link href="/private/settings/account/edit" asChild style={{ flex: 1 }}>
                            <Button title="Edit Profile" />
                        </Link>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            { state?.blocking && (
                                <Button
                                    title={'Unblock'}
                                    variant={'danger'}
                                    onPress={props.onUnblockPress}
                                />
                            )}
                            { !state?.blocking && (<Button
                                title={state?.following ? 'Following' : 'Follow'}
                                variant={state?.following ? 'secondary' : 'primary'}
                                onPress={props.onFollowPress}
                            />
                            )}
                        </View>

                        <Pressable
                            onPress={props.onMenuPress}
                            style={{
                                borderWidth: 1,
                                borderColor: '#E5E5E5',
                                borderRadius: 4,
                                padding: 10,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <MaterialIcons name="keyboard-arrow-down" size={20} color="black" />
                        </Pressable>
                    </>
                )}
            </XStack>

            {props.user?.bio && (
                <View style={{ paddingHorizontal: 20 }}>
                    <StackText fontSize="$2" textAlign="center" fontWeight="500" color="#161823">
                        {props.user?.bio}
                    </StackText>
                </View>
            )}

            {props.user?.link && (
                <Link href={props.user?.link} asChild>
                    <Pressable>
                        <XStack gap="$1" alignItems="center">
                            <Ionicons name="link" size={14} color="#86878B" />
                            <StackText fontSize="$2" color="#86878B" textDecorationLine="underline">
                                {props.user?.link.replace(/^https?:\/\//, '')}
                            </StackText>
                        </XStack>
                    </Pressable>
                </Link>
            )}
        </YStack>
    );
}
