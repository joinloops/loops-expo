import Avatar from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
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
                {props.user?.is_verified && (
                    <Ionicons name="checkmark-circle" size={20} color="#20D5EC" />
                )}
            </XStack>

            <XStack justifyContent="center" alignItems="center" gap="$8">
                <Link href={`/private/profile/following/${props.user?.id}`} asChild>
                    <Pressable>
                        <YStack justifyContent="center" alignItems="center">
                            <StackText fontSize="$5" fontWeight="bold">
                                {props.user?.post_count || 0}
                            </StackText>
                            <StackText fontSize="$3" color="#86878B">
                                Videos
                            </StackText>
                        </YStack>
                    </Pressable>
                </Link>

                <Link href={`/private/profile/followers/${props.user?.id}`} asChild>
                    <Pressable>
                        <YStack justifyContent="center" alignItems="center">
                            <StackText fontSize="$5" fontWeight="bold">
                                {props.user?.follower_count}
                            </StackText>
                            <StackText fontSize="$3" color="#86878B">
                                Followers
                            </StackText>
                        </YStack>
                    </Pressable>
                </Link>

                <YStack justifyContent="center" alignItems="center">
                    <StackText fontSize="$5" fontWeight="bold">
                        {props.user?.likes_count || 0}
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
                        <Link href="/settings/share-profile" asChild style={{ flex: 1 }}>
                            <Button title="Share Profile" variant="secondary" />
                        </Link>
                    </>
                ) : (
                    <>
                        <View style={{ flex: 1 }}>
                            <Button
                                title={state?.following ? 'Following' : 'Follow'}
                                variant={state?.following ? 'secondary' : 'primary'}
                                onPress={props.onFollowPress}
                            />
                        </View>

                        {state?.following && (
                            <Link
                                href={`/private/messages/${props.user?.id}`}
                                asChild
                                style={{ flex: 1 }}>
                                <Button title="Message" variant="secondary" icon="mail-outline" />
                            </Link>
                        )}

                        <Pressable
                            onPress={props.onUserIconPress}
                            style={{
                                borderWidth: 1,
                                borderColor: '#E5E5E5',
                                borderRadius: 4,
                                padding: 10,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <Ionicons name="person-add-outline" size={20} color="black" />
                        </Pressable>

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
