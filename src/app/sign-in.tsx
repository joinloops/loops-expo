import { useAuthStore } from '@/utils/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInLeft,
    SlideInRight,
    SlideOutLeft,
    SlideOutRight,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import tw from 'twrnc';

const POPULAR_SERVERS = [
    { label: 'loops.video', value: 'loops.video' },
    // { label: 'loops.one', value: 'loops.one' },
    { label: 'Other…', value: 'other' },
];

type FlowStep =
    | 'initial'
    | 'signin-server'
    | 'signin-custom-url';

export default function SignInScreen() {
    const loginWithOAuth = useAuthStore((state) => state.loginWithOAuth);

    const [currentStep, setCurrentStep] = useState<FlowStep>('initial');
    const [isLoading, setIsLoading] = useState(false);

    const [selectedServer, setSelectedServer] = useState(POPULAR_SERVERS[0].value);
    const [customServerUrl, setCustomServerUrl] = useState('');

    const customUrlRef = useRef<TextInput>(null);

    const contentOpacity = useSharedValue(1);

    const isValidUrl = (url: string): boolean => {
        if (!url.trim()) return false;
        const urlPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
        return urlPattern.test(url.trim());
    };

    const transitionToStep = (nextStep: FlowStep) => {
        contentOpacity.value = withTiming(0, { duration: 150 }, () => {
            contentOpacity.value = withTiming(1, { duration: 150 });
        });
        setCurrentStep(nextStep);
    };

    const handleSignInStart = () => {
        transitionToStep('signin-server');
    };

    const handleSignInServerSelected = async () => {
        if (selectedServer === 'other') {
            transitionToStep('signin-custom-url');
            setTimeout(() => customUrlRef.current?.focus(), 300);
            return;
        }
        await handleSignInSubmit(selectedServer);
    };

    const handleSignInSubmit = async (serverUrl: string) => {
        const cleanedUrl = serverUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
        setIsLoading(true);

        try {
            const success = await loginWithOAuth(cleanedUrl);
            if (success) {
                router.replace('/(tabs)');
            } else {
                Alert.alert('Login Failed', 'Unable to complete login. Please check the server URL and try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        const backMap: Record<FlowStep, FlowStep> = {
            'signin-server': 'initial',
            'signin-custom-url': 'signin-server',
            'initial': 'initial',
        };
        transitionToStep(backMap[currentStep]);
    };

    const renderInitial = () => (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={tw`flex-1 justify-between px-6 py-12`}>
            <LinearGradient
                colors={['#151518ff', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />
            <View style={tw`flex-1 justify-center items-center`}>
                <Text style={tw`text-white text-5xl font-bold mb-4 text-center`}>Loops</Text>
                <Text style={tw`text-gray-300 text-xl text-center leading-6`}>
                    Short videos. Endless creativity.
                </Text>
            </View>

            <View style={tw`gap-3`}>
                <Pressable
                    onPress={handleSignInStart}
                    style={({ pressed }) => [
                        tw`h-14 rounded-2xl justify-center items-center bg-[#FFE500]`,
                        pressed && tw`opacity-80`,
                    ]}
                >
                    <Text style={tw`text-black text-base font-bold`}>Sign In</Text>
                </Pressable>
            </View>
        </Animated.View>
    );

    const renderSignInServer = () => (
        <View style={tw`flex-1 px-6 pt-16`}>
            <LinearGradient
                colors={['#151518ff', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />
            <Animated.View entering={SlideInLeft} exiting={SlideOutRight}>
                <Pressable onPress={handleBack} style={tw`mb-8`}>
                    <Text style={tw`text-blue-400 text-base`}>← Back</Text>
                </Pressable>
            </Animated.View>

            <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <Text style={tw`text-white text-3xl font-bold mb-2`}>Choose your server</Text>
                <Text style={tw`text-gray-400 text-base mb-8`}>Select where your account is hosted</Text>

                <View style={tw`flex-row flex-wrap gap-2 mb-8`}>
                    {POPULAR_SERVERS.map((srv) => {
                        const active = selectedServer === srv.value;
                        return (
                            <Pressable
                                key={srv.value}
                                onPress={() => setSelectedServer(srv.value)}
                                style={({ pressed }) => [
                                    tw`px-4 py-4 rounded-2xl border-2`,
                                    tw`${active ? 'bg-transparent border-[#FFE500]' : 'bg-transparent border-gray-700'}`,
                                    pressed && tw`opacity-80`,
                                ]}
                            >
                                <Text style={tw`${active ? 'text-[#FFE500]' : 'text-white'} text-base font-semibold`}>
                                    {srv.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable
                    onPress={handleSignInServerSelected}
                    disabled={isLoading}
                    style={({ pressed }) => [
                        tw`h-14 rounded-2xl justify-center items-center`,
                        isLoading ? tw`bg-[#FFE500]/60` : tw`bg-[#FFE500]`,
                        pressed && !isLoading && tw`opacity-80`,
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={tw`text-black text-base font-bold`}>Continue</Text>
                    )}
                </Pressable>
            </Animated.View>
        </View>
    );

    const renderSignInCustomUrl = () => (
        <View style={tw`flex-1 px-6 pt-16`}>
            <LinearGradient
                colors={['#151518ff', '#000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tw`absolute inset-0`}
            />
            <Animated.View entering={SlideInLeft} exiting={SlideOutRight}>
                <Pressable onPress={handleBack} style={tw`mb-8`}>
                    <Text style={tw`text-blue-400 text-base`}>← Back</Text>
                </Pressable>
            </Animated.View>

            <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
                <Text style={tw`text-white text-3xl font-bold mb-2`}>Enter server URL</Text>
                <Text style={tw`text-gray-400 text-base mb-8`}>Type your Loops server address</Text>

                <View style={tw`mb-8`}>
                    <View style={styles.inputRow}>
                        <Text style={styles.prefix}>https://</Text>
                        <TextInput
                            ref={customUrlRef}
                            style={styles.textInput}
                            placeholder="your.loops.instance"
                            placeholderTextColor="#666"
                            value={customServerUrl}
                            onChangeText={setCustomServerUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                            returnKeyType="go"
                            editable={!isLoading}
                            onSubmitEditing={() => isValidUrl(customServerUrl) && handleSignInSubmit(customServerUrl)}
                        />
                    </View>
                    <Text style={tw`text-gray-500 text-xs mt-2`}>Example: loops.video or your.loops.instance</Text>
                </View>

                <Pressable
                    onPress={() => handleSignInSubmit(customServerUrl)}
                    disabled={isLoading || !isValidUrl(customServerUrl)}
                    style={({ pressed }) => [
                        tw`h-14 rounded-2xl justify-center items-center`,
                        isLoading || !isValidUrl(customServerUrl) ? tw`bg-[#FFE500]/40` : tw`bg-[#FFE500]`,
                        pressed && isValidUrl(customServerUrl) && !isLoading && tw`opacity-80`,
                    ]}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[isLoading || !isValidUrl(customServerUrl) ? tw`text-black/40` : tw`text-black`, tw`text-base font-bold`]}>Sign In</Text>
                    )}
                </Pressable>
            </Animated.View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={tw`flex-1 bg-black`}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {currentStep === 'initial' && renderInitial()}
            {currentStep === 'signin-server' && renderSignInServer()}
            {currentStep === 'signin-custom-url' && renderSignInCustomUrl()}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#333',
        paddingHorizontal: 16,
        height: 56,
        fontSize: 16,
        color: '#fff',
    },
    prefix: {
        fontSize: 16,
        color: '#666',
        marginRight: 0,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        paddingVertical: 0,
    },
});