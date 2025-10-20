import { updateAccountPassword } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';
import tw from 'twrnc';

export default function PasswordChangeScreen() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [errors, setErrors] = useState({});

    const updatePasswordMutation = useMutation({
        mutationFn: (params) => updateAccountPassword(params),
        onSuccess: (data) => {
            if (data?.error?.code != 'ok') {
                const errors = data?.errors;
                setErrors(errors)
                return;
            }
            
            Alert.alert(
                'Success',
                'Your password has been updated successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]
            );
        },
        onError: (error) => {
            console.log('Password update error:', error);
            
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                Alert.alert(
                    'Error',
                    error.response?.data?.message || 'Failed to update password. Please try again.'
                );
            }
        },
    });

    const validateForm = () => {
        const newErrors = {};

        if (!currentPassword) {
            newErrors.current_password = ['Current password is required'];
        }

        if (!newPassword) {
            newErrors.password = ['New password is required'];
        } else if (newPassword.length < 8) {
            newErrors.password = ['Password must be at least 8 characters'];
        } else if (newPassword.length > 72) {
            newErrors.password = ['Password must not exceed 72 characters'];
        }

        if (!confirmPassword) {
            newErrors.password_confirmation = ['Please confirm your password'];
        } else if (newPassword !== confirmPassword) {
            newErrors.password_confirmation = ['Passwords do not match'];
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        updatePasswordMutation.mutate({
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword,
        });
    };

    const isFormValid = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && newPassword.length <= 72;

    return (
        <View style={tw`flex-1 bg-gray-100`}>
            <Stack.Screen
                options={{
                    title: 'Change Password',
                    headerStyle: { backgroundColor: '#fff' },
                    headerBackTitle: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={tw`flex-1`} keyboardShouldPersistTaps="handled">
                <View style={tw`mt-6 px-5`}>
                    <Text style={tw`text-sm text-gray-600 mb-6`}>
                        Enter your current password and choose a new secure password.
                    </Text>

                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                            Current Password
                        </Text>
                        <View style={tw`relative`}>
                            <TextInput
                                style={tw`bg-white border ${
                                    errors.current_password ? 'border-red-500' : 'border-gray-300'
                                } rounded-lg px-4 py-3 pr-12 text-base`}
                                value={currentPassword}
                                onChangeText={(text) => {
                                    setCurrentPassword(text);
                                    if (errors.current_password) {
                                        setErrors({ ...errors, current_password: null });
                                    }
                                }}
                                secureTextEntry={!showCurrent}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="Enter current password"
                            />
                            <Pressable
                                onPress={() => setShowCurrent(!showCurrent)}
                                style={tw`absolute right-4 top-3`}>
                                <Ionicons
                                    name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                                    size={24}
                                    color="#999"
                                />
                            </Pressable>
                        </View>
                        {errors.current_password && (
                            <Text style={tw`text-red-500 text-sm mt-1`}>
                                {errors.current_password[0]}
                            </Text>
                        )}
                    </View>

                    <View style={tw`mb-4`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                            New Password
                        </Text>
                        <View style={tw`relative`}>
                            <TextInput
                                style={tw`bg-white border ${
                                    errors.password ? 'border-red-500' : 'border-gray-300'
                                } rounded-lg px-4 py-3 pr-12 text-base`}
                                value={newPassword}
                                onChangeText={(text) => {
                                    setNewPassword(text);
                                    if (errors.password) {
                                        setErrors({ ...errors, password: null });
                                    }
                                }}
                                secureTextEntry={!showNew}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="Enter new password"
                            />
                            <Pressable
                                onPress={() => setShowNew(!showNew)}
                                style={tw`absolute right-4 top-3`}>
                                <Ionicons
                                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                                    size={24}
                                    color="#999"
                                />
                            </Pressable>
                        </View>
                        {errors.password && (
                            <Text style={tw`text-red-500 text-sm mt-1`}>
                                {errors.password[0]}
                            </Text>
                        )}
                        {!errors.password && newPassword && (
                            <Text style={tw`text-gray-500 text-xs mt-1`}>
                                Must be 8-72 characters
                            </Text>
                        )}
                    </View>

                    <View style={tw`mb-6`}>
                        <Text style={tw`text-sm font-medium text-gray-700 mb-2`}>
                            Confirm New Password
                        </Text>
                        <View style={tw`relative`}>
                            <TextInput
                                style={tw`bg-white border ${
                                    errors.password_confirmation ? 'border-red-500' : 'border-gray-300'
                                } rounded-lg px-4 py-3 pr-12 text-base`}
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    if (errors.password_confirmation) {
                                        setErrors({ ...errors, password_confirmation: null });
                                    }
                                }}
                                secureTextEntry={!showConfirm}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="Confirm new password"
                            />
                            <Pressable
                                onPress={() => setShowConfirm(!showConfirm)}
                                style={tw`absolute right-4 top-3`}>
                                <Ionicons
                                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                    size={24}
                                    color="#999"
                                />
                            </Pressable>
                        </View>
                        {errors.password_confirmation && (
                            <Text style={tw`text-red-500 text-sm mt-1`}>
                                {errors.password_confirmation[0]}
                            </Text>
                        )}
                    </View>

                    <Pressable
                        onPress={handleSubmit}
                        disabled={!isFormValid || updatePasswordMutation.isPending}
                        style={({ pressed }) => [
                            tw`bg-blue-600 rounded-lg py-4 items-center`,
                            (!isFormValid || updatePasswordMutation.isPending) && tw`bg-gray-400`,
                            pressed && isFormValid && tw`bg-blue-700`,
                        ]}>
                        {updatePasswordMutation.isPending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={tw`text-white text-base font-semibold`}>
                                Update Password
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}