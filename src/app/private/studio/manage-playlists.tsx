import { useTheme } from '@/contexts/ThemeContext'
import {
    deletePlaylist,
    fetchPlaylistDetails,
    updatePlaylist,
} from '@/utils/requests'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRoute, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native'
import tw from 'twrnc'
import {
    useAddToPlaylist,
    usePlaylistVideos,
    useRemoveFromPlaylist,
    useStudioVideos,
} from '../../../hooks/usePlaylistManagement'

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can view', icon: 'earth-outline' },
  { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link', icon: 'link-outline' },
  { value: 'private', label: 'Private', description: 'Only you', icon: 'lock-closed-outline' },
  { value: 'followers', label: 'Followers', description: 'Only your followers', icon: 'people-outline' },
]

function formatDuration(seconds) {
  if (seconds == null) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function VideoRow({ item, action }) {
  const duration = formatDuration(item.media?.duration)
  return (
    <View style={tw`flex-row items-center px-4 py-3`}>
      <View style={tw`w-14 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800`}>
        {item.media?.thumbnail ? (
          <Image source={{ uri: item.media.thumbnail }} style={tw`w-full h-full`} />
        ) : (
          <View style={tw`w-full h-full items-center justify-center`}>
            <Ionicons
              name="videocam-outline"
              size={20}
              color={tw.color('text-gray-400 dark:text-gray-500')}
            />
          </View>
        )}
        {duration ? (
          <View style={tw`absolute bottom-1 right-1 bg-black/70 rounded px-1`}>
            <Text style={tw`text-[10px] text-white font-medium`}>{duration}</Text>
          </View>
        ) : null}
      </View>
      <View style={tw`flex-1 mx-3`}>
        <Text numberOfLines={2} style={tw`text-sm text-gray-900 dark:text-white`}>
          {item.caption || 'Untitled'}
        </Text>
        <View style={tw`flex-row items-center mt-1.5`}>
          <Ionicons
            name="heart"
            size={12}
            color={tw.color('text-gray-400 dark:text-gray-500')}
          />
          <Text style={tw`text-xs text-gray-400 dark:text-gray-500 ml-1 mr-3`}>
            {item.likes}
          </Text>
          <Ionicons
            name="chatbubble"
            size={11}
            color={tw.color('text-gray-400 dark:text-gray-500')}
          />
          <Text style={tw`text-xs text-gray-400 dark:text-gray-500 ml-1`}>
            {item.comments}
          </Text>
        </View>
      </View>
      {action}
    </View>
  )
}

export default function ManagePlaylistScreen() {
  const route = useRoute()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const { id: playlistId, name: playlistName } = route.params ?? {}

  const [mode, setMode] = useState('current')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput.trim())
  const [busy, setBusy] = useState({})

  const [showSettings, setShowSettings] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', visibility: 'public' })

  const isAdd = mode === 'add'

  const { data: details } =  useQuery({
        queryKey: ['playlistDetails', playlistId],
        queryFn: () => fetchPlaylistDetails(playlistId),
  });

  const detailsRef = useRef(details)
  useEffect(() => {
    detailsRef.current = details
  }, [details])

  const current = usePlaylistVideos({ playlistId })
  const studio = useStudioVideos({ search, enabled: isAdd })

  const addMutation = useAddToPlaylist(playlistId)
  const removeMutation = useRemoveFromPlaylist(playlistId)

  const updateMutation = useMutation({
    mutationFn: (payload) => updatePlaylist(playlistId, payload),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['playlistDetails', playlistId], (old) => ({
        ...(old ?? {}),
        ...variables,
        ...(data ?? {}),
      }))
      queryClient.invalidateQueries({ queryKey: ['playlistDetails', playlistId] })
      setShowSettings(false)
    },
    onError: () => Alert.alert('Error', 'Could not update playlist'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
      queryClient.invalidateQueries({ queryKey: ['studio-playlists'] })
      queryClient.invalidateQueries({ queryKey: ['accountPlaylists'] })
      setShowSettings(false)
      router.back()
    },
    onError: () => Alert.alert('Error', 'Could not delete playlist'),
  })

  const currentVideos = useMemo(
    () => current.data?.pages.flatMap((p) => p.data) ?? [],
    [current.data]
  )
  const studioVideos = useMemo(
    () => studio.data?.pages.flatMap((p) => p.data) ?? [],
    [studio.data]
  )
  const inPlaylistIds = useMemo(
    () => new Set(currentVideos.map((v) => v.id)),
    [currentVideos]
  )

  const setVideoBusy = useCallback((id, value) => {
    setBusy((b) => {
      if (value) return { ...b, [id]: true }
      const next = { ...b }
      delete next[id]
      return next
    })
  }, [])

  const handleAdd = useCallback(
    (video) => {
        console.log(`adding ${video.id}`)
      setVideoBusy(video.id, true)
      addMutation.mutate(video.id, {
        onSettled: () => setVideoBusy(video.id, false),
      })
    },
    [addMutation, setVideoBusy]
  )

  const handleRemove = (video) => {
    Alert.alert(
        'Remove video', 
        'Are you sure you want to remove this video from this playlist?', 
        [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => handleRemovePerform(video) },
        ]
    );
  }

  const handleRemovePerform = useCallback(
    (video) => {
      setVideoBusy(video.id, true)
      removeMutation.mutate(video.id, {
        onSettled: () => setVideoBusy(video.id, false),
      })
    },
    [removeMutation, setVideoBusy]
  )

  const switchMode = useCallback((next) => {
    setMode(next)
    setSearchInput('')
  }, [])

  const openSettings = useCallback(() => {
    const d = detailsRef.current
    setForm({
      name: d?.name ?? '',
      description: d?.description ?? '',
      visibility: d?.visibility ?? 'public',
    })
    setShowSettings(true)
  }, [])

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) {
      Alert.alert('Name required', 'Please enter a playlist name')
      return
    }
    updateMutation.mutate({
      name,
      description: form.description.trim(),
      visibility: form.visibility,
    })
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete playlist',
      'Are you sure you want to delete this playlist? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    )
  }

  const renderRemoveAction = (video) => (
    <Pressable
      onPress={() => handleRemove(video)}
      disabled={!!busy[video.id]}
      hitSlop={8}
      style={tw`w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800`}
    >
      {busy[video.id] ? (
        <ActivityIndicator size="small" color={tw.color('text-gray-400')} />
      ) : (
        <Ionicons name="remove" size={20} color={tw.color('text-red-500')} />
      )}
    </Pressable>
  )

  const renderAddAction = (video) => {
    const added = inPlaylistIds.has(video.id)
    if (busy[video.id]) {
      return (
        <View style={tw`w-9 h-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800`}>
          <ActivityIndicator size="small" color={tw.color('text-gray-400')} />
        </View>
      )
    }
    return (
      <Pressable
        onPress={() => (added ? handleRemove(video) : handleAdd(video))}
        hitSlop={8}
        style={tw.style(
          'w-9 h-9 rounded-full items-center justify-center',
          added ? 'bg-gray-900 dark:bg-white' : 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Ionicons
          name={added ? 'checkmark' : 'add'}
          size={20}
          color={
            added
              ? tw.color('text-white dark:text-gray-900')
              : tw.color('text-gray-900 dark:text-white')
          }
        />
      </Pressable>
    )
  }

  const activeQuery = isAdd ? studio : current
  const videos = isAdd ? studioVideos : currentVideos

  const renderEmpty = () => {
    if (activeQuery.isLoading) {
      return (
        <View style={tw`flex-1 items-center justify-center py-20`}>
          <ActivityIndicator color={tw.color('text-gray-400')} />
        </View>
      )
    }
    if (activeQuery.isError) {
      return (
        <View style={tw`flex-1 items-center justify-center px-8 py-20`}>
          <Ionicons
            name="cloud-offline-outline"
            size={32}
            color={tw.color('text-gray-400 dark:text-gray-500')}
          />
          <Text style={tw`text-base text-gray-500 dark:text-gray-400 mt-3 text-center`}>
            Could not load videos
          </Text>
          <Pressable
            onPress={() => activeQuery.refetch()}
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
          name={isAdd ? 'search-outline' : 'film-outline'}
          size={32}
          color={tw.color('text-gray-400 dark:text-gray-500')}
        />
        <Text style={tw`text-base text-gray-500 dark:text-gray-400 mt-3 text-center`}>
          {isAdd
            ? search
              ? 'No videos match your search'
              : 'No videos to add'
            : 'This playlist has no videos yet'}
        </Text>
      </View>
    )
  }

  return (
    <View style={tw`flex-1 bg-white dark:bg-black`}>
        <Stack.Screen
            options={{
                title: 'Playlist',
                headerStyle: { backgroundColor: isDark ? '#000' : '#ffffff' },
                headerTintColor: isDark ? '#F3F4F6' : '#000',
                headerTitleStyle: {
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                },
                headerShadowVisible: false,
                headerBackTitle: 'Playlists',
                headerRight: () => (
                    <Pressable onPress={openSettings} hitSlop={8}>
                        <Ionicons
                            name="settings-outline"
                            size={22}
                            color={isDark ? '#F3F4F6' : '#000'}
                        />
                    </Pressable>
                ),
            }}
        />
      {details?.name ? (
        <Text
          numberOfLines={1}
          style={tw`px-4 pt-2 text-lg font-bold text-gray-900 dark:text-white`}
        >
          {details?.name}
        </Text>
      ) : null}

      {details?.description ? (
        <Text
          numberOfLines={3}
          style={tw`px-4 py-2 text-sm text-gray-900 dark:text-white`}
        >
          {details?.description}
        </Text>
      ) : null}

      <View style={tw`flex-row mx-4 mt-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800`}>
        {[
          ['current', 'In Playlist'],
          ['add', 'Add Videos'],
        ].map(([key, label]) => {
          const active = mode === key
          return (
            <Pressable
              key={key}
              onPress={() => switchMode(key)}
              style={tw.style(
                'flex-1 py-2 rounded-lg items-center',
                active && 'bg-white dark:bg-black'
              )}
            >
              <Text
                style={tw.style(
                  'text-sm font-semibold',
                  active
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {isAdd ? (
        <View style={tw`px-4 pt-3`}>
          <View style={tw`flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3`}>
            <Ionicons
              name="search"
              size={18}
              color={tw.color('text-gray-400 dark:text-gray-500')}
            />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search your videos"
              placeholderTextColor={tw.color('text-gray-400 dark:text-gray-500')}
              style={tw`flex-1 py-2.5 px-2 text-base text-gray-900 dark:text-white`}
              returnKeyType="search"
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
        </View>
      ) : null}

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VideoRow
            item={item}
            action={isAdd ? renderAddAction(item) : renderRemoveAction(item)}
          />
        )}
        onEndReached={() => {
          if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
            activeQuery.fetchNextPage()
          }
        }}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        style={tw`mt-2`}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching && !activeQuery.isFetchingNextPage}
            onRefresh={activeQuery.refetch}
            tintColor={tw.color('text-gray-400')}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          activeQuery.isFetchingNextPage ? (
            <View style={tw`py-6`}>
              <ActivityIndicator color={tw.color('text-gray-400')} />
            </View>
          ) : null
        }
        contentContainerStyle={videos.length === 0 ? tw`flex-grow` : undefined}
      />

      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1 justify-end`}
        >
          <Pressable
            style={tw`absolute inset-0 bg-black/50`}
            onPress={() => setShowSettings(false)}
          />
          <View style={tw`bg-white dark:bg-black rounded-t-3xl max-h-[88%]`}>
            <View style={tw`flex-row items-center justify-between px-5 pt-5 pb-3`}>
              <Text style={tw`text-xl font-bold text-gray-900 dark:text-white`}>
                Playlist Settings
              </Text>
              <Pressable
                onPress={() => setShowSettings(false)}
                hitSlop={8}
                style={tw`w-8 h-8 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-800`}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={tw.color('text-gray-900 dark:text-white')}
                />
              </Pressable>
            </View>

            <ScrollView
              style={tw`px-5`}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={tw`text-sm font-semibold text-gray-500 dark:text-gray-400 mt-2 mb-1.5`}>
                Name
              </Text>
              <TextInput
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="Playlist name"
                multiline={false}
                placeholderTextColor={tw`text-gray-400 dark:text-gray-500`}
                style={tw`bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-5 flex justify-center text-gray-900 dark:text-white`}
                textAlignVertical="center"
                autoCapitalize="sentences"
              />

              <Text style={tw`text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-1.5`}>
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="Add a description"
                placeholderTextColor={tw.color('text-gray-400 dark:text-gray-500')}
                multiline
                numberOfLines={7}
                maxLength={1000}
                textAlignVertical="top"
                style={tw`bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-3 text-base text-gray-900 dark:text-white min-h-24`}
              />
              <Text style={tw`text-sm text-right text-gray-500 dark:text-gray-400 mb-1.5`}>
                { form?.description?.length }/1000
              </Text>

              <Text style={tw`text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-1.5`}>
                Visibility
              </Text>
              <View style={tw`bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden`}>
                {VISIBILITY_OPTIONS.map((opt, i) => {
                  const selected = form.visibility === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setForm((f) => ({ ...f, visibility: opt.value }))}
                      style={tw.style(
                        'flex-row items-center px-3 py-3',
                        i > 0 && 'border-t border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={tw.color('text-gray-500 dark:text-gray-400')}
                      />
                      <View style={tw`flex-1 ml-3`}>
                        <Text style={tw`text-base text-gray-900 dark:text-white`}>
                          {opt.label}
                        </Text>
                        <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-0.5`}>
                          {opt.description}
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={tw.color('text-gray-900 dark:text-white')}
                        />
                      ) : (
                        <View style={tw`w-[22px] h-[22px] rounded-full border-2 border-gray-300 dark:border-gray-600`} />
                      )}
                    </Pressable>
                  )
                })}
              </View>

              <Pressable
                onPress={handleSave}
                disabled={updateMutation.isPending}
                style={tw`mt-6 py-3.5 rounded-xl items-center justify-center bg-gray-900 dark:bg-white`}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={isDark ? '#000' : '#fff'}
                  />
                ) : (
                  <Text style={tw`text-base font-semibold text-white dark:text-gray-900`}>
                    Save Changes
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
                style={tw`mt-3 py-3.5 rounded-xl items-center justify-center flex-row`}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator size="small" color={tw.color('text-red-500')} />
                ) : (
                  <>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={tw.color('text-red-500')}
                    />
                    <Text style={tw`text-base font-semibold text-red-500 ml-2`}>
                      Delete Playlist
                    </Text>
                  </>
                )}
              </Pressable>

              <View style={tw`h-8`} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}