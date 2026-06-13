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
  }

  render() {
    if (this.state.error) {
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
