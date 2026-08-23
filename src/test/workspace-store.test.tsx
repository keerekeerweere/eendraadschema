import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalWorkspaceStore } from "../application/WorkspaceStore";
import { WorkspaceHeader } from "../ui/workspace/WorkspaceHeader";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("LocalWorkspaceStore", () => {
  it("publishes schema and situation tab changes without duplicate notifications", () => {
    const store = new LocalWorkspaceStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.getSnapshot().activeTab).toBe("schema");
    store.commands.selectTab("situation");
    store.commands.selectTab("situation");
    store.commands.selectTab("schema");

    expect(store.getSnapshot().activeTab).toBe("schema");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("tracks a stable primary placement within a deduplicated multi-selection", () => {
    const store = new LocalWorkspaceStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.commands.selectSituationElements(["SP_1", "SP_2", "SP_1"], "SP_1");
    store.commands.selectSituationElements(["SP_1", "SP_2"], "SP_1");

    expect(store.getSnapshot()).toMatchObject({
      selectedSituationElementId: "SP_1",
      selectedSituationElementIds: ["SP_1", "SP_2"],
    });
    expect(Object.isFrozen(store.getSnapshot().selectedSituationElementIds)).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("hides duplicate legacy workspace links while retaining the rest of the menu", async () => {
    document.body.innerHTML = `
      <ul id="minitabs">
        <li><a>Bestand</a></li>
        <li><a>Eéndraadschema</a></li>
        <li><a>Situatieschema</a></li>
        <li><a>Print</a></li>
      </ul>
    `;
    render(
      <WorkspaceHeader
        itemCount={3}
        store={new LocalWorkspaceStore()}
        onSelectTab={() => {}}
      />,
    );

    await waitFor(() => {
      expect(Array.from(document.querySelectorAll<HTMLLIElement>("#minitabs li"))
        .filter(item => item.style.display === "none")).toHaveLength(2);
    });
    expect(document.querySelector("#minitabs")?.textContent).toContain("Bestand");
    expect(document.querySelector("#minitabs")?.textContent).toContain("Print");
  });
});
