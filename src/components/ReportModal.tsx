import { blockAccount, fetchReportRules, submitReport, unblockAccount } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import tw from 'twrnc';

type ReportPayload = {
    id: string;
    key: string;
    type: string;
    comment: string;
};

export function ReportModal({ visible, onClose, onCommunityGuidelines, item, reportType }) {
    const [step, setStep] = useState('select');
    const [selectedReason, setSelectedReason] = useState(null);
    const [hideContent, setHideContent] = useState(false);
    const [additionalDetails, setAdditionalDetails] = useState('');

    const { data: rules, isLoading } = useQuery({
        queryKey: ['fetchReportRules'],
        queryFn: async () => {
            const res = await fetchReportRules();
            return res;
        },
    });

    const mutation = useMutation({
        mutationFn: async (payload: ReportPayload) => {
            return await submitReport(payload);
        },
        onSuccess: () => {
            setStep('success');
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    const blockMutation = useMutation({
        mutationFn: async (data) => {
            if(data.type === 'block') {
                return await blockAccount(data.id);
            } else if (data.type === 'unblock') {
                return await unblockAccount(data.id);
            }
        },
        onError: (error) => {
            Alert.alert('Error', error.message);
        },
    });

    useEffect(() => {
        const type = hideContent ? 'block' : 'unblock'
        blockMutation.mutate({type, id: item.account?.id})
    }, [hideContent])

    const handleReasonSelect = async (reason) => {
        setSelectedReason(reason);

        const requiresDetails = ['1012', '1015', '1018', '1021', '1023', '1025', '1026'].includes(reason.key);

        if (requiresDetails) {
            setStep('details');
        } else {
            mutation.mutate({
                id: item.id,
                key: reason.key,
                type: reportType,
                comment: additionalDetails
            })
        }
    };

    const handleSubmitDetails = async () => {
        mutation.mutate({
            id: item.id,
            key: selectedReason?.key,
            type: reportType,
            comment: additionalDetails
        })
    };

    const handleClose = () => {
        setStep('select');
        setSelectedReason(null);
        setHideContent(false);
        setAdditionalDetails('');
        onClose();
    };

    const handleGuidelines = () => {
        setStep('select');
        setSelectedReason(null);
        setHideContent(false);
        setAdditionalDetails('');
        onCommunityGuidelines();
    }

    const handleDone = () => {
        handleClose();
    };

    if (isLoading) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleClose}
            >
                <View style={tw`flex-1 justify-end`}>
                    <Pressable
                        style={tw`absolute inset-0 bg-black/50`}
                        onPress={handleClose}
                    />
                    <View style={tw`bg-white rounded-t-3xl p-6 items-center min-h-[100px]`}>
                        <ActivityIndicator size="large" color="#000" />
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={tw`flex-1 justify-end`}>
                <Pressable
                    style={tw`absolute inset-0`}
                    onPress={handleClose}
                />

                {step === 'select' ? (
                    <View style={tw`bg-white rounded-t-3xl max-h-[85%]`}>
                        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200`}>
                            <View style={tw`w-8`} />
                            <Text style={tw`text-lg font-bold`}>Select a reason</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={tw`pb-4`}>
                            {rules?.map((option, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-100`}
                                    onPress={() => handleReasonSelect(option)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={tw`text-base flex-1`}>{option.message}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ) : step === 'details' ? (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={tw`bg-white rounded-t-3xl`}
                    >
                        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200`}>
                            <TouchableOpacity onPress={() => setStep('select')}>
                                <Ionicons name="chevron-back" size={24} color="#007AFF" />
                            </TouchableOpacity>
                            <Text style={tw`text-lg font-bold`}>Additional details</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={tw`px-5 py-6`}>
                            <Text style={tw`text-base text-gray-800 font-bold mb-2`}>
                                {selectedReason?.message}
                            </Text>
                            <Text style={tw`text-sm text-gray-500 mb-4`}>
                                Please provide any additional context that might help us review this report (optional). This is only visible to admins and is not public.
                            </Text>

                            <View style={tw`border border-gray-300 rounded-xl p-3 mb-2`}>
                                <TextInput
                                    style={tw`text-base min-h-[120px] text-gray-900`}
                                    placeholder="Add optional details here..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    maxLength={500}
                                    value={additionalDetails}
                                    onChangeText={setAdditionalDetails}
                                    textAlignVertical="top"
                                />
                            </View>

                            <Text style={tw`text-sm text-gray-400 text-right mb-6`}>
                                {additionalDetails.length}/500
                            </Text>

                            {/* Submit button */}
                            <TouchableOpacity
                                style={tw`bg-[#FF2D55] rounded-full py-4 items-center`}
                                onPress={handleSubmitDetails}
                            >
                                <Text style={tw`text-white text-base font-semibold`}>Submit Report</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                ) : (
                    <View style={tw`bg-white rounded-t-3xl`}>
                        <View style={tw`flex-row justify-between items-center px-5 py-4 border-b border-gray-200`}>
                            <View style={tw`w-8`} />
                            <Text style={tw`text-lg font-bold`}>Report</Text>
                            <TouchableOpacity onPress={handleClose}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={tw`px-5 py-8`}>
                            <View style={tw`items-center mb-6`}>
                                <View style={tw`w-20 h-20 bg-green-400 rounded-full items-center justify-center`}>
                                    <Ionicons name="checkmark" size={40} color="#fff" />
                                </View>
                            </View>

                            <Text style={tw`text-2xl font-bold text-center mb-4`}>
                                Thanks for reporting
                            </Text>

                            <Text style={tw`text-center text-gray-600 text-base leading-6`}>
                                We'll review your report and take action if there is a violation of our Community Guidelines.
                            </Text>

                            <View style={tw`h-px bg-gray-200 my-6`} />
                            { item?.account?.username && (
                                <>
                                    <Text style={tw`text-gray-500 mb-4`}>You can also:</Text>

                                    <View style={tw`flex-row justify-between items-center`}>
                                        <Text style={tw`text-base flex-1`}>
                                            Hide content from <Text style={tw`font-bold`}>{item?.account?.username || 'this user'}</Text>
                                        </Text>
                                        <Switch
                                            value={hideContent}
                                            onValueChange={setHideContent}
                                            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                                            thumbColor="#fff"
                                            />
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={tw`px-5 pb-8`}>
                            <TouchableOpacity
                                style={tw`bg-[#FF2D55] rounded-full py-4 items-center mb-3`}
                                onPress={handleDone}
                            >
                                <Text style={tw`text-white text-base font-semibold`}>Done</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={tw`py-3 items-center`}
                                onPress={handleGuidelines}
                            >
                                <Text style={tw`text-[#007AFF] text-base`}>
                                    Review Community Guidelines
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}