import Link from 'next/link';

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-brand-black p-6 text-white"><section className="max-w-lg border border-white/10 bg-white/[.025] p-8"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-cyan-200">404 · Outside the case file</p><h1 className="mt-4 font-serif text-5xl">Nothing here.</h1><p className="mt-4 text-sm leading-6 text-brand-gray-200">This route does not exist, or the resource is no longer available to your account.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-black">Return to command center</Link></section></main>;
}
