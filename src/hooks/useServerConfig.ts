import { useQuery } from '@tanstack/react-query';
import {
    fetchServerConfig,
    serverConfigQueryKey,
    type AppConfig,
    type FeatureFlag,
} from '../services/config';

const ONE_DAY = 1000 * 60 * 60 * 24;

export function useServerConfig() {
    return useQuery({
        queryKey: serverConfigQueryKey,
        queryFn: fetchServerConfig,
        staleTime: ONE_DAY,
        gcTime: ONE_DAY * 7,
    });
}

export function useFeatureFlag(flag: FeatureFlag): boolean {
    const { data } = useServerConfig();
    return Boolean(data?.[flag]);
}

export function useConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] | undefined {
    const { data } = useServerConfig();
    return data?.[key];
}
