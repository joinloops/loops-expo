import { PressableHaptics } from '@/components/ui/PressableHaptics';
import { StackText, XStack, YStack } from '@/components/ui/Stack';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchAnalytics } from '@/utils/requests';
import { Ionicons } from '@expo/vector-icons';
import { Circle, matchFont } from '@shopify/react-native-skia';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    TextInput,
    View,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedProps,
    useAnimatedReaction,
    useDerivedValue,
} from 'react-native-reanimated';
import tw from 'twrnc';
import { CartesianChart, Line, useChartPressState } from 'victory-native';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type MetricId = 'views' | 'likes' | 'comments' | 'shares' | 'followers';

interface Tab {
    id: MetricId;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}

const TABS: Tab[] = [
    { id: 'views', label: 'Video views', icon: 'play-outline', activeIcon: 'play' },
    { id: 'likes', label: 'Likes', icon: 'heart-outline', activeIcon: 'heart' },
    { id: 'comments', label: 'Comments', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
    { id: 'shares', label: 'Shares', icon: 'sync', activeIcon: 'sync-circle' },
    { id: 'followers', label: 'Followers', icon: 'person-add-outline', activeIcon: 'person-add' },
];

const RANGES: { id: 7 | 30 | 60; label: string }[] = [
    { id: 7, label: '7d' },
    { id: 30, label: '30d' },
    { id: 60, label: '60d' },
];

const ACCENT = '#F02C56';

const formatCompact = (n: number): string => {
    'worklet';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) {
        return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    }
    if (abs >= 1_000) {
        return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    }
    return String(Math.round(n));
};

const formatShortDate = (iso: string): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatLongDate = (iso: string): string => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

interface AnalyticsResponse {
    data: Record<string, any>[];
    total: number;
}

interface TabPillProps {
    tab: Tab;
    active: boolean;
    onPress: () => void;
    colorScheme: 'light' | 'dark';
}

const TabPill = ({ tab, active, onPress, colorScheme }: TabPillProps) => {
    const iconColor = active
        ? colorScheme === 'dark'
            ? '#000'
            : '#FFF'
        : colorScheme === 'dark'
          ? '#9CA3AF'
          : '#6B7280';

    return (
        <PressableHaptics
            onPress={onPress}
            style={({ pressed }) => [
                tw`flex-row items-center px-4 py-2 mr-2 rounded-full border`,
                active
                    ? tw`bg-black dark:bg-white border-black dark:border-white`
                    : tw`bg-transparent border-gray-200 dark:border-gray-800`,
                pressed && tw`opacity-60`,
            ]}>
            <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={15}
                color={iconColor}
                style={tw`mr-1.5`}
            />
            <StackText
                fontSize="$3"
                fontWeight="semibold"
                textColor={
                    active ? 'text-white dark:text-black' : 'text-gray-600 dark:text-gray-400'
                }>
                {tab.label}
            </StackText>
        </PressableHaptics>
    );
};

const RangeSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={tw`flex-row bg-gray-100 dark:bg-slate-900 rounded-full p-1 self-start`}>
        {RANGES.map((r) => {
            const active = r.id === value;
            return (
                <PressableHaptics
                    key={r.id}
                    onPress={() => onChange(r.id)}
                    style={({ pressed }) => [
                        tw`px-4 py-1.5 rounded-full`,
                        active && tw`bg-white dark:bg-slate-700`,
                        pressed && tw`opacity-70`,
                    ]}>
                    <StackText
                        fontSize="$3"
                        fontWeight={active ? 'semibold' : 'normal'}
                        textColor={
                            active
                                ? 'text-black dark:text-white'
                                : 'text-slate-500 dark:text-slate-400'
                        }>
                        {r.label}
                    </StackText>
                </PressableHaptics>
            );
        })}
    </View>
);

