# Omschakelaar design

## Purpose

Add a configurable three-connection changeover switch for installations such as a Victron MultiPlus-II bypass. The component represents a mechanically linked switch with three physical ports (`IN`, `OUT1`, and `OUT2`) and three selector positions (`OUT1`, `OFF`, and `OUT2`). The drawing documents the device topology and does not represent a live switch position.

The supplied Sontheimer ULO40 drawing in `feature/UkH1E4L0bRwtegdscJgp6F11.avif` is the visual reference. The implementation remains manufacturer-neutral and supports the requested Sontheimer ratings.

## Domain model

`Omschakelaar` is a first-class electrical item. It has three stable physical port identities:

- `IN`
- `OUT1`
- `OUT2`

Because the existing electrical document is a tree, one physical port occupies the item's parent side. That port is always `IN`: it is never a user choice and never persisted as a separate property — it is simply whatever the switch's own tree parent happens to be, wherever the switch was inserted. The other two ports are represented by required internal `Omschakelaarpoort` connector items with fixed identities: the first connector is always `OUT1`, the second always `OUT2`, regardless of which one (if either) carries a pre-existing wired circuit.

An earlier revision let the parent-side port be reassigned to `IN`, `OUT1`, or `OUT2` via a `parent_port` property, implemented as a connector-identity swap. That was confusing in practice: the same physical drawing position could show different port text depending on the dropdown, and preserving a wired subtree across the swap added a lot of command-layer complexity for a choice that didn't need to exist. It has been removed. `IN`/`OUT1`/`OUT2` are now purely structural, positional labels — like "top", "left", "right" — not an energy-flow direction or a user-configurable mapping.

An `Omschakelaarpoort`:

- is visible in the hierarchy with its physical port label (`OUT1` or `OUT2`);
- has no independently rendered conductor or symbol;
- accepts at most one `Kring` child;
- cannot be added independently;
- cannot be deleted, reordered, duplicated, or changed to another type;
- is excluded from public item-type choices and situation-plan symbols.

`Omschakelaar` is allowed wherever `Splitsing` is currently accepted. Its connector ports accept a `Kring`, allowing the component to represent grid selection, backup selection, inverter bypass, and similar layouts without assigning an energy-flow direction to the names `IN` and `OUT`.

## Properties

The React property inspector exposes:

| Property | Persisted key | Allowed values | Default |
| --- | --- | --- | --- |
| Number of switched poles | `aantal_polen` | `2`, `4` | `4` |
| Nominal current | `amperage` | `16`, `25`, `32`, `40`, `63`, `80`, `100` | `63` |
| Address/description | `adres` | free text | empty |

`2P` and `4P` describe how many conductors the mechanism switches together. They are independent of the three physical connection ports.

The labels shown to users are Belgian Dutch: `Aantal polen`, `Nominale stroom`, and `Adres/omschrijving`. There is no port-mapping field.

## Creation and command behavior

Adding an `Omschakelaar` creates the switch and its two required connector items in one schema transaction. The entire addition is one undo step. Redo restores the same topology and properties.

Application commands enforce the component invariant:

- exactly two direct `Omschakelaarpoort` children;
- the connector port identities are `OUT1` and `OUT2`, always in that order;
- connector identities are unique;
- each connector has no more than one `Kring` child;
- connector structural operations are rejected with a clear Dutch error message.

There is no command to reassign which port is on the parent side: it is always `IN`, determined solely by where the switch sits in the tree, and never changes without moving the switch itself.

The switch and connectors continue to use the existing `SchemaCommands` boundary. React does not mutate the legacy hierarchy or property bags directly.

## Persistence and compatibility

The existing EDS property serialization stores the new item types and property keys. A save/open round trip must preserve switch properties, connector identities, attached circuits, and stable item IDs.

Existing EDS documents are unchanged and require no migration. Invalid or externally modified new data must not crash document reading or SVG rendering. Structural validation reports missing, duplicate, extra, or inconsistent connector ports. Normal editor commands cannot create those invalid states.

