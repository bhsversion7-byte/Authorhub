import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImagePlus, Link, Trash2, X } from "lucide-react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const previewDialogStyle = {
  position: "relative",
  display: "grid",
  gap: "12px",
  width: "min(980px, calc(100vw - 36px))",
  maxHeight: "calc(100vh - 42px)",
  padding: "14px",
  border: "1px solid rgba(255, 255, 255, 0.78)",
  borderRadius: "24px",
  background: "linear-gradient(180deg, rgba(255, 253, 248, 0.96), rgba(246, 241, 234, 0.92))",
  boxShadow: "0 34px 90px rgba(44, 42, 41, 0.22)",
};

const previewImageStyle = {
  display: "block",
  width: "100%",
  maxHeight: "calc(100vh - 156px)",
  objectFit: "contain",
  borderRadius: "18px",
  background: "rgba(255, 250, 244, 0.68)",
};

const previewHotspotStyle = {
  position: "absolute",
  inset: 0,
  top: 0,
  right: "auto",
  bottom: "auto",
  left: 0,
  zIndex: 2,
  display: "block",
  width: "100%",
  height: "100%",
  padding: 0,
  border: 0,
  borderRadius: "18px",
  background: "transparent",
  color: "transparent",
  boxShadow: "none",
  cursor: "zoom-in",
};

export default function MediaCarousel({ images = [], onChange, label = "参考图片" }) {
  const [url, setUrl] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [mediaError, setMediaError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const dragStart = useRef(null);
  const hasDragged = useRef(false);
  const fileInputRef = useRef(null);
  const safeImages = useMemo(() => images ?? [], [images]);

  useEffect(() => {
    if (!safeImages.length) {
      setActiveIndex(0);
      setPreviewImage(null);
      return;
    }
    if (activeIndex > safeImages.length - 1) setActiveIndex(safeImages.length - 1);
  }, [activeIndex, safeImages.length]);

  useEffect(() => {
    if (!previewImage) return;
    const stillExists = safeImages.some((image) => getImageKey(image) === getImageKey(previewImage));
    if (!stillExists) setPreviewImage(null);
  }, [previewImage, safeImages]);

  useEffect(() => {
    if (!previewImage) return;
    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setPreviewImage(null);
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [previewImage]);

  function addFiles(event) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const allowedFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);
    const rejectedCount = files.length - allowedFiles.length;
    setMediaError(rejectedCount ? `已跳过 ${rejectedCount} 张超过 5MB 的图片。` : "");

    Promise.all(
      allowedFiles.map(
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
    ).then((nextImages) => {
      if (!nextImages.length) return;
      const nextActiveIndex = safeImages.length;
      onChange([...safeImages, ...nextImages]);
      setActiveIndex(nextActiveIndex);
    });
    event.target.value = "";
  }

  function addUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setMediaError("");
    const nextActiveIndex = safeImages.length;
    onChange([...safeImages, { id: `${Date.now()}-${trimmed}`, src: trimmed, alt: label }]);
    setActiveIndex(nextActiveIndex);
    setUrl("");
  }

  function removeImage(index, event) {
    event?.preventDefault();
    event?.stopPropagation();
    const nextImages = safeImages.filter((_, itemIndex) => itemIndex !== index);
    onChange(nextImages);
    setActiveIndex((current) => Math.max(0, Math.min(current, nextImages.length - 1)));
    setPreviewImage(null);
  }

  function move(delta, event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!safeImages.length) return;
    setActiveIndex((current) => (current + delta + safeImages.length) % safeImages.length);
  }

  function beginDrag(event) {
    dragStart.current = event.clientX;
    hasDragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateDrag(event) {
    if (dragStart.current === null) return;
    const offset = event.clientX - dragStart.current;
    if (Math.abs(offset) > 8) hasDragged.current = true;
    setDragX(Math.max(-110, Math.min(110, offset)));
  }

  function endDrag(event) {
    event?.stopPropagation?.();
    if (dragX > 42) move(-1);
    if (dragX < -42) move(1);
    dragStart.current = null;
    window.setTimeout(() => {
      hasDragged.current = false;
    }, 0);
    setDragX(0);
  }

  function onPointerDown(event) {
    if (event.target.closest("button, input, label")) return;
    beginDrag(event);
  }

  function onPointerMove(event) {
    updateDrag(event);
  }

  function onPointerUp(event) {
    endDrag(event);
  }

  function onHotspotPointerDown(event) {
    event.stopPropagation();
    beginDrag(event);
  }

  function onHotspotPointerMove(event) {
    event.stopPropagation();
    updateDrag(event);
  }

  function onHotspotPointerUp(event) {
    endDrag(event);
  }

  function openPreview(image, index, event) {
    event.stopPropagation();
    if (hasDragged.current) return;
    if (index !== activeIndex) {
      setActiveIndex(index);
      return;
    }
    setPreviewImage(image);
  }

  return (
    <div className="media-carousel-block">
      <div className="media-carousel-head">
        <span>{label}</span>
        <button type="button" className="media-upload-button" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={15} />
          添加图片
        </button>
        <input ref={fileInputRef} className="media-upload-input" type="file" accept="image/*" multiple onChange={addFiles} />
      </div>

      <div className="media-url-row compact-media-url">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addUrl();
            }
          }}
          placeholder="粘贴图片 URL"
        />
        <button type="button" onClick={addUrl} aria-label="添加图片链接">
          <Link size={15} />
        </button>
      </div>
      {mediaError && <p className="media-error">{mediaError}</p>}

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
                  key={getImageKey(image, index)}
                  data-visible={visible ? "true" : "false"}
                  title={index === activeIndex ? "点击查看大图" : "点击切换到这张图片"}
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
                  <button
                    type="button"
                    aria-label={index === activeIndex ? "查看大图" : "切换到这张图片"}
                    style={previewHotspotStyle}
                    onClick={(event) => openPreview(image, index, event)}
                    onPointerDown={onHotspotPointerDown}
                    onPointerMove={onHotspotPointerMove}
                    onPointerUp={onHotspotPointerUp}
                    onPointerCancel={onHotspotPointerUp}
                  />
                  <button type="button" onClick={(event) => removeImage(index, event)} aria-label="删除图片" style={{ zIndex: 3 }}>
                    <Trash2 size={14} />
                  </button>
                </figure>
              );
            })}
            {safeImages.length > 1 && (
              <>
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
                      key={getImageKey(image, index)}
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
            )}
          </>
        ) : (
          <div className="media-empty">添加 2 张或更多图片后，可滑动查看。</div>
        )}
      </div>

      {previewImage &&
        createPortal(
          <div className="modal-backdrop media-preview-backdrop" role="presentation" style={{ zIndex: 150 }} onMouseDown={() => setPreviewImage(null)}>
            <section style={previewDialogStyle} role="dialog" aria-modal="true" aria-label={`${label} 大图预览`} onMouseDown={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                aria-label="关闭图片预览"
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  zIndex: 2,
                  display: "grid",
                  width: "34px",
                  height: "34px",
                  placeItems: "center",
                  borderRadius: "50%",
                  background: "rgba(44, 42, 41, 0.78)",
                  color: "#fff8ef",
                }}
              >
                <X size={16} />
              </button>
              <img style={previewImageStyle} src={previewImage.src} alt={previewImage.alt || label} />
              <p style={{ margin: "0 4px", color: "#6f6258", fontSize: "12px", lineHeight: 1.6 }}>
                {previewImage.alt || label}
              </p>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}

function getImageKey(image, fallback = "") {
  return image?.id ?? image?.src ?? String(fallback);
}
