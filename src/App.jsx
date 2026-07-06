import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import FloatingMusicPlayer from "./components/FloatingMusicPlayer.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TourProvider from "./components/TourProvider.jsx";
import { createKeyedDebouncer } from "./lib/debounce.js";
import { buildMarkdownExport, getRelationshipEndpointId } from "./lib/markdownExport.js";
import { deleteImageFromStorage } from "./lib/mediaStorage.js";
import {
  SHARE_ROLES,
  createShareLink as createSharedNovelLink,
  decorateSharedNovel,
  ensureSharedNovel,
  getActiveShareLink,
  getOrCreateShareLink,
  getSharedNovelByToken,
  joinSharedNovel,
  leaveSharedNovel,
  loadSharedNovelsForUser,
  parseShareRoute,
  revokeShareRole,
  saveSharedNovel,
  stripSharedNovel,
  subscribeToSharedDraftPreviews,
  subscribeToSharedNovel,
  subscribeToSharedNovelPresence,
} from "./lib/shareAdapter.js";
import {
  createSharedSaveNotice,
  createSharedDraftPreview,
  formatPresenceLabel,
  formatSharedSaveNotice,
  getSharedSaveSnippet,
  isLocalSharedSaveEcho,
  isObsoleteSharedRealtimeUpdate,
  pruneExpiredSharedDrafts,
  rememberLocalSharedSave,
  shouldHandleSharedRealtimeUpdate,
} from "./lib/sharedCollaboration.js";
import { getLocalAuthUser, hasSupabaseConfig, setLocalAuthUser, supabase } from "./lib/supabaseClient.js";
import { clearLocalAuthorHubData, flushCloudSave, isCloudSaveBlocked, loadAuthorHubData, retryCloudSync, saveAuthorHubData } from "./lib/shimoAdapter.js";

const AuthGate = lazy(() => import("./components/AuthGate.jsx"));
const AuthorDashboard = lazy(() => import("./components/AuthorDashboard.jsx"));
const LandingGateway = lazy(() => import("./components/LandingGateway.jsx"));
const NovelSection = lazy(() => import("./components/NovelSection.jsx"));
const UserCenter = lazy(() => import("./components/UserCenter.jsx"));

const BOOK_COLORS = ["#4A6357", "#7A3E3E", "#2E4C6D", "#8C6239", "#6C5E7A", "#6F7D5E"];
const ESCAPE_BLOCKING_SELECTOR = ".modal-backdrop, .zen-overlay, .logo-lightbox-overlay, .publish-popover, .novel-share-popover";
const TEXT_ENTRY_SELECTOR = "input, textarea, select, [contenteditable='true']";
const THEME_MODE_KEY = "author-hub-theme-mode";
const APPEARANCE_KEY = "author-hub-appearance";
const ACTIVE_VIEW_KEY = "author-hub-active-view";

