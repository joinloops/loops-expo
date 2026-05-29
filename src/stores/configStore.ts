import { create } from 'zustand';
import type { AppConfig, FeatureFlag } from '../services/config';

type ConfigState = {
    config: AppConfig | null;
    setConfig: (c: AppConfig | null) => void;
    flag: (key: FeatureFlag) => boolean;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
    config: null,
    setConfig: (config) => set({ config }),
    flag: (key) => Boolean(get().config?.[key]),
}));
