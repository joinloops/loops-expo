import Avatar from '@/components/Avatar';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useAuthStore } from '@/utils/authStore';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import tw from 'twrnc';

export default function AccountListItem(props) {
    const { user } = useAuthStore();

    return (
        <View style={tw`px-4 py-3`}>
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
                <XStack alignItems="center" gap="$3" flex={1}>
                    <Link href={`/private/profile/${props.item?.id.toString()}`}>
                        <Avatar url={props.item?.avatar} width={60} />
                    </Link>
                    <YStack flex={1}>
                        <XStack alignItems="center" gap="$1">
                            <StackText fontSize="$4" fontWeight={600} numberOfLines={1}>
                                {props.item?.name || props.item?.username}
                            </StackText>
                        
                        </XStack>
                        <StackText fontSize="$3" style={tw`text-gray-500`} numberOfLines={1}>
                            {props.item?.username}
                        </StackText>
                    </YStack>
                </XStack>

                { props?.item.id == user.id ? (<Pressable 
                    style={tw`bg-gray-200 px-6 py-2 rounded-lg`}
                    onPress={() => {
                        console.log('Toggle unfollow for', props.item?.id);
                    }}
                >
                    <Text style={tw`font-semibold text-black text-sm`}>
                        View
                    </Text>
                </Pressable>) : 
                props.item?.is_following == true ? 
                (<Pressable 
                    style={tw`bg-gray-200 px-6 py-2 rounded-lg`}
                    onPress={() => {
                        console.log('Toggle unfollow for', props.item?.id);
                    }}
                >
                    <Text style={tw`font-semibold text-black text-sm`}>
                        Following
                    </Text>
                </Pressable>) : 
                (<Pressable 
                    style={tw`bg-[#F02C56] px-6 py-2 rounded-lg`}
                    onPress={() => {
                        // Handle follow/unfollow action
                        console.log('Toggle follow for', props.item?.id);
                    }}
                >
                    <Text style={tw`font-semibold text-white text-sm`}>
                        Follow
                    </Text>
                </Pressable>)}
            </XStack>
        </View>
    );
}