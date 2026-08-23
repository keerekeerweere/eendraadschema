import { useState } from "react";
import { ui } from "../uiStyles";

interface AddItemControlProps {
  readonly allowedTypes: readonly string[];
  readonly label: string;
  readonly onAdd: (type: string) => void;
}

export function AddItemControl({ allowedTypes, label, onAdd }: AddItemControlProps) {
  const [selectedType, setSelectedType] = useState(allowedTypes[0] ?? "");
  const currentType = allowedTypes.includes(selectedType) ? selectedType : (allowedTypes[0] ?? "");

  if (allowedTypes.length === 0) return null;

  return (
    <div className="mt-1 mb-2 ml-5 flex flex-wrap items-center gap-1">
      <label>
        <span className="sr-only">{label}</span>
        <select
          className={ui.field}
          aria-label={label}
          value={currentType}
          onChange={(event) => setSelectedType(event.currentTarget.value)}
        >
          {allowedTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
      </label>
      <button className={ui.button} type="button" onClick={() => onAdd(currentType)} disabled={currentType === ""}>
        Toevoegen
      </button>
    </div>
  );
}
