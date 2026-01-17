import Avatar from '@/components/Avatar';
import { XStack, YStack } from '@/components/ui/Stack';
import { composeAutocompleteMentions, composeAutocompleteTags, uploadDuet } from '@/utils/requests';
import { prettyCount } from '@/utils/ui';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Video as VideoCompressor } from 'react-native-compressor';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from 'twrnc';

const MAX_CAPTION_LENGTH = 200;
const MAX_ALT_TEXT_LENGTH = 2000;

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'tr', name: 'Turkish' },
    { code: "af", name: "Afrikaans" },
    { code: "am", name: "Amharic" },
    { code: "az", name: "Azerbaijani" },
    { code: "be", name: "Belarusian" },
    { code: "bn", name: "Bengali" },
    { code: "bs", name: "Bosnian" },
    { code: "bg", name: "Bulgarian" },
    { code: "my", name: "Burmese" },
    { code: "ca", name: "Catalan" },
    { code: "ceb", name: "Cebuano" },
    { code: "cs", name: "Czech" },
    { code: "cy", name: "Welsh" },
    { code: "da", name: "Danish" },
    { code: "el", name: "Greek" },
    { code: "et", name: "Estonian" },
    { code: "eu", name: "Basque" },
    { code: "fa", name: "Persian" },
    { code: "fi", name: "Finnish" },
    { code: "fil", name: "Filipino (Tagalog)" },
    { code: "ga", name: "Irish" },
    { code: "gd", name: "Scottish Gaelic" },
    { code: "gl", name: "Galician" },
    { code: "gu", name: "Gujarati" },
    { code: "ha", name: "Hausa" },
    { code: "he", name: "Hebrew" },
    { code: "hr", name: "Croatian" },
    { code: "hu", name: "Hungarian" },
    { code: "hy", name: "Armenian" },
    { code: "id", name: "Indonesian" },
    { code: "is", name: "Icelandic" },
    { code: "ka", name: "Georgian" },
    { code: "kk", name: "Kazakh" },
    { code: "km", name: "Khmer" },
    { code: "kn", name: "Kannada" },
    { code: "lo", name: "Lao" },
    { code: "lt", name: "Lithuanian" },
    { code: "lv", name: "Latvian" },
    { code: "mk", name: "Macedonian" },
    { code: "ml", name: "Malayalam" },
    { code: "mn", name: "Mongolian" },
    { code: "mr", name: "Marathi" },
    { code: "ms", name: "Malay" },
    { code: "ne", name: "Nepali" },
    { code: "no", name: "Norwegian" },
    { code: "pa", name: "Punjabi" },
    { code: "ro", name: "Romanian" },
    { code: "si", name: "Sinhala" },
    { code: "sk", name: "Slovak" },
    { code: "sl", name: "Slovenian" },
    { code: "so", name: "Somali" },
    { code: "sq", name: "Albanian" },
    { code: "sr", name: "Serbian" },
    { code: "sv", name: "Swedish" },
    { code: "sw", name: "Swahili" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "th", name: "Thai" },
    { code: "uk", name: "Ukrainian" },
    { code: "ur", name: "Urdu" },
    { code: "uz", name: "Uzbek" },
    { code: "vi", name: "Vietnamese" },
    { code: "xh", name: "Xhosa" },
    { code: "yo", name: "Yoruba" },
    { code: "zu", name: "Zulu" }
];

const VISIBILITY = [
    {
        name: "Everyone",
        title: "Everyone can view this post",
        icon: "earth-outline",
        id: 1,
        disabled: false,
        description: "Anyone can see this post"
    },
    {
        name: "Local",
        title: "Only people on loops.video can view",
        icon: "map-outline",
        id: 2,
        disabled: true,
        description: "Visible only to people on loops.video"
    },
    {
        name: "Followers",
        title: "Only followers can view this post",
        icon: "people-outline",
        id: 3,
        disabled: true,
        description: "Visible only to your followers"
    },
    {
        name: "Friends",
        title: "Only friends can view this post",
        icon: "people-circle-outline",
        id: 4,
        disabled: true,
        description: "Followers you follow back"
    },
    {
        name: "Only you",
        title: "Only you can view this post",
        icon: "lock-closed-outline",
        id: 5,
        disabled: true,
        description: "Visible only to you"
    },
]

