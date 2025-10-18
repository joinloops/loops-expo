import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Link } from 'expo-router';
import { View } from 'react-native';
import tw from 'twrnc';

export default function OnboardingFirstScreen() {
    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Onboarding Screen 1
            </AppText>
            <Link asChild push href="/onboarding/final">
                <Button title="Go to screen 2" />
            </Link>
        </View>
    );
}
