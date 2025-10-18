import { Storage } from '@/utils/cache';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
    primary: {
        bg: string;
        text: string;
    };
    secondary: {
        bg: string;
        text: string;
    };
    success: {
        bg: string;
        text: string;
    };
    warning: {
        bg: string;
        text: string;
    };
    danger: {
        bg: string;
        text: string;
    };
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
}

const lightTheme: Theme = {
    primary: {
        bg: 'bg-blue-500',
        text: 'text-white',
    },
    secondary: {
        bg: 'bg-gray-500',
        text: 'text-white',
    },
    success: {
        bg: 'bg-green-500',
        text: 'text-white',
    },
    warning: {
        bg: 'bg-yellow-500',
        text: 'text-gray-900',
    },
    danger: {
        bg: 'bg-red-500',
        text: 'text-white',
    },
    background: 'bg-white',
    surface: 'bg-gray-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
};

const darkTheme: Theme = {
    primary: {
        bg: 'bg-blue-600',
        text: 'text-white',
    },
    secondary: {
        bg: 'bg-gray-700',
        text: 'text-white',
    },
    success: {
        bg: 'bg-green-600',
        text: 'text-white',
    },
    warning: {
        bg: 'bg-yellow-600',
        text: 'text-gray-900',
    },
    danger: {
        bg: 'bg-red-600',
        text: 'text-white',
    },
    background: 'bg-gray-900',
    surface: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
};

interface ThemeStore {
    mode: ThemeMode;
    theme: Theme;
    setMode: (mode: ThemeMode) => void;
    toggleMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => {
    // Load theme from storage
    const savedMode = Storage.getString('theme_mode') as ThemeMode | undefined;
    const initialMode = savedMode || 'light';

    return {
        mode: initialMode,
        theme: initialMode === 'light' ? lightTheme : darkTheme,
        setMode: (mode) => {
            Storage.set('theme_mode', mode);
            set({
                mode,
                theme: mode === 'light' ? lightTheme : darkTheme,
            });
        },
        toggleMode: () => {
            set((state) => {
                const newMode = state.mode === 'light' ? 'dark' : 'light';
                Storage.set('theme_mode', newMode);
                return {
                    mode: newMode,
                    theme: newMode === 'light' ? lightTheme : darkTheme,
                };
            });
        },
    };
});
