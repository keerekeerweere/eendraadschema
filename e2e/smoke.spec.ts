import { expect, test, type Page } from "@playwright/test";

async function loadExample(page: Page, example: 0 | 1): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("Welkom op ééndraadschema")).toBeVisible();
  await page.locator(`button[onclick="load_example(${example})"]`).click();
  await expect(page.getByRole("navigation", { name: "Elektrische hiërarchie" })).toBeVisible();
}

test("loads an example into the React editor with a live SVG preview", async ({ page }) => {
  await loadExample(page, 1);

  await expect(page.locator("#react-hierarchy-root [data-hierarchy-item-id]").first()).toBeVisible();
  await expect(page.locator("#right_col_inner #EDS svg")).toBeVisible();
  await expect(page.getByRole("contentinfo", { name: "Statusbalk van de editor" })).toBeVisible();
});

test("adds components at branch ends and between drawn components", async ({ page }) => {
  await loadExample(page, 0);

  const endTrigger = page.getByRole("button", { name: /na Contactdoos.*toevoegen/ }).first();
  await expect(endTrigger).toBeVisible();
  await endTrigger.click();
  let dialog = page.getByRole("dialog", { name: "Onderdeel toevoegen" });
  await dialog.getByRole("combobox").selectOption("Lichtpunt");
  await dialog.getByRole("button", { name: "Toevoegen" }).click();

  const selectedItem = page.locator("#react-hierarchy-root [aria-current='true']");
  await expect(selectedItem).toContainText("Lichtpunt");
  const insertedLightId = await selectedItem.getAttribute("data-hierarchy-item-id");
  await expect(page.locator(`#right_col_inner [data-schema-item-id="${insertedLightId}"]`).first()).toBeVisible();

  const betweenTrigger = page.getByRole("button", { name: /vóór Lichtpunt.*invoegen/ }).first();
  await expect(betweenTrigger).toBeVisible();
  await betweenTrigger.click();
  dialog = page.getByRole("dialog", { name: "Onderdeel toevoegen" });
  await dialog.getByRole("combobox").selectOption("Contactdoos");
  await dialog.getByRole("button", { name: "Toevoegen" }).click();

  await expect(page.locator("#react-hierarchy-root [aria-current='true']")).toContainText("Contactdoos");
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
});

test("links schematic symbols and hierarchy selection in both directions", async ({ page }) => {
  await loadExample(page, 0);

  const schematicLabel = page.locator("#EDSSVG text").filter({ hasText: "Waterkoker" }).first();
  const itemId = await schematicLabel.evaluate((element) =>
    element.closest("[data-schema-item-id]")?.getAttribute("data-schema-item-id"),
  );
  const schematicContainer = schematicLabel.locator("xpath=ancestor::*[@data-schema-item-id][1]");
  const hitArea = schematicContainer.locator(":scope > [data-schema-hit-area]");
  await hitArea.hover();
  await expect(schematicContainer).toHaveAttribute("data-schema-hovered", "true");
  await expect(schematicContainer).toHaveCSS("filter", /drop-shadow/);
  await hitArea.click();

  const selectedRow = page.locator("#react-hierarchy-root [aria-current='true']");
  await expect(selectedRow).toHaveAttribute("data-hierarchy-item-id", itemId!);
  await expect(selectedRow).toBeFocused();

  const circuitRow = page.locator("#react-hierarchy-root [data-hierarchy-item-id]").filter({ hasText: "Kring" }).first();
  const circuitId = await circuitRow.getAttribute("data-hierarchy-item-id");
  await circuitRow.click();
  const highlightedSymbol = page.locator(
    `#right_col_inner [data-schema-item-id="${circuitId}"][data-schema-selected="true"]`,
  ).first();
  await expect(highlightedSymbol).toBeVisible();
  await expect(highlightedSymbol).toHaveCSS("filter", /drop-shadow/);
});

