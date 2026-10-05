import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const SignupPage = lazy(() => import("@/features/auth/SignupPage"));
const DevicesPage = lazy(() => import("@/features/devices/DevicesPage"));
const PairingPage = lazy(() => import("@/features/pairing/PairingPage"));
const JoinPage = lazy(() => import("@/features/pairing/JoinPage"));
const ScanPage = lazy(() => import("@/features/pairing/ScanPage"));
const SendPage = lazy(() => import("@/features/transfers/SendPage"));
const InboxPage = lazy(() => import("@/features/transfers/InboxPage"));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage"));
const SpaceDetailPage = lazy(() => import("@/features/spaces/SpaceDetailPage"));
const JoinSpacePage = lazy(() => import("@/features/spaces/JoinSpacePage"));
const MessagesPage = lazy(() => import("@/features/transfers/MessagesPage"));
const ChatPage = lazy(() => import("@/features/transfers/ChatPage"));
const ConfirmPage = lazy(() => import("@/features/auth/ConfirmPage"));
const WorkspacePage = lazy(() => import("@/features/workspace/WorkspacePage"));
const ClipboardPage = lazy(() => import("@/features/clipboard/ClipboardPage"));
const AdminDashboardPage = lazy(() => import("@/features/admin/AdminDashboardPage"));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-ov-muted text-sm">
      Chargement…
    </div>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* --- Publiques --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join-space" element={<JoinSpacePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/auth/confirm" element={<ConfirmPage />} />

          {/* --- Protégées --- */}
          <Route element={<ProtectedRoute />}>
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/pair" element={<PairingPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/spaces/:id" element={<SpaceDetailPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:kind/:id" element={<ChatPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/clipboard" element={<ClipboardPage />} />

            {/* --- Console Admin (Niveau min 10) --- */}
            <Route element={<AdminRoute minLevel={10} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>

          {/* --- Fallback --- */}
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="*" element={<Navigate to="/devices" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
