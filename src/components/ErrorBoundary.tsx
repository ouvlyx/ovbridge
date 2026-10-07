import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught exception:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-ov-bg text-ov-text">
          <Card className="w-full max-w-md p-6 bg-ov-surface border-ov-border text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-ov-danger/10 border border-ov-danger/30 flex items-center justify-center text-ov-danger">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-ov-danger">
                Oups ! Une erreur est survenue
              </h1>
              <p className="text-xs text-ov-muted">
                L'application a rencontré une anomalie inattendue.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-ov-bg border border-ov-border text-left">
                <p className="text-[11px] font-mono text-ov-danger truncate">
                  {this.state.error.message || "Erreur de rendu React"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-ov-border text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recharger
              </Button>
              <Button
                onClick={() => (window.location.href = "/devices")}
                className="bg-ov-primary hover:bg-ov-primaryHover text-xs"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" /> Accueil
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
