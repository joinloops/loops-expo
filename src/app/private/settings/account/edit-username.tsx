import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/utils/authStore';
import { Storage } from '@/utils/cache';
import {
    checkAccountUsername,
    fetchAccountUsernameSettings,
    updateAccountUsername,
} from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import tw from 'twrnc';

type UsernameHistoryRow = {
    username: string;
    source: string;
    is_revert: boolean;
    started_at: string | null;
    ended_at: string | null;
};

type UsernameSettings = {
    enabled: boolean;
    username: string;
    domain: string;
    reserved_username: string | null;
    reserved_at: string | null;
    limit: number;
    window_days: number;
    cooldown_hours: number;
    changes_used: number;
    changes_remaining: number;
    cooldown_ends_at: string | null;
    limit_resets_at: string | null;
    can_change: boolean;
    can_revert: boolean;
    requires_password: boolean;
    min_length: number;
    max_length: number;
    history: UsernameHistoryRow[];
};

type CheckResult = {
    username: string;
    available: boolean;
    is_revert: boolean;
    reason: string | null;
    message: string | null;
};

const ACCENT = '#F02C56';

const relativeTime = (iso: string | null) => {
    if (!iso) return '';
    const diffSeconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSeconds);
    if (abs >= 86400) {
        const days = Math.round(diffSeconds / 86400);
        return days === 1 ? 'tomorrow' : `in ${days} days`;
    }
    if (abs >= 3600) {
        const hours = Math.round(diffSeconds / 3600);
        return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    const minutes = Math.max(1, Math.round(diffSeconds / 60));
    return `in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
};

const shortDate = (iso: string | null) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export default function EditUsernameScreen() {
    const queryClient = useQueryClient();
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const server = Storage.getString('app.instance');

    const [input, setInput] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const checkToken = useRef(0);

    const {
        data: settings,
        isLoading,
        refetch,
    } = useQuery<UsernameSettings>({
        queryKey: ['usernameSettings'],
        queryFn: async () => {
            const res = await fetchAccountUsernameSettings();
            return res.data;
        },
    });

    const cleaned = useMemo(() => input.trim().replace(/^@+/, ''), [input]);
    const currentUsername = settings?.username;

    const onChangeUsername = useCallback((text: string) => {
        checkToken.current++;
        setInput(text.replace(/\s/g, ''));
        setCheckResult(null);
        setUsernameError('');
        setIsChecking(false);
    }, []);

    useEffect(() => {
        if (!cleaned || !currentUsername || cleaned === currentUsername) {
            return;
        }

        const token = ++checkToken.current;

        const timer = setTimeout(async () => {
            setIsChecking(true);
            try {
                const res = await checkAccountUsername({ username: cleaned });
                if (token !== checkToken.current) return;
                setCheckResult(res.data);
                setUsernameError(res.data.available ? '' : res.data.message || '');
            } catch (error: any) {
                if (token !== checkToken.current) return;
                setUsernameError(error?.message || 'Could not check this username.');
            } finally {
                if (token === checkToken.current) setIsChecking(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [cleaned, currentUsername]);

    const mutation = useMutation({
        mutationFn: async (payload: { username: string; password: string | null }) => {
            return await updateAccountUsername(payload);
        },
        onSuccess: (res) => {
            const account = res.data.account;
            queryClient.setQueryData(['fetchSelfAccount', 'self'], account);
            queryClient.setQueryData(['usernameSettings'], res.data.status);

            const { user, server: authServer, setUser } = useAuthStore.getState();
            if (user && authServer) {
                setUser(
                    { ...user, username: account.username, acct: account.username },
                    authServer,
                );
            }

            setInput('');
            setPassword('');
            setCheckResult(null);

            Alert.alert(
                'Username updated',
                `You are now @${account.username}. Links to your old username will redirect while it stays reserved for you.`,
                [{ text: 'OK', onPress: () => router.back() }],
            );
        },
        onError: (error: any) => {
            const reason = error?.data?.reason;
            if (reason === 'password') {
                setPasswordError(error.message);
            } else {
                setUsernameError(error?.message || 'Something went wrong. Please try again.');
            }
            if (reason === 'cooldown' || reason === 'limit') {
                refetch();
            }
        },
    });

    const confirmAndSave = useCallback(
        (target: string, isRevert: boolean) => {
            if (!settings) return;
            if (settings.requires_password && !password) {
                setPasswordError('Enter your password to confirm');
                return;
            }

            Alert.alert(
                'Change your username?',
                isRevert
                    ? `You will switch back to @${target}. This does not count toward your limit.`
                    : `You will become @${target}. Your current username @${settings.username} stays reserved for you until you change it again.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Change',
                        onPress: () =>
                            mutation.mutate({
                                username: target,
                                password: settings.requires_password ? password : null,
                            }),
                    },
                ],
            );
        },
        [settings, password, mutation],
    );

    const canSave =
        !!settings?.enabled &&
        !mutation.isPending &&
        !isChecking &&
        !!checkResult?.available &&
        checkResult.username === cleaned &&
        (!settings.requires_password || !!password);

    const handleSave = useCallback(() => {
        if (!canSave || !checkResult) return;
        confirmAndSave(cleaned, checkResult.is_revert);
    }, [canSave, checkResult, cleaned, confirmAndSave]);

    const blockedNotice = useMemo(() => {
        if (!settings?.enabled) return '';
        if (settings.cooldown_ends_at) {
            return `You can change it again ${relativeTime(settings.cooldown_ends_at)}.`;
        }
        if (settings.changes_remaining === 0 && settings.limit_resets_at) {
            return `Your next change opens up ${relativeTime(settings.limit_resets_at)}.`;
        }
        return '';
    }, [settings]);

    const placeholderColor = isDark ? '#6b7280' : '#9ca3af';
    const revertDisabled = !settings?.can_revert || mutation.isPending;

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    title: 'Username',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: isDark ? '#fff' : '#000',
                    headerBackTitle: 'Account',
                    headerShown: true,
                    headerRight: () =>
                        mutation.isPending ? (
                            <ActivityIndicator size="small" color={ACCENT} />
                        ) : (
                            <Pressable onPress={handleSave} disabled={!canSave}>
                                <Text
                                    style={[
                                        tw`text-base font-semibold`,
                                        canSave ? tw`text-[#F02C56]` : tw`text-gray-400`,
                                    ]}>
                                    Save
                                </Text>
                            </Pressable>
                        ),
                }}
            />

            {isLoading || !settings ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator color={ACCENT} />
                </View>
            ) : (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={tw`flex-1`}>
                    <ScrollView
                        contentContainerStyle={tw`p-5 pb-12`}
                        keyboardShouldPersistTaps="handled">
                        <Text style={tw`text-sm text-gray-500 dark:text-gray-400 mb-4`}>
                            Your username is your handle on Loops and across the fediverse.
                        </Text>

                        {!settings.enabled && (
                            <View
                                style={tw`mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`}>
                                <Text style={tw`text-sm text-gray-700 dark:text-gray-300`}>
                                    Username changes are not available on this server.
                                </Text>
                            </View>
                        )}

                        <View
                            style={tw`flex-row items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mb-4`}>
                            <View style={tw`flex-1 mr-3`}>
                                <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mb-1`}>
                                    Current username
                                </Text>
                                <Text
                                    style={tw`text-lg font-semibold text-gray-900 dark:text-white`}
                                    numberOfLines={1}>
                                    @{settings.username}
                                </Text>
                            </View>
                            <View
                                style={[
                                    tw`flex-row items-center px-2.5 py-1 rounded-full`,
                                    settings.changes_remaining > 0
                                        ? tw`bg-green-100 dark:bg-green-900/40`
                                        : tw`bg-orange-100 dark:bg-orange-900/40`,
                                ]}>
                                <Ionicons
                                    name="refresh"
                                    size={12}
                                    color={settings.changes_remaining > 0 ? '#16a34a' : '#ea580c'}
                                />
                                <Text
                                    style={[
                                        tw`text-xs font-medium ml-1`,
                                        settings.changes_remaining > 0
                                            ? tw`text-green-700 dark:text-green-300`
                                            : tw`text-orange-700 dark:text-orange-300`,
                                    ]}>
                                    {settings.changes_remaining} of {settings.limit} left
                                </Text>
                            </View>
                        </View>

                        {settings.reserved_username && (
                            <View
                                style={tw`p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 mb-4`}>
                                <View style={tw`flex-row items-start`}>
                                    <Ionicons
                                        name="lock-closed"
                                        size={18}
                                        color={isDark ? '#93c5fd' : '#3b82f6'}
                                        style={tw`mt-0.5`}
                                    />
                                    <View style={tw`flex-1 ml-2.5`}>
                                        <Text
                                            style={tw`text-sm font-semibold text-blue-800 dark:text-blue-200`}>
                                            Reserved for you
                                        </Text>
                                        <Text
                                            style={tw`text-sm text-blue-700 dark:text-blue-300 mt-0.5`}>
                                            @{settings.reserved_username} is held for you until your
                                            next change, so you can switch back anytime.
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    disabled={revertDisabled}
                                    onPress={() =>
                                        confirmAndSave(settings.reserved_username as string, true)
                                    }
                                    style={({ pressed }) => [
                                        tw`mt-3 py-2.5 rounded-lg items-center border border-blue-200 dark:border-blue-800 bg-white dark:bg-black`,
                                        pressed && tw`opacity-70`,
                                        revertDisabled && tw`opacity-50`,
                                    ]}>
                                    <Text
                                        style={tw`text-sm font-semibold text-blue-700 dark:text-blue-200`}>
                                        Switch back to @{settings.reserved_username}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <Text style={tw`text-sm font-medium text-gray-700 dark:text-gray-300 mb-2`}>
                            New username
                        </Text>
                        <View
                            style={[
                                tw`flex-row items-center rounded-lg border bg-gray-50 dark:bg-gray-900`,
                                usernameError
                                    ? tw`border-red-300 dark:border-red-800`
                                    : tw`border-gray-200 dark:border-gray-800`,
                            ]}>
                            <Text style={tw`text-base text-gray-400 pl-4`}>@</Text>
                            <TextInput
                                style={tw`flex-1 text-base text-gray-900 dark:text-white py-3 px-2`}
                                value={input}
                                onChangeText={onChangeUsername}
                                placeholder={settings.username}
                                placeholderTextColor={placeholderColor}
                                maxLength={settings.max_length}
                                editable={settings.enabled && !mutation.isPending}
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                returnKeyType="done"
                            />
                            {isChecking ? (
                                <ActivityIndicator size="small" color="#999" style={tw`mr-3`} />
                            ) : checkResult?.available ? (
                                <Ionicons
                                    name="checkmark-circle"
                                    size={20}
                                    color="#22c55e"
                                    style={tw`mr-3`}
                                />
                            ) : usernameError ? (
                                <Ionicons
                                    name="close-circle"
                                    size={20}
                                    color="#ef4444"
                                    style={tw`mr-3`}
                                />
                            ) : null}
                        </View>

                        <View style={tw`flex-row justify-between mt-2`}>
                            <View style={tw`flex-1 mr-3`}>
                                {usernameError ? (
                                    <View style={tw`flex-row items-start`}>
                                        <Ionicons
                                            name="alert-circle"
                                            size={16}
                                            color="#ef4444"
                                            style={tw`mt-0.5`}
                                        />
                                        <Text style={tw`text-sm text-red-500 ml-1 flex-1`}>
                                            {usernameError}
                                        </Text>
                                    </View>
                                ) : checkResult?.available ? (
                                    <Text style={tw`text-sm text-green-600 dark:text-green-400`}>
                                        {checkResult.is_revert
                                            ? 'Available, this is your reserved username'
                                            : 'Available'}
                                    </Text>
                                ) : null}
                            </View>
                            <Text style={tw`text-sm text-gray-400`}>
                                {cleaned.length}/{settings.max_length}
                            </Text>
                        </View>

                        <View
                            style={tw`mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800`}>
                            <Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>
                                Your profile will be at
                            </Text>
                            <Text
                                style={tw`text-sm font-medium text-gray-900 dark:text-white mt-1`}>
                                {server || settings.domain}/@{cleaned || settings.username}
                            </Text>
                        </View>

                        {settings.requires_password && (
                            <View style={tw`mt-5`}>
                                <Text
                                    style={tw`text-sm font-medium text-gray-700 dark:text-gray-300 mb-2`}>
                                    Confirm your password
                                </Text>
                                <View
                                    style={[
                                        tw`flex-row items-center rounded-lg border bg-gray-50 dark:bg-gray-900`,
                                        passwordError
                                            ? tw`border-red-300 dark:border-red-800`
                                            : tw`border-gray-200 dark:border-gray-800`,
                                    ]}>
                                    <TextInput
                                        style={tw`flex-1 text-base text-gray-900 dark:text-white py-3 px-4`}
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setPasswordError('');
                                        }}
                                        placeholder="Enter your current password"
                                        placeholderTextColor={placeholderColor}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        textContentType="password"
                                        editable={settings.enabled && !mutation.isPending}
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword((v) => !v)}
                                        hitSlop={8}
                                        style={tw`px-3`}>
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color="#999"
                                        />
                                    </Pressable>
                                </View>
                                {!!passwordError && (
                                    <Text style={tw`text-sm text-red-500 mt-2`}>
                                        {passwordError}
                                    </Text>
                                )}
                            </View>
                        )}

                        {!!blockedNotice && (
                            <View style={tw`flex-row items-start mt-4`}>
                                <Ionicons
                                    name="time-outline"
                                    size={16}
                                    color="#ea580c"
                                    style={tw`mt-0.5`}
                                />
                                <Text
                                    style={tw`text-sm text-orange-600 dark:text-orange-400 ml-1.5 flex-1`}>
                                    {blockedNotice}
                                </Text>
                            </View>
                        )}

                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-5 leading-5`}>
                            You can change your username {settings.limit} times every{' '}
                            {settings.window_days} days, with at least {settings.cooldown_hours}{' '}
                            hours between changes. Switching back to your reserved username does not
                            count toward the limit.
                        </Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-2 leading-5`}>
                            Your followers stay with you. Other servers pick up the new handle when
                            they receive the update, and some may take a little while.
                        </Text>

                        {settings.history.length > 1 && (
                            <View style={tw`mt-6`}>
                                <Text
                                    style={tw`text-sm font-medium text-gray-700 dark:text-gray-300 mb-2`}>
                                    Recent usernames
                                </Text>
                                <View
                                    style={tw`rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden`}>
                                    {settings.history.map((row, index) => (
                                        <View
                                            key={`${row.username}-${row.started_at}-${index}`}
                                            style={[
                                                tw`flex-row items-center justify-between px-4 py-3 bg-white dark:bg-black`,
                                                index > 0 &&
                                                    tw`border-t border-gray-100 dark:border-gray-800`,
                                            ]}>
                                            <View style={tw`flex-1 mr-3`}>
                                                <Text
                                                    style={tw`text-base text-gray-900 dark:text-white`}
                                                    numberOfLines={1}>
                                                    @{row.username}
                                                </Text>
                                                <Text
                                                    style={tw`text-xs text-gray-500 dark:text-gray-400 mt-0.5`}>
                                                    {shortDate(row.started_at)}
                                                    {row.ended_at
                                                        ? ` to ${shortDate(row.ended_at)}`
                                                        : ''}
                                                </Text>
                                            </View>
                                            {!row.ended_at ? (
                                                <View
                                                    style={tw`px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40`}>
                                                    <Text
                                                        style={tw`text-xs font-medium text-green-700 dark:text-green-300`}>
                                                        Current
                                                    </Text>
                                                </View>
                                            ) : row.username === settings.reserved_username ? (
                                                <View
                                                    style={tw`px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40`}>
                                                    <Text
                                                        style={tw`text-xs font-medium text-blue-700 dark:text-blue-300`}>
                                                        Reserved
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );
}
