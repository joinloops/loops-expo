import { SHARE_TARGETS, ShareTarget, targetIdentifier } from '@/utils/shareTargets';
import { checkInstalledApps } from 'expo-check-installed-apps';
import { useEffect, useState } from 'react';

let cachedTargets: ShareTarget[] | null = null;

const fallbackTargets = SHARE_TARGETS.filter((t) => t.alwaysAvailable);

export function useInstalledShareApps() {
    const [targets, setTargets] = useState<ShareTarget[]>(cachedTargets ?? fallbackTargets);

    useEffect(() => {
        if (cachedTargets) return;

        let active = true;

        const identifiers = SHARE_TARGETS.filter((t) => !t.alwaysAvailable)
            .map(targetIdentifier)
            .filter((v): v is string => !!v);

        if (!identifiers.length) {
            cachedTargets = fallbackTargets;
            return;
        }

        checkInstalledApps(identifiers)
            .then((installed) => {
                const resolved = SHARE_TARGETS.filter((t) => {
                    if (t.alwaysAvailable) return true;
                    const key = targetIdentifier(t);
                    return !!key && installed[key] === true;
                });
                cachedTargets = resolved;
                if (active) setTargets(resolved);
            })
            .catch(() => {
                cachedTargets = fallbackTargets;
                if (active) setTargets(fallbackTargets);
            });

        return () => {
            active = false;
        };
    }, []);

    return targets;
}
