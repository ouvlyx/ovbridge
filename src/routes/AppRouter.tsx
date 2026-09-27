import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const SignupPage = lazy(() => import("@/features/auth/SignupPage"));
const DevicesPage = lazy(() => import("@/features/devices/DevicesPage"));
const PairingPage = lazy(() => import("@/features/pairing/PairingPage"));
const JoinPage = lazy(() => import("@/features/pairing/JoinPage"));
const SendPage = lazy(() => import("@/features/transfers/SendPage"));
const InboxPage = lazy(() => import("@/features/transfers/InboxPage"));

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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/join" element={<JoinPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/pair" element={<PairingPage />} />
            <Route path="/send" element={<SendPage />} />
            <Route path="/inbox" element={<InboxPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="*" element={<Navigate to="/devices" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}