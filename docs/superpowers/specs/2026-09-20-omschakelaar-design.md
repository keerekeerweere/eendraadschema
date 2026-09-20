# Omschakelaar design

## Purpose

Add a configurable three-connection changeover switch for installations such as a Victron MultiPlus-II bypass. The component represents a mechanically linked switch with three physical ports (`IN`, `OUT1`, and `OUT2`) and three selector positions (`OUT1`, `OFF`, and `OUT2`). The drawing documents the device topology and does not represent a live switch position.

The supplied Sontheimer ULO40 drawing in `feature/UkH1E4L0bRwtegdscJgp6F11.avif` is the visual reference. The implementation remains manufacturer-neutral and supports the requested Sontheimer ratings.

## Domain model

`Omschakelaar` is a first-class electrical item. It has three stable physical port identities:

- `IN`
- `OUT1`
- `OUT2`

Because the existing electrical document is a tree, one physical port occupies the item's parent side. The user selects that port through `parent_port`. The other two ports are represented by required internal `Omschakelaarpoort` connector items. Each connector identifies its physical port explicitly rather than deriving it from child order.

An `Omschakelaarpoort`:

- is visible in the hierarchy with its physical port label;
- has no independently rendered conductor or symbol;
- accepts at most one `Kring` child;
- cannot be added independently;
- cannot be deleted, reordered, duplicated, or changed to another type;
- is excluded from public item-type choices and situation-plan symbols.

The parent-side port can be changed with empty or wired connectors. The connector representing the requested new parent becomes the connector for the previous parent port, preserving its item ID and complete circuit subtree. This explicit exchange keeps all three physical port identities represented exactly once without deleting or detaching wiring.

`Omschakelaar` is allowed wherever `Splitsing` is currently accepted. Its connector ports accept a `Kring`, allowing the component to represent grid selection, backup selection, inverter bypass, and similar layouts without assigning an energy-flow direction to the names `IN` and `OUT`.

## Properties

The React property inspector exposes:

| Property | Persisted key | Allowed values | Default |
| --- | --- | --- | --- |
| Number of switched poles | `aantal_polen` | `2`, `4` | `4` |
| Nominal current | `amperage` | `16`, `25`, `32`, `40`, `63`, `80`, `100` | `63` |
| Port on the parent side | `parent_port` | `IN`, `OUT1`, `OUT2` | `IN` |
| Address/description | `adres` | free text | empty |

`2P` and `4P` describe how many conductors the mechanism switches together. They are independent of the three physical connection ports.

The labels shown to users are Belgian Dutch: `Aantal polen`, `Nominale stroom`, `Poort aan invoerzijde`, and `Adres/omschrijving`.

## Creation and command behavior

Adding an `Omschakelaar` creates the switch and its two required connector items in one schema transaction. The entire addition is one undo step. Redo restores the same topology and properties.

Application commands enforce the component invariant:

- exactly two direct `Omschakelaarpoort` children;
- the connector port identities are the two values other than `parent_port`;
- connector identities are unique;
- each connector has no more than one `Kring` child;
- connector structural operations are rejected with a clear Dutch error message;
- changing `parent_port` preserves both connector subtrees and their stable IDs.

Changing the parent-side port performs a targeted identity exchange. The connector whose port equals the requested new parent is renamed to the previous parent port; the other connector remains unchanged. For example, changing `IN` to `OUT1` renames the existing `OUT1` connector to `IN`, while `OUT2` remains `OUT2`. Any `Kring` and descendants below the renamed connector remain attached to the same connector ID. The switch property and connector identity update happen in one transaction and one undo step.

The switch and connectors continue to use the existing `SchemaCommands` boundary. React does not mutate the legacy hierarchy or property bags directly.

## Persistence and compatibility

The existing EDS property serialization stores the new item types and property keys. A save/open round trip must preserve switch properties, connector identities, attached circuits, and stable item IDs.

Existing EDS documents are unchanged and require no migration. Invalid or externally modified new data must not crash document reading or SVG rendering. Structural validation reports missing, duplicate, extra, or inconsistent connector ports. Normal editor commands cannot create those invalid states.

The feature does not introduce a general graph or cross-reference model. Connecting a switch to three arbitrary existing lines elsewhere in a document remains outside this scope; users arrange the component through the supported parent-side mapping and its two connector circuits.

## Hierarchy and property UI

The hierarchy shows the switch as `Omschakelaar` and its two children by their physical labels, for example `OUT1` and `OUT2` when `IN` is on the parent side. Connector rows permit adding or editing their one `Kring` child but do not expose normal structural actions.

The switch uses the configured-item property editor. Select controls constrain poles, current, and parent-side port to the allowed values. Failed changes display the existing command-error feedback and leave the document unchanged.