export default function DuetCaptionScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { videoPath, duration, selectedSound, duetId, layout } = params;
    const [caption, setCaption] = useState('#duet');
    const [altText, setAltText] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
    const [selectedVisibility, setSelectedVisibility] = useState(VISIBILITY[0]);
    const [saveToDevice, setSaveToDevice] = useState(false);
    const [allowComments, setAllowComments] = useState(true);
    const [allowDownloads, setAllowDownloads] = useState(true);
    const [allowDuets, setAllowDuets] = useState(true);
    const [allowStitches, setAllowStitches] = useState(true);
    const [isSensitive, setIsSensitive] = useState(false);
    const [isAd, setIsAd] = useState(false);
    const [isAi, setIsAi] = useState(false);

    const [cursorPosition, setCursorPosition] = useState(0);
    const [autocompleteType, setAutocompleteType] = useState<'hashtag' | 'mention' | null>(null);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');
    const [autocompleteStart, setAutocompleteStart] = useState(0);

    const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
    const [showAltTextModal, setShowAltTextModal] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);

    const [overlayVisible, setOverlayVisible] = useState(false);
    const [overlayMessage, setOverlayMessage] = useState<string>('Preparing…');
    const [progressPct, setProgressPct] = useState<number>(0);

    const inputRef = useRef<TextInput>(null);
    const altTextInputRef = useRef<TextInput>(null);

    const player = useVideoPlayer(videoPath as string, (player) => { });

    const { data: hashtagSuggestions = [] } = useQuery({
        queryKey: ['autoComplete_hashtags', autocompleteQuery],
        queryFn: async () => {
            const res = await composeAutocompleteTags(autocompleteQuery)
            return res.data
        },
        enabled: autocompleteType === 'hashtag' && autocompleteQuery.length > 0,
    });

    const { data: mentionSuggestions = [] } = useQuery({
        queryKey: ['autoComplete_mentions', autocompleteQuery],
        queryFn: async () => {
            const res = await composeAutocompleteMentions(autocompleteQuery)
            console.log(res)
            return res.data
        },
        enabled: autocompleteType === 'mention' && autocompleteQuery.length > 0,
    });

    const uploadLoop = async ({
        originalPath,
        caption,
        altText,
        language,
        visibility,
        allowComments,
        allowDownloads,
        allowDuets,
        allowStitches,
        isSensitive,
        isAd,
        isAi,
        selectedSound,
    }: any) => {
        setOverlayVisible(true);
        setOverlayMessage('Compressing… 0%');
        setProgressPct(0);

        const compressedUri = await VideoCompressor.compress(
            originalPath,
            {
                maxSize: 1920,
                compressionMethod: 'auto',
            },
            (progress) => {
                const pct = Math.round(progress * 100);
                setProgressPct(pct);
                setOverlayMessage(`Compressing… ${pct}%`);
            }
        );

        const uploadUri = compressedUri.startsWith('file://') ? compressedUri : `file://${compressedUri}`;
        const filename = `upload_${Date.now()}.mp4`;

        setOverlayMessage('Uploading…');

        const params = {
            video: {
                uri: uploadUri,
                name: filename,
                type: 'video/mp4',
            },
            duet_id: duetId,
            duet_layout: layout,
            description: caption ?? null,
            alt_text: altText ?? null,
            lang: language?.code ?? 'en',
            comment_state: allowComments ? '4' : '0',
            can_download: allowDownloads ? '1' : '0',
            can_duet: allowDuets ? '1' : '0',
            can_stitch: allowStitches ? '1' : '0',
            is_sensitive: isSensitive ? '1' : '0',
            contains_ad: isAd ? '1' : '0',
            contains_ai: isAi ? '1' : '0'
        }

        const res = await uploadDuet(params)

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Upload failed');
        }

        const json = await res.json();
        return { json, uploadUri };
    };

    const postMutation = useMutation({
        mutationFn: uploadLoop,
        onSuccess: async ({ json, uploadUri }) => {
            setOverlayMessage('Done!');
            setOverlayVisible(false);
            router.replace('/');
        },
        onError: (err: any) => {
            setOverlayVisible(false);
            Alert.alert('Upload failed', String(err?.message || err));
        },
    });

    const handlePost = () => {
        postMutation.mutate({
            originalPath: String(videoPath),
            caption,
            altText,
            language: selectedLanguage,
            visibility: selectedVisibility,
            allowComments,
            allowDownloads,
            allowDuets,
            allowStitches,
            isSensitive,
            isAd,
            isAi,
            selectedSound,
        });
    };

    const detectAutocomplete = (text: string, position: number) => {
        const textBeforeCursor = text.substring(0, position);

        const lastHashtagIndex = textBeforeCursor.lastIndexOf('#');
        const lastMentionIndex = textBeforeCursor.lastIndexOf('@');

        const lastTriggerIndex = Math.max(lastHashtagIndex, lastMentionIndex);

        if (lastTriggerIndex === -1) {
            setAutocompleteType(null);
            return;
        }

        const textAfterTrigger = textBeforeCursor.substring(lastTriggerIndex + 1);
        if (textAfterTrigger.includes(' ') || textAfterTrigger.includes('\n')) {
            setAutocompleteType(null);
            return;
        }

        const type = lastHashtagIndex > lastMentionIndex ? 'hashtag' : 'mention';
        setAutocompleteType(type);
        setAutocompleteQuery(textAfterTrigger);
        setAutocompleteStart(lastTriggerIndex);
    };

    const handleCaptionChange = (text: string) => {
        if (text.length <= MAX_CAPTION_LENGTH) {
            setCaption(text);
            detectAutocomplete(text, cursorPosition);
        }
    };

    const handleSelectionChange = (event: any) => {
        const position = event.nativeEvent.selection.start;
        setCursorPosition(position);
        detectAutocomplete(caption, position);
    };

    const handleSelectSuggestion = (suggestion: any) => {
        let newText = '';
        const beforeTrigger = caption.substring(0, autocompleteStart);
        const afterCursor = caption.substring(cursorPosition);

        if (autocompleteType === 'hashtag') {
            newText = `${beforeTrigger}#${suggestion.name} ${afterCursor}`;
        } else if (autocompleteType === 'mention') {
            newText = `${beforeTrigger}@${suggestion.username} ${afterCursor}`;
        }

        setCaption(newText);
        setAutocompleteType(null);
        setAutocompleteQuery('');

        const newCursorPosition = beforeTrigger.length +
            (autocompleteType === 'hashtag' ? suggestion.name.length : suggestion.username.length) + 2;

        setTimeout(() => {
            inputRef.current?.setNativeProps({
                selection: { start: newCursorPosition, end: newCursorPosition }
            });
        }, 0);
    };

    const showAutocomplete = autocompleteType &&
        (autocompleteType === 'hashtag' ? hashtagSuggestions.length > 0 : mentionSuggestions.length > 0);

    const handleBack = () => {
        router.back();
    };

    const charsRemaining = MAX_CAPTION_LENGTH - caption.length;
    const isNearLimit = charsRemaining <= 20;

    const altTextCharsRemaining = MAX_ALT_TEXT_LENGTH - altText.length;
    const isAltTextNearLimit = altTextCharsRemaining <= 100;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={32} color="#000" />
                </TouchableOpacity>
                <Text style={tw`text-lg font-bold`}>Upload Duet</Text>
                <TouchableOpacity style={styles.backButton}>
                    <Ionicons name="chevron-back" size={32} color="#fff" />
                </TouchableOpacity>
            </View>

            <View>
                <View style={styles.captionSection}>
                    <View style={styles.captionInputContainer}>
                        <TextInput
                            ref={inputRef}
                            style={styles.captionInput}
                            value={caption}
                            onChangeText={handleCaptionChange}
                            onSelectionChange={handleSelectionChange}
                            placeholder="Add an optional caption..."
                            placeholderTextColor="#999"
                            multiline
                            maxLength={MAX_CAPTION_LENGTH}
                        />
                        <View style={styles.characterCounter}>
                            <Text style={[
                                styles.characterCounterText,
                                isNearLimit && styles.characterCounterWarning
                            ]}>
                                {charsRemaining}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.thumbnailContainer}>
                        <VideoView
                            style={styles.thumbnail}
                            player={player}
                            allowsPictureInPicture={false}
                            nativeControls={false}
                        />
                    </View>
                </View>

                {showAutocomplete && (
                    <View style={styles.autocompleteContainer}>
                        <FlatList
                            data={autocompleteType === 'hashtag' ? hashtagSuggestions : mentionSuggestions}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.suggestionItem}
                                    onPress={() => handleSelectSuggestion(item)}
                                >
                                    {autocompleteType === 'hashtag' ? (
                                        <>
                                            <View style={styles.hashtagIcon}>
                                                <Text style={styles.hashtagIconText}>#</Text>
                                            </View>
                                            <View style={styles.suggestionContent}>
                                                <Text style={styles.suggestionName}>{item.name}</Text>
                                                <Text style={styles.suggestionMeta}>
                                                    {item.count.toLocaleString()} posts
                                                </Text>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <Avatar url={item?.avatar} />
                                            <YStack style={styles.suggestionContent} justifyContent='center'>
                                                <XStack flex={1} gap="$1" alignItems='center'>
                                                    <Text style={styles.suggestionName}>@{item.username}</Text>
                                                    <Text>·</Text>
                                                    <Text style={styles.suggestionMetaSmall}>{prettyCount(item.follower_count)} Followers</Text>
                                                </XStack>
                                                {item.bio && item.bio.length && (<XStack gap="$1">
                                                    <Text style={styles.suggestionMetaSmall} numberOfLines={1}>{item.bio}</Text>
                                                </XStack>)}
                                            </YStack>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </View>

            <ScrollView onScroll={() => Keyboard.dismiss()}>
                <View style={styles.quickAccessSection}>
                    {/* <TouchableOpacity
                        style={styles.listItem}
                    >
                        <View style={styles.listItemLeftLonger}>
                            <View style={styles.listItemIcon}>
                                <Ionicons name="location-outline" size={20} color="#999" />
                            </View>
                            <YStack style={{ flex: 1 }}>
                                <Text style={styles.listItemText}>Location</Text>
                            </YStack>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
                    </TouchableOpacity> */}

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setShowVisibilityModal(true)}
                    >
                        <View style={styles.listItemLeftLonger}>
                            <View style={styles.listItemIcon}>
                                <Ionicons name={selectedVisibility.icon} size={20} color="#999" />
                            </View>
                            <YStack style={{ flex: 1 }}>
                                <Text style={styles.listItemText}>{selectedVisibility.title}</Text>
                            </YStack>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setShowAltTextModal(true)}
                    >
                        <View style={styles.listItemLeftLonger}>
                            <View style={styles.listItemIcon}>
                                <Ionicons name="accessibility-outline" size={20} color="#999" />
                            </View>
                            <YStack style={{ flex: 1 }}>
                                <Text style={styles.listItemText}>Add alternative text</Text>
                                {altText.length > 0 && (
                                    <Text style={styles.listItemTextPreview} numberOfLines={1}>
                                        {altText}
                                    </Text>
                                )}

                                {altText.length == 0 && (
                                    <Text style={styles.listItemTextPreview}>
                                        Provide a brief description for viewers using screen readers
                                    </Text>
                                )}
                            </YStack>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <View style={styles.listItemLeft}>
                            <View style={styles.listItemIcon}>
                                <Ionicons name="language-outline" size={20} color="#999" />
                            </View>
                            <YStack>
                                <Text style={styles.listItemText}>Video Language</Text>
                                <Text style={styles.listItemTextPreview}>{selectedLanguage.name}</Text>
                            </YStack>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => setShowMoreOptionsModal(true)}
                    >
                        <View style={styles.listItemLeft}>
                            <View style={styles.listItemIcon}>
                                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                            </View>
                            <YStack>
                                <Text style={styles.listItemText}>More options</Text>
                                <Text style={styles.listItemTextHelp}>Permission and content settings</Text>
                            </YStack>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={20} color="#999" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.bottomActions}>
                <TouchableOpacity onPress={handlePost} style={styles.postButton}>
                    <Feather name="upload" size={20} color="#fff" />
                    <Text style={styles.postButtonText}>Post</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={showMoreOptionsModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowMoreOptionsModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowMoreOptionsModal(false)}>
                            <Ionicons name="close" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>More Options</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>

                        <XStack>
                            <Text style={styles.listSectionTitle}>Privacy Settings</Text>
                        </XStack>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="chatbubble-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Allow Comments</Text>
                                </YStack>
                            </View>
                            <Switch value={allowComments} onValueChange={setAllowComments} />
                        </View>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="download-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Allow Downloads</Text>
                                </YStack>
                            </View>
                            <Switch value={allowDownloads} onValueChange={setAllowDownloads} />
                        </View>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="people-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Allow Duets</Text>
                                </YStack>
                            </View>
                            <Switch value={allowDuets} onValueChange={setAllowDuets} />
                        </View>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="cut-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Allow Stitches</Text>
                                </YStack>
                            </View>
                            <Switch value={allowStitches} onValueChange={setAllowStitches} />
                        </View>

                        <View style={styles.listSectionSeparator} />

                        <XStack>
                            <Text style={styles.listSectionTitle}>Advanced Settings</Text>
                        </XStack>



                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="eye-off-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Sensitive content</Text>
                                    <Text style={styles.listItemTextHelp}>Mark this post as sensitive to show a warning and limit to those aged 18 years and older</Text>
                                </YStack>
                            </View>
                            <Switch value={isSensitive} onValueChange={setIsSensitive} />
                        </View>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="bag-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Content disclosure and ads</Text>
                                    <Text style={styles.listItemTextHelp}>Let others know this post promotes a brand, product or service</Text>
                                </YStack>
                            </View>
                            <Switch value={isAd} onValueChange={setIsAd} />
                        </View>

                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="information-circle-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>AI-Generated Content</Text>
                                    <Text style={styles.listItemTextHelp}>Add this label to tell viewers your content was generated or edited with AI</Text>

                                </YStack>
                            </View>
                            <Switch value={isAi} onValueChange={setIsAi} />
                        </View>
                        <View style={styles.listItem}>
                            <View style={styles.listItemLeft}>
                                <View style={styles.listItemIcon}>
                                    <Ionicons name="download-outline" size={20} color="#999" />
                                </View>
                                <YStack>
                                    <Text style={styles.listItemText}>Save to device</Text>
                                    <Text style={styles.listItemTextHelp}>Save a copy to your device</Text>
                                </YStack>
                            </View>
                            <Switch value={saveToDevice} onValueChange={setSaveToDevice} />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={showAltTextModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowAltTextModal(false)}
            >
                <SafeAreaView style={styles.fullScreenModalContainer}>
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={0}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowAltTextModal(false)}>
                                <Ionicons name="close" size={28} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Alt Text</Text>
                            <TouchableOpacity onPress={() => setShowAltTextModal(false)}>
                                <Text style={styles.doneButton}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.fullScreenModalContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.altTextDescription}>
                                Describe your video content to make it accessible for visually impaired viewers using screen readers. Include important visual details, actions, and context.
                            </Text>

                            <View style={styles.altTextInputContainer}>
                                <TextInput
                                    ref={altTextInputRef}
                                    style={styles.altTextInput}
                                    value={altText}
                                    onChangeText={(text) => {
                                        if (text.length <= MAX_ALT_TEXT_LENGTH) {
                                            setAltText(text);
                                        }
                                    }}
                                    placeholder="Describe what's happening in your video..."
                                    placeholderTextColor="#999"
                                    multiline
                                    maxLength={MAX_ALT_TEXT_LENGTH}
                                    autoFocus
                                    textAlignVertical="top"
                                />
                            </View>

                            <View style={styles.altTextCharCounter}>
                                <Text style={[
                                    styles.altTextCharCounterText,
                                    isAltTextNearLimit && styles.characterCounterWarning
                                ]}>
                                    {altTextCharsRemaining} characters remaining
                                </Text>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={showLanguageModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <SafeAreaView style={styles.fullScreenModalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                            <Ionicons name="close" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <Text style={styles.languageDescription}>
                        Select the primary language spoken in your video
                    </Text>

                    <FlatList
                        data={LANGUAGES}
                        keyExtractor={(item) => item.code}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.languageItem}
                                onPress={() => {
                                    setSelectedLanguage(item);
                                    setShowLanguageModal(false);
                                }}
                            >
                                <Text style={styles.languageName}>{item.name}</Text>
                                {selectedLanguage.code === item.code && (
                                    <Ionicons name="checkmark" size={24} color="#ff0050" />
                                )}
                            </TouchableOpacity>
                        )}
                        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : 'never'}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
                    />
                </SafeAreaView>
            </Modal>

            <Modal
                visible={showVisibilityModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowVisibilityModal(false)}
            >
                <SafeAreaView style={styles.fullScreenModalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowVisibilityModal(false)}>
                            <Ionicons name="close" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Select Visibility</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <Text style={styles.visibilityHeaderDescription}>
                        Who can view this post
                    </Text>

                    <FlatList
                        data={VISIBILITY}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.visibilityItem, { opacity: item.disabled ? 0.5 : 1 }]}
                                disabled={item.disabled}
                                onPress={() => {
                                    setSelectedVisibility(item);
                                    setShowVisibilityModal(false);
                                }}
                            >
                                <YStack gap={1}>
                                    <Text style={styles.visibilityName}>{item.name}</Text>
                                    <Text style={styles.visibilityDescription}>{item.description}</Text>
                                </YStack>

                                {selectedVisibility.id === item.id ? (
                                    <View style={styles.radioContainerActive}>
                                        <View style={styles.radioActive} />
                                    </View>
                                ) : (
                                    <View style={styles.radioContainer} />

                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
            {overlayVisible && (
                <View style={styles.backdrop} pointerEvents="auto">
                    <View style={styles.card}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.title}>{overlayMessage}</Text>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    captionSection: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    captionInputContainer: {
        flex: 1,
        position: 'relative',
    },
    captionInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        lineHeight: 20,
        minHeight: 100,
        borderWidth: 1,
        padding: 10,
        paddingBottom: 30,
        borderRadius: 10,
        borderColor: '#ccc',
    },
    characterCounter: {
        position: 'absolute',
        bottom: 8,
        right: 10,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    characterCounterText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    characterCounterWarning: {
        color: '#ff0050',
    },
    thumbnailContainer: {
        width: 80,
        height: 150,
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    thumbnail: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    autocompleteContainer: {
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    hashtagIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hashtagIconText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    suggestionMeta: {
        fontSize: 13,
        color: '#666',
    },
    suggestionMetaSmall: {
        fontSize: 12,
        color: '#666',
    },
    quickAccessSection: {
        flex: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    listItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '70%',
        gap: 12,
        flex: 1,
    },
    listItemLeftLonger: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '80%',
        gap: 12,
        flex: 1,
    },
    listSectionTitle: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        color: '#666',
        fontSize: 16,
        fontWeight: 600
    },
    listSectionSeparator: {
        backgroundColor: '#f8f8f8',
        height: 10
    },
    listItemIcon: {
        paddingRight: 10,
    },
    listItemText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#121212',
    },
    listItemTextHelp: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    listItemTextPreview: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    moreOptionsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
        gap: 8,
    },
    moreOptionsText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
    bottomActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 40,
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e0e0e0',
        backgroundColor: '#fff',
    },
    postButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ff0050',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    postButtonText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    fullScreenModalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    doneButton: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ff0050',
    },
    modalScrollView: {
        flex: 1,
    },
    fullScreenModalContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    altTextDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        paddingVertical: 16,
    },
    altTextInputContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        backgroundColor: '#fff',
        minHeight: 200,
    },
    altTextInput: {
        fontSize: 15,
        color: '#000',
        lineHeight: 22,
        padding: 16,
        minHeight: 200,
    },
    altTextCharCounter: {
        paddingVertical: 12,
        alignItems: 'flex-end',
    },
    altTextCharCounterText: {
        fontSize: 13,
        color: '#666',
    },
    languageDescription: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    languageItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    languageName: {
        fontSize: 16,
        color: '#000',
    },
    visibilityHeaderDescription: {
        fontSize: 18,
        color: '#000',
        fontWeight: 700,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    visibilityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    visibilityName: {
        fontSize: 16,
        fontWeight: 700,
        color: '#000',
    },
    visibilityDescription: {
        fontSize: 14,
        color: '#666',
    },
    radioContainer: {
        width: 30,
        height: 30,
        borderRadius: 30,
        borderColor: '#eee',
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioContainerActive: {
        width: 30,
        height: 30,
        borderRadius: 30,
        backgroundColor: '#F02C56',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: {
        width: 15,
        height: 15,
        borderRadius: 15,
        backgroundColor: '#fff',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '72%',
        borderRadius: 16,
        paddingVertical: 22,
        paddingHorizontal: 18,
        backgroundColor: '#fff',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        marginTop: 6,
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        textAlign: 'center',
    },
    sub: {
        fontSize: 13,
        color: '#666',
    },
});
