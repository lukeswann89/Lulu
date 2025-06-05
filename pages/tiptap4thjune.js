import dynamic from 'next/dynamic';

// Import the TipTap test component with SSR off
const TipTap4thJune = dynamic(() => import('../components/TipTap4thJune'), { ssr: false });

export default function TipTapTestPage() {
  return (
    <TipTap4thJune />
  );
}