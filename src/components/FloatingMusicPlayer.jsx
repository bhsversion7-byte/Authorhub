import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Pause, Play, SkipBack, SkipForward } from "lucide-react";

const STORAGE_KEY = "author-hub-music-position";
const EDGE_GAP = 8;
const PLAYER_HEIGHT = 86;
const PLAYER_VOLUME = 0.22;

const TRACKS = [
  {
    id: 1,
    title: "Two to Two",
    artist: "Free 20s Jazz Collection · Public Domain",
    src: "/music/two-to-two.mp3",
  },
  {
    id: 2,
    title: "South",
    artist: "Bennie Moten · Public Domain",
    src: "/music/south.mp3",
  },
  {
    id: 3,
    title: "Dardanella",
    artist: "Raderman Jazz Orchestra · Public Domain",
    src: "/music/dardanella.mp3",
  },
  {
    id: 4,
    title: "Whispering",
    artist: "Paul Whiteman · Public Domain",
    src: "/music/whispering.mp3",
  },
  {
    id: 5,
    title: "Panama",
    artist: "Free 20s Jazz Collection · Public Domain",
    src: "/music/panama.mp3",
  },
];

export default function FloatingMusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  // Start collapsed: the player is a "低干扰" (low-interference) box, and its
  // default top-right rest spot otherwise covers the novel hero's word-count
  // value. Collapsed it's a small pill clear of that content; one tap expands it.
  const [collapsed, setCollapsed] = useState(true);
  const [playbackIssue, setPlaybackIssue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [top, setTop] = useState(() => getInitialTop());
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const failedTrackIdsRef = useRef(new Set());
  const frameRef = useRef(null);
  const pendingTopRef = useRef(null);
  const track = TRACKS[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = PLAYER_VOLUME;
  }, []);

  useEffect(() => {
    if (!dragging) localStorage.setItem(STORAGE_KEY, JSON.stringify({ y: top }));
  }, [top, dragging]);

  useEffect(() => {
    function clampIntoViewport() {
      setTop((current) => getSafeTop(current));
    }
    window.addEventListener("resize", clampIntoViewport);
    window.addEventListener("orientationchange", clampIntoViewport);
    return () => {
      window.removeEventListener("resize", clampIntoViewport);
      window.removeEventListener("orientationchange", clampIntoViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (playing) playCurrentTrack(trackIndex);
  }, [trackIndex]);

  function playCurrentTrack(index = trackIndex) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = PLAYER_VOLUME;
    audio.play().then(() => setPlaying(true)).catch(() => handlePlaybackFailure(index));
  }

  function resetTrackFailures() {
    failedTrackIdsRef.current.clear();
    setPlaybackIssue("");
  }

  function togglePlay(event) {
    event?.stopPropagation?.();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      setPlaybackIssue("");
      return;
    }
    resetTrackFailures();
    playCurrentTrack(trackIndex);
  }

  function selectTrack(delta) {
    resetTrackFailures();
    setPlaying(true);
    setTrackIndex((current) => (current + delta + TRACKS.length) % TRACKS.length);
  }

  function nextTrack(event) {
    event?.stopPropagation?.();
    selectTrack(1);
  }

  function previousTrack(event) {
    event?.stopPropagation?.();
    selectTrack(-1);
  }

  function handlePlaybackFailure(failedIndex) {
    const failedTrack = TRACKS[failedIndex];
    if (!failedTrack) return;
    const failedIds = failedTrackIdsRef.current;
    failedIds.add(failedTrack.id);

    if (failedIds.size >= TRACKS.length) {
      audioRef.current?.pause();
      setPlaying(false);
      setPlaybackIssue("音乐源暂时不可用");
      failedIds.clear();
      return;
    }

    const nextIndex = findNextPlayableIndex(failedIndex, failedIds);
    if (nextIndex === failedIndex) {
      setPlaying(false);
      setPlaybackIssue("音乐源暂时不可用");
      return;
    }

    setPlaybackIssue("已跳过一首不可用曲目");
    setPlaying(true);
    setTrackIndex(nextIndex);
  }

  function handleAudioError() {
    if (playing) handlePlaybackFailure(trackIndex);
    else setPlaybackIssue("当前曲目加载失败");
  }

  function toggleCollapsed(event) {
    event?.stopPropagation?.();
    setCollapsed((current) => !current);
    setTop((current) => getSafeTop(current));
  }

  function onPointerDown(event) {
    if (event.target.closest("button")) return;
    setDragging(true);
    dragRef.current = { startY: event.clientY, originY: top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragRef.current) return;
    scheduleTopUpdate(getSafeTop(dragRef.current.originY + event.clientY - dragRef.current.startY));
  }

  function onPointerUp() {
    dragRef.current = null;
    const lastTop = pendingTopRef.current;
    pendingTopRef.current = null;
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setDragging(false);
    setTop((current) => getSafeTop(lastTop ?? current));
  }

  function scheduleTopUpdate(nextTop) {
    pendingTopRef.current = nextTop;
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingTopRef.current === null) return;
      setTop(pendingTopRef.current);
    });
  }

  return (
    <div
      className={`floating-music ${playing ? "is-playing" : ""} ${collapsed ? "is-collapsed" : ""} ${dragging ? "is-dragging" : ""} ${playbackIssue ? "has-playback-issue" : ""}`}
      style={{ left: "auto", right: `${EDGE_GAP}px`, top: `${top}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <audio ref={audioRef} src={track.src} preload="none" onEnded={nextTrack} onError={handleAudioError} />
      <button type="button" className="vinyl-button floating-vinyl" onClick={togglePlay} aria-label={playing ? "暂停音乐" : "播放音乐"}>
        <Disc3 size={collapsed ? 20 : 22} />
      </button>
      <div className="track-window" aria-hidden={collapsed}>
        <span>{track.title}</span>
        <small>{playbackIssue || track.artist}</small>
      </div>
      <div className="player-controls" aria-hidden={collapsed}>
        <button type="button" onClick={previousTrack} aria-label="上一首" disabled={collapsed}>
          <SkipBack size={13} />
        </button>
        <button type="button" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"} disabled={collapsed}>
          {playing ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button type="button" onClick={nextTrack} aria-label="下一首" disabled={collapsed}>
          <SkipForward size={13} />
        </button>
      </div>
      <button type="button" className="music-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "展开音乐盒" : "向右收起音乐盒"}>
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  );
}

function getInitialTop() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    stored = null;
  }
  return getSafeTop(stored?.y ?? 24);
}

function getSafeTop(value) {
  return Math.max(EDGE_GAP, Math.min(window.innerHeight - PLAYER_HEIGHT, value));
}

function findNextPlayableIndex(currentIndex, failedIds) {
  for (let step = 1; step <= TRACKS.length; step += 1) {
    const nextIndex = (currentIndex + step) % TRACKS.length;
    if (!failedIds.has(TRACKS[nextIndex].id)) return nextIndex;
  }
  return currentIndex;
}
