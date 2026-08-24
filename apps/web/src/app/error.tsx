'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Route error', error); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-brand-black p-6 text-white"><section className="max-w-lg border border-red-400/20 bg-red-500/[.05] p-8"><TriangleAlert className="h-6 w-6 text-red-300"/><p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-red-200">Workspace interruption</p><h1 className="mt-2 font-serif text-4xl">This view couldn’t load.</h1><p className="mt-4 text-sm leading-6 text-brand-gray-100">No investigation data was changed. Try loading the view again, or return to the command center.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-black"><RotateCcw className="h-4 w-4"/>Try again</button><Link href="/" className="rounded-xl border border-white/15 px-4 py-3 text-xs font-bold uppercase tracking-widest hover:border-white/35">Command center</Link></div>{error.digest && <p className="mt-6 font-mono text-[10px] text-brand-gray-200">Reference {error.digest}</p>}</section></main>;
}