test("edits a circuit property through React and updates the SVG", async ({ page }) => {
  await loadExample(page, 1);

  // Rows start collapsed; reveal a circuit through the editor search.
  await page.getByRole("searchbox", { name: "Zoeken in het schema" }).fill("Kring");
  await page.getByRole("search").getByRole("button").first().click();

  const propertiesPanel = page.locator("#react-properties-root");
  await expect(propertiesPanel.getByRole("heading", { name: "Eigenschappen" })).toBeVisible();

  await propertiesPanel.getByText("Geavanceerde instellingen").click();
  const addressField = propertiesPanel.getByLabel("Adres", { exact: true });
  await addressField.fill("Smoketest-adres");
  await addressField.blur();

  await expect(page.locator("#right_col_inner #EDS svg")).toContainText("Smoketest-adres");

  const undoButton = page.getByRole("button", { name: "Ongedaan maken" });
  await undoButton.click();
  await expect(page.locator("#right_col_inner #EDS svg")).not.toContainText("Smoketest-adres");

  await page.getByRole("toolbar", { name: "Werkruimtecommando's" })
    .getByRole("button", { name: "Opnieuw" }).click();
  await expect(page.locator("#right_col_inner #EDS svg")).toContainText("Smoketest-adres");
});

test("search reveals and selects a matching item", async ({ page }) => {
  await loadExample(page, 1);

  const searchInput = page.getByRole("searchbox", { name: "Zoeken in het schema" });
  await searchInput.fill("Lichtpunt");
  await expect(page.getByRole("search").getByRole("status")).toContainText("gevonden");

  await page.getByRole("search").getByRole("button").first().click();
  await expect(searchInput).toHaveValue("");
  await expect(page.locator("#react-hierarchy-root [aria-current='true']")).toBeVisible();
});

