import dynamic from "next/dynamic";

const LuluTipTapDemo = dynamic(() => import("../components/LuluTipTapDemo"), {
  loading: () => <p>Loading editor...</p>,
  ssr: false
});

export default function TestHighlightPage() {
  return (
    <div style={{ maxWidth: 600, margin: "2rem auto" }}>
      <LuluTipTapDemo />
    </div>
  );
}