## SVG rendering

The one-line renderer draws a neutral changeover mechanism based on the supplied reference:

- one common contact and two alternative contacts;
- one centered selector arm that touches neither alternative and therefore represents `OFF`;
- three physical port labels matching the configured mapping;
- a nearby rating label such as `63A 4P`;
- optional address/description text using existing escaping and typography conventions.

The symbol never displays a selected or live state. The switch renderer owns all visible port contacts and conductor stubs. `Omschakelaarpoort` remains a structural hierarchy node and must not add a placeholder line, because its child `Kring` already owns the continuing conductor.

Orientation is automatic and follows the incoming conductor; there is no orientation property:

- in horizontal placement, `IN` enters from the left, `OUT1` is the upper-right branch, and `OUT2` is the lower-right branch;
- on a vertical `Kring`, `IN` enters from below, `OUT1` is the upper-left branch, and `OUT2` is the upper-right branch.

Labels and rating text remain upright in either orientation. In vertical orientation, the incoming conductor stays exactly on the common contact's center axis. The rating and optional address are placed to the right of that conductor so text never covers or visually interrupts the wire. The switch lays out the two connector subtrees itself rather than passing the connector nodes through the generic vertical compositor. Each attached `Kring` starts at its physical port; an empty port ends in one explicit insertion anchor at the visible conductor endpoint. These anchors identify the corresponding connector item so schematic insertion adds the circuit below the correct physical connector hierarchy node.

Conductor continuity is a rendering invariant:

- the incoming conductor endpoint equals the common-contact coordinate;
- the outgoing vertical conductor from the parent `Kring`/automaat and the omschakelaar `IN` conductor are one straight rendered line: after all nested SVG translations, their x-coordinates are identical;
- the shared parent-to-IN axis uses an integer SVG coordinate so browser rasterization cannot create a visible pixel offset;
- each output stub begins at its alternative-contact coordinate;
- an attached circuit's starting coordinate equals the corresponding output-stub endpoint;
- an empty port's insertion anchor equals its output-stub endpoint;
- applying vertical orientation preserves these shared coordinates without gaps, lateral shifts, or duplicate segments. The two joined parent/IN segments use continuous stroke caps at their shared endpoint.

The renderer calculates bounds large enough for both branch subtrees, labels, and optional description without clipping adjacent content. Print and SVG export use the same renderer output.

## Failure handling

Property validation rejects unsupported pole counts, current ratings, and port names. A parent-side change is rejected only when the switch connector topology is malformed, so the operation cannot safely identify the connector to rename. Such rejection is atomic and leaves the switch, connector labels, and attached circuits unchanged. Attempts to mutate protected connector structure are rejected.

Legacy rendering and readers handle malformed switch data defensively by using safe display defaults. Structural validation identifies the underlying invariant violation so the document remains inspectable rather than failing during render.

## Tests and verification

Focused automated coverage will verify:

- factory registration, defaults, and public/internal type visibility;
- atomic creation of the switch and its two ports;
- property validation for every allowed choice and representative invalid values;
- parent-side changes with empty and wired connectors, including preservation of connector IDs and descendant circuits;
- undo and redo of a wired parent-side change;
- connector deletion, movement, duplication, and type-change protection;
- one-child connector capacity;
- undo and redo of creation and property updates;
- EDS serialization and reconstruction with stable identities and attachments;
- structural validation of malformed connector arrangements;
- SVG topology, neutral selector, port labels, rating, and escaping;
- automatic horizontal and vertical orientation;
- exactly one visible conductor per port and no connector placeholder lines;
- numeric equality of incoming/contact, contact/stub, stub/circuit, and stub/insertion-anchor endpoints;
- end-to-end equality of the parent `Kring`/automaat outgoing line and the translated omschakelaar `IN` line in a multi-item vertical layout;
- integer-pixel alignment of the shared parent-to-IN axis in the rendered SVG;
- vertical rating/address placement clear of the incoming conductor;
- direct schematic insertion into the intended `OUT1` or `OUT2` connector;
- property-editor coverage and hierarchy capabilities.

Before completion, run the project baseline:

```sh
npm test -- --run
npm run typecheck:test
npm run build
git diff --check
```

Browser-level validation is required only if focused tests reveal an integration risk that unit/component coverage cannot establish. Any completion report will distinguish browser checks from jsdom tests.

## Out of scope

- A live or user-selected switch position.
- A manual orientation setting.
- Pole counts other than `2P` and `4P`.
- Current ratings outside `16–100 A` listed above.
- A general multi-port graph capable of connecting arbitrary existing nodes.
- Detailed modeling of the Victron MultiPlus-II AC and DC connections.
- Manufacturer-specific catalog data beyond the supported ratings.
