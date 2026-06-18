import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Pause, Play, SkipBack, SkipForward } from "lucide-react";

const TRACKS = [
  {
    id: 1,
    title: "12th Street Rag",
    artist: "Library of Congress Public Domain",
    src: "https://citizen-dj.labs.loc.gov/audio/samplepacks/loc-jukebox-jazz/12th-Street-rag_jukebox-38191_002_00-00-30.mp3",
  },
  {
    id: 2,
    title: "After You've Gone",
    artist: "Library of Congress Public Domain",
    src: "https://citizen-dj.labs.loc.gov/audio/samplepacks/loc-jukebox-jazz/After-youve-gone_jukebox-313413_001_00-01-00.mp3",
  },
  {
    id: 3,
    title: "At the Jazz Band Ball",
    artist: "Library of Congress Public Domain",
    src: "https://citizen-dj.labs.loc.gov/audio/samplepacks/loc-jukebox-jazz/At-the-jazz-band-ball_jukebox-28219_001_00-00-30.mp3",
  },
  {
    id: 4,
    title: "Avalon",
    artist: "Library of Congress Public Domain",
    src: "https://citizen-dj.labs.loc.gov/audio/samplepacks/loc-jukebox-jazz/Avalon_jukebox-37794_001_00-00-00.mp3",
  },
  {
    id: 5,
    title: "Bluin' the Blues",
    artist: "Library of Congress Public Domain",
    src: "https://citizen-dj.labs.loc.gov/audio/samplepacks/loc-jukebox-jazz/Bluin-the-blues_jukebox-185940_001_00-00-00.mp3",
  },
];

const EDGE_GAP = 8;
const EXPANDED_WIDTH = 420;
const COLLAPSED_WIDTH = 96;
const PLAYER_HEIGHT = 86;

