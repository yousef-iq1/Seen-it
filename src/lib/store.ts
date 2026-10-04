"use client";
import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import type { Swipe, SwipeAction, Title, UserList } from "@/lib/types";
import { applySwipe, emptyProfile, normalizeProfile, revertSwipe, type TasteProfile, } from "@/lib/engine/taste";
import { getLocalItem, getLocalTitle, vectorOf } from "@/lib/catalog";
function makeSeed(): number {
    return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
const WRITE_DELAY_MS = 400;
export const PERSISTENCE_ERROR_EVENT = "seen-it:persistence-error";
let pendingWrite: {
    key: string;
    value: StorageValue<SeenItState>;
} | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
function flushWrite() {
    if (writeTimer) {
        clearTimeout(writeTimer);
        writeTimer = null;
    }
    if (!pendingWrite)
        return;
    try {
        localStorage.setItem(pendingWrite.key, JSON.stringify(pendingWrite.value));
    }
    catch (error) {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(PERSISTENCE_ERROR_EVENT, {
                detail: error instanceof Error ? error.message : "Browser storage is unavailable",
            }));
        }
    }
    pendingWrite = null;
}
if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flushWrite);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden")
            flushWrite();
    });
}
const deferredStorage: PersistStorage<SeenItState> = {
    getItem: (name) => {
        if (pendingWrite?.key === name)
            return pendingWrite.value;
        if (typeof localStorage === "undefined")
            return null;
        const raw = localStorage.getItem(name);
        if (!raw)
            return null;
        try {
            return JSON.parse(raw) as StorageValue<SeenItState>;
        }
        catch {
            return null;
        }
    },
    setItem: (name, value) => {
        pendingWrite = { key: name, value };
        if (writeTimer)
            clearTimeout(writeTimer);
        writeTimer = setTimeout(flushWrite, WRITE_DELAY_MS);
    },
    removeItem: (name) => {
        pendingWrite = null;
        if (writeTimer)
            clearTimeout(writeTimer);
        if (typeof localStorage !== "undefined")
            localStorage.removeItem(name);
    },
};
export type Settings = {
    showSeenButton: boolean;
    swipeUp: "not_seen" | "seen";
    screenFeedback: boolean;
    haptics: boolean;
    reach: "narrow" | "medium" | "wide";
    locale: "auto" | "ar" | "en";
};
export const DEFAULT_SETTINGS: Settings = {
    showSeenButton: false,
    swipeUp: "not_seen",
    screenFeedback: true,
    haptics: true,
    reach: "narrow",
    locale: "auto",
};
interface SeenItState {
    swipes: Record<string, Swipe>;
    swipeOrder: string[];
    profile: TasteProfile;
    seed: number;
    lists: UserList[];
    publicProfile: {
        name: string;
        bio: string;
        avatarUrl: string;
    };
    onboardingSeen: boolean;
    settings: Settings;
    accountOwner: string | null;
    deletedSwipeIds: string[];
    deletedListIds: string[];
    passed: string[];
    swipe: (title: Title, action: SwipeAction) => void;
    learnPasses: (titles: Title[]) => void;
    undo: () => string | null;
    removeSwipe: (titleId: string) => void;
    resetAll: () => void;
    eraseAllUserData: () => void;
    setAccountOwner: (userId: string | null) => void;
    rebuildProfile: () => void;
    setOnboardingSeen: () => void;
    setPublicProfile: (p: {
        name: string;
        bio: string;
        avatarUrl: string;
    }) => void;
    setSettings: (patch: Partial<Settings>) => void;
    compactSwipes: () => void;
    createList: (name: string, sourceListId?: string) => string;
    deleteList: (id: string) => void;
    renameList: (id: string, name: string) => void;
    toggleListItem: (listId: string, titleId: string) => void;
    setListPublic: (listId: string, isPublic: boolean) => void;
    setListHideOwner: (listId: string, hide: boolean) => void;
    addToList: (listId: string, titleIds: string[]) => void;
    removeFromList: (listId: string, titleIds: string[]) => void;
}
function titleFor(swipe: Swipe): Title | undefined {
    return getLocalTitle(swipe.titleId) ?? swipe.title;
}
function snapshot(title: Title): Title {
    return { ...title, overview: { en: "", ar: "" }, related: undefined };
}
export const useSeenIt = create<SeenItState>()(persist((set, get) => ({
    swipes: {},
    swipeOrder: [],
    profile: emptyProfile(),
    seed: makeSeed(),
    lists: [],
    publicProfile: { name: "", bio: "", avatarUrl: "" },
    onboardingSeen: false,
    settings: DEFAULT_SETTINGS,
    accountOwner: null,
    deletedSwipeIds: [],
    deletedListIds: [],
    passed: [],
    setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    compactSwipes: () => set((s) => {
        let changed = 0;
        const slim: Record<string, Swipe> = {};
        for (const [id, sw] of Object.entries(s.swipes)) {
            if (sw.title && getLocalItem(id)) {
                const { title: _drop, ...rest } = sw;
                slim[id] = rest;
                changed++;
            }
            else {
                slim[id] = sw;
            }
        }
        return changed > 0 ? { swipes: slim } : {};
    }),
    learnPasses: (titles) => set((s) => {
        const already = new Set(s.passed);
        const fresh = titles.filter((t) => !already.has(t.id) && !s.swipes[t.id]);
        if (fresh.length === 0)
            return {};
        return { passed: [...s.passed, ...fresh.map((t) => t.id)] };
    }),
    swipe: (title, action) => {
        const v = vectorOf(title);
        set((s) => {
            const existed = s.swipes[title.id];
            let profile = s.profile;
            const oldTitle = existed ? titleFor(existed) : undefined;
            if (existed && oldTitle) {
                profile = revertSwipe(profile, oldTitle, vectorOf(oldTitle), existed.action);
            }
            profile = applySwipe(profile, title, v, action);
            return {
                swipes: {
                    ...s.swipes,
                    [title.id]: {
                        titleId: title.id,
                        action,
                        at: Date.now(),
                        title: getLocalItem(title.id) ? undefined : snapshot(title),
                    },
                },
                swipeOrder: [...s.swipeOrder.filter((id) => id !== title.id), title.id],
                deletedSwipeIds: s.deletedSwipeIds.filter((id) => id !== title.id),
                profile,
            };
        });
    },
    undo: () => {
        const s = get();
        const lastId = s.swipeOrder[s.swipeOrder.length - 1];
        if (!lastId)
            return null;
        const last = s.swipes[lastId];
        const title = last ? titleFor(last) : undefined;
        set((st) => {
            const swipes = { ...st.swipes };
            delete swipes[lastId];
            return {
                swipes,
                swipeOrder: st.swipeOrder.slice(0, -1),
                deletedSwipeIds: st.deletedSwipeIds.includes(lastId)
                    ? st.deletedSwipeIds
                    : [...st.deletedSwipeIds, lastId],
                profile: title && last
                    ? revertSwipe(st.profile, title, vectorOf(title), last.action)
                    : st.profile,
            };
        });
        return lastId;
    },
    removeSwipe: (titleId) => {
        const s = get();
        const sw = s.swipes[titleId];
        if (!sw)
            return;
        const title = titleFor(sw);
        set((st) => {
            const swipes = { ...st.swipes };
            delete swipes[titleId];
            return {
                swipes,
                swipeOrder: st.swipeOrder.filter((id) => id !== titleId),
                deletedSwipeIds: st.deletedSwipeIds.includes(titleId)
                    ? st.deletedSwipeIds
                    : [...st.deletedSwipeIds, titleId],
                profile: title
                    ? revertSwipe(st.profile, title, vectorOf(title), sw.action)
                    : st.profile,
            };
        });
    },
    rebuildProfile: () => set((s) => {
        let profile = emptyProfile();
        for (const id of s.swipeOrder) {
            const sw = s.swipes[id];
            const title = sw?.title ?? getLocalTitle(id);
            if (sw && title)
                profile = applySwipe(profile, title, vectorOf(title), sw.action);
        }
        return { profile };
    }),
    resetAll: () => set({
        swipes: {},
        swipeOrder: [],
        passed: [],
        profile: emptyProfile(),
        seed: makeSeed(),
    }),
    eraseAllUserData: () => {
        try {
            localStorage.removeItem("seen-it-sentinels");
            sessionStorage.removeItem("seen-it:add-shared-list");
        }
        catch {
        }
        set({
            swipes: {},
            swipeOrder: [],
            passed: [],
            profile: emptyProfile(),
            seed: makeSeed(),
            lists: [],
            publicProfile: { name: "", bio: "", avatarUrl: "" },
            onboardingSeen: false,
            settings: DEFAULT_SETTINGS,
            accountOwner: null,
            deletedSwipeIds: [],
            deletedListIds: [],
        });
    },
    setAccountOwner: (userId) => set({ accountOwner: userId }),
    setOnboardingSeen: () => set({ onboardingSeen: true }),
    setPublicProfile: (p) => set({ publicProfile: p }),
    createList: (name, sourceListId) => {
        const id = `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        set((s) => ({
            lists: [
                ...s.lists,
                {
                    id,
                    name,
                    isPublic: false,
                    titleIds: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ...(sourceListId ? { sourceListId } : null),
                },
            ],
        }));
        return id;
    },
    deleteList: (id) => set((s) => ({
        lists: s.lists.filter((l) => l.id !== id),
        deletedListIds: s.deletedListIds.includes(id)
            ? s.deletedListIds
            : [...s.deletedListIds, id],
    })),
    renameList: (id, name) => set((s) => ({
        lists: s.lists.map((l) => (l.id === id ? { ...l, name, updatedAt: Date.now() } : l)),
    })),
    setListHideOwner: (listId, hide) => set((s) => ({
        lists: s.lists.map((l) => (l.id === listId ? { ...l, hideOwner: hide, updatedAt: Date.now() } : l)),
    })),
    addToList: (listId, titleIds) => set((s) => ({
        lists: s.lists.map((l) => l.id === listId
            ? { ...l, titleIds: [...new Set([...l.titleIds, ...titleIds])], updatedAt: Date.now() }
            : l),
    })),
    removeFromList: (listId, titleIds) => {
        const drop = new Set(titleIds);
        set((s) => ({
            lists: s.lists.map((l) => l.id === listId
                ? { ...l, titleIds: l.titleIds.filter((id) => !drop.has(id)), updatedAt: Date.now() }
                : l),
        }));
    },
    toggleListItem: (listId, titleId) => set((s) => ({
        lists: s.lists.map((l) => l.id === listId
            ? {
                ...l,
                titleIds: l.titleIds.includes(titleId)
                    ? l.titleIds.filter((t) => t !== titleId)
                    : [...l.titleIds, titleId],
                updatedAt: Date.now(),
            }
            : l),
    })),
    setListPublic: (listId, isPublic) => set((s) => ({
        lists: s.lists.map((l) => (l.id === listId ? { ...l, isPublic, updatedAt: Date.now() } : l)),
    })),
}), {
    name: "seen-it-store",
    version: 7,
    storage: deferredStorage,
    migrate: (persisted: unknown, version: number) => {
        const state = persisted as Partial<SeenItState> | undefined;
        if (!state)
            return persisted as SeenItState;
        const order = state.swipeOrder ?? [];
        const swipes = state.swipes ?? {};
        if (version >= 4) {
            const slim: Record<string, Swipe> = {};
            for (const [id, sw] of Object.entries(swipes)) {
                slim[id] = sw.title ? { ...sw, title: snapshot(sw.title) } : sw;
            }
            return { ...state, swipes: slim } as SeenItState;
        }
        let profile = emptyProfile();
        for (const id of order) {
            const sw = swipes[id];
            const title = sw?.title ?? getLocalTitle(id);
            if (sw && title)
                profile = applySwipe(profile, title, vectorOf(title), sw.action);
        }
        return {
            ...state,
            profile,
            seed: state.seed ?? makeSeed(),
            accountOwner: state.accountOwner ?? null,
            deletedSwipeIds: Array.isArray(state.deletedSwipeIds) ? state.deletedSwipeIds : [],
            deletedListIds: Array.isArray(state.deletedListIds) ? state.deletedListIds : [],
        } as SeenItState;
    },
    merge: (persisted, current) => {
        const state = (persisted ?? {}) as Partial<SeenItState>;
        return {
            ...current,
            ...state,
            seed: state.seed ?? current.seed,
            passed: state.passed ?? [],
            settings: { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) },
            accountOwner: state.accountOwner ?? null,
            deletedSwipeIds: Array.isArray(state.deletedSwipeIds) ? state.deletedSwipeIds : [],
            deletedListIds: Array.isArray(state.deletedListIds) ? state.deletedListIds : [],
            profile: normalizeProfile(state.profile),
        };
    },
}));
export const selectWatched = (s: SeenItState) => Object.values(s.swipes).filter((sw) => sw.action !== "not_seen");
export const selectLiked = (s: SeenItState) => Object.values(s.swipes).filter((sw) => sw.action === "liked");
