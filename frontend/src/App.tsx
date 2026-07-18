import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/Spinner';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Route-level code splitting (Perf M-2): each page becomes its own chunk so the
// heavy Create form (react-hook-form + zod) and the other views are fetched on
// demand instead of in the initial bundle. Pages use named exports, so map them
// to the default export React.lazy expects.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const InvoiceListPage = lazy(() =>
  import('./pages/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage })),
);
const CreateInvoicePage = lazy(() =>
  import('./pages/CreateInvoicePage').then((m) => ({ default: m.CreateInvoicePage })),
);
const InvoiceDetailPage = lazy(() =>
  import('./pages/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })),
);

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoiceListPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateInvoicePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoiceDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
