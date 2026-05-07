import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { FileText, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import * as api from '@/lib/api';

function formatRs(amount) {
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `Rs. ${(amount / 1000).toFixed(1)}K`;
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`;
}

function formatRsFull(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

const STATUS_CONFIG = {
  draft:   { label: 'Draft',   bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  unpaid:  { label: 'Unpaid',  bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-500' },
  paid:    { label: 'Paid',    bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  overdue: { label: 'Overdue', bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">{formatRsFull(payload[0].value)}</p>
      <p className="text-muted-foreground">{payload[0].payload.count} invoice{payload[0].payload.count !== 1 ? 's' : ''}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    refetchInterval: 60000,
  });

  const maxRevenue = data ? Math.max(...data.monthlyRevenue.map(m => m.revenue), 1) : 1;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AZ Distribution — Business Overview</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</span>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp size={15} className="text-green-600" />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-24" /> : (
              <div>
                <div className="text-2xl font-bold" data-testid="kpi-total-revenue">
                  {formatRs(data?.totalRevenue || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Paid invoices</div>
              </div>
            )}
          </div>

          {/* Outstanding */}
          <div className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Outstanding</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Clock size={15} className="text-yellow-600" />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-24" /> : (
              <div>
                <div className="text-2xl font-bold" data-testid="kpi-outstanding">
                  {formatRs(data?.outstanding || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Unpaid + overdue</div>
              </div>
            )}
          </div>

          {/* This Month */}
          <div className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Month</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckCircle2 size={15} className="text-blue-600" />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-24" /> : (
              <div>
                <div className="text-2xl font-bold" data-testid="kpi-this-month">
                  {formatRs(data?.thisMonthRevenue || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">Revenue collected</div>
              </div>
            )}
          </div>

          {/* Total Invoices */}
          <div className="border border-border rounded-xl p-4 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Invoices</span>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <FileText size={15} className="text-muted-foreground" />
              </div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-16" /> : (
              <div>
                <div className="text-2xl font-bold" data-testid="kpi-invoice-count">
                  {data?.invoiceCount || 0}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">All time</div>
              </div>
            )}
          </div>
        </div>

        {/* Chart + Status breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 border border-border rounded-xl p-5 bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Monthly Revenue</h2>
              <span className="text-xs text-muted-foreground">Last 6 months (paid)</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={data?.monthlyRevenue || []} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.split(' ')[0]}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {(data?.monthlyRevenue || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.revenue === maxRevenue && entry.revenue > 0
                          ? 'hsl(var(--foreground))'
                          : 'hsl(var(--muted-foreground) / 0.3)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Breakdown */}
          <div className="border border-border rounded-xl p-5 bg-card">
            <h2 className="text-sm font-semibold mb-4">Invoice Status</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(['paid', 'unpaid', 'overdue', 'draft']).map(s => {
                  const count = data?.statusCounts?.[s] || 0;
                  const total = data?.invoiceCount || 1;
                  const pct = Math.round((count / total) * 100);
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      className="w-full text-left space-y-1.5 group"
                      onClick={() => navigate(`/invoices?status=${s}`)}
                      data-testid={`status-bar-${s}`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground group-hover:underline underline-offset-2">
                          {cfg.label}
                        </span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', cfg.dot.replace('bg-', 'bg-'))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Invoices</h2>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              onClick={() => navigate('/invoices')}
              data-testid="link-view-all-invoices"
            >
              View all
            </button>
          </div>
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : !data?.recentInvoices?.length ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No invoices yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.recentInvoices.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                  data-testid={`recent-invoice-${inv.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {inv.customerName || '—'} · {formatDate(inv.date)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold ml-4 whitespace-nowrap">
                    {formatRsFull(inv.grandTotal)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
