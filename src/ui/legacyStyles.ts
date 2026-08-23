/** Tailwind utilities shared with DOM that is still created outside React. */
export const legacyUi = Object.freeze({
  popupOverlay: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 invisible",
  popup: "fixed top-1/2 left-1/2 z-[1000000] max-h-[90vh] max-w-[90vw] -translate-1/2 overflow-auto rounded-lg border border-neutral-300 bg-white px-5 pt-1 pb-5 shadow-xl [&_h3]:text-blue-700",
  dialogButton: "mx-2 mt-2 block min-w-24 cursor-pointer rounded-md border-0 bg-blue-500 px-5 py-2.5 font-semibold text-white hover:bg-blue-700",
  contextMenu: "absolute z-[999999999] hidden border border-neutral-400 bg-neutral-100 text-xs leading-none shadow-lg",
  contextMenuItem: "flex cursor-pointer items-center justify-between px-1.5 py-1 hover:bg-neutral-200",
  contextMenuShortcut: "ml-4 text-neutral-500",
  contextMenuSeparator: "my-0.5 border-0 border-t border-neutral-300",
  situationBox: "box absolute box-border rotate-0 cursor-pointer border-solid border-transparent bg-transparent select-none",
  situationLabel: "boxlabel absolute inline-block box-border rotate-0 cursor-pointer whitespace-nowrap border-0 bg-transparent text-[11px] select-none",
  ribbonButton: "inline-flex min-h-12 w-16 cursor-pointer flex-col items-center justify-center rounded-md border border-transparent px-1 py-0.5 text-center text-xs text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100",
  ribbonIcon: "pointer-events-none text-2xl leading-none",
  ribbonLabel: "pointer-events-none mt-1 block w-full leading-tight",
});
