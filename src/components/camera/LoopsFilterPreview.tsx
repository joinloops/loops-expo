import { requireNativeComponent, StyleSheet, ViewStyle } from 'react-native'

const NativeLoopsFilterPreview = requireNativeComponent<{ style?: ViewStyle }>(
  'LoopsFilterPreviewView'
)

export function LoopsFilterPreview({ style }: { style?: ViewStyle }) {
  return <NativeLoopsFilterPreview style={[StyleSheet.absoluteFill, style]} />
}