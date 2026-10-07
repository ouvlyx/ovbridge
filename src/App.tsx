import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth";
import AppRouter from "@/routes/AppRouter";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NetworkStatusBanner />
        <Toaster theme="dark" position="top-center" richColors />
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
