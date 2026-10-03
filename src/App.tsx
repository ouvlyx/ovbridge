import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth";
import AppRouter from "@/routes/AppRouter";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";

export default function App() {
  return (
    <AuthProvider>
      <NetworkStatusBanner />
      <Toaster theme="dark" position="top-center" richColors />
      <AppRouter />
    </AuthProvider>
  );
}
