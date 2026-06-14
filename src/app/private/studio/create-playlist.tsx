import { useTheme } from '@/contexts/ThemeContext'
import { createPlaylist, fetchPlaylistLimits } from '@/utils/requests'
import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
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
} from 'react-native'
import tw from 'twrnc'

const NAME_MAX = 20
const DESC_MAX = 1000

const VISIBILITY = [
  { value: 'public', label: 'Public', description: 'Anyone can view', icon: 'earth-outline' },
  { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link', icon: 'link-outline' },
  { value: 'private', label: 'Private', description: 'Only you', icon: 'lock-closed-outline' },
  { value: 'followers', label: 'Followers', description: 'Only your followers', icon: 'people-outline' },
]

export default function CreatePlaylistScreen() {
  const router = useRouter()
  const { colorScheme } = useTheme()
  const isDark = colorScheme === 'dark'
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState('public')

  const { data: playlistLimits } = useQuery({
    queryKey: ['studio', 'playlistLimits'],
    queryFn: fetchPlaylistLimits,
  })

  const createMutation = useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio-playlists'] })
      qc.invalidateQueries({ queryKey: ['studio', 'playlistLimits'] })
    },
  })

  const limitReached = playlistLimits?.can_create === false
  const trimmedName = name.trim()
  const canSubmit =
    trimmedName.length > 0 && !limitReached && !createMutation.isPending

  const handleCreate = () => {
    if (!canSubmit) return
    createMutation.mutate(
      {
        name: trimmedName,
        description: description.trim() || null,
        visibility,
      },
      {
        onSuccess: (playlist) => {
          router.replace({
            pathname: `/private/studio/manage-playlists?id=${playlist.id}&name=${playlist.name}`,
            params: { id: playlist.id, name: playlist.name },
          })
        },
        onError: (err) => {
          console.log(err)
          Alert.alert(
            'Could not create playlist',
            'Something went wrong. Please try again.'
          )
        },
      }
    )
  }

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-white dark:bg-black`}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

    <Stack.Screen
            options={{
                title: 'Create Playlist',
                headerStyle: { backgroundColor: isDark ? '#000' : '#ffffff' },
                headerTintColor: isDark ? '#F3F4F6' : '#000',
                headerTitleStyle: {
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                },
                headerShadowVisible: false,
                headerBackTitle: 'Playlists',
            }}
        />
      <ScrollView
        contentContainerStyle={tw`pb-10`}
        keyboardShouldPersistTaps="handled"
      >
        {limitReached ? (
          <View style={tw`flex-row items-start mx-4 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950`}>
            <Ionicons
              name="alert-circle"
              size={18}
              color="#ef4444"
              style={tw`mt-0.5`}
            />
            <Text style={tw`flex-1 ml-2 text-sm text-red-600 dark:text-red-400`}>
              {playlistLimits?.limit != null
                ? `You've reached your limit of ${playlistLimits.limit} playlists. Delete one to create a new playlist.`
                : `You've reached your playlist limit. Delete one to create a new playlist.`}
            </Text>
          </View>
        ) : null}

        <View style={tw`px-4 mt-5`}>
          <View style={tw`flex-row items-center justify-between mb-1.5`}>
            <Text style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}>
              Name
            </Text>
            <Text style={tw`text-xs text-gray-400 dark:text-gray-500`}>
              {name.length}/{NAME_MAX}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Playlist name"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            maxLength={NAME_MAX}
            editable={!limitReached}
            style={tw`bg-gray-100 dark:bg-gray-800 rounded-xl px-3.5 py-3 text-base text-gray-900 dark:text-white`}
            returnKeyType="next"
          />
        </View>

        <View style={tw`px-4 mt-5`}>
          <View style={tw`flex-row items-center justify-between mb-1.5`}>
            <Text style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300`}>
              Description
            </Text>
            <Text style={tw`text-xs text-gray-400 dark:text-gray-500`}>
              {description.length}/{DESC_MAX}
            </Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this playlist about?"
            placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
            maxLength={DESC_MAX}
            editable={!limitReached}
            multiline
            textAlignVertical="top"
            style={tw`bg-gray-100 dark:bg-gray-800 rounded-xl px-3.5 py-3 text-base text-gray-900 dark:text-white h-28`}
          />
        </View>

        <View style={tw`px-4 mt-5`}>
          <Text style={tw`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5`}>
            Visibility
          </Text>
          {VISIBILITY.map((opt) => {
            const selected = visibility === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                disabled={limitReached}
                style={tw.style(
                  'flex-row items-center p-3.5 rounded-xl mb-2 border',
                  selected
                    ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-800'
                )}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isDark ? '#d1d5db' : '#374151'}
                />
                <View style={tw`flex-1 ml-3`}>
                  <Text style={tw`text-base font-medium text-gray-900 dark:text-white`}>
                    {opt.label}
                  </Text>
                  <Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-0.5`}>
                    {opt.description}
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={
                    selected
                      ? isDark
                        ? '#ffffff'
                        : '#111827'
                      : isDark
                        ? '#4b5563'
                        : '#d1d5db'
                  }
                />
              </Pressable>
            )
          })}
        </View>

        <View style={tw`px-4 mt-6`}>
          <Pressable
            onPress={handleCreate}
            disabled={!canSubmit}
            style={tw.style(
              'flex-row items-center justify-center py-3.5 rounded-xl',
              canSubmit ? 'bg-gray-900 dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            )}
          >
            {createMutation.isPending ? (
              <ActivityIndicator
                size="small"
                color={isDark ? '#111827' : '#ffffff'}
              />
            ) : (
              <Text
                style={tw.style(
                  'text-base font-semibold',
                  canSubmit
                    ? 'text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                Create Playlist
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}