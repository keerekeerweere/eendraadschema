import type { Hierarchical_List } from "../Hierarchical_List";
import type { SituationPlan } from "../sitplan/SituationPlan";
import { SituationPlanElement } from "../sitplan/SituationPlanElement";
import {
  SituationPlanCommandError,
  type SituationPlanCommands,
  type SituationPlanElementChanges,
  type SituationPlanAlignment,
  type SituationPlanDistributionAxis,
  type SituationPlanElementUpdate,
  type SituationPlanElementSnapshot,
  type SituationPlanSnapshot,
  type SituationPlanStore,
} from "./SituationPlanStore";

export type SituationPlanMutationCommitted = () => void;

export class LegacySituationPlanStore implements SituationPlanStore {
  private structure: Hierarchical_List;
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private snapshot: SituationPlanSnapshot;
  private stateKey: string;

  readonly commands: SituationPlanCommands;

  constructor(
    structure: Hierarchical_List,
    private readonly mutationCommitted?: SituationPlanMutationCommitted,
  ) {
    this.structure = structure;
    this.snapshot = this.createSnapshot();
    this.stateKey = this.createStateKey(this.snapshot);
    this.commands = Object.freeze({
      selectPage: this.selectPage.bind(this),
      addPage: this.addPage.bind(this),
      deletePage: this.deletePage.bind(this),
      updateDefaults: this.updateDefaults.bind(this),
      updateElement: this.updateElement.bind(this),
      updateElements: this.updateElements.bind(this),
      alignElements: this.alignElements.bind(this),
      distributeElements: this.distributeElements.bind(this),
      duplicateElements: this.duplicateElements.bind(this),
      deleteElements: this.deleteElements.bind(this),
    });
  }

