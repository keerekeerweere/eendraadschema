import type { ReactNode } from "react";

type IconName = "undo" | "redo" | "save" | "file" | "image" | "add" | "select" | "clear" | "delete" | "back" | "front" | "zoomOut" | "zoomIn" | "fit";

export function WorkspaceIcon({ name }: { readonly name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<IconName, ReactNode> = {
    undo: <><path d="M9 7H4v5" /><path d="M4 12a8 8 0 1 1 2.3 5.7" /></>,
    redo: <><path d="M15 7h5v5" /><path d="M20 12a8 8 0 1 0-2.3 5.7" /></>,
    save: <><path d="M4 3h13l3 3v15H4z" /><path d="M7 3v6h9V3M7 21v-8h10v8" /></>,
    file: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4M9 12h7M9 16h7" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m4 17 5-5 3 3 3-4 5 6" /></>,
    add: <path d="M12 4v16M4 12h16" />,
    select: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 3 3 5-6" /></>,
    clear: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 12h8" /></>,
    delete: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
    back: <><rect x="5" y="5" width="11" height="11" rx="1" /><path d="M9 19h10V9" /></>,
    front: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M5 15V5h10" /></>,
    zoomOut: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M7.5 10.5h6M15.5 15.5 21 21" /></>,
    zoomIn: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M7.5 10.5h6M10.5 7.5v6M15.5 15.5 21 21" /></>,
    fit: <><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /><rect x="7" y="7" width="10" height="10" rx="1" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" {...common}>{shapes[name]}</svg>;
}
