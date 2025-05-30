import React, { useMemo, useState } from "react";
import { createEditor } from "slate";
import { Slate, Editable, withReact } from "slate-react";

export default function SlateTest() {
  // HARDCODED, always valid
  const initialValue = [
    {
      type: "paragraph",
      children: [{ text: "Hello world! This is a basic Slate test." }]
    }
  ];
  const [value, setValue] = useState(initialValue);
  const editor = useMemo(() => withReact(createEditor()), []);

  return (
    <div style={{ maxWidth: 600, margin: "80px auto" }}>
      <h1>Slate Minimal Test</h1>
      <Slate editor={editor} value={value} onChange={setValue}>
        <Editable
          style={{
            minHeight: 120,
            border: "1px solid #888",
            borderRadius: 6,
            padding: 12,
            fontFamily: "serif"
          }}
        />
      </Slate>
    </div>
  );
}
