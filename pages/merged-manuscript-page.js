import dynamic from 'next/dynamic';

// Import the new editor with SSR off
const MergedManuscriptEditor = dynamic(() => import('../components/MergedManuscriptEditor'), { ssr: false });

export default function Home() {
  return (
    <MergedManuscriptEditor />
  );
}
