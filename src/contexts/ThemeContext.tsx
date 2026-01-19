import { Storage } from '@/utils/cache';
import React, { PropsWithChildren, createContext, useContext, useEffect } from 'react';
import tw, { useAppColorScheme, useDeviceContext } from 'twrnc';

export const storage = Storage;

type ColorScheme = 'light' | 'dark' | 'device';

type ThemeContextType = {
    colorScheme: ColorScheme;
    toggleTheme: () => void;
    setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = (props: PropsWithChildren) => {
    useDeviceContext(tw, {
        observeDeviceColorSchemeChanges: false,
        initialColorScheme: (storage.getString('colorScheme') as ColorScheme) || 'light',
    });

    const [colorScheme, toggleColorScheme, setColorScheme] = useAppColorScheme(tw);

    const toggleTheme = () => {
        toggleColorScheme();
    };

    useEffect(() => {
        if (colorScheme) {
            storage.set('colorScheme', colorScheme as string);
        }
    }, [colorScheme]);

    return (
        <ThemeContext.Provider
            key={tw.memoBuster}
            {...props}
            value={{ colorScheme: colorScheme as ColorScheme, toggleTheme, setColorScheme }}
        />
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }

    return context;
};
