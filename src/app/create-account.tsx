import { AppText } from '@/components/AppText';
import { View } from 'react-native';
import tw from 'twrnc';

export default function CreateAccountScreen() {
    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Create Account Screen
            </AppText>
        </View>
    );
}
