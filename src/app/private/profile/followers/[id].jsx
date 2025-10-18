import AccountListItem from '@/components/profile/AccountListItem';
import { StackText, YStack } from '@/components/ui/Stack';
import { fetchAccountFollowers } from '@/utils/requests';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';
import tw from 'twrnc';

const keyExtractor = (_, index) => `followers-${_.id}-${index}`;

export default function Screen() {
    const { id } = useLocalSearchParams();

    const RenderItem = ({ item }) => <AccountListItem key={item.id} item={item} />;
    const {
        data: feed,
        fetchNextPage,
        fetchPreviousPage,
        hasNextPage,
        hasPreviousPage,
        isFetchingNextPage,
        isRefetching,
        refetch,
        isFetching,
        status,
        isError,
        error,
    } = useInfiniteQuery({
        queryKey: ['accountFollowing', id],
        queryFn: fetchAccountFollowers,
        initialPageParam: 0,
        refetchOnWindowFocus: false,
        getNextPageParam: (lastPage) => lastPage.meta?.next_cursor,
    });

    const EmptyList = useCallback(() => {
        if (isFetching || isFetchingNextPage) {
            return null;
        }

        if (feed?.pages?.length && feed.pages.some((page) => page.data.length > 0)) {
            return null;
        }

        if (status === 'success') {
            return (
                <YStack paddingY="$5" justifyContent="center" alignItems="center">
                    <StackText fontSize="$5">This account is not followed by anyone yet.</StackText>
                </YStack>
            );
        }

        return null;
    }, [isFetching, isFetchingNextPage, status, feed]);

    const feedData = useMemo(() => {
        if (!feed?.pages?.length) return [];
        return feed.pages.flatMap((p) => p?.data ?? []);
    }, [feed]);

    return (
        <View style={tw`justify-center flex-1`}>
            <Stack.Screen
                options={{
                    title: 'User',
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
                    headerTitle: 'Followers',
                }}
            />
            <FlatList
                data={feedData}
                keyExtractor={keyExtractor}
                renderItem={RenderItem}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={EmptyList}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <YStack paddingY="$6" alignItems="center">
                            <ActivityIndicator />
                        </YStack>
                    ) : null
                }
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={() => refetch()}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
