import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient, getAuthenticatedIdentity } from '@/lib/supabase/server';

export const metadata = {
  title: 'Cutting Jobs — ReCut OS',
};

export default async function JobsListPage() {
  const identity = await getAuthenticatedIdentity();
  if (!identity) {
    redirect('/login');
  }

  const supabase = await createClient();
  const [jobsRes, partsRes, plansRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', identity.userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('job_parts')
      .select('job_id, quantity')
      .eq('user_id', identity.userId),
    supabase
      .from('plans')
      .select('id, job_id, status')
      .eq('user_id', identity.userId),
  ]);

  const jobs = jobsRes.data ?? [];
  const parts = partsRes.data ?? [];
  const plans = plansRes.data ?? [];

  const piecesByJob = new Map<string, { rows: number; pieces: number }>();
  for (const p of parts) {
    const cur = piecesByJob.get(p.job_id) ?? { rows: 0, pieces: 0 };
    cur.rows += 1;
    cur.pieces += p.quantity;
    piecesByJob.set(p.job_id, cur);
  }

  const plansByJob = new Map<string, number>();
  for (const pl of plans) {
    plansByJob.set(pl.job_id, (plansByJob.get(pl.job_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="cc-kicker text-accent-text">Production Queue</p>
          <h1 className="text-2xl font-bold leading-8 tracking-tight text-fg">
            Cutting Jobs
          </h1>
          <p className="text-sm text-fg-muted">
            Specify rectangular part requirements, generate kerf-aware cutting
            plans, and commit approved layouts to shop inventory.
          </p>
        </div>

        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Cutting Job
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workshop Jobs ({jobs.length})</CardTitle>
          <CardDescription>
            Select a job to edit part specifications, run the optimizer, or
            inspect saved cutting plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-subtle bg-bg-subtle/60 p-10 text-center text-sm text-fg-muted">
              <ClipboardList
                className="mx-auto mb-2 h-7 w-7 text-fg-subtle"
                aria-hidden="true"
              />
              <p>No cutting jobs yet.</p>
              <Button asChild className="mt-4">
                <Link href="/app/jobs/new">Create Your First Cutting Job</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border-subtle">
              <table className="w-full border-collapse text-left text-xs">
                <caption className="sr-only">Cutting jobs list</caption>
                <thead>
                  <tr className="cc-table-head h-12 border-b border-border-subtle">
                    <th scope="col" className="cc-kicker px-4">
                      Job Title
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Part Demand
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Saved Plans
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Status
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Updated
                    </th>
                    <th scope="col" className="cc-kicker px-4">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle tabular-nums">
                  {jobs.map((job) => {
                    const demand = piecesByJob.get(job.id) ?? {
                      rows: 0,
                      pieces: 0,
                    };
                    const planCount = plansByJob.get(job.id) ?? 0;
                    return (
                      <tr key={job.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="font-semibold text-fg hover:text-accent-text"
                          >
                            {job.title}
                          </Link>
                          {job.notes && (
                            <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
                              {job.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-fg">
                          {demand.pieces} pieces ({demand.rows}{' '}
                          {demand.rows === 1 ? 'row' : 'rows'})
                        </td>
                        <td className="px-4 py-3 font-mono text-fg-muted">
                          {planCount}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              job.status === 'committed'
                                ? 'production'
                                : job.status === 'planned'
                                  ? 'amber'
                                  : 'neutral'
                            }
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-fg-muted">
                          {new Date(job.updated_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC',
                            }
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="font-semibold text-accent-text hover:underline"
                          >
                            Open Job
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