  getSnapshot(): SituationPlanSnapshot {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Transitional seam for the legacy canvas while its interactions are migrated. */
  synchronizeLegacyDocument(structure: Hierarchical_List = this.structure): void {
    this.structure = structure;
    const nextSnapshot = this.createSnapshot();
    const nextStateKey = this.createStateKey(nextSnapshot);
    if (nextStateKey === this.stateKey) return;
    this.publish();
  }

  getLegacyDocument(): Hierarchical_List {
    return this.structure;
  }

  private selectPage(page: number): void {
    this.assertPage(page);
    if (page === this.plan.getActivePage()) return;
    this.commit(() => this.plan.setActivePage(page));
  }

  private addPage(): number {
    return this.commit(() => {
      const page = this.plan.addPage();
      this.plan.setActivePage(page);
      return page;
    });
  }

  private deletePage(page: number): void {
    this.assertPage(page);
    if (this.plan.getPageCount() === 1) {
      throw new SituationPlanCommandError("LAST_PAGE", "De laatste pagina kan niet worden verwijderd.");
    }
    this.commit(() => this.plan.deletePage(page));
  }

  private updateDefaults(changes: Parameters<SituationPlan["updateDefaults"]>[0]): void {
    if (changes.fontsize !== undefined && (!Number.isFinite(changes.fontsize) || changes.fontsize <= 0)) {
      throw new SituationPlanCommandError("INVALID_DEFAULT", "De lettergrootte moet groter zijn dan nul.");
    }
    if (changes.scale !== undefined && (!Number.isFinite(changes.scale) || changes.scale <= 0)) {
      throw new SituationPlanCommandError("INVALID_DEFAULT", "De schaal moet groter zijn dan nul.");
    }
    if (changes.rotate !== undefined && !Number.isFinite(changes.rotate)) {
      throw new SituationPlanCommandError("INVALID_DEFAULT", "De rotatie moet een eindig getal zijn.");
    }

    const defaults = this.plan.getDefaults();
    const changed = Object.entries(changes).some(
      ([key, value]) => defaults[key as keyof typeof defaults] !== value,
    );
    if (!changed) return;
    this.commit(() => this.plan.updateDefaults(changes));
  }

  private updateElement(elementId: string, changes: SituationPlanElementChanges): void {
    this.updateElements([{ elementId, changes }]);
  }

  private updateElements(updates: readonly SituationPlanElementUpdate[]): void {
    const elementIds = new Set<string>();
    const prepared = updates.map(({ elementId, changes }) => {
      if (elementIds.has(elementId)) {
        throw new SituationPlanCommandError(
          "INVALID_ELEMENT_CHANGE",
          `Plaatsing '${elementId}' komt meer dan eenmaal voor in dezelfde wijziging.`,
        );
      }

      elementIds.add(elementId);
      return this.prepareElementUpdate(elementId, changes);
    }).filter(update => update.changed);
    if (prepared.length === 0) return;

    this.commit(() => {
      for (const update of prepared) {
        this.applyElementChanges(update.element, update.serialized, update.changes);
      }
    });
  }

  private alignElements(elementIds: readonly string[], alignment: SituationPlanAlignment): void {
    const elements = this.requireSelectedElements(elementIds, 2).filter(element => element.movable);
    if (elements.length < 2) return;
    const horizontal = alignment === "left" || alignment === "horizontal-center" || alignment === "right";
    const values = elements.map(element => horizontal ? element.posx : element.posy);
    const target = alignment === "left" || alignment === "top"
      ? Math.min(...values)
      : alignment === "right" || alignment === "bottom"
        ? Math.max(...values)
        : values.reduce((sum, value) => sum + value, 0) / values.length;
    this.updateElements(elements.map(element => ({
      elementId: element.id,
      changes: {
        position: {
          x: horizontal ? target : element.posx,
          y: horizontal ? element.posy : target,
        },
      },
    })));
  }

  private distributeElements(
    elementIds: readonly string[],
    axis: SituationPlanDistributionAxis,
  ): void {
    const horizontal = axis === "horizontal";
    const elements = this.requireSelectedElements(elementIds, 3)
      .filter(element => element.movable)
      .sort((first, second) => (
        horizontal ? first.posx - second.posx : first.posy - second.posy
      ));
    if (elements.length < 3) return;
    const first = horizontal ? elements[0].posx : elements[0].posy;
    const last = horizontal
      ? elements[elements.length - 1].posx
      : elements[elements.length - 1].posy;
    const interval = (last - first) / (elements.length - 1);
    this.updateElements(elements.map((element, index) => ({
      elementId: element.id,
      changes: {
        position: {
          x: horizontal ? first + interval * index : element.posx,
          y: horizontal ? element.posy : first + interval * index,
        },
      },
    })));
  }

  private duplicateElements(
    elementIds: readonly string[],
    offset: Readonly<{ x: number; y: number }> = { x: 10, y: 10 },
  ): readonly string[] {
    if (!Number.isFinite(offset.x) || !Number.isFinite(offset.y)) {
      throw new SituationPlanCommandError(
        "INVALID_ELEMENT_CHANGE",
        "De verschuiving voor duplicaten moet uit geldige getallen bestaan.",
      );
    }

    const elements = this.requireSelectedElements(elementIds, 1);
    const duplicateCounts = new Map<number, number>();
    for (const element of elements) {
      const itemId = element.getElectroItemId();
      if (itemId !== null) duplicateCounts.set(itemId, (duplicateCounts.get(itemId) ?? 0) + 1);
    }
    for (const [itemId, addedCount] of duplicateCounts) {
      const item = this.structure.getElectroItemById(itemId);
      const existingCount = this.plan.countByElectroItemId(itemId);
      if (!item || existingCount + addedCount > item.maxSituationPlanElements()) {
        throw new SituationPlanCommandError(
          "INVALID_ELEMENT_SELECTION",
          `Het elektrische onderdeel ${itemId} laat geen extra plaatsing toe.`,
        );
      }
    }
    const duplicates = elements.map((element) => {
      const duplicate = new SituationPlanElement();
      duplicate.fromJsonObject({
        ...element.toJsonObject(),
        posx: element.posx + offset.x,
        posy: element.posy + offset.y,
        labelposx: element.labelposx + offset.x,
        labelposy: element.labelposy + offset.y,
      });
      return duplicate;
    });
    return this.commit(() => {
      for (const duplicate of duplicates) this.plan.addElement(duplicate);
      return Object.freeze(duplicates.map(element => element.id));
    });
  }

  private deleteElements(elementIds: readonly string[]): readonly number[] {
    const elements = this.requireSelectedElements(elementIds, 1);
    const deletableElements = elements.filter(element => element.movable);
    const deletedItemIds = deletableElements.flatMap((element) => {
      const itemId = element.getElectroItemId();
      if (itemId === null) return [];
      const item = this.structure.getElectroItemById(itemId);
      return item?.getParent()?.getType() === "Container" ? [itemId] : [];
    });
    if (deletableElements.length === 0) return Object.freeze([]);
    return this.commit(() => {
      for (const element of deletableElements) this.plan.removeElement(element);
      return Object.freeze(deletedItemIds);
    });
  }

  private requireSelectedElements(
    elementIds: readonly string[],
    minimum: number,
  ): SituationPlanElement[] {
    const uniqueIds = [...new Set(elementIds)];
    if (uniqueIds.length < minimum) {
      throw new SituationPlanCommandError(
        "INVALID_ELEMENT_SELECTION",
        `Selecteer minstens ${minimum} plaatsingen voor deze bewerking.`,
      );
    }
    const elements = uniqueIds.map((elementId) => {
      const element = this.plan.getElements().find(candidate => candidate.id === elementId);
      if (!element) {
        throw new SituationPlanCommandError(
          "ELEMENT_NOT_FOUND",
          `Situatieplanplaatsing '${elementId}' bestaat niet.`,
        );
      }
      return element;
    });
    if (new Set(elements.map(element => element.page)).size > 1) {
      throw new SituationPlanCommandError(
        "INVALID_ELEMENT_SELECTION",
        "Deze bewerking kan alleen op plaatsingen van dezelfde pagina worden uitgevoerd.",
      );
    }
    return elements;
  }

  private prepareElementUpdate(elementId: string, changes: SituationPlanElementChanges) {
    const element = this.plan.getElements().find(candidate => candidate.id === elementId);
    if (!element) {
      throw new SituationPlanCommandError(
        "ELEMENT_NOT_FOUND",
        `Situatieplanplaatsing '${elementId}' bestaat niet.`,
      );
    }
    if (changes.page !== undefined) this.assertPage(changes.page);
    if (changes.position !== undefined && (
      !Number.isFinite(changes.position.x) || !Number.isFinite(changes.position.y)
    )) {
      throw new SituationPlanCommandError("INVALID_ELEMENT_CHANGE", "De positie moet uit geldige getallen bestaan.");
    }
    if (changes.labelFontSize !== undefined && (
      !Number.isFinite(changes.labelFontSize) || changes.labelFontSize <= 0
    )) {
      throw new SituationPlanCommandError("INVALID_ELEMENT_CHANGE", "De lettergrootte moet groter zijn dan nul.");
    }
    if (changes.scale !== undefined && (!Number.isFinite(changes.scale) || changes.scale <= 0)) {
      throw new SituationPlanCommandError("INVALID_ELEMENT_CHANGE", "De schaal moet groter zijn dan nul.");
    }
    if (changes.rotation !== undefined && !Number.isFinite(changes.rotation)) {
      throw new SituationPlanCommandError("INVALID_ELEMENT_CHANGE", "De rotatie moet een geldig getal zijn.");
    }

    const serialized = element.toJsonObject();
    const changed = (
      (changes.page !== undefined && changes.page !== serialized.page)
      || (changes.position !== undefined && (
        changes.position.x !== serialized.posx || changes.position.y !== serialized.posy
      ))
      || (changes.labelFontSize !== undefined && changes.labelFontSize !== serialized.labelfontsize)
      || (changes.addressType !== undefined && changes.addressType !== serialized.adrestype)
      || (changes.address !== undefined && changes.address !== serialized.adres)
      || (changes.addressLocation !== undefined && changes.addressLocation !== serialized.adreslocation)
      || (changes.rotation !== undefined && changes.rotation !== serialized.rotate)
      || (changes.scale !== undefined && changes.scale !== serialized.scale)
      || (changes.movable !== undefined && changes.movable !== serialized.movable)
    );
    return { changed, changes, element, serialized };
  }

  private applyElementChanges(
    element: SituationPlanElement,
    serialized: ReturnType<SituationPlanElement["toJsonObject"]>,
    changes: SituationPlanElementChanges,
  ): void {
    if (changes.page !== undefined) element.page = changes.page;
    if (changes.position !== undefined) {
      element.posx = changes.position.x;
      element.posy = changes.position.y;
    }
    if (changes.labelFontSize !== undefined) element.labelfontsize = changes.labelFontSize;
    if (
      changes.addressType !== undefined
      || changes.address !== undefined
      || changes.addressLocation !== undefined
    ) {
      const addressType = changes.addressType ?? (serialized.adrestype === "manueel" ? "manueel" : "auto");
      const addressLocation = changes.addressLocation ?? (
        serialized.adreslocation === "links"
          ? "links"
          : serialized.adreslocation === "boven"
            ? "boven"
            : serialized.adreslocation === "onder"
              ? "onder"
              : "rechts"
      );
      element.setAdres(
        addressType,
        changes.address ?? serialized.adres ?? "",
        addressLocation,
      );
    }
    if (changes.rotation !== undefined) element.rotate = changes.rotation;
    if (changes.scale !== undefined) element.setscale(changes.scale);
    if (changes.movable !== undefined) element.movable = changes.movable;
  }

  private assertPage(page: number): void {
    if (!Number.isInteger(page) || page < 1 || page > this.plan.getPageCount()) {
      throw new SituationPlanCommandError(
        "INVALID_PAGE",
        `Pagina ${page} bestaat niet in het situatieplan.`,
      );
    }
  }

  private commit<Result>(mutation: () => Result): Result {
    const result = mutation();
    this.mutationCommitted?.();
    this.publish();
    return result;
  }

  private get plan(): SituationPlan {
    return this.structure.sitplan;
  }

  private createSnapshot(): SituationPlanSnapshot {
    return Object.freeze({
      revision: this.revision,
      activePage: this.plan.getActivePage(),
      pageCount: this.plan.getPageCount(),
      defaults: Object.freeze({ ...this.plan.getDefaults() }),
      elements: Object.freeze(this.plan.getElements().map(element => this.createElementSnapshot(element))),
    });
  }

  private createElementSnapshot(element: SituationPlanElement): SituationPlanElementSnapshot {
    const serialized = element.toJsonObject();
    return Object.freeze({
      id: element.id,
      page: serialized.page,
      position: Object.freeze({ x: serialized.posx, y: serialized.posy }),
      size: Object.freeze({ width: serialized.sizex, height: serialized.sizey }),
      labelPosition: Object.freeze({ x: serialized.labelposx, y: serialized.labelposy }),
      labelFontSize: serialized.labelfontsize,
      addressType: serialized.adrestype,
      address: serialized.adres,
      addressLocation: serialized.adreslocation,
      rotation: serialized.rotate,
      scale: serialized.scale,
      movable: serialized.movable,
      svg: serialized.svg,
      electroItemId: serialized.electroItemId,
    });
  }

  private publish(): void {
    this.revision += 1;
    this.snapshot = this.createSnapshot();
    this.stateKey = this.createStateKey(this.snapshot);
    for (const listener of this.listeners) listener();
  }

  private createStateKey(snapshot: SituationPlanSnapshot): string {
    return JSON.stringify({
      activePage: snapshot.activePage,
      pageCount: snapshot.pageCount,
      defaults: snapshot.defaults,
      elements: snapshot.elements,
    });
  }
}
