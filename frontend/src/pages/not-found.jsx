import { Link } from 'wouter';
import { FileText } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText size={28} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/invoices">
          <a>
            <Button data-testid="btn-go-home">Go to Invoices</Button>
          </a>
        </Link>
      </div>
    </Layout>
  );
}
