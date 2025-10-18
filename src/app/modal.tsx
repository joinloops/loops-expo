import { AppText } from '@/components/AppText';
import { View } from 'react-native';
import tw from 'twrnc';

export default function ModalScreenScreen() {
    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Modal Screen
            </AppText>
        </View>
    );
}
