import { StackText } from '@/components/ui/Stack';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import tw from 'twrnc';

export default function VideoScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    return (
        <View style={tw`flex-1 bg-white`}>
            <Stack.Screen
                options={{
                    title: 'Video',
                    headerStyle: { backgroundColor: '#fff' },
                    headerTintColor: '#000',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                        color: '#000',
                    },
                    headerBackTitle: 'Back',
                    headerShadowVisible: false,
                    headerBackTitleVisible: false,
                    headerShown: true,
                    headerTitle: 'Video',
                }}
            />
            <StackText>{id}</StackText>
        </View>
    );
}
