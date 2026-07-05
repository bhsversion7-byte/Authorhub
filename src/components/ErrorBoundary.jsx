import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Author Hub render error", error, info);
    // A lazy chunk from a previous deploy failed to load (stale index.html).
    // Recover by reloading the fresh build instead of showing the error screen.
    const message = String(error?.message || error || "");
    if (/dynamically imported module|Loading chunk|module script failed|Importing a module/i.test(message)) {
      try {
        const last = Number(window.sessionStorage.getItem("ah-chunk-reload") || 0);
        if (Date.now() - last > 12000) {
          window.sessionStorage.setItem("ah-chunk-reload", String(Date.now()));
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.error) {
      // The anonymous public share page (/share/<token>) is shown to
      // strangers who are not the owner - never surface a raw stack trace
      // (chunk paths, and error messages that can quote the offending data)
      // to them. The signed-in owner (any other route) still gets the full
      // trace so they can copy-paste it for debugging.
      let isPublicViewer = false;
      try {
        isPublicViewer = window.location.pathname.startsWith("/share/");
      } catch {
        isPublicViewer = false;
      }

      if (isPublicViewer) {
        return (
          <main className="error-screen">
            <h1>分享链接暂时无法打开</h1>
            <p>请确认链接是否完整，或请作者重新生成只读查看链接。</p>
          </main>
        );
      }

      return (
        <main className="error-screen">
          <h1>Author Hub 启动失败</h1>
          <p>页面运行时出现错误。请把下面这段错误发给我，我可以继续修。</p>
          <pre>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
        </main>
      );
    }

    return this.props.children;
  }
}
