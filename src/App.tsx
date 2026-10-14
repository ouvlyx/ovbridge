import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth";
import AppRouter from "@/routes/AppRouter";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OnboardingModal } from "@/components/OnboardingModal";
import { AppPreferencesProvider } from "@/features/profile/AppPreferences";

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppPreferencesProvider>
          <NetworkStatusBanner />
          <OnboardingModal />
          <Toaster theme="dark" position="top-center" richColors />
          <AppRouter />
        </AppPreferencesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
