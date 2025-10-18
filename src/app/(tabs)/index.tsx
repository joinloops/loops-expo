import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Link } from 'expo-router';
import { View } from 'react-native';
import tw from 'twrnc';

export default function IndexScreen() {
    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Home Screen
            </AppText>
            <Link asChild push href="/modal">
                <Button title="Open modal" />
            </Link>
        </View>
    );
}
