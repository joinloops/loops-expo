import { Storage } from '@/utils/cache';

export type AppConfig = {
    app: {
        name: string;
        url: string;
        description: string;
        software: string;
        version: string;
    };
    media: {
        max_video_size: number;
        max_video_duration: number;
        allowed_video_formats: string[];
    };
    fyf: boolean;
    registration: boolean;
    registration_mode: 'open' | 'closed' | 'approval';
    federation: boolean;
    pushNotifications: boolean;
    starterKits: boolean;
    atomFeeds: boolean;
    hasKlipy: boolean;
};

export type FeatureFlag = {
    [K in keyof AppConfig]: AppConfig[K] extends boolean ? K : never;
}[keyof AppConfig];

export async function fetchServerConfig(): Promise<AppConfig> {
    const server = Storage.getString('app.instance');
    const url = `https://${server}/api/v1/config`;

    const resp = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
    });

    if (!resp.ok) {
        console.log('Config endpoint not available, using defaults');
        return { fyf: false };
    }

    const data = await resp.json();
    return data;
}

export const serverConfigQueryKey = ['server-config'] as const;
