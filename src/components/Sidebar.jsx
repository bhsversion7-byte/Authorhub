import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Disc3, Home, Pause, Play, Plus, RotateCcw, SkipForward, X } from "lucide-react";

export const JAZZ_LIBRARY = [
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

export default function Sidebar({ novels, width, setWidth, activeView, onSelect, onAddNovel, onDeleteNovel, onReset }) {
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const startX = useRef(0);
  const startWidth = useRef(width);
  const audioRef = useRef(null);
  const fallbackRef = useRef(null);
  const skipGuardRef = useRef(0);
  const currentTrack = JAZZ_LIBRARY[trackIndex];
  const novelCountLabel = useMemo(() => `${toChineseCount(novels.length)}本小说`, [novels.length]);

  useEffect(() => {
    if (!dragging) return;

    function onMove(event) {
      const nextWidth = Math.min(420, Math.max(236, startWidth.current + event.clientX - startX.current));
      setWidth(nextWidth);
    }

    function onUp() {
      setDragging(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, setWidth]);

  useEffect(() => {
    return () => stopFallback();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.24;
    audio.load();
    if (playing && !fallbackRef.current) {
      audio.play().catch(() => skipBrokenTrack("play-failed"));
    }
  }, [trackIndex, playing]);

  function startFallback() {
    stopFallback();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setPlaying(false);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    gain.gain.value = 0.035;
    gain.connect(context.destination);

    const notes = [261.63, 329.63, 392, 493.88];
    const oscillators = notes.map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index % 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency / (index === 3 ? 2 : 1);
      const noteGain = context.createGain();
      noteGain.gain.value = index === 0 ? 0.32 : 0.12;
      oscillator.connect(noteGain);
      noteGain.connect(gain);
      oscillator.start();
      return oscillator;
    });

    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    fallbackRef.current = { context, oscillators, lfo };
    setPlaying(true);
  }

  function stopFallback() {
    if (!fallbackRef.current) return;
    const { context, oscillators, lfo } = fallbackRef.current;
    [...oscillators, lfo].forEach((node) => {
      try {
        node.stop();
      } catch {
        // Already stopped.
      }
    });
    context.close?.();
    fallbackRef.current = null;
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (playing) {
      audio?.pause();
      stopFallback();
      setPlaying(false);
      return;
    }

    stopFallback();
    if (!audio) {
      startFallback();
      return;
    }
    audio.volume = 0.24;
    setPlaying(true);
    const fallbackTimer = window.setTimeout(() => {
      if (audio.paused && !fallbackRef.current) startFallback();
    }, 1100);
    audio
      .play()
      .then(() => {
        window.clearTimeout(fallbackTimer);
        setPlaying(true);
      })
      .catch(() => {
        window.clearTimeout(fallbackTimer);
        skipBrokenTrack("play-failed");
      });
  }

  function nextTrack() {
    audioRef.current?.pause();
    stopFallback();
    skipGuardRef.current = 0;
    setTrackIndex((current) => (current + 1) % JAZZ_LIBRARY.length);
    setPlaying(true);
  }

  function skipBrokenTrack(reason = "audio-error") {
    console.warn(`Audio track failed (${reason}), skipping: ${currentTrack.title}`, currentTrack.src);
    audioRef.current?.pause();
    stopFallback();
    skipGuardRef.current += 1;
    if (skipGuardRef.current >= JAZZ_LIBRARY.length) {
      startFallback();
      skipGuardRef.current = 0;
      return;
    }
    setTrackIndex((current) => (current + 1) % JAZZ_LIBRARY.length);
    setPlaying(true);
  }

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <p>Author Hub</p>
          <span>小说创作中台</span>
        </div>
      </div>

      <nav className="nav-stack" aria-label="全局导航">
        <button type="button" onClick={() => onSelect("author")} className={`nav-item is-home ${activeView === "author" ? "is-active" : ""}`}>
          <Home size={18} />
          <span>作者个人主页</span>
        </button>
        <div className="nav-label">{novelCountLabel}</div>
        {novels.map((novel) => (
          <div key={novel.id} className={`nav-item novel-nav-item ${activeView === novel.id ? "is-active" : ""}`} style={{ "--item-color": novel.color }}>
            <button type="button" className="novel-select-button" onClick={() => onSelect(novel.id)}>
              <BookOpen size={18} />
              <span className="novel-nav-title">{novel.title}</span>
            </button>
            <button
              type="button"
              className="novel-delete-button"
              aria-label={`删除 ${novel.title}`}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDeleteNovel(novel.id);
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <button type="button" className="nav-item add-novel-button" onClick={onAddNovel}>
          <Plus size={18} />
          <span>新增小说</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className={`vinyl-player ${playing ? "is-playing" : ""}`}>
          <audio ref={audioRef} src={currentTrack.src} preload="auto" onEnded={nextTrack} onError={() => skipBrokenTrack("load-error")} />
          <button type="button" className="vinyl-button" onClick={togglePlay} aria-label={playing ? "暂停音乐" : "播放音乐"}>
            <Disc3 size={22} />
          </button>
          <div className="track-window" title={`${currentTrack.title} - ${currentTrack.artist}`}>
            <span>{currentTrack.title}</span>
            <small>{fallbackRef.current ? "本地柔和和弦" : currentTrack.artist}</small>
          </div>
          <div className="player-controls">
            <button type="button" onClick={togglePlay} aria-label={playing ? "暂停" : "播放"}>
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button type="button" onClick={nextTrack} aria-label="下一首">
              <SkipForward size={14} />
            </button>
          </div>
        </div>
        <button type="button" className="ghost-button" onClick={onReset}>
          <RotateCcw size={16} />
          重置 demo 数据
        </button>
        <p>拖动右侧细线可调整信息框宽度。</p>
      </div>

      <div
        className="resize-handle"
        onMouseDown={(event) => {
          startX.current = event.clientX;
          startWidth.current = width;
          setDragging(true);
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧边栏宽度"
      />
    </aside>
  );
}

function toChineseCount(value) {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value <= 10) return value === 10 ? "十" : digits[value] ?? String(value);
  if (value < 20) return `十${digits[value % 10]}`;
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const unit = value % 10;
    return `${digits[ten]}十${unit ? digits[unit] : ""}`;
  }
  return String(value);
}
