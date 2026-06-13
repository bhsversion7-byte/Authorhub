import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Link, Trash2 } from "lucide-react";

export default function MediaCarousel({ images = [], onChange, label = "参考图片" }) {
  const [url, setUrl] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const dragStart = useRef(null);
  const safeImages = useMemo(() => images ?? [], [images]);

  useEffect(() => {
    if (!safeImages.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > safeImages.length - 1) {
      setActiveIndex(safeImages.length - 1);
    }
  }, [activeIndex, safeImages.length]);

  function addFiles(event) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: `${Date.now()}-${file.name}`,
                src: reader.result,
                alt: file.name,
              });
            reader.readAsDataURL(file);
          }),
      ),
    ).then((nextImages) => onChange([...safeImages, ...nextImages]));
    event.target.value = "";
  }

  function addUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onChange([...safeImages, { id: `${Date.now()}-${trimmed}`, src: trimmed, alt: label }]);
    setUrl("");
  }

  function removeImage(id, event) {
    event?.stopPropagation();
    onChange(safeImages.filter((image) => image.id !== id));
  }

  function move(delta, event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!safeImages.length) return;
    setActiveIndex((current) => (current + delta + safeImages.length) % safeImages.length);
  }

  function onPointerDown(event) {
    if (event.target.closest("button, input, label")) return;
    dragStart.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (dragStart.current === null) return;
    setDragX(Math.max(-110, Math.min(110, event.clientX - dragStart.current)));
  }

  function onPointerUp() {
    if (dragX > 42) move(-1);
    if (dragX < -42) move(1);
    dragStart.current = null;
    setDragX(0);
  }

  return (
    <div className="media-carousel-block">
      <div className="media-carousel-head">
        <span>{label}</span>
        <label className="media-upload-button">
          <ImagePlus size={15} />
          添加图片
          <input type="file" accept="image/*" multiple onChange={addFiles} />
        </label>
      </div>

      <div className="media-url-row compact-media-url">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴图片 URL" />
        <button type="button" onClick={addUrl} aria-label="添加图片链接">
          <Link size={15} />
        </button>
      </div>

      <p className="media-note">添加 2 张或更多图片后，可滑动查看。</p>

      <div
        className={`imessage-stack ${safeImages.length ? "" : "is-empty"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ "--drag-x": `${dragX}px` }}
      >
        {safeImages.length ? (
          <>
            {safeImages.map((image, index) => {
              const offset = index - activeIndex;
              const visible = Math.abs(offset) <= 3;
              return (
                <figure
                  className={`imessage-card ${index === activeIndex ? "is-active" : ""}`}
                  key={image.id ?? image.src}
                  data-visible={visible ? "true" : "false"}
                  style={{
                    "--card-x": `${offset * 42}px`,
                    "--card-y": `${Math.abs(offset) * 9}px`,
                    "--card-scale": 1 - Math.min(Math.abs(offset), 3) * 0.055,
                    "--card-opacity": 1 - Math.min(Math.abs(offset), 4) * 0.2,
                    "--tilt": `${offset * -3.4}deg`,
                    "--drag-tilt": `${dragX * 0.015}deg`,
                  }}
                >
                  <img src={image.src} alt={image.alt || `${label} ${index + 1}`} draggable="false" />
                  <button type="button" onClick={(event) => removeImage(image.id, event)} aria-label="删除图片">
                    <Trash2 size={14} />
                  </button>
                </figure>
              );
            })}
            <button type="button" className="stack-nav prev" onClick={(event) => move(-1, event)} aria-label="上一张">
              <ChevronLeft size={17} />
            </button>
            <button type="button" className="stack-nav next" onClick={(event) => move(1, event)} aria-label="下一张">
              <ChevronRight size={17} />
            </button>
            <div className="stack-dots" aria-label="图片页码">
              {safeImages.map((image, index) => (
                <button
                  type="button"
                  key={image.id ?? image.src}
                  className={index === activeIndex ? "is-active" : ""}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveIndex(index);
                  }}
                  aria-label={`查看第 ${index + 1} 张图片`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="media-empty">添加 2 张或更多图片后，可滑动查看。</div>
        )}
      </div>
    </div>
  );
}
