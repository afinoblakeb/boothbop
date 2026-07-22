import { Component, type CSSProperties, type ReactNode } from "react";

interface StartupErrorBoundaryProps {
  children: ReactNode;
  reload?: () => void;
}

interface StartupErrorBoundaryState {
  failed: boolean;
}

const surfaceStyle: CSSProperties = {
  alignItems: "center",
  background: "#fff7ed",
  color: "#171717",
  display: "flex",
  fontFamily: "system-ui, sans-serif",
  justifyContent: "center",
  minHeight: "100vh",
  padding: "24px",
  textAlign: "center",
};

const contentStyle: CSSProperties = {
  maxWidth: "360px",
};

const headingStyle: CSSProperties = {
  fontSize: "24px",
  lineHeight: 1.2,
  margin: "0 0 12px",
};

const copyStyle: CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.5,
  margin: "0 0 20px",
};

const buttonStyle: CSSProperties = {
  background: "#171717",
  border: 0,
  borderRadius: "4px",
  color: "#ffffff",
  cursor: "pointer",
  font: "600 16px/1 system-ui, sans-serif",
  minHeight: "48px",
  padding: "0 24px",
};

export class StartupErrorBoundary extends Component<
  StartupErrorBoundaryProps,
  StartupErrorBoundaryState
> {
  state: StartupErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): StartupErrorBoundaryState {
    return { failed: true };
  }

  private reload = () => {
    if (this.props.reload) {
      this.props.reload();
      return;
    }
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main role="alert" style={surfaceStyle}>
        <div style={contentStyle}>
          <h1 style={headingStyle}>BoothBop couldn't start</h1>
          <p style={copyStyle}>Reload the app to try again.</p>
          <button type="button" style={buttonStyle} onClick={this.reload}>
            Try again
          </button>
        </div>
      </main>
    );
  }
}
