import Avatar from '@/components/Avatar';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import tw from 'twrnc';

export default function AccountListItem(props) {
    return (
        <View style={tw.style('p-3 border border-gray-300')}>
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
                <XStack alignItems="center" gap="$3">
                    <Link href={`/private/profile/${props.item?.id.toString()}`}>
                        <Avatar url={props.item?.avatar} />
                    </Link>
                    <YStack>
                        <StackText fontSize="$3" fontWeight="bold">
                            @{props.item?.username}
                        </StackText>
                        <StackText fontSize="$2" secondary={true}>
                            {props.item?.name}
                        </StackText>
                    </YStack>
                </XStack>

                <Link href={`/private/profile/${props.item?.id.toString()}`} asChild>
                    <Pressable>
                        <StackText fontWeight="bold" px="$3" color="$blue9">
                            View
                        </StackText>
                    </Pressable>
                </Link>
            </XStack>
        </View>
    );
}
