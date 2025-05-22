import dynamic from "next/dynamic";
import React from "react";

const EditorTest = dynamic(() => import("../components/TestHighlightReal"), {
  ssr: false,
});

export default function Page() {
  return <EditorTest />;
}
