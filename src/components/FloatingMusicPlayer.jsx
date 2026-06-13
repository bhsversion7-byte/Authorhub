import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Disc3, Pause, Play, SkipForward } from "lucide-react";

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

export default function FloatingMusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("author-hub-music-position")) ?? { x: window.innerWidth - 330, y: 24 };
    } catch {
      return { x: window.innerWidth - 330, y: 24 };
    }
  });
  const audioRef = useRef(null);
  const dragRef = useRef(null);
  const track = TRACKS[trackIndex];

  useEffect(() => {
    localStorage.setItem("author-hub-music-position", JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.22;
    audio.load();
    if (playing) audio.play().catch(() => nextTrack());
  }, [trackIndex, playing]);

  function togglePlay(event) {
    event?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio.volume = 0.22;
    audio.play().then(() => setPlaying(true)).catch(() => nextTrack());
  }

  function nextTrack(event) {
    event?.stopPropagation();
    setTrackIndex((current) => (current + 1) % TRACKS.length);
    setPlaying(true);
  }

  function onPointerDown(event) {
    if (event.target.closest("button")) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragRef.current) return;
    const nextX = dragRef.current.originX + event.clientX - dragRef.current.startX;
    const nextY = dragRef.current.originY + event.clientY - dragRef.current.startY;
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - (collapsed ? 54 : 280), nextX)),
      y: Math.max(8, Math.min(window.innerHeight - 72, nextY)),
    });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      className={`floating-music ${playing ? "is-playing" : ""} ${collapsed ? "is-collapsed" : ""}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <audio ref={audioRef} src={track.src} preload="auto" onEnded={nextTrack} onError={nextTrack} />
      <button type="button" className="vinyl-button floating-vinyl" onClick={togglePlay} aria-label={playing ? "暂停音乐" : "播放音乐"}>
        <Disc3 size={collapsed ? 20 : 22} />
      </button>
      {!collapsed && (
        <>
          <div className="track-window">
            <span>{track.title}</span>
            <small>{track.artist}</small>
          </div>
          <div className="player-controls">
            <button type="button" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"}>
              {playing ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button type="button" onClick={nextTrack} aria-label="下一首">
              <SkipForward size={13} />
            </button>
          </div>
        </>
      )}
      <button type="button" className="music-collapse" onClick={() => setCollapsed((current) => !current)} aria-label={collapsed ? "展开音乐盒" : "收起音乐盒"}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
