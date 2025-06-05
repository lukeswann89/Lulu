import dynamic from 'next/dynamic';

// Import the LuluTipTap editor with SSR off
const LuluTipTapComponent = dynamic(() => import('../components/LuluTipTap'), { ssr: false });

export default function LuluTipTapTest() {
  return (
    <LuluTipTapComponent />
  );
}