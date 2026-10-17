import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import AppLayout from "@/components/AppLayout";
import { loadRouteModule } from "@/lib/chunkLoadRecovery";
import QuickOnboardingModal from "@/features/auth/QuickOnboardingModal";

const LoginPage = lazy(() => loadRouteModule(() => import("@/features/auth/LoginPage")));
const QuickSignupPage = lazy(() => loadRouteModule(() => import("@/features/auth/QuickSignupPage")));
const RecoverAccountPage = lazy(() => loadRouteModule(() => import("@/features/auth/RecoverAccountPage")));
const DevicesPage = lazy(() => loadRouteModule(() => import("@/features/devices/DevicesPage")));
const PairingPage = lazy(() => loadRouteModule(() => import("@/features/pairing/PairingPage")));
const JoinPage = lazy(() => loadRouteModule(() => import("@/features/pairing/JoinPage")));
const ScanPage = lazy(() => loadRouteModule(() => import("@/features/pairing/ScanPage")));
const SendPage = lazy(() => loadRouteModule(() => import("@/features/transfers/SendPage")));
const InboxPage = lazy(() => loadRouteModule(() => import("@/features/transfers/InboxPage")));
const ProfilePage = lazy(() => loadRouteModule(() => import("@/features/profile/ProfilePage")));
const SpaceDetailPage = lazy(() => loadRouteModule(() => import("@/features/spaces/SpaceDetailPage")));
const ProjectStoragePage = lazy(() => loadRouteModule(() => import("@/features/spaces/ProjectStoragePage")));
const JoinSpacePage = lazy(() => loadRouteModule(() => import("@/features/spaces/JoinSpacePage")));
const MessagesPage = lazy(() => loadRouteModule(() => import("@/features/transfers/MessagesPage")));
const ChatPage = lazy(() => loadRouteModule(() => import("@/features/transfers/ChatPage")));
const ConfirmPage = lazy(() => loadRouteModule(() => import("@/features/auth/ConfirmPage")));
const AuthCallbackPage = lazy(() => loadRouteModule(() => import("@/features/auth/AuthCallbackPage")));
const ForgotPasswordPage = lazy(() => loadRouteModule(() => import("@/features/auth/ForgotPasswordPage")));
const ResetPasswordPage = lazy(() => loadRouteModule(() => import("@/features/auth/ResetPasswordPage")));
const WorkspacePage = lazy(() => loadRouteModule(() => import("@/features/workspace/WorkspacePage")));
const ClipboardPage = lazy(() => loadRouteModule(() => import("@/features/clipboard/ClipboardPage")));
const AdminDashboardPage = lazy(() => loadRouteModule(() => import("@/features/admin/AdminDashboardPage")));
const PrivacyPolicyPage = lazy(() => loadRouteModule(() => import("@/features/legal/PrivacyPolicyPage")));
const TermsPage = lazy(() => loadRouteModule(() => import("@/features/legal/TermsPage")));
const NotFoundPage = lazy(() => loadRouteModule(() => import("@/components/NotFoundPage")));

const SpacesPage = lazy(() => loadRouteModule(() => import("@/features/spaces/SpacesPage")));

function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ov-bg text-ov-muted text-sm"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className="w-8 h-8 animate-spin text-ov-primary" aria-hidden="true" />
      <span>Chargement…</span>
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <QuickOnboardingModal />
        <Routes>
          {/* --- Publiques --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/quick-signup" element={<QuickSignupPage />} />
          <Route path="/signup" element={<Navigate to="/quick-signup" replace />} />
          <Route path="/recover" element={<RecoverAccountPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join-space" element={<JoinSpacePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/auth/confirm" element={<ConfirmPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* --- Protégées avec AppLayout (Desktop Sidebar + Mobile BottomBar) --- */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/pair" element={<PairingPage />} />
              <Route path="/send" element={<SendPage />} />
              <Route path="/inbox" element={<InboxPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/spaces/:id" element={<SpaceDetailPage />} />
              <Route path="/spaces/:id/storage" element={<ProjectStoragePage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:kind/:id" element={<ChatPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/clipboard" element={<ClipboardPage />} />

              {/* Route protégée */}
              <Route path="/spaces" element={<SpacesPage />} />

              {/* --- Console Admin (Niveau min 10) --- */}
              <Route element={<AdminRoute minLevel={10} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
              </Route>
            </Route>
          </Route>

          {/* --- Fallback / 404 --- */}
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