The feature does not introduce a general graph or cross-reference model. Connecting a switch to three arbitrary existing lines elsewhere in a document remains outside this scope; users arrange the component through its fixed `IN`/`OUT1`/`OUT2` structure and its two connector circuits.

## Hierarchy and property UI

The hierarchy shows the switch as `Omschakelaar` and its two children by their fixed physical labels, `OUT1` and `OUT2`. Connector rows permit adding or editing their one `Kring` child but do not expose normal structural actions.

The switch uses the configured-item property editor. Select controls constrain poles and current to the allowed values. Failed changes display the existing command-error feedback and leave the document unchanged.

## SVG rendering

The one-line renderer draws a neutral changeover mechanism based on the supplied reference:

- one common contact (`IN`, always centered between the two alternatives) and two alternative contacts (`OUT1`, `OUT2`);
- one centered selector arm that touches neither alternative and therefore represents `OFF`;
- three physical port labels, each on its own text line, positioned clear of the rating/address text below them;
- a nearby rating label such as `63A 4P` on a separate line below the `IN` label so long text never collides with the port labels;
- optional address/description text on a further separate line, using existing escaping and typography conventions.

The symbol never displays a selected or live state. The switch renderer owns all visible port contacts and conductor stubs. `Omschakelaarpoort` remains a structural hierarchy node and must not add a placeholder line, because its child `Kring` already owns the continuing conductor.

Orientation is automatic and follows the incoming conductor; there is no orientation property. `IN` is always the common contact, centered between the two alternatives; `OUT1` and `OUT2` are always in the same fixed slots, regardless of which one (if either) is wired:

- in horizontal placement, `IN` enters from the left, vertically centered between `OUT1` (top branch) and `OUT2` (bottom branch);
- on a vertical `Kring`, `IN` enters from below, horizontally centered between `OUT1` (left branch) and `OUT2` (right branch).

Labels and rating text remain upright in either orientation. In vertical orientation, the incoming conductor stays exactly on the common contact's center axis. The rating and optional address are placed to the right of that conductor, one line below the `IN` label, so text never covers or visually interrupts the wire and never collides with the port label. The switch lays out the two connector subtrees itself rather than passing the connector nodes through the generic vertical compositor. Each attached `Kring` starts at its physical port; an empty port ends in one explicit insertion anchor at the visible conductor endpoint. These anchors identify the corresponding connector item so schematic insertion adds the circuit below the correct physical connector hierarchy node.

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

Property validation rejects unsupported pole counts and current ratings. Attempts to mutate protected connector structure are rejected.

Legacy rendering and readers handle malformed switch data defensively by using safe display defaults. Structural validation identifies the underlying invariant violation so the document remains inspectable rather than failing during render.

## Tests and verification

Focused automated coverage will verify:

- factory registration, defaults, and public/internal type visibility;
- atomic creation of the switch and its two fixed-identity ports;
- property validation for every allowed choice and representative invalid values;
- connector identities (`OUT1`, `OUT2`) staying fixed regardless of which one is wired;
- connector deletion, movement, duplication, and type-change protection;
- one-child connector capacity;
- undo and redo of creation and property updates;
- EDS serialization and reconstruction with stable identities and attachments;
- structural validation of malformed connector arrangements;
- SVG topology, neutral selector, port labels, rating, and escaping;
- automatic horizontal and vertical orientation, with `IN` centered between `OUT1` and `OUT2` in both;
- exactly one visible conductor per port and no connector placeholder lines;
- numeric equality of incoming/contact, contact/stub, stub/circuit, and stub/insertion-anchor endpoints;
- end-to-end equality of the parent `Kring`/automaat outgoing line and the translated omschakelaar `IN` line in a multi-item vertical layout, including through live-preview SVG flattening;
- integer-pixel alignment of the shared parent-to-IN axis in the rendered SVG;
- vertical rating/address placement clear of the incoming conductor and of the port label;
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