export default function App() {
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState(() => localStorage.getItem(ACTIVE_VIEW_KEY) || "author");
  const [sharedNovelsReady, setSharedNovelsReady] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState(() => localStorage.getItem("author-hub-privacy-blur") === "true");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sharedNovels, setSharedNovels] = useState([]);
  const [shareRoute] = useState(() => parseShareRoute());
  const [publicShare, setPublicShare] = useState({ status: "idle", row: null, error: "" });
  const [shareNotice, setShareNotice] = useState("");
  const [sharedPresenceById, setSharedPresenceById] = useState({});
  const [sharedDraftsById, setSharedDraftsById] = useState({});
  const [cloudSyncBlocked, setCloudSyncBlocked] = useState(false);
  const skipNextCloudSaveRef = useRef(false);
  const joinedShareTokenRef = useRef("");
  const sharedSaveDebouncerRef = useRef(createKeyedDebouncer(900));
  const sharedSaveInFlightRef = useRef(new Set());
  const detachedSharedIdsRef = useRef(new Set());
  const localSharedSaveVersionsRef = useRef(new Map());
  const queuedSharedRealtimeRowsRef = useRef(new Map());
  const sharedDraftControllersRef = useRef(new Map());
  const sharedDraftTimersRef = useRef(new Map());
  const pendingSharedDraftsRef = useRef(new Map());
  const latestSharedDraftSnippetsRef = useRef(new Map());
  const recentSharedSaveNoticeRef = useRef(new Map());
  const shareNoticeTimerRef = useRef(null);
  const activeViewRef = useRef(activeView);

  const isPublicShareRoute = shareRoute?.intent === SHARE_ROLES.VIEWER;
  const sidebarWidth = sidebarCollapsed ? "72px" : "clamp(184px, 15vw, 224px)";

  useEffect(() => {
    activeViewRef.current = activeView;
  }, [activeView]);

  useEffect(() => {
    if (isPublicShareRoute) {
      setAuthReady(true);
      return undefined;
    }

    let mounted = true;
    let cleanup;

    async function boot() {
      if (hasSupabaseConfig && supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (mounted) {
          setLocalAuthUser(null);
          setAuthUser(sessionData.session?.user ?? null);
        }
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setLocalAuthUser(null);
          setAuthUser(session?.user ?? null);
        });
        cleanup = () => listener.subscription.unsubscribe();
      } else if (mounted) {
        setAuthUser(getLocalAuthUser());
      }

      if (mounted) setAuthReady(true);
    }

    boot();
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [isPublicShareRoute]);

  useEffect(() => {
    if (isPublicShareRoute) return;
    if (authUser && !data) {
      loadAuthorHubData(authUser).then((loadedData) => {
        const storedTheme = getStoredThemeMode();
        const storedAppearance = getStoredAppearance();
        // Local appearance (font size/family/mode) is the source of truth on
        // load so settings survive refresh even if a debounced cloud save for
        // the document had not flushed yet.
        skipNextCloudSaveRef.current = true;
        setCloudSyncBlocked(isCloudSaveBlocked(authUser.id));
        setData({
          ...loadedData,
          appearance: {
            ...loadedData.appearance,
            ...(storedAppearance ?? {}),
            ...(storedTheme ? { darkMode: storedTheme === "dark" } : {}),
          },
        });
      });
    }
    if (!authUser) setData(null);
    // Keyed on authUser?.id, not the authUser object: onAuthStateChange fires
    // repeatedly (cross-tab session sync, token refresh) with a new object
    // reference each time even for the same signed-in user, and depending on
    // the object identity here would re-run data loading on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, data, isPublicShareRoute]);

  useEffect(() => {
    if (!shareRoute || shareRoute.intent !== SHARE_ROLES.VIEWER) return;
    let mounted = true;
    let intervalId;
    async function loadPublicShare({ quiet = false } = {}) {
      if (!quiet) setPublicShare({ status: "loading", row: null, error: "" });
      try {
        const row = await getSharedNovelByToken(shareRoute.token);
        if (mounted) {
          setPublicShare((current) => {
            if (quiet && current.row?.updatedAt === row?.updatedAt) return current;
            return { status: "ready", row, error: "" };
          });
        }
      } catch (error) {
        console.warn("AuthorHub public share could not be opened.", error);
        if (mounted && !quiet) setPublicShare({ status: "error", row: null, error: "这个分享链接暂时无法打开。" });
      }
    }
    setPublicShare({ status: "loading", row: null, error: "" });
    loadPublicShare();
    intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      loadPublicShare({ quiet: true });
    }, 12000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [shareRoute]);

  useEffect(() => {
    if (isPublicShareRoute) return;
    if (!authUser || !data) {
      setSharedNovels([]);
      setSharedNovelsReady(false);
      return;
    }
    let mounted = true;
    loadSharedNovelsForUser().then((rows) => {
      if (mounted) {
        setSharedNovels(rows);
        setSharedNovelsReady(true);
      }
    });
    return () => {
      mounted = false;
    };
    // Intentionally NOT depending on `data` itself: every keystroke anywhere
    // in the app produces a new `data` reference, and this effect has no
    // debounce, so depending on the object identity re-fires this RPC on
    // every edit. All post-load mutations (create/join/realtime/detach)
    // already update `sharedNovels` locally via setSharedNovels, so this
    // only needs to run once data becomes available after login.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, Boolean(data), isPublicShareRoute]);

  useEffect(() => {
    if (!authUser || !data || shareRoute?.intent !== SHARE_ROLES.EDITOR || !shareRoute.token) return;
    if (joinedShareTokenRef.current === shareRoute.token) return;
    joinedShareTokenRef.current = shareRoute.token;
    joinSharedNovel(shareRoute.token)
      .then((row) => {
        setSharedNovels((current) => upsertSharedNovelRow(current, row));
        setActiveView(`shared-${row.id}`);
        window.history.replaceState({}, "", "/");
        setShareNotice("已加入共同编辑。之后保存的版本会同步给协作者。");
      })
      .catch((error) => {
        console.warn("AuthorHub shared novel join failed.", error);
        setShareNotice("共同编辑链接暂时无法加入，请确认链接是否有效。");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, Boolean(data), shareRoute]);

  useEffect(() => {
    const cleanups = sharedNovels.map((row) =>
      subscribeToSharedNovel(row.id, (nextRow) => {
        const incomingRow = { ...nextRow, role: row.role };
        if (
          isLocalSharedSaveEcho(localSharedSaveVersionsRef.current, incomingRow) ||
          isObsoleteSharedRealtimeUpdate(localSharedSaveVersionsRef.current, incomingRow)
        ) {
          return;
        }

        const decision = shouldHandleSharedRealtimeUpdate({
          role: row.role,
          hasPendingLocalSave: sharedSaveDebouncerRef.current.has(row.id),
          hasInFlightSave: sharedSaveInFlightRef.current.has(row.id),
          isTextEntryActive: activeViewRef.current === `shared-${row.id}` && isTextEntryFocused(),
        });

        if (decision.action === "ignore") return;
        if (decision.action === "defer") {
          queuedSharedRealtimeRowsRef.current.set(row.id, incomingRow);
          return;
        }
        applySharedRealtimeRow(incomingRow, getSharedRealtimeNotice(incomingRow, decision.notice));
      }),
    );
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [sharedNovels.map((row) => `${row.id}:${row.role}`).join("|")]);

  useEffect(() => {
    if (!authUser?.id) {
      setSharedPresenceById({});
      return undefined;
    }

    const editableRows = sharedNovels.filter((row) => row.role !== SHARE_ROLES.VIEWER);
    const editableIds = new Set(editableRows.map((row) => row.id));
    setSharedPresenceById((current) =>
      Object.fromEntries(Object.entries(current).filter(([sharedNovelId]) => editableIds.has(sharedNovelId))),
    );

    const cleanups = editableRows.map((row) =>
      subscribeToSharedNovelPresence(row.id, authUser, (people) => {
        setSharedPresenceById((current) => ({ ...current, [row.id]: people }));
      }),
    );
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [authUser?.id, sharedNovels.map((row) => `${row.id}:${row.role}`).join("|")]);

  useEffect(() => {
    if (!authUser?.id) {
      setSharedDraftsById({});
      sharedDraftControllersRef.current.clear();
      return undefined;
    }

    const editableRows = sharedNovels.filter((row) => row.role !== SHARE_ROLES.VIEWER);
    const editableIds = new Set(editableRows.map((row) => row.id));
    setSharedDraftsById((current) => Object.fromEntries(Object.entries(current).filter(([sharedNovelId]) => editableIds.has(sharedNovelId))));

    const cleanups = editableRows.map((row) => {
      const controller = subscribeToSharedDraftPreviews(row.id, authUser, (event) => {
        if (event?.type === "save-notice") {
          recentSharedSaveNoticeRef.current.set(event.sharedNovelId, Date.now());
          showShareNotice(formatSharedSaveNotice(event), 5000);
          return;
        }
        setSharedDraftsById((current) => updateSharedDraftState(current, event));
      });
      sharedDraftControllersRef.current.set(row.id, controller);
      return () => {
        controller.unsubscribe();
        sharedDraftControllersRef.current.delete(row.id);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [authUser?.id, sharedNovels.map((row) => `${row.id}:${row.role}`).join("|")]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSharedDraftsById((current) => {
        const next = {};
        Object.entries(current).forEach(([sharedNovelId, draftsByField]) => {
          const pruned = pruneExpiredSharedDrafts(draftsByField);
          if (Object.keys(pruned).length) next[sharedNovelId] = pruned;
        });
        return next;
      });
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      sharedDraftTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      sharedDraftTimersRef.current.clear();
      pendingSharedDraftsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    function releaseQueuedUpdates() {
      window.setTimeout(() => {
        if (!isTextEntryFocused()) applyQueuedSharedRealtimeRows();
      }, 0);
    }

    window.addEventListener("focusout", releaseQueuedUpdates, true);
    document.addEventListener("visibilitychange", releaseQueuedUpdates);
    return () => {
      window.removeEventListener("focusout", releaseQueuedUpdates, true);
      document.removeEventListener("visibilitychange", releaseQueuedUpdates);
    };
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    document.body.dataset.ambient = hour >= 22 || hour < 6 ? "night" : hour >= 15 ? "afternoon" : "day";
  }, []);

  useEffect(() => {
    const storedTheme = getStoredThemeMode();
    const darkMode = data?.appearance?.darkMode ?? storedTheme === "dark";
    document.body.dataset.theme = darkMode ? "dark" : "light";
  }, [data?.appearance?.darkMode]);

  useEffect(() => {
    localStorage.setItem("author-hub-privacy-blur", String(privacyBlur));
  }, [privacyBlur]);

  useEffect(() => {
    if (isPublicShareRoute) return;
    if (!data || !authUser) return;
    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }
    saveAuthorHubData(data, authUser);
    // Keyed on authUser?.id, not the authUser object: onAuthStateChange fires
    // repeatedly (cross-tab session sync, token refresh) with a new object
    // reference each time even for the same signed-in user. Depending on the
    // object identity re-saved the document on every such tick with no
    // actual edit, hammering Supabase continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, authUser?.id, isPublicShareRoute]);

  // A cloud load failure (real-world flaky network, one bad request) blocks
  // saveAuthorHubData from reaching Supabase for the rest of the session so a
  // stale local fallback can't overwrite a newer cloud document - but every
  // edit made *after* that point (novel reorder, character save, anything)
  // is real intent, not stale fallback data. Without this, that edit would
  // sit in localStorage only and vanish on the next refresh, with nothing
  // but a console warning - "my changes don't survive a refresh" with no
  // visible cause. Retry in the background (network regain + a periodic
  // fallback) and immediately re-push the current document the moment
  // connectivity is confirmed, so nothing edited while blocked is lost.
  useEffect(() => {
    if (isPublicShareRoute || !authUser || !cloudSyncBlocked) return undefined;
    let cancelled = false;
    let retrying = false;

    async function attemptRecovery() {
      if (retrying || cancelled) return;
      retrying = true;
      try {
        const recovered = await retryCloudSync(authUser);
        if (cancelled || !recovered) return;
        setCloudSyncBlocked(false);
        setData((current) => {
          if (current) saveAuthorHubData(current, authUser, { immediate: true }).catch(() => {});
          return current;
        });
      } finally {
        retrying = false;
      }
    }

    attemptRecovery();
    window.addEventListener("online", attemptRecovery);
    const intervalId = window.setInterval(attemptRecovery, 20000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", attemptRecovery);
      window.clearInterval(intervalId);
    };
  }, [cloudSyncBlocked, authUser, isPublicShareRoute]);

  useEffect(() => {
    if (isPublicShareRoute) return undefined;
    function flushAll() {
      flushCloudSave();
      flushSharedSaves();
    }
    function flushOnHide() {
      if (document.visibilityState === "hidden") flushAll();
    }
    window.addEventListener("beforeunload", flushAll);
    document.addEventListener("visibilitychange", flushOnHide);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      document.removeEventListener("visibilitychange", flushOnHide);
      flushAll();
    };
  }, [isPublicShareRoute]);

  useEffect(() => {
    if (!data || !justRegistered) return;
    const completed = Boolean(authUser?.user_metadata?.has_completed_tour);
    if (!completed) setTourStep(0);
  }, [data, justRegistered, authUser]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== "Escape" || event.defaultPrevented) return;

      if (deleteCandidate) {
        event.preventDefault();
        setDeleteCandidate(null);
        return;
      }

      if (tourStep !== null) {
        event.preventDefault();
        finishTour();
        return;
      }

      if (document.querySelector(ESCAPE_BLOCKING_SELECTOR)) return;
      if (document.activeElement?.closest?.(TEXT_ENTRY_SELECTOR)) return;

      setPrivacyBlur((current) => !current);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteCandidate, tourStep]);

  useEffect(() => {
    if (!authUser) return;
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
  }, [activeView, authUser]);

  const sharedWorkspaceNovels = useMemo(() => sharedNovels.map(decorateSharedNovel).filter(Boolean), [sharedNovels]);
  const sharedSourceIds = useMemo(() => new Set(sharedWorkspaceNovels.map((novel) => novel.sourceNovelId).filter(Boolean)), [sharedWorkspaceNovels]);
  const novels = useMemo(() => {
    const privateNovels = (data?.novels ?? []).filter((novel) => !sharedSourceIds.has(novel.id));
    return [...privateNovels, ...sharedWorkspaceNovels];
  }, [data?.novels, sharedSourceIds, sharedWorkspaceNovels]);
  const activeNovel = useMemo(() => novels.find((novel) => novel.id === activeView), [activeView, novels]);
  const appearance = data?.appearance ?? { fontFamily: "sans", fontSize: 14 };

  useEffect(() => {
    if (!data || activeView === "author" || activeView === "user") return;
    if (activeView.startsWith("shared-") && !sharedNovelsReady) return;
    if (activeNovel) return;
    setActiveView("author");
    // A restored view (from a previous session, via ACTIVE_VIEW_KEY) can
    // point at a novel that no longer exists (deleted elsewhere, share
    // revoked). Once both private and shared novels have finished loading,
    // fall back to the author dashboard instead of leaving the user stuck.
  }, [data, activeView, activeNovel, sharedNovelsReady]);

  function handleAuthed(user, meta = {}) {
    if (meta.isNew) {
      localStorage.removeItem("ah_tour");
      localStorage.removeItem("author-hub-tour-complete");
    }
    setJustRegistered(Boolean(meta.isNew));
    setAuthUser(user);
  }

  async function retrySyncNow() {
    if (!authUser) return;
    const recovered = await retryCloudSync(authUser);
    if (!recovered) return;
    setCloudSyncBlocked(false);
    if (data) saveAuthorHubData(data, authUser, { immediate: true }).catch(() => {});
  }

  async function logout() {
    if (hasSupabaseConfig && supabase) {
      await flushCloudSave();
      flushSharedSaves();
      await supabase.auth.signOut();
    }
    // Clear the full-manuscript local cache so "安全登出" on a shared computer
    // actually leaves nothing behind for the next person to read.
    clearLocalAuthorHubData(authUser);
    setLocalAuthUser(null);
    setAuthUser(null);
    setData(null);
    setActiveView("author");
    localStorage.removeItem(ACTIVE_VIEW_KEY);
  }

  async function unregisterAccount() {
    if (!authUser) return;
    if (hasSupabaseConfig && supabase) {
      await flushCloudSave();
      flushSharedSaves();
      const { error } = await supabase.rpc("delete_author_hub_account");
      if (error) throw error;
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
    // The server-side RPC deletes the cloud copy; without this the "deleted"
    // manuscript would survive in plaintext localStorage, contradicting the
    // deletion promise (especially on a shared machine).
    clearLocalAuthorHubData(authUser);
    setLocalAuthUser(null);
    setAuthUser(null);
    setData(null);
    setActiveView("author");
    localStorage.removeItem(ACTIVE_VIEW_KEY);
  }

  function saveDataImmediately(nextData) {
    if (!authUser) return Promise.resolve();
    return saveAuthorHubData(nextData, authUser, { immediate: true }).catch((error) => {
      console.warn("Author Hub immediate cloud save failed.", error);
      setShareNotice("云端保存失败，本地内容仍保留，请稍后再试。");
      window.setTimeout(() => setShareNotice(""), 2400);
      throw error;
    });
  }

  const selectView = useCallback((viewId) => {
    setActiveView(viewId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  function updateAuthor(nextAuthor) {
    setData((current) => ({ ...current, author: nextAuthor }));
  }

  function updateAppearance(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "darkMode")) {
      storeThemeMode(patch.darkMode ? "dark" : "light");
    }
    setData((current) => {
      const nextAppearance = { ...current.appearance, ...patch };
      storeAppearance(nextAppearance);
      return { ...current, appearance: nextAppearance };
    });
  }

  function updateNovelRecord(novelId, updater) {
    const sharedRow = sharedNovels.find((row) => `shared-${row.id}` === novelId);
    if (sharedRow) {
      setSharedNovels((current) =>
        current.map((row) => {
          if (`shared-${row.id}` !== novelId) return row;
          const workspaceNovel = decorateSharedNovel(row);
          const nextWorkspaceNovel = updater(workspaceNovel);
          const nextNovel = stripSharedNovel(nextWorkspaceNovel);
          scheduleSharedSave(row.id, nextNovel, row.updatedAt);
          return {
            ...row,
            novel: nextNovel,
          };
        }),
      );
      return;
    }

    setData((current) => ({
      ...current,
      novels: current.novels.map((novel) => (novel.id === novelId ? updater(novel) : novel)),
    }));
  }

  function scheduleSharedSave(sharedNovelId, novel, expectedUpdatedAt) {
    sharedSaveDebouncerRef.current.schedule(sharedNovelId, () => {
      // The debounce entry is gone the instant this timer fires (before the
      // network round trip even starts), so the realtime guard's `has()`
      // check alone left a gap for the whole in-flight duration of the
      // request. Track that window explicitly so an incoming realtime update
      // for this novel is skipped until our own save has actually settled.
      sharedSaveInFlightRef.current.add(sharedNovelId);
      saveSharedNovel(sharedNovelId, novel, expectedUpdatedAt)
        .then((row) => {
          // The novel may have been detached (confirmDeleteNovel) while this
          // request was in flight - don't let a late-arriving response
          // resurrect it into sharedNovels.
          if (detachedSharedIdsRef.current.has(sharedNovelId)) return;
          rememberLocalSharedSave(localSharedSaveVersionsRef.current, row);
          setSharedNovels((current) => upsertSharedNovelRow(current, row));
          announceSharedSave(sharedNovelId, novel);
        })
        .catch((error) => {
          console.warn("AuthorHub shared novel save failed.", error);
          const stale = /stale|conflict|newer/i.test(error.message || "");
          if (stale) {
            return saveSharedNovel(sharedNovelId, novel, null)
              .then((row) => {
                if (detachedSharedIdsRef.current.has(sharedNovelId)) return;
                rememberLocalSharedSave(localSharedSaveVersionsRef.current, row);
                setSharedNovels((current) => upsertSharedNovelRow(current, row));
                announceSharedSave(sharedNovelId, novel);
              })
              .catch((retryError) => {
                console.warn("AuthorHub shared novel stale-save retry failed.", retryError);
                showShareNotice("共享小说保存失败，本地内容仍保留，请稍后再试。", 2600);
              });
          }
          showShareNotice("共享小说保存失败，本地内容仍保留，请稍后再试。", 2600);
        })
        .finally(() => {
          sharedSaveInFlightRef.current.delete(sharedNovelId);
          if (!isTextEntryFocused()) applyQueuedSharedRealtimeRows(sharedNovelId);
        });
    });
  }

  function applySharedRealtimeRow(row, notice) {
    setSharedNovels((current) => upsertSharedNovelRow(current, row));
    if (notice) showShareNotice(notice, 5000);
  }

  function applyQueuedSharedRealtimeRows(sharedNovelId) {
    if (sharedSaveDebouncerRef.current.has(sharedNovelId) || sharedSaveInFlightRef.current.has(sharedNovelId)) return;
    if (isTextEntryFocused()) return;

    const rawQueuedRows = sharedNovelId
      ? queuedSharedRealtimeRowsRef.current.has(sharedNovelId)
        ? [queuedSharedRealtimeRowsRef.current.get(sharedNovelId)]
        : []
      : Array.from(queuedSharedRealtimeRowsRef.current.values());

    if (sharedNovelId) {
      queuedSharedRealtimeRowsRef.current.delete(sharedNovelId);
    } else {
      queuedSharedRealtimeRowsRef.current.clear();
    }

    const queuedRows = rawQueuedRows.filter(
      (row) =>
        row &&
        !isLocalSharedSaveEcho(localSharedSaveVersionsRef.current, row) &&
        !isObsoleteSharedRealtimeUpdate(localSharedSaveVersionsRef.current, row),
    );
    if (!queuedRows.length) return;

    setSharedNovels((current) => queuedRows.reduce((next, row) => upsertSharedNovelRow(next, row), current));
    const latestRow = queuedRows.at(-1);
    const notice = getSharedRealtimeNotice(latestRow, "内容已同步");
    if (notice) showShareNotice(notice, 5000);
  }

  function showShareNotice(message, durationMs = 5000) {
    if (shareNoticeTimerRef.current) window.clearTimeout(shareNoticeTimerRef.current);
    setShareNotice(message);
    shareNoticeTimerRef.current = window.setTimeout(() => {
      setShareNotice("");
      shareNoticeTimerRef.current = null;
    }, durationMs);
  }

  function announceSharedSave(sharedNovelId, novel) {
    const latestDraft = latestSharedDraftSnippetsRef.current.get(sharedNovelId);
    const snippet = getSharedSaveSnippet(latestDraft?.snippet) || getSharedSaveSnippet(novel?.outline) || getSharedSaveSnippet(novel?.setting);
    const notice = createSharedSaveNotice({
      sharedNovelId,
      label: formatPresenceLabel({
        name: authUser?.user_metadata?.username ?? authUser?.user_metadata?.name,
        email: authUser?.email,
      }),
      snippet,
      userId: authUser?.id,
    });
    if (!notice) return;
    recentSharedSaveNoticeRef.current.set(sharedNovelId, Date.now());
    showShareNotice(formatSharedSaveNotice(notice), 5000);
    sharedDraftControllersRef.current.get(sharedNovelId)?.sendSaveNotice(notice);
  }

  function getSharedRealtimeNotice(row, fallbackNotice) {
    if (!fallbackNotice || !row?.id) return "";
    const recentAt = recentSharedSaveNoticeRef.current.get(row.id);
    if (recentAt && Date.now() - recentAt < 6500) return "";
    const snippet = getSharedSaveSnippet(row.novel?.outline) || getSharedSaveSnippet(row.novel?.setting);
    return snippet ? formatSharedSaveNotice({ label: "协作者", snippet }) : fallbackNotice;
  }

  function broadcastSharedDraft(novelId, fieldPath, value, cursorIndex) {
    const sharedNovelId = getSharedNovelIdFromWorkspaceId(novelId);
    if (!sharedNovelId || !authUser?.id) return;
    const sharedRow = sharedNovels.find((row) => row.id === sharedNovelId);
    if (!sharedRow || sharedRow.role === SHARE_ROLES.VIEWER) return;

    const preview = createSharedDraftPreview({
      sharedNovelId,
      fieldPath,
      value,
      cursorIndex,
      user: authUser,
    });
    if (!preview) return;

    const key = `${sharedNovelId}:${fieldPath}`;
    latestSharedDraftSnippetsRef.current.set(sharedNovelId, { fieldPath, snippet: preview.tail });
    pendingSharedDraftsRef.current.set(key, preview);
    if (sharedDraftTimersRef.current.has(key)) return;

    const timerId = window.setTimeout(() => {
      sharedDraftTimersRef.current.delete(key);
      const latestPreview = pendingSharedDraftsRef.current.get(key);
      pendingSharedDraftsRef.current.delete(key);
      sharedDraftControllersRef.current.get(sharedNovelId)?.sendDraft(latestPreview);
    }, 800);
    sharedDraftTimersRef.current.set(key, timerId);
  }

  function clearSharedDraft(novelId, fieldPath) {
    const sharedNovelId = getSharedNovelIdFromWorkspaceId(novelId);
    if (!sharedNovelId) return;
    const key = `${sharedNovelId}:${fieldPath}`;
    const timerId = sharedDraftTimersRef.current.get(key);
    if (timerId) window.clearTimeout(timerId);
    sharedDraftTimersRef.current.delete(key);
    pendingSharedDraftsRef.current.delete(key);
    sharedDraftControllersRef.current.get(sharedNovelId)?.clearDraft(fieldPath);
  }

  // Unlike the private cloud save, shared-novel saves had no unload/hide flush:
  // a quick edit-then-close on a shared novel lost the edit outright. Fires
  // every still-pending 900ms shared save immediately, same as flushCloudSave.
  function flushSharedSaves() {
    sharedSaveDebouncerRef.current.flush();
  }

  function updateNovel(novelId, patch) {
    updateNovelRecord(novelId, (novel) => ({ ...novel, ...patch }));
  }

  function addCharacter(novelId, character) {
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      characters: [...novel.characters, character],
    }));
  }

  function updateCharacter(novelId, characterId, patch) {
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      characters: novel.characters.map((character) => (character.id === characterId ? { ...character, ...patch } : character)),
    }));
  }

  function deleteCharacter(novelId, characterId) {
    // MediaCarousel's own removeImage() cleans up Supabase Storage one image
    // at a time while editing, but deleting the whole character bypasses
    // that entirely - without this, every image that character had ever
    // uploaded becomes permanently orphaned in the author-hub-media bucket
    // (removed from the document, but never removed from Storage).
    const novel = novels.find((item) => item.id === novelId);
    const character = novel?.characters.find((item) => item.id === characterId);
    deleteImagesFor(character?.images);
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      characters: novel.characters.filter((character) => character.id !== characterId),
      relationships: (novel.relationships ?? []).filter((relationship) => {
        const sourceId = getRelationshipEndpointId(relationship.source);
        const targetId = getRelationshipEndpointId(relationship.target);
        return sourceId !== characterId && targetId !== characterId;
      }),
    }));
  }

  function addRelationship(novelId, relationship) {
    updateNovelRecord(novelId, (novel) => ({ ...novel, relationships: [...(novel.relationships ?? []), relationship] }));
  }

  function updateRelationship(novelId, relationshipIndex, patch) {
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      relationships: (novel.relationships ?? []).map((relationship, index) => (index === relationshipIndex ? { ...relationship, ...patch } : relationship)),
    }));
  }

  function deleteRelationship(novelId, relationshipIndex) {
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      relationships: (novel.relationships ?? []).filter((_, index) => index !== relationshipIndex),
    }));
  }

  function addNovel() {
    const index = (data.novels?.length ?? 0) + 1;
    const id = `novel-${Date.now()}`;
    const novel = createBlankNovel(id, index);

    setData((current) => ({ ...current, novels: [...current.novels, novel] }));
    setActiveView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reorderNovel(novelId, targetIndex) {
    // The sidebar renders one merged list (private novels, then shared ones),
    // but a shared novel's id (`shared-<id>`) never appears in `data.novels`,
    // so the private-only reorder below was a silent no-op for shared rows.
    // Shared novels have no server-side order column, so this reorders them
    // among themselves for the current session only (matches how the private
    // list already reorders via local state; both persist through their own
    // existing save paths).
    if (sharedNovels.some((row) => `shared-${row.id}` === novelId)) {
      const privateCount = (data?.novels ?? []).filter((novel) => !sharedSourceIds.has(novel.id)).length;
      setSharedNovels((current) => {
        const fromIndex = current.findIndex((row) => `shared-${row.id}` === novelId);
        if (fromIndex < 0 || targetIndex == null) return current;
        // targetIndex is an index into the merged (private-then-shared) list.
        // A drop that lands within the private section has no meaningful
        // position within the shared sublist - clamping it to 0 used to
        // silently snap the novel to the front of the shared group
        // regardless of where it was actually dropped. Ignore it instead.
        if (targetIndex < privateCount) return current;
        const localTarget = Math.min(current.length - 1, targetIndex - privateCount);
        if (localTarget === fromIndex) return current;
        const next = [...current];
        const [movedRow] = next.splice(fromIndex, 1);
        next.splice(localTarget, 0, movedRow);
        return next;
      });
      return;
    }

    setData((current) => {
      const fromIndex = current.novels.findIndex((novel) => novel.id === novelId);
      if (fromIndex < 0 || targetIndex == null || targetIndex === fromIndex) return current;

      const nextNovels = [...current.novels];
      const [movedNovel] = nextNovels.splice(fromIndex, 1);
      const insertIndex = Math.max(0, Math.min(nextNovels.length, targetIndex));
      nextNovels.splice(insertIndex, 0, movedNovel);
      return { ...current, novels: nextNovels };
    });
  }

  function clearAllUserData() {
    if (!data) return Promise.resolve();
    // Same orphaned-Storage-object risk as a single novel delete, just for
    // every private novel at once.
    (data.novels ?? []).forEach((novel) => deleteImagesForNovel(novel));
    const nextData = {
      ...data,
      novels: [],
      author: {
        ...data.author,
        hasCompletedTour: true,
      },
    };
    setData(nextData);
    localStorage.setItem("author-hub-tour-complete", "true");
    setActiveView("author");
    return saveDataImmediately(nextData);
  }

  function exportJsonData() {
    downloadText(`author-hub-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  function exportMarkdownData() {
    const markdown = buildMarkdownExport(data);
    downloadText(`author-hub-export-${new Date().toISOString().slice(0, 10)}.md`, markdown, "text/markdown;charset=utf-8");
  }

  async function finishTour() {
    localStorage.setItem("ah_tour", "true");
    localStorage.setItem("author-hub-tour-complete", "true");
    if (hasSupabaseConfig && supabase) {
      supabase.auth.updateUser({ data: { has_completed_tour: true } }).catch((error) => {
        console.warn("Tour metadata sync failed", error);
      });
    }
    setData((current) => ({
      ...current,
      author: { ...current.author, hasCompletedTour: true },
    }));
    setTourStep(null);
    setJustRegistered(false);
  }

  function requestDeleteNovel(novelId) {
    const novel = novels.find((item) => item.id === novelId);
    if (novel) setDeleteCandidate(novel);
  }

  function confirmDeleteNovel() {
    if (!deleteCandidate) return;
    if (deleteCandidate.sharedMeta?.id) {
      const sharedId = deleteCandidate.sharedMeta.id;
      // Drop any edit still waiting out its 900ms debounce for this novel -
      // otherwise it fires after we've already removed the row and its
      // .then() re-adds the just-detached novel right back into
      // sharedNovels. Also mark it detached so a save that was already
      // in flight (network round trip already started) doesn't resurrect it
      // when its own response comes back a moment later.
      sharedSaveDebouncerRef.current.cancel(sharedId);
      detachedSharedIdsRef.current.add(sharedId);
      const removedRow = sharedNovels.find((row) => row.id === sharedId);
      const nextSharedNovels = sharedNovels.filter((row) => row.id !== sharedId);
      setSharedNovels(nextSharedNovels);
      // The pre-share private copy is frozen at whatever the novel looked like
      // the moment it was first shared (ensureSharedNovel snapshots it, but
      // never removes it from data.novels). Every edit made afterward only
      // ever lived on the shared row, so if we leave that stale duplicate in
      // data.novels, detaching silently resurrects the old content and the
      // debounced cloud save then persists it, discarding the collaboration.
      const remainingPrivateNovels = deleteCandidate.sourceNovelId
        ? data.novels.filter((novel) => novel.id !== deleteCandidate.sourceNovelId)
        : data.novels;
      if (remainingPrivateNovels !== data.novels) {
        const nextData = { ...data, novels: remainingPrivateNovels };
        setData(nextData);
        saveDataImmediately(nextData).catch(() => {});
      }
      setActiveView(nextSharedNovels[0] ? `shared-${nextSharedNovels[0].id}` : remainingPrivateNovels[0]?.id ?? "author");
      setShareNotice("已从当前视图移除共享小说；云端协作空间仍保留。");
      window.setTimeout(() => setShareNotice(""), 2200);
      setDeleteCandidate(null);

      // The above only updates local React state. Without this, the removed
      // novel's own membership row survives in Supabase and
      // list_author_hub_shared_novels() brings it right back on next
      // load/refresh - "I removed it but it came back after refresh".
      leaveSharedNovel(sharedId).catch((error) => {
        console.warn("AuthorHub could not remove shared-novel membership on the server; restoring it locally.", error);
        detachedSharedIdsRef.current.delete(sharedId);
        if (removedRow) setSharedNovels((current) => upsertSharedNovelRow(current, removedRow));
        setShareNotice("移除失败，请检查网络后重试。");
        window.setTimeout(() => setShareNotice(""), 2600);
      });
      return;
    }
    // This is a real permanent delete (unlike the shared "detach" branch
    // above) - every image every character/timeline event in this novel
    // ever uploaded needs to actually leave Storage too, or it just becomes
    // permanently unreachable garbage in the bucket.
    deleteImagesForNovel(deleteCandidate);
    const remainingNovels = novels.filter((novel) => novel.id !== deleteCandidate.id);
    const nextActiveView = activeView === deleteCandidate.id ? remainingNovels[0]?.id ?? "author" : activeView;
    const nextData = { ...data, novels: data.novels.filter((novel) => novel.id !== deleteCandidate.id) };
    setData(nextData);
    saveDataImmediately(nextData).catch(() => {});
    setActiveView(nextActiveView);
    setDeleteCandidate(null);
  }

  function addEvent(novelId, event) {
    updateNovelRecord(novelId, (novel) => ({ ...novel, timeline: [...novel.timeline, event] }));
  }

  function updateEvent(novelId, eventId, patch) {
    updateNovelRecord(novelId, (novel) => ({
      ...novel,
      timeline: novel.timeline.map((event) => (event.id === eventId ? { ...event, ...patch } : event)),
    }));
  }

  function deleteEvent(novelId, eventId) {
    // Same orphaned-Storage-object risk as deleteCharacter above.
    const novel = novels.find((item) => item.id === novelId);
    const event = novel?.timeline.find((item) => item.id === eventId);
    deleteImagesFor(event?.images);
    updateNovelRecord(novelId, (novel) => ({ ...novel, timeline: novel.timeline.filter((event) => event.id !== eventId) }));
  }

  function reorderEvent(novelId, eventId, targetIndex) {
    updateNovelRecord(novelId, (novel) => {
      const fromIndex = novel.timeline.findIndex((event) => event.id === eventId);
      if (fromIndex < 0 || targetIndex == null || fromIndex === targetIndex) return novel;
      const nextTimeline = [...novel.timeline];
      const [movedEvent] = nextTimeline.splice(fromIndex, 1);
      nextTimeline.splice(Math.max(0, Math.min(nextTimeline.length, targetIndex)), 0, movedEvent);
      return { ...novel, timeline: nextTimeline };
    });
  }

  async function createNovelShareLink(novel, role, sections, { forceNew = false, matchSections = true } = {}) {
    const existingSharedId = novel.sharedMeta?.id;
    const shouldSwitchToSharedView = !existingSharedId;
    let sharedRow = existingSharedId ? sharedNovels.find((row) => row.id === existingSharedId) : null;
    if (!sharedRow) {
      sharedRow = await ensureSharedNovel(novel);
    }
    // Only the explicit "生成链接/重新生成" action reaches this path. Tab
    // switching in the popover is local UI state and must not fetch or create
    // a token. Non-forced generation reuses the current active link so owners
    // can hand out one stable URL to many collaborators/readers at once.
    const link = forceNew
      ? await createSharedNovelLink(sharedRow.id, role, sections)
      : await getOrCreateShareLink(sharedRow.id, role, sections, { requireSectionMatch: matchSections });
    setSharedNovels((current) => upsertSharedNovelRow(current, withActiveShareLink(sharedRow, link)));
    if (shouldSwitchToSharedView) setActiveView(`shared-${sharedRow.id}`);
    setShareNotice(role === SHARE_ROLES.EDITOR ? "共同编辑链接已生成。" : "只读查看链接已生成。");
    window.setTimeout(() => setShareNotice(""), 1800);
    return link;
  }

  async function getNovelActiveShareLink(novel, role, sections) {
    const sharedId = novel.sharedMeta?.id;
    if (!sharedId) return null;
    const link = await getActiveShareLink(sharedId, role, sections, { requireSectionMatch: false });
    if (link?.url) {
      setSharedNovels((current) => current.map((row) => (row.id === sharedId ? withActiveShareLink(row, link) : row)));
    }
    return link;
  }

  async function revokeNovelShareRole(novel, role) {
    const sharedId = novel.sharedMeta?.id;
    if (!sharedId) return;
    await revokeShareRole(sharedId, role);
    // Editor revoke also removes every joined collaborator's membership
    // server-side, so the count drops back to just the owner; viewer access
    // was never tracked as membership, so its count is unaffected.
    setSharedNovels((current) =>
      current.map((row) => {
        if (row.id !== sharedId) return row;
        const { [role]: _removed, ...activeLinks } = row.activeLinks ?? {};
        return {
          ...row,
          ...(role === SHARE_ROLES.EDITOR ? { collaboratorCount: 1 } : {}),
          activeLinks,
        };
      }),
    );
    // Revoking the editor link removes every collaborator's access, so the
    // "正在协作" presence strip should clear right away (their lingering
    // realtime connection shouldn't keep showing until they refresh); viewer
    // revoke never had presence anyway, so clearing is a harmless no-op there.
    setSharedPresenceById((current) => ({ ...current, [sharedId]: [] }));
    setShareNotice(role === SHARE_ROLES.EDITOR ? "共同编辑链接已撤回。" : "只读查看链接已撤回。");
    window.setTimeout(() => setShareNotice(""), 1800);
  }

  if (shareRoute?.intent === SHARE_ROLES.VIEWER) {
    return <SharedNovelPublicPage state={publicShare} />;
  }

  if (authReady && !authUser) {
    return (
      <Suspense fallback={<LandingShellFallback />}>
        <LandingGateway>
          <AuthGate onAuthed={handleAuthed} />
        </LandingGateway>
      </Suspense>
    );
  }

  if (!data) {
    return (
      <main className="loading-screen" aria-label="正在整理隐私空间中">
        <div className="privacy-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>正在整理隐私空间中</p>
      </main>
    );
  }

  return (
    <div
      className={`app-shell ${privacyBlur ? "privacy-blur" : ""} ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}
      style={{ "--sidebar-current-width": sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 14}px` }}
    >
      <Sidebar
        novels={novels}
        width={sidebarWidth}
        activeView={activeView}
        appearance={appearance}
        collapsed={sidebarCollapsed}
        onSelect={selectView}
        onAddNovel={addNovel}
        onDeleteNovel={requestDeleteNovel}
        onReorderNovel={reorderNovel}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main
        className={`content-shell font-${appearance.fontFamily ?? "sans"}`}
        style={{ marginLeft: sidebarWidth, "--editor-font-size": `${appearance.fontSize ?? 14}px` }}
      >
        <Suspense fallback={null}>
          {activeView === "author" && (
            <AuthorDashboard
              author={data.author}
              novels={novels}
              appearance={appearance}
              privacyBlur={privacyBlur}
              onAuthorChange={updateAuthor}
              onAppearanceChange={updateAppearance}
              onPrivacyBlurChange={setPrivacyBlur}
            />
          )}
          {activeView === "user" && (
            <UserCenter
              authUser={authUser}
              author={data.author}
              onAuthorChange={updateAuthor}
              onExportJson={exportJsonData}
              onExportMarkdown={exportMarkdownData}
              onClearData={clearAllUserData}
              onLogout={logout}
              onUnregister={unregisterAccount}
              appearance={appearance}
              onAppearanceChange={updateAppearance}
            />
          )}
          {activeNovel ? (
            <NovelSection
              key={activeNovel.id}
              novel={activeNovel}
              readOnly={activeNovel.sharedMeta?.role === SHARE_ROLES.VIEWER}
              onNovelChange={updateNovel}
              onAddCharacter={addCharacter}
              onUpdateCharacter={updateCharacter}
              onAddRelationship={addRelationship}
              onUpdateRelationship={updateRelationship}
              onDeleteRelationship={deleteRelationship}
              onDeleteCharacter={deleteCharacter}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onDeleteEvent={deleteEvent}
              onReorderEvent={reorderEvent}
              onCreateShareLink={createNovelShareLink}
              onGetActiveShareLink={getNovelActiveShareLink}
              onRevokeShareLink={revokeNovelShareRole}
              shareInfo={activeNovel.sharedMeta}
              activeCollaborators={
                activeNovel.sharedMeta?.id
                  ? (sharedPresenceById[activeNovel.sharedMeta.id] ?? []).filter((person) => person.id && person.id !== authUser?.id)
                  : []
              }
              draftPreviews={activeNovel.sharedMeta?.id ? sharedDraftsById[activeNovel.sharedMeta.id] ?? {} : {}}
              onDraftPreviewChange={broadcastSharedDraft}
              onDraftPreviewClear={clearSharedDraft}
              visibleSections={activeNovel.sharedMeta?.publicSections}
            />
          ) : activeView.startsWith("shared-") && !sharedNovelsReady ? null : activeView !== "author" && activeView !== "user" ? (
            <section className="section empty-state">
              <Sparkles size={22} />
              <h2>这里还没有小说</h2>
              <p>点击左侧的“新增小说”，创建你的第一组人物星图、时间线和设定集。</p>
              <button type="button" className="primary-button compact-action" onClick={addNovel}>
                新增小说
              </button>
            </section>
          ) : null}
        </Suspense>
      </main>
      <FloatingMusicPlayer />
      {cloudSyncBlocked && !isPublicShareRoute && (
        <div className="cloud-sync-banner" role="alert">
          <span>云端连接异常，你的更改目前只保存在本地，请检查网络。</span>
          <button type="button" onClick={retrySyncNow}>
            重试同步
          </button>
        </div>
      )}
      {shareNotice && <div className="share-sync-toast" role="status">{shareNotice}</div>}
      {deleteCandidate && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setDeleteCandidate(null)}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-novel-title" onMouseDown={(event) => event.stopPropagation()}>
            {deleteCandidate.sharedMeta?.id ? (
              <>
                <p className="eyebrow">Remove shared novel</p>
                <h2 id="delete-novel-title">是否从手稿列表中移除该共享小说？</h2>
                <p>这只会把《{deleteCandidate.title}》从你的手稿列表中移除；云端协作空间和其他协作者的内容不受影响。</p>
              </>
            ) : (
              <>
                <p className="eyebrow">Remove novel</p>
                <h2 id="delete-novel-title">是否从手稿列表中移除该小说？</h2>
                <p>移除后将永久清空《{deleteCandidate.title}》相关的全部星图、人物卡片及设定数据，且无法恢复。请谨慎确认。</p>
              </>
            )}
            <div className="confirm-actions">
              <button type="button" className="ghost-button" onClick={() => setDeleteCandidate(null)}>
                取消
              </button>
              <button type="button" className="danger-button" onClick={confirmDeleteNovel}>
                {deleteCandidate.sharedMeta?.id ? "确定移除" : "确定删除"}
              </button>
            </div>
          </section>
        </div>
      )}
      {tourStep !== null && (
        <TourProvider
          step={tourStep}
          setStep={setTourStep}
          onDone={finishTour}
          onSelectView={selectView}
          demoNovelId={novels[0]?.id ?? "author"}
        />
      )}
    </div>
  );
}

function LandingShellFallback() {
  return (
    <main
      aria-label="正在打开 AuthorHub"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 70% 46%, rgba(242, 153, 74, 0.16), transparent 24%), linear-gradient(135deg, #0f1317 0%, #12161a 48%, #171214 100%)",
      }}
    />
  );
}

function SharedNovelPublicPage({ state }) {
  const novel = useMemo(() => decorateSharedNovel(state.row), [state.row]);
  const noop = useCallback(() => {}, []);

  if (state.status === "loading" || state.status === "idle") {
    return (
      <main className="loading-screen" aria-label="正在打开分享小说">
        <div className="privacy-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p>正在打开分享小说</p>
      </main>
    );
  }

  if (state.status === "error" || !novel) {
    return (
      <main className="shared-view-shell shared-view-empty">
        <section className="section empty-state">
          <Sparkles size={22} />
          <h2>分享链接暂时无法打开</h2>
          <p>{state.error || "请确认链接是否完整，或请作者重新生成只读查看链接。"}</p>
        </section>
      </main>
    );
  }

  return (
    <div className="shared-view-shell">
      <main className="content-shell font-serif shared-view-content">
        <div className="shared-view-ribbon">
          <strong>只读查看《{novel.title}》 · 可浏览作者公开分享的内容，不能编辑。</strong>
        </div>
        <NovelSection
          novel={novel}
          readOnly
          onNovelChange={noop}
          onAddCharacter={noop}
          onUpdateCharacter={noop}
          onAddRelationship={noop}
          onUpdateRelationship={noop}
          onDeleteRelationship={noop}
          onDeleteCharacter={noop}
          onAddEvent={noop}
          onUpdateEvent={noop}
          onDeleteEvent={noop}
          onReorderEvent={noop}
          onCreateShareLink={noop}
          onGetActiveShareLink={noop}
          shareInfo={novel.sharedMeta}
          visibleSections={novel.sharedMeta?.publicSections}
        />
      </main>
      <FloatingMusicPlayer />
    </div>
  );
}

function createBlankNovel(id, index) {
  return {
    id,
    title: `新小说 ${index}`,
    subtitle: "一句话写下这本书的灵魂。",
    genre: "类型未定",
    color: BOOK_COLORS[index % BOOK_COLORS.length],
    accent: "#F6E7D5",
    currentWords: 0,
    targetWords: 100000,
    finishDate: "2026-12-31",
    outline: "写下主线、转折点、核心冲突与结局方向。",
    setting: "写下世界观、时代背景、规则系统、地理空间与重要道具。",
    themes: ["成长", "羁绊"],
    characters: [],
    relationships: [],
    timeline: [],
    sourceLinks: [],
  };
}

// Bulk-delete paths (a whole character, event, novel, or "清空数据") remove
// content from the document but must also clean up any images that content
// had uploaded to the author-hub-media Storage bucket - MediaCarousel's own
// removeImage() only covers removing one image at a time while editing.
function getImageSrc(image) {
  return typeof image === "string" ? image : image?.src;
}

function deleteImagesFor(images) {
  (images ?? []).forEach((image) => {
    const src = getImageSrc(image);
    if (src) deleteImageFromStorage(src);
  });
}

function deleteImagesForNovel(novel) {
  (novel?.characters ?? []).forEach((character) => deleteImagesFor(character.images));
  (novel?.timeline ?? []).forEach((event) => deleteImagesFor(event.images));
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getStoredThemeMode() {
  try {
    const mode = localStorage.getItem(THEME_MODE_KEY);
    return mode === "dark" || mode === "light" ? mode : null;
  } catch {
    return null;
  }
}

function storeThemeMode(mode) {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    // Theme persistence is a local preference only.
  }
}

function getStoredAppearance() {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeAppearance(appearance) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(appearance));
  } catch {
    // Appearance persistence is a local preference only.
  }
}

function isTextEntryFocused() {
  return Boolean(document.activeElement?.closest?.(TEXT_ENTRY_SELECTOR));
}

function getSharedNovelIdFromWorkspaceId(novelId) {
  return typeof novelId === "string" && novelId.startsWith("shared-") ? novelId.slice("shared-".length) : "";
}

function updateSharedDraftState(current, event) {
  if (!event?.sharedNovelId || !event?.fieldPath || !event?.userId) return current;
  const currentNovelDrafts = current[event.sharedNovelId] ?? {};
  const currentFieldDrafts = currentNovelDrafts[event.fieldPath] ?? [];
  const nextFieldDrafts =
    event.type === "draft-clear"
      ? currentFieldDrafts.filter((draft) => draft.userId !== event.userId)
      : [...currentFieldDrafts.filter((draft) => draft.userId !== event.userId), event];

  const nextNovelDrafts = { ...currentNovelDrafts };
  if (nextFieldDrafts.length) {
    nextNovelDrafts[event.fieldPath] = nextFieldDrafts;
  } else {
    delete nextNovelDrafts[event.fieldPath];
  }

  const next = { ...current };
  if (Object.keys(nextNovelDrafts).length) {
    next[event.sharedNovelId] = nextNovelDrafts;
  } else {
    delete next[event.sharedNovelId];
  }
  return next;
}

function upsertSharedNovelRow(current, row) {
  if (!row?.id) return current;
  const index = current.findIndex((item) => item.id === row.id);
  if (index < 0) return [...current, row];
  const next = [...current];
  next[index] = {
    ...next[index],
    ...row,
    role: row.role ?? next[index].role,
    activeLinks: row.activeLinks ?? next[index].activeLinks,
  };
  return next;
}

function withActiveShareLink(row, link) {
  if (!row?.id || !link?.role || !link?.url) return row;
  return {
    ...row,
    activeLinks: {
      ...(row.activeLinks ?? {}),
      [link.role]: link,
    },
  };
}
