import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LegacySaveStatusStore } from "../application/SaveStatusStore";
import { LocalWorkspaceStore } from "../application/WorkspaceStore";
import { WorkspaceHeader } from "../ui/workspace/WorkspaceHeader";

afterEach(cleanup);

describe("WorkspaceHeader", () => {
  it("keeps navigation, save state, and document actions reachable", () => {
    const store = new LocalWorkspaceStore();
    let saved = true;
    const saveStatusStore = new LegacySaveStatusStore(() => ({ hasUnsavedChanges: !saved, filename: "woning.eds" }));
    const onFile = vi.fn();
    render(<WorkspaceHeader
      itemCount={3}
      openIssueCount={2}
      store={store}
      saveStatusStore={saveStatusStore}
      onSelectTab={tab => store.commands.selectTab(tab)}
      onNew={() => {}}
      onFile={onFile}
      onPrint={() => {}}
      onDocumentation={() => {}}
      onAbout={() => {}}
    />);

    expect(screen.getByRole("navigation", { name: "Werkruimteweergave" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAccessibleName("woning.eds is opgeslagen");
    fireEvent.click(screen.getByRole("button", { name: "Situatieschema" }));
    expect(store.getSnapshot().activeTab).toBe("situation");
    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Bestand" }));
    expect(onFile).toHaveBeenCalledOnce();
    act(() => { saved = false; saveStatusStore.refresh(); });
    expect(screen.getByRole("status")).toHaveAccessibleName("Niet opgeslagen wijzigingen in woning.eds");
  });
});
