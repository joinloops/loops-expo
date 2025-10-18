import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/utils/authStore';
import { View } from 'react-native';
import tw from 'twrnc';

export default function OnboardingFinalScreen() {
    const { completeOnboarding } = useAuthStore();

    return (
        <View style={tw`justify-center flex-1 p-4`}>
            <AppText center size="heading">
                Onboarding Screen 2
            </AppText>
            <Button title="Complete onboarding" onPress={completeOnboarding} />
        </View>
    );
}
