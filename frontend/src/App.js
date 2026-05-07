import { Switch, Route, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import InvoicesPage from '@/pages/invoices';
import InvoiceEditorPage from '@/pages/invoice-editor';
import CustomersPage from '@/pages/customers';
import ProductsPage from '@/pages/products';
import NotFoundPage from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/invoices" />} />
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/invoices/new" component={() => <InvoiceEditorPage mode="new" />} />
      <Route path="/invoices/:id/edit" component={() => <InvoiceEditorPage mode="edit" />} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/products" component={ProductsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
