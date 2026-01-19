// src/app/private/_layout.tsx
import { Stack } from 'expo-router';

export default function PrivateLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerBackTitleVisible: false,
                headerShadowVisible: false,
            }}></Stack>
    );
}
