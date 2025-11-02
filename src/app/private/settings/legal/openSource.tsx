import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';


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

const LibraryCard = React.memo(({
    item,
    onPress
}: {
    item: LicenseItem;
    onPress: (license: License) => void;
}) => {
    const handlePress = useCallback(() => {
        onPress(item);
    }, [item, onPress]);

    return (
        <TouchableOpacity
            style={styles.libraryCard}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.libraryHeader}>
                <Text style={styles.libraryName}>{item.name}</Text>
                <Text style={styles.libraryVersion}>v{item.version}</Text>
            </View>

            {item.description && (
                <Text style={styles.libraryDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}

            <View style={styles.libraryFooter}>
                <Text style={styles.licenseType}>{item.type}</Text>
                {item.author && (
                    <Text style={styles.libraryAuthor} numberOfLines={1}>
                        {item.author}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
});

LibraryCard.displayName = 'LibraryCard';

export default function OpenSourceScreen() {
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

    const renderItem = useCallback(({ item }: { item: LicenseItem }) => (
        <LibraryCard item={item} onPress={openLicenseModal} />
    ), [openLicenseModal]);

    const keyExtractor = useCallback((item: LicenseItem) => item.id, []);

    const getItemLayout = useCallback((data: any, index: number) => ({
        length: 120,
        offset: 120 * index,
        index,
    }), []);

    const ListHeaderComponent = useMemo(() => (
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Open Source Libraries</Text>
            <Text style={styles.headerSubtitle}>
                Our app is powered by {licenseArray.length} open source {licenseArray.length === 1 ? 'library' : 'libraries'}.
            </Text>
        </View>
    ), [licenseArray.length]);

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading licenses...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    title: 'Open Source Software Notices'
                }}
            />

            <FlatList
                data={licenseArray}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                ListHeaderComponent={ListHeaderComponent}
                contentContainerStyle={styles.listContent}
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
                onRequestClose={closeLicenseModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderContent}>
                            <Text style={styles.modalTitle}>{selectedLicense?.name}</Text>
                            <Text style={styles.modalVersion}>v{selectedLicense?.version}</Text>
                        </View>
                        <TouchableOpacity onPress={closeLicenseModal} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={[selectedLicense]}
                        keyExtractor={() => 'modal-content'}
                        renderItem={() => (
                            <View style={styles.modalContent}>
                                {selectedLicense?.author && (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>Author</Text>
                                        <Text style={styles.modalSectionText}>{selectedLicense.author}</Text>
                                    </View>
                                )}

                                {selectedLicense?.description && (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>Description</Text>
                                        <Text style={styles.modalSectionText}>{selectedLicense.description}</Text>
                                    </View>
                                )}

                                {selectedLicense?.url && (
                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>Repository</Text>
                                        <Text style={styles.modalLink}>{selectedLicense.url}</Text>
                                    </View>
                                )}

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>License ({selectedLicense?.type})</Text>
                                    <Text style={styles.licenseContent}>{selectedLicense?.content}</Text>
                                </View>
                            </View>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 4,
        backgroundColor: '#f5f5f5',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    libraryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    libraryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    libraryName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flex: 1,
        marginRight: 8,
    },
    libraryVersion: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'monospace',
    },
    libraryDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        lineHeight: 20,
    },
    libraryFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    licenseType: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    libraryAuthor: {
        fontSize: 12,
        color: '#999',
        flex: 1,
        marginLeft: 12,
        textAlign: 'right',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalHeaderContent: {
        flex: 1,
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    modalVersion: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'monospace',
    },
    closeButton: {
        paddingVertical: 4,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    modalContent: {
        padding: 20,
    },
    modalSection: {
        marginBottom: 24,
    },
    modalSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalSectionText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 24,
    },
    modalLink: {
        fontSize: 16,
        color: '#007AFF',
        lineHeight: 24,
    },
    licenseContent: {
        fontSize: 13,
        color: '#333',
        lineHeight: 20,
        fontFamily: 'monospace',
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
    },
});