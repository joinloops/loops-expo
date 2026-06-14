import { useTheme } from '@/contexts/ThemeContext'
import { fetchPlaylistLimits, fetchPlaylists } from '@/utils/requests'
import { Ionicons } from '@expo/vector-icons'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View,
} from 'react-native'
import tw from 'twrnc'

const SORT_OPTIONS = [
  { label: 'Ordered', field: 'order_column', direction: 'asc' },
  { label: 'Newest', field: 'created_at', direction: 'desc' },
  { label: 'Name', field: 'name', direction: 'asc' },
]

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function PlaylistRow({ item, onPress }) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={tw`flex-row items-center px-4 py-3 active:bg-gray-100 dark:active:bg-gray-800`}
    >
      <View style={tw`w-16 h-24 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800`}>
        {item.cover_image ? (
          <Image source={{ uri: item.cover_image }} style={tw`w-full h-full`} />
        ) : (
          <View style={tw`w-full h-full items-center justify-center`}>
            <Ionicons
              name="film-outline"
              size={22}
              color={tw.color('text-gray-400 dark:text-gray-500')}
            />
          </View>
        )}
      </View>
      <View style={tw`flex-1 ml-3`}>
        <View style={tw`flex-row items-center`}>
          <Text
            numberOfLines={1}
            style={tw`flex-1 text-base font-semibold text-gray-900 dark:text-white`}
          >
            {item.name}
          </Text>
          {item.visibility === 'private' && (
            <Ionicons
              name="lock-closed"
              size={13}
              color={tw.color('text-gray-400 dark:text-gray-500')}
              style={tw`ml-2`}
            />
          )}
        </View>
        {item.description ? (
          <Text
            numberOfLines={1}
            style={tw`text-sm text-gray-500 dark:text-gray-400 mt-0.5`}
          >
            {item.description}
          </Text>
        ) : null}
        <Text style={tw`text-xs text-gray-400 dark:text-gray-500 mt-1`}>
          {item.videos_count} {item.videos_count === 1 ? 'video' : 'videos'}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={tw.color('text-gray-300 dark:text-gray-600')}
      />
    </Pressable>
  )
}

export default function PlaylistsScreen() {
  const router = useRouter()
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
  const [searchInput, setSearchInput] = useState('')
  const [sortIndex, setSortIndex] = useState(0)
  const search = useDebouncedValue(searchInput.trim())
  const sort = SORT_OPTIONS[sortIndex]

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['studio-playlists', `search:${search}`, `sortField:${sort.field}`, `sortDirection:${sort.direction}`],
    queryFn: ({ pageParam }) => 
        fetchPlaylists({ 
            cursor: pageParam as string | null,
            search: search,
            sortField: sort.field,
            sortDirection: sort.direction,
        }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.meta?.next_cursor ?? undefined,
  })

    const { data: playlistLimits } = useQuery({
        queryKey: ['studio', 'playlistLimits'],
        queryFn: () => fetchPlaylistLimits()
    })

    const canCreate = !playlistLimits?.feature_unavailable && playlistLimits?.can_create;


  const playlists = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  )

  const handleAddNewPlaylist = () => {
    console.log('add new playlist')
    console.log(playlistLimits)

    router.push('/private/studio/create-playlist')
  }

  const handleOpen = useCallback(
    (playlist) => router.push(`/private/studio/manage-playlists?id=${playlist.id}&name=${playlist.name}`),
    [router]
  )

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <ActivityIndicator color={tw.color('text-gray-400')} />
        </View>
      )
    }
    if (isError) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-20`}>
          <Ionicons
            name="cloud-offline-outline"
            size={32}
            color={tw.color('text-gray-400 dark:text-gray-500')}
          />
          <Text style={tw`text-base text-gray-500 dark:text-gray-400 mt-3 text-center`}>
            Could not load playlists
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={tw`mt-4 px-4 py-2 rounded-full bg-gray-900 dark:bg-white`}
          >
            <Text style={tw`text-sm font-medium text-white dark:text-gray-900`}>
              Try again
            </Text>
          </Pressable>
        </View>
      )
    }
    return (
      <View style={tw`flex-1 items-center justify-center px-8 py-20`}>
        <Ionicons
          name="albums-outline"
          size={32}
          color={tw.color('text-gray-400 dark:text-gray-500')}
        />
        <Text style={tw`text-base text-gray-500 dark:text-gray-400 mt-3 text-center`}>
          {search ? 'No playlists match your search' : 'No playlists yet'}
        </Text>
      </View>
    )
  }

  return (
    <View style={tw`flex-1 bg-white dark:bg-black`}>
    <Stack.Screen
            options={{
                title: 'My Playlists',
                headerStyle: { backgroundColor: isDark ? '#000' : '#ffffff' },
                headerTintColor: isDark ? '#F3F4F6' : '#000',
                headerTitleStyle: {
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                },
                headerShadowVisible: false,
                headerBackTitle: 'Studio',
                headerRight: () => canCreate ? (
                    <Pressable
                        hitSlop={8}
                        disabled={!canCreate}
                        onPress={handleAddNewPlaylist}
                        style={tw`${canCreate ? '' : 'opacity-40'}`}>
                        <Ionicons
                            name="add-circle-outline"
                            size={22}
                            color={isDark ? '#F3F4F6' : '#000'}
                        />
                    </Pressable>
                ) : null,
            }}
        />
      <View style={tw`px-4 pt-2 pb-3`}>
        <View style={tw`flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3`}>
          <Ionicons
            name="search"
            size={18}
            color={tw.color('text-gray-400 dark:text-gray-500')}
          />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search playlists"
            placeholderTextColor={tw.color('text-gray-400 dark:text-gray-500')}
            style={tw`flex-1 h-12 flex align-center lh-0 px-2 text-gray-900 dark:text-white [include-font-padding:false]`}
            returnKeyType="search"
            textAlignVertical="center"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={18}
                color={tw.color('text-gray-400 dark:text-gray-500')}
              />
            </Pressable>
          )}
        </View>

        <View style={tw`flex-row mt-3`}>
          {SORT_OPTIONS.map((opt, i) => {
            const active = i === sortIndex
            return (
              <Pressable
                key={opt.label}
                onPress={() => setSortIndex(i)}
                style={tw.style(
                  'mr-2 px-3 py-1.5 rounded-full',
                  active ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'
                )}
              >
                <Text
                  style={tw.style(
                    'text-sm font-medium',
                    active
                      ? 'text-white dark:text-gray-900'
                      : 'text-gray-600 dark:text-gray-300'
                  )}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlaylistRow item={item} onPress={handleOpen} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={tw.color('text-gray-400')}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={tw`py-6`}>
              <ActivityIndicator color={tw.color('text-gray-400')} />
            </View>
          ) : <View style={tw`h-30`} />
        }
        contentContainerStyle={playlists.length === 0 ? tw`flex-grow` : undefined}
      />
    </View>
  )
}