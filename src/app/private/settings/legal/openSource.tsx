import { useTheme } from '@/contexts/ThemeContext';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import tw from 'twrnc';

type License = {
    name: string;
    author?: string;
    content: string;
    description?: string;
    type: string;
    url?: string;
    version: string;
};

type LicenseItem = License & { id: string };

const LibraryCard = React.memo(
    ({ item, onPress }: { item: LicenseItem; onPress: (license: License) => void }) => {
        const handlePress = useCallback(() => {
            onPress(item);
        }, [item, onPress]);

        return (
            <TouchableOpacity
                style={tw`bg-white dark:bg-zinc-900 rounded-xl p-4 mt-3 shadow-sm`}
                onPress={handlePress}
                activeOpacity={0.7}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                    <Text
                        style={tw`text-base font-semibold text-black dark:text-white flex-1 mr-2`}>
                        {item.name}
                    </Text>
                    <Text style={tw`text-sm text-gray-600 dark:text-gray-400 font-mono`}>
                        v{item.version}
                    </Text>
                </View>

                {item.description && (
                    <Text
                        style={tw`text-sm text-gray-600 dark:text-gray-400 mb-3 leading-5`}
                        numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={tw`flex-row justify-between items-center`}>
                    <Text
                        style={tw`text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded`}>
                        {item.type}
                    </Text>
                    {item.author && (
                        <Text
                            style={tw`text-xs text-gray-400 dark:text-gray-500 flex-1 ml-3 text-right`}
                            numberOfLines={1}>
                            {item.author}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    },
);

LibraryCard.displayName = 'LibraryCard';

export default function OpenSourceScreen() {
    const { colorScheme } = useTheme();

    const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [licenses, setLicenses] = useState<Record<string, License> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLicenses = async () => {
            try {
                const licensesData = require('../../../../../assets/licenses.json');
                setLicenses(licensesData);
            } catch (error) {
                console.error('Failed to load licenses:', error);
            } finally {
                setLoading(false);
            }
        };

        loadLicenses();
    }, []);

    const licenseArray = useMemo(() => {
        if (!licenses) return [];
        return Object.entries(licenses).map(([id, license]) => ({
            ...license,
            id,
        }));
    }, [licenses]);

    const openLicenseModal = useCallback((license: License) => {
        setSelectedLicense(license);
        setModalVisible(true);
    }, []);

    const closeLicenseModal = useCallback(() => {
        setModalVisible(false);
        setTimeout(() => setSelectedLicense(null), 300);
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: LicenseItem }) => <LibraryCard item={item} onPress={openLicenseModal} />,
        [openLicenseModal],
    );

    const keyExtractor = useCallback((item: LicenseItem) => item.id, []);

    const getItemLayout = useCallback(
        (data: any, index: number) => ({
            length: 120,
            offset: 120 * index,
            index,
        }),
        [],
    );

    const ListHeaderComponent = useMemo(
        () => (
            <View style={tw`bg-[#f5f5f5] dark:bg-black mt-2 pt-3 px-2`}>
                <Text style={tw`text-2xl font-bold text-black mb-2 dark:text-white`}>
                    Open Source Libraries
                </Text>
                <Text style={tw`text-sm text-gray-600 mb-2 dark:text-gray-300`}>
                    Our app is powered by {licenseArray.length} open source{' '}
                    {licenseArray.length === 1 ? 'library' : 'libraries'}.
                </Text>
            </View>
        ),
        [licenseArray.length],
    );

    if (loading) {
        return (
            <View style={tw`flex`}>
                <View style={tw`flex justify-center items-center`}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={tw`text-sm text-gray-600 dark:text-gray-300`}>
                        Loading licenses...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={tw`flex bg-[#f5f5f5] dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    title: 'Open Source Software Notices',
                }}
            />

            <FlatList
                data={licenseArray}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                contentContainerStyle={tw`px-6`}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={10}
                getItemLayout={getItemLayout}
            />

            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeLicenseModal}>
                <View style={tw`flex-1 bg-white dark:bg-black`}>
                    <View
                        style={tw`flex-row justify-between items-start px-5 py-4 border-b border-gray-200 dark:border-zinc-800`}>
                        <View style={tw`flex-1 mr-4`}>
                            <Text style={tw`text-xl font-bold text-black dark:text-white mb-1`}>
                                {selectedLicense?.name}
                            </Text>
                            <Text style={tw`text-sm text-gray-600 dark:text-gray-400 font-mono`}>
                                v{selectedLicense?.version}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={closeLicenseModal} style={tw`py-1`}>
                            <Text
                                style={tw`text-base font-semibold text-blue-600 dark:text-blue-400`}>
                                Done
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={[selectedLicense]}
                        keyExtractor={() => 'modal-content'}
                        renderItem={() => (
                            <View style={tw`p-5`}>
                                {selectedLicense?.author && (
                                    <View style={tw`mb-6`}>
                                        <Text
                                            style={tw`text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider`}>
                                            Author
                                        </Text>
                                        <Text
                                            style={tw`text-base text-black dark:text-white leading-6`}>
                                            {selectedLicense.author}
                                        </Text>
                                    </View>
                                )}

                                {selectedLicense?.description && (
                                    <View style={tw`mb-6`}>
                                        <Text
                                            style={tw`text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider`}>
                                            Description
                                        </Text>
                                        <Text
                                            style={tw`text-base text-black dark:text-white leading-6`}>
                                            {selectedLicense.description}
                                        </Text>
                                    </View>
                                )}

                                {selectedLicense?.url && (
                                    <View style={tw`mb-6`}>
                                        <Text
                                            style={tw`text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider`}>
                                            Repository
                                        </Text>
                                        <Text
                                            style={tw`text-base text-blue-600 dark:text-blue-400 leading-6`}>
                                            {selectedLicense.url}
                                        </Text>
                                    </View>
                                )}

                                <View style={tw`mb-6`}>
                                    <Text
                                        style={tw`text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider`}>
                                        License ({selectedLicense?.type})
                                    </Text>
                                    <Text
                                        style={tw`text-xs text-gray-800 dark:text-gray-300 leading-5 font-mono bg-gray-100 dark:bg-zinc-900 p-3 rounded-lg`}>
                                        {selectedLicense?.content}
                                    </Text>
                                </View>
                            </View>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
}
