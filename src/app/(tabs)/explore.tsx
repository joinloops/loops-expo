import { AppText } from '@/components/AppText';
import { View } from 'react-native';
import tw from 'twrnc';

export default function Screen() {
    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Explore
            </AppText>
        </View>
    );
}
