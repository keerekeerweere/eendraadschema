import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LocalWorkspaceStore } from "../application/WorkspaceStore";
import { WorkspaceSidebarResizers } from "../ui/workspace/WorkspaceSidebarResizers";

afterEach(() => {
  cleanup();
  document.getElementById("react-workspace-sidebar")?.remove();
  document.getElementById("properties_col")?.remove();
});

describe("WorkspaceSidebarResizers", () => {
  it("opens each responsive panel, closes with Escape, and returns focus", async () => {
    const navigation = document.createElement("aside");
    navigation.id = "react-workspace-sidebar";
    navigation.tabIndex = -1;
    document.body.append(navigation);
    const details = document.createElement("aside");
    details.id = "properties_col";
    details.tabIndex = -1;
    document.body.append(details);
    const store = new LocalWorkspaceStore();
    act(() => store.commands.selectTab("schema"));
    render(<WorkspaceSidebarResizers store={store} />);

    const navigationButton = screen.getByRole("button", { name: "Navigatie" });
    fireEvent.click(navigationButton);
    await waitFor(() => expect(navigation).toHaveClass("workspace-drawer-open"));
    expect(navigationButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(navigationButton).toHaveFocus();
    expect(navigationButton).toHaveAttribute("aria-expanded", "false");

    const detailsButton = screen.getByRole("button", { name: "Details" });
    fireEvent.click(detailsButton);
    await waitFor(() => expect(details).toHaveClass("workspace-drawer-open"));
    fireEvent.click(screen.getAllByRole("button", { name: "Paneel sluiten" })[0]);
    expect(detailsButton).toHaveFocus();
    expect(detailsButton).toHaveAttribute("aria-expanded", "false");
  });
});
