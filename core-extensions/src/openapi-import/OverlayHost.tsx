import React, { useEffect } from "react";
import type { PluginContext } from "@voiden/sdk/ui";
import { OpenAPIImportPanel } from "./components/OpenAPIImportPanel";
import * as ReactDomClient from "react-dom/client";
import * as ReactDom from "react-dom";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ExtendedPluginContextExplicit } from "./plugin";
import { X } from "lucide-react";

const OVERLAY_ID = "voiden-openapi-overlay-root";
const TARGET_SELECTOR = "#main-editor";

function ensureRoot(el: HTMLElement) {
  const canCreateRoot = (ReactDomClient as any)?.createRoot;
  if (canCreateRoot) {
    const root = (ReactDomClient as any).createRoot(el);
    return {
      render: (node: React.ReactNode) => root.render(node),
      unmount: () => root.unmount?.(),
    };
  }
  return {
    render: (node: React.ReactNode) => ReactDom.render(node as any, el),
    unmount: () => ReactDom.unmountComponentAtNode(el),
  };
}

// The outer "shell" fills the host (host is sized to match .bg-editor)
const shellStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2147483647,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.4)", // dim within the editor area only
};

const frameStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background: "var(--ui-bg)",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  borderBottom: "1px solid var(--ui-line)",
  background: "var(--ui-panel-bg)",
  color: "var(--editor-fg)",
  fontSize: 13,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
};


function OverlayApp({ onClose, context }: { onClose: () => void; context: ExtendedPluginContextExplicit }) {
  const [client] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <OverlayShell onClose={onClose} context={context} />
    </QueryClientProvider>
  );
}

const OverlayShell: React.FC<{ onClose: () => void; context: PluginContext }> = ({ onClose, context }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={shellStyle} className="border border-border" role="dialog" aria-modal="true">
      <div style={frameStyle}>
        <div style={headerStyle}>
          <div className="text-text text-md">OpenAPI Preview</div>
          <button className="flex items-center p-1 gap-2 text-comment border border-border rounded hover:border-accent hover:text-text transition" onClick={onClose}>
             <X size={14}></X> (Esc)
          </button>
        </div>
        <div style={bodyStyle} className="bg-bg flex justify-center items-center">
          <OpenAPIImportPanel context={context} />
        </div>
      </div>
    </div>
  );
};

export function createOpenApiOverlay(context: PluginContext) {
  let host: HTMLDivElement | null = null;
  let root: { render: (n: React.ReactNode) => void; unmount: () => void } | null = null;
  let openState = false;

  let targetEl: Element | null = null;
  let resizeObs: ResizeObserver | null = null;

  const mount = () => {
    if (!host) {
      host = document.createElement("div");
      host.id = OVERLAY_ID;
      host.style.position = "absolute"; // key: position absolute
      host.style.zIndex = String(49);

      // To keep overlay painting above editor, append to body (absolute coords use viewport)
      document.body.appendChild(host);
      root = ensureRoot(host);
    }
  };

  const updatePosition = () => {
    // Try to find target each time in case the DOM changed
    targetEl = document.querySelector(TARGET_SELECTOR);
    if (!targetEl || !host) {
      // fallback: cover full viewport (rare)
      host!.style.left = "0px";
      host!.style.top = "0px";
      host!.style.width = `${window.innerWidth}px`;
      host!.style.height = `${window.innerHeight}px`;
      return;
    }
    const rect = (targetEl as HTMLElement).getBoundingClientRect();
    // Because host is absolutely positioned relative to the viewport,
    // using rect.{top,left,width,height} aligns it perfectly.
    host.style.left = `${Math.round(rect.left)}px`;
    host.style.top = `${Math.round(rect.top)}px`;
    host.style.width = `${Math.round(rect.width)}px`;
    host.style.height = `${Math.round(rect.height)}px`;
    host.style.pointerEvents = "auto"; // ensure clicks go to overlay
  };

  const addObservers = () => {
    // Resize/scroll listeners
    const onWinChange = () => updatePosition();
    window.addEventListener("resize", onWinChange, { passive: true });
    window.addEventListener("scroll", onWinChange, { passive: true });

    // ResizeObserver for the target element (handles layout/size changes)
    const el = document.querySelector(TARGET_SELECTOR) as HTMLElement | null;
    if (el && "ResizeObserver" in window) {
      resizeObs = new ResizeObserver(() => updatePosition());
      resizeObs.observe(el);
    }

    // A tiny rAF loop to catch rapid layout shifts (debounced)
    let rafId = 0;
    const watch = () => {
      updatePosition();
      rafId = requestAnimationFrame(watch);
    };
    rafId = requestAnimationFrame(watch);

    // Return cleanup
    return () => {
      window.removeEventListener("resize", onWinChange);
      window.removeEventListener("scroll", onWinChange);
      if (resizeObs) {
        try {
          resizeObs.disconnect();
        } catch {}
        resizeObs = null;
      }
      cancelAnimationFrame(rafId);
    };
  };

  let cleanupObservers: (() => void) | null = null;

  const toggleVisible = (makeVisible: boolean) => {
    if (host && openState) {
      host.style.display = makeVisible ? "block" : "none";
    }
  };

  const open = () => {
    if (openState && host?.style.display==='block') return;
    openState = true;
    mount();
    updatePosition();
    cleanupObservers = addObservers();
    root!.render(<OverlayApp context={context} onClose={destroy} />);

    if (host) {
      host.style.display = "block";
    }
  };

  const close = () => {
    if (!openState) return;
    openState = false;
    if (cleanupObservers) {
      cleanupObservers();
      cleanupObservers = null;
    }
    if (root) root.render(<></>); // unmount children
  };

  const destroy = () => {
    close();
    if (root) {
      root.unmount?.();
      root = null;
    }
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
  };

  return { open, close, destroy, toggleVisible };
}
