import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationMenu } from "../ui/workspace/ApplicationMenu";

afterEach(cleanup);

describe("ApplicationMenu", () => {
  it("keeps document actions available in the application menu", () => {
    const onNew = vi.fn();
    const onFile = vi.fn();
    const onPrint = vi.fn();
    render(
      <ApplicationMenu
        onNew={onNew}
        onFile={onFile}
        onPrint={onPrint}
        onDocumentation={() => {}}
        onAbout={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Nieuw dossier" }));
    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Bestand" }));
    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Afdrukken en exporteren" }));
    expect(onNew).toHaveBeenCalledOnce();
    expect(onFile).toHaveBeenCalledOnce();
    expect(onPrint).toHaveBeenCalledOnce();
  });

  it("groups documentation and contact in the application menu", () => {
    const onDocumentation = vi.fn();
    const onAbout = vi.fn();
    render(
      <ApplicationMenu
        onNew={() => {}}
        onFile={() => {}}
        onPrint={() => {}}
        onDocumentation={onDocumentation}
        onAbout={onAbout}
      />,
    );

    const details = screen.getByText("Menu", { exact: false }).closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Handleiding" }));
    expect(onDocumentation).toHaveBeenCalledOnce();
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Menu", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: "Info en contact" }));
    expect(onAbout).toHaveBeenCalledOnce();
  });
});
