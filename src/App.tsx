import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";
import AppRouter from "@/routes/AppRouter";

export default function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-center" richColors />
      <AppRouter />
    </AuthProvider>
  );
}