export default function FloatingMusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [playbackIssue, setPlaybackIssue] = useState("");
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState(() => getInitialPosition());
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const dragRef = useRef(null);
  const failedTrackIdsRef = useRef(new Set());
  const frameRef = useRef(null);
  const pendingPositionRef = useRef(null);
  const track = TRACKS[trackIndex];

  useEffect(() => {
    localStorage.setItem("author-hub-music-position", JSON.stringify(position));
  }, [position]);

  useLayoutEffect(() => {
    setPosition((current) => {
      const measuredWidth = getPlayerWidth(playerRef.current, collapsed);
      if (collapsed) return dockToRight(current, measuredWidth, collapsed);
      return getSafePosition({ ...current, x: window.innerWidth - measuredWidth - EDGE_GAP }, collapsed, measuredWidth);
    });
  }, [collapsed]);

  useEffect(() => {
    setPosition((current) => {
      const measuredWidth = getPlayerWidth(playerRef.current, collapsed);
      return getSafePosition({ ...current, x: window.innerWidth - measuredWidth - EDGE_GAP }, collapsed, measuredWidth);
    });
  }, []);

  useEffect(() => {
    function clampIntoViewport() {
      setPosition((current) => {
        const measuredWidth = getPlayerWidth(playerRef.current, collapsed);
        const next = collapsed ? { ...current, x: window.innerWidth - measuredWidth - EDGE_GAP } : current;
        return getSafePosition(next, collapsed, measuredWidth);
      });
    }
    window.addEventListener("resize", clampIntoViewport);
    window.addEventListener("orientationchange", clampIntoViewport);
    return () => {
      window.removeEventListener("resize", clampIntoViewport);
      window.removeEventListener("orientationchange", clampIntoViewport);
    };
  }, [collapsed]);

  useEffect(() => {
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.22;
    audio.load();
    if (!playing) return;
    audio.play().catch(() => handlePlaybackFailure(trackIndex));
  }, [trackIndex, playing]);

  function togglePlay(event) {
    event?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      setPlaybackIssue("");
      return;
    }
    failedTrackIdsRef.current.clear();
    setPlaybackIssue("");
    audio.volume = 0.22;
    audio.play().then(() => setPlaying(true)).catch(() => handlePlaybackFailure(trackIndex));
  }

  function nextTrack(event) {
    event?.stopPropagation();
    failedTrackIdsRef.current.clear();
    setPlaybackIssue("");
    setTrackIndex((current) => (current + 1) % TRACKS.length);
    setPlaying(true);
  }

  function previousTrack(event) {
    event?.stopPropagation();
    failedTrackIdsRef.current.clear();
    setPlaybackIssue("");
    setTrackIndex((current) => (current - 1 + TRACKS.length) % TRACKS.length);
    setPlaying(true);
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
    setTrackIndex(nextIndex);
    setPlaying(true);
  }

  function handleAudioError() {
    if (!playing) {
      setPlaybackIssue("当前曲目加载失败");
      return;
    }
    handlePlaybackFailure(trackIndex);
  }

  function toggleCollapsed(event) {
    event?.stopPropagation();
    setCollapsed((current) => {
      const nextCollapsed = !current;
      setPosition((positionNow) => {
        const measuredWidth = getPlayerWidth(playerRef.current, nextCollapsed);
        if (nextCollapsed) return dockToRight(positionNow, measuredWidth, nextCollapsed);
        return getSafePosition({ ...positionNow, x: window.innerWidth - measuredWidth - EDGE_GAP }, nextCollapsed, measuredWidth);
      });
      return nextCollapsed;
    });
  }

  function onPointerDown(event) {
    if (event.target.closest("button")) return;
    setDragging(true);
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragRef.current) return;
    const measuredWidth = getPlayerWidth(playerRef.current, collapsed);
    const nextX = dragRef.current.originX + event.clientX - dragRef.current.startX;
    const nextY = dragRef.current.originY + event.clientY - dragRef.current.startY;
    schedulePositionUpdate(
      getSafePosition(
        {
          x: collapsed ? window.innerWidth - measuredWidth - EDGE_GAP : nextX,
          y: nextY,
        },
        collapsed,
        measuredWidth,
      ),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
    pendingPositionRef.current = null;
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setDragging(false);
    setPosition((current) => {
      const measuredWidth = getPlayerWidth(playerRef.current, collapsed);
      return getSafePosition(collapsed ? { ...current, x: window.innerWidth - measuredWidth - EDGE_GAP } : current, collapsed, measuredWidth);
    });
  }

  function schedulePositionUpdate(nextPosition) {
    pendingPositionRef.current = nextPosition;
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      if (!pendingPositionRef.current) return;
      setPosition(pendingPositionRef.current);
    });
  }

  return (
    <div
      ref={playerRef}
      className={`floating-music ${playing ? "is-playing" : ""} ${collapsed ? "is-collapsed" : ""} ${dragging ? "is-dragging" : ""} ${playbackIssue ? "has-playback-issue" : ""}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <audio ref={audioRef} src={track.src} preload="none" onEnded={nextTrack} onError={handleAudioError} />
      <button type="button" className="vinyl-button floating-vinyl" onClick={togglePlay} aria-label={playing ? "暂停音乐" : "播放音乐"}>
        <Disc3 size={collapsed ? 20 : 22} />
      </button>
      {!collapsed && (
        <>
          <div className="track-window">
            <span>{track.title}</span>
            <small>{playbackIssue || track.artist}</small>
          </div>
          <div className="player-controls">
            <button type="button" onClick={previousTrack} aria-label="上一首">
              <SkipBack size={13} />
            </button>
            <button type="button" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" onClick={nextTrack} aria-label="下一首">
              <SkipForward size={13} />
            </button>
          </div>
        </>
      )}
      <button type="button" className="music-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "展开音乐盒" : "向右收起音乐盒"}>
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  );
}

function getInitialPosition() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem("author-hub-music-position"));
  } catch {
    stored = null;
  }
  return getSafePosition({ x: window.innerWidth - EXPANDED_WIDTH - EDGE_GAP, y: stored?.y ?? 24 }, false, EXPANDED_WIDTH);
}

function getPlayerWidth(element, isCollapsed) {
  return Math.ceil(element?.offsetWidth || (isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH));
}

function dockToRight(position, measuredWidth, isCollapsed) {
  return getSafePosition({ ...position, x: window.innerWidth - measuredWidth - EDGE_GAP }, isCollapsed, measuredWidth);
}

function getSafePosition(position, isCollapsed, measuredWidth) {
  const width = measuredWidth || (isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
  return {
    x: Math.max(EDGE_GAP, Math.min(window.innerWidth - width - EDGE_GAP, position.x)),
    y: Math.max(EDGE_GAP, Math.min(window.innerHeight - PLAYER_HEIGHT, position.y)),
  };
}

function findNextPlayableIndex(currentIndex, failedIds) {
  for (let step = 1; step <= TRACKS.length; step += 1) {
    const nextIndex = (currentIndex + step) % TRACKS.length;
    if (!failedIds.has(TRACKS[nextIndex].id)) return nextIndex;
  }
  return currentIndex;
}