test("unified workspace links hierarchy items to situation-plan placements", async ({ page }) => {
  await loadExample(page, 1);

  const workspaceTabs = page.getByRole("navigation", { name: "Werkruimteweergave" });
  const hierarchy = page.getByRole("navigation", { name: "Elektrische hiërarchie" });
  await expect(workspaceTabs.getByRole("button", { name: "Eéndraadschema" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#minitabs li:visible").filter({ hasText: "Eéndraadschema" })).toHaveCount(0);
  await expect(page.locator("#minitabs li:visible").filter({ hasText: "Situatieschema" })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "Zoeken in het schema" }).fill("Lichtpunt");
  await page.getByRole("search").getByRole("button").first().click();
  const links = page.getByRole("region", { name: "Koppelingen met situatieschema" });
  await expect(links).toContainText("0 plaatsingen");

  await links.getByRole("button", { name: "Plaats symbool" }).click();
  await expect(workspaceTabs.getByRole("button", { name: "Situatieschema" })).toHaveAttribute("aria-current", "page");
  await expect(hierarchy).toBeVisible();
  await expect(links).toContainText("1 plaatsing");

  const helpDialogOk = page.getByRole("button", { name: "OK" });
  if (await helpDialogOk.isVisible()) await helpDialogOk.click();
  await links.getByRole("button", { name: /Toon plaatsing 1/ }).click();
  await expect(page.locator("#paper .box.selected")).toBeVisible();
  const placementInspector = page.getByRole("region", { name: "Eigenschappen van situatiesymbool" });
  const rotation = placementInspector.getByLabel("Rotatie (°)");
  await rotation.fill("90");
  await rotation.blur();
  await expect(rotation).toHaveValue("90");
  await expect.poll(() => page.evaluate(() => (
    globalThis.situationPlanStore.getSnapshot().elements[0]?.rotation
  ))).toBe(90);
});

test("adds a secondary board, shows breadcrumbs, and deletes it again", async ({ page }) => {
  await loadExample(page, 1);

  await page.getByText("+ Verdeelbord toevoegen").click();
  const boardNavigator = page.getByRole("region", { name: "Verdeelborden" });
  const addForm = boardNavigator.locator("details").filter({ hasText: "+ Verdeelbord toevoegen" }).locator("form");
  await addForm.getByLabel("Naam").fill("Garage");
  await addForm.locator("select").selectOption({ index: 1 });
  await addForm.getByRole("button", { name: "Verdeelbord toevoegen" }).click();

  await expect(boardNavigator.getByRole("list").first()).toContainText("Garage");
  const breadcrumbs = page.getByRole("navigation", { name: /Voedingspad/ });
  await expect(breadcrumbs).toContainText("Hoofdbord");
  await expect(breadcrumbs).toContainText("Garage");

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByText("Instellingen van Garage").click();
  await page.getByRole("button", { name: "Verdeelbord verwijderen" }).click();
  await expect(boardNavigator.getByRole("list").first()).not.toContainText("Garage");
});

test("status bar zoom controls scale the SVG preview", async ({ page }) => {
  await loadExample(page, 0);

  const statusbar = page.getByRole("contentinfo", { name: "Statusbalk van de editor" });
  await statusbar.getByRole("button", { name: "Inzoomen" }).click();
  await expect(statusbar.getByRole("button", { name: "Zoom terugzetten naar 100 procent" })).toHaveText("125%");
  await expect(page.locator("#right_col_inner")).toHaveCSS("zoom", "1.25");

  await statusbar.getByRole("button", { name: "Zoom terugzetten naar 100 procent" }).click();
  await expect(statusbar.getByRole("button", { name: "Zoom terugzetten naar 100 procent" })).toHaveText("100%");
});

test("situation plan React controls manage pages", async ({ page }) => {
  await loadExample(page, 0);
  await page.getByRole("navigation", { name: "Werkruimteweergave" })
    .getByRole("button", { name: "Situatieschema" }).click();
  const helpDialogOk = page.getByRole("button", { name: "OK" });
  if (await helpDialogOk.isVisible()) await helpDialogOk.click();

  const controls = page.getByRole("toolbar", { name: "Werkruimtecommando's" });
  const pageSelect = controls.getByRole("combobox", { name: "Pagina" });
  await expect(pageSelect).toHaveValue("1");

  const paper = page.locator("#paper");
  const initialElementCount = await paper.locator(".box").count();
  await controls.getByLabel("Kies een plattegrondbestand").setInputFiles("css/bg.jpg");
  await expect(paper.locator(".box")).toHaveCount(initialElementCount + 1);
  await expect(controls.getByText("De plattegrond is toegevoegd", { exact: false })).toBeAttached();

  await controls.getByRole("button", { name: "Los symbool" }).click();
  const symbolDialog = page.getByRole("dialog", { name: "Los symbool toevoegen" });
  await symbolDialog.getByLabel("Schaal (%)").fill("125");
  await symbolDialog.getByLabel("Rotatie (°)").fill("90");
  await symbolDialog.getByRole("button", { name: "Toevoegen" }).click();
  await expect(symbolDialog).toBeHidden();
  await expect(paper.locator(".box")).toHaveCount(initialElementCount + 2);

  const fittedTransform = await paper.evaluate((element) => element.style.transform);
  await controls.getByRole("button", { name: "Situatieschema inzoomen" }).click();
  await expect.poll(() => paper.evaluate((element) => element.style.transform)).not.toBe(fittedTransform);
  await controls.getByRole("button", { name: "Passend" }).click();
  await expect.poll(() => paper.evaluate((element) => element.style.transform)).toBe(fittedTransform);

  await controls.getByRole("button", { name: /^Pagina$/ }).click();
  await expect(pageSelect).toHaveValue("2");
  await expect(pageSelect.locator("option")).toHaveCount(2);

  await pageSelect.selectOption("1");
  await expect(controls.getByRole("button", { name: /^Pagina$/ })).toBeDisabled();

  await pageSelect.selectOption("2");
  page.once("dialog", (dialog) => dialog.accept());
  await controls.getByRole("button", { name: "Pagina 2 verwijderen" }).click();
  await expect(pageSelect).toHaveValue("1");
  await expect(pageSelect.locator("option")).toHaveCount(1);
});

test("print page renders a preview through the print adapter", async ({ page }) => {
  await loadExample(page, 1);

  await page.locator("#minitabs").getByText("Print", { exact: true }).click();
  const printDialog = page.getByRole("dialog", { name: "Afdrukken" });
  await expect(printDialog).toBeVisible();
  await expect(printDialog.getByRole("button", { name: "PDF genereren" })).toBeVisible();
  await expect(printDialog.locator('[aria-label="Afdrukvoorbeeld"] > div > svg')).toBeVisible();
  await page.getByRole("button", { name: "Sluiten" }).click();

  await page.getByRole("navigation", { name: "Werkruimteweergave" })
    .getByRole("button", { name: "Eéndraadschema" }).click();
  await expect(page.getByRole("navigation", { name: "Elektrische hiërarchie" })).toBeVisible();
});
