import { Component, createElement, ReactNode } from "react";

/**
 * Calls on_error when an error happens and displays a fallback UI.
 */
export class ReactErrorBoundary extends Component<
  { children: ReactNode; on_error: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.on_error(error);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return createElement("div", {
        children: "Component failed",
      });
    }

    return this.props.children;
  }
}
