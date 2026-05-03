import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import InvoicesPage from "@/pages/invoices";
import InvoiceEditorPage from "@/pages/invoice-editor";
import CustomersPage from "@/pages/customers";
import ProductsPage from "@/pages/products";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/invoices" />
      </Route>
      <Route path="/invoices" component={InvoicesPage} />
      <Route path="/invoices/new">
        <InvoiceEditorPage mode="new" />
      </Route>
      <Route path="/invoices/:id/edit">
        <InvoiceEditorPage mode="edit" />
      </Route>
      <Route path="/customers" component={CustomersPage} />
      <Route path="/products" component={ProductsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
