import { CalendarClock, CircleDot } from 'lucide-react';
import { ApiError, TimelineEvent } from '@/lib/api';
import { Skeleton } from '@/components/ui/primitives';

interface CaseTimelineProps {
  events?: TimelineEvent[];
  loading?: boolean;
  error?: Error | null;
}

function eventTone(event: TimelineEvent) {
  if (event.severity === 'CRITICAL' || event.severity === 'HIGH') return 'bg-red-400';
  if (event.severity === 'MEDIUM') return 'bg-amber-300';
  return 'bg-[#8aa39b]';
}

export function CaseTimeline({ events, loading, error }: CaseTimelineProps) {
  const feedUnavailable = error instanceof ApiError && error.status === 404;

  return <section className="glass-panel mt-5 p-6">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
      <div><p className="eyebrow">Case chronology</p><h2 className="title-serif mt-1 text-3xl">Timeline</h2><p className="mt-2 max-w-2xl text-sm text-brand-gray-200">Evidence, enrichment observations and analyst activity ordered by the time they occurred.</p></div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-brand-gray-200">UTC normalized</span>
    </div>
    {loading && <div className="mt-6 space-y-4">{[1, 2, 3].map(index => <Skeleton key={index} className="h-16"/>)}</div>}
    {feedUnavailable && <div className="mt-6 border-l-2 border-amber-300 bg-amber-300/5 px-4 py-4 text-sm text-brand-gray-200"><p className="font-medium text-brand-gray-100">Event feed is being connected.</p><p className="mt-1">The workbench is ready for real case events as soon as the timeline service is deployed. No placeholder activity is shown.</p></div>}
    {!loading && !error && !events?.length && <div className="mt-6 flex items-center gap-3 border border-white/10 bg-black/10 px-4 py-5 text-sm text-brand-gray-200"><CalendarClock className="h-5 w-5 text-amber-200"/>No events have been recorded for this case.</div>}
    {!loading && !!events?.length && <ol className="mt-6 border-l border-white/15 pl-5">{events.map(event => <li className="relative pb-6 last:pb-0" key={event.id}><span className={`absolute -left-[25px] top-1.5 h-2.5 w-2.5 border-2 border-[#162020] ${eventTone(event)}`}/><div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1"><p className="text-sm font-medium">{event.title}</p><time className="font-mono text-[10px] text-brand-gray-200" dateTime={event.occurredAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(event.occurredAt))} UTC</time></div>{event.summary && <p className="mt-1 text-sm leading-6 text-brand-gray-200">{event.summary}</p>}<div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-brand-gray-300">{event.source && <span className="inline-flex items-center gap-1"><CircleDot className="h-3 w-3"/>{event.source}</span>}{event.actor && <span>{event.actor.displayName}</span>}</div></li>)}</ol>}
    {!feedUnavailable && !!error && <p className="mt-6 border-l-2 border-red-400 px-4 py-2 text-sm text-red-200">Timeline could not be loaded: {error.message}</p>}
  </section>;
}