export default function AnalyticsScreen() {
    const { colorScheme } = useTheme();
    const [activeTab, setActiveTab] = useState<MetricId>('views');
    const [range, setRange] = useState<number>(30);
    const [activeIndex, setActiveIndex] = useState<number>(-1);

    const { data, isLoading, isError, refetch } = useQuery<AnalyticsResponse>({
        queryKey: ['analytics', activeTab, range],
        queryFn: () => fetchAnalytics(activeTab, range),
        staleTime: 60_000,
    });

    const chartData = useMemo(() => {
        if (!data?.data?.length) return [];
        return data.data.map((d, i) => {
            const raw = d[activeTab] ?? d.value ?? d.count ?? d.views ?? d.followers ?? 0;
            return {
                x: i,
                value: typeof raw === 'number' ? raw : Number(raw) || 0,
                date: d.date as string,
                dateLabel: formatLongDate(d.date),
                shortDate: formatShortDate(d.date),
            };
        });
    }, [data, activeTab]);

    const total = data?.total ?? 0;

    const fontFamily = Platform.select({
        ios: 'Helvetica Neue',
        android: 'sans-serif',
        default: 'sans-serif',
    });
    const font = matchFont({
        fontFamily: fontFamily!,
        fontSize: 11,
        fontStyle: 'normal',
        fontWeight: 'normal',
    });

    const { state, isActive } = useChartPressState({
        x: 0,
        y: { value: 0 },
    });

    useAnimatedReaction(
        () => ({
            active: isActive.value,
            x: state.x.value.value,
        }),
        (curr, prev) => {
            const newIdx = curr.active ? Math.round(curr.x) : -1;
            const prevIdx = prev?.active ? Math.round(prev.x) : -1;
            if (newIdx !== prevIdx) {
                runOnJS(setActiveIndex)(newIdx);
            }
        },
    );

    const headlineValue = useDerivedValue(() => {
        if (!isActive.value) return formatCompact(total);
        return formatCompact(state.y.value.value.value);
    });

    const headlineProps = useAnimatedProps(() => {
        return { text: headlineValue.value, defaultValue: headlineValue.value } as any;
    });

    const activePoint = activeIndex >= 0 ? (chartData[activeIndex] ?? null) : null;
    const subtitle = activePoint
        ? activePoint.dateLabel
        : chartData.length > 0
          ? `Last ${chartData.length} days`
          : '';

    const axisLabelColor = colorScheme === 'dark' ? '#6B7280' : '#9CA3AF';
    const axisLineColor = colorScheme === 'dark' ? '#1F2937' : '#F3F4F6';
    const headlineColor = colorScheme === 'dark' ? '#FFFFFF' : '#000000';
    const subtitleColor = colorScheme === 'dark' ? '#9CA3AF' : '#6B7280';

    const activeTabLabel = TABS.find((t) => t.id === activeTab)?.label ?? '';

    return (
        <View style={tw`flex-1 bg-white dark:bg-black`}>
            <Stack.Screen
                options={{
                    headerTitle: 'Analytics',
                    title: 'Analytics',
                    headerStyle: tw`bg-white dark:bg-black`,
                    headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
                    headerTitleStyle: {
                        fontSize: 22,
                        fontWeight: 'bold',
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                    },
                    headerBackTitle: 'Studio',
                    headerShadowVisible: false,
                    headerShown: true,
                }}
            />

            <ScrollView contentContainerStyle={tw`pb-12`} showsVerticalScrollIndicator={false}>
                <FlatList
                    data={TABS}
                    keyExtractor={(t) => t.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`px-4 py-3`}
                    renderItem={({ item }) => (
                        <TabPill
                            tab={item}
                            active={item.id === activeTab}
                            onPress={() => setActiveTab(item.id)}
                            colorScheme={colorScheme}
                        />
                    )}
                />

                <View style={tw`px-4 pb-4`}>
                    <RangeSelector value={range} onChange={setRange} />
                </View>

                <View style={tw`px-4 pb-3`}>
                    <StackText
                        fontSize="$3"
                        textColor="text-gray-500 dark:text-gray-400"
                        fontWeight="semibold">
                        {activeTabLabel.toUpperCase()}
                    </StackText>
                    <View style={tw`mt-1 flex-row items-baseline`}>
                        <AnimatedTextInput
                            editable={false}
                            underlineColorAndroid="transparent"
                            style={[
                                tw`p-0 m-0`,
                                {
                                    fontSize: 36,
                                    fontWeight: '700',
                                    color: headlineColor,
                                    minWidth: 120,
                                },
                            ]}
                            animatedProps={headlineProps}
                        />
                    </View>
                    <StackText
                        fontSize="$3"
                        textColor="text-gray-500 dark:text-gray-400"
                        style={tw`mt-1`}>
                        {subtitle}
                    </StackText>
                </View>

                <View style={[tw`px-4`, { height: 280 }]}>
                    {isLoading ? (
                        <YStack flex={1} alignItems="center" justifyContent="center">
                            <ActivityIndicator size="large" color={ACCENT} />
                        </YStack>
                    ) : isError ? (
                        <YStack flex={1} alignItems="center" justifyContent="center">
                            <Ionicons name="alert-circle-outline" size={32} color={subtitleColor} />
                            <StackText
                                fontSize="$3"
                                textColor="text-gray-500 dark:text-gray-400"
                                style={tw`mt-2`}>
                                Could not load analytics.
                            </StackText>
                            <Pressable
                                onPress={() => refetch()}
                                style={tw`mt-3 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-900`}>
                                <StackText
                                    fontSize="$3"
                                    fontWeight="semibold"
                                    textColor="text-black dark:text-white">
                                    Retry
                                </StackText>
                            </Pressable>
                        </YStack>
                    ) : chartData.length === 0 ? (
                        <YStack flex={1} alignItems="center" justifyContent="center">
                            <Ionicons name="bar-chart-outline" size={32} color={subtitleColor} />
                            <StackText
                                fontSize="$3"
                                textColor="text-gray-500 dark:text-gray-400"
                                style={tw`mt-2`}>
                                No data yet for this range.
                            </StackText>
                        </YStack>
                    ) : (
                        <CartesianChart
                            data={chartData}
                            xKey="x"
                            yKeys={['value']}
                            chartPressState={state}
                            domainPadding={{ left: 16, right: 16, top: 32, bottom: 8 }}
                            axisOptions={{
                                font,
                                labelColor: axisLabelColor,
                                lineColor: axisLineColor,
                                tickCount: { x: range <= 7 ? 7 : 5, y: 4 },
                                formatXLabel: (idx) => {
                                    const point = chartData[Math.round(Number(idx))];
                                    return point ? point.shortDate : '';
                                },
                                formatYLabel: (v) => formatCompact(Number(v)),
                            }}>
                            {({ points }) => (
                                <>
                                    <Line
                                        points={points.value}
                                        color={ACCENT}
                                        strokeWidth={3}
                                        curveType="natural"
                                        animate={{ type: 'timing', duration: 300 }}
                                    />
                                    {isActive && (
                                        <>
                                            <Circle
                                                cx={state.x.position}
                                                cy={state.y.value.position}
                                                r={11}
                                                color={ACCENT}
                                                opacity={0.2}
                                            />
                                            <Circle
                                                cx={state.x.position}
                                                cy={state.y.value.position}
                                                r={6}
                                                color={ACCENT}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </CartesianChart>
                    )}
                </View>

                {chartData.length > 0 && (
                    <View style={tw`mt-8`}>
                        <View style={tw`px-4 pb-2`}>
                            <XStack style={tw`items-center justify-between`}>
                                <StackText
                                    fontSize="$5"
                                    fontWeight="semibold"
                                    textColor="text-black dark:text-gray-200">
                                    Daily breakdown
                                </StackText>

                                <StackText
                                    fontSize="$3"
                                    textColor="text-gray-500 dark:text-gray-400">
                                    ({range === 7 ? 'past 7 days' : 'past 14 days'})
                                </StackText>
                            </XStack>
                        </View>
                        {[...chartData]
                            .reverse()
                            .slice(0, 14)
                            .map((d) => (
                                <View
                                    key={d.date}
                                    style={tw`flex-row items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-900`}>
                                    <StackText
                                        fontSize="$3"
                                        textColor="text-gray-700 dark:text-gray-300">
                                        {d.dateLabel}
                                    </StackText>
                                    <StackText
                                        fontSize="$3"
                                        fontWeight="semibold"
                                        textColor="text-black dark:text-white">
                                        {d.value.toLocaleString()}
                                    </StackText>
                                </View>
                            ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
