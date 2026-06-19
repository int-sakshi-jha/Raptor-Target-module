import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import LoadingWrapper from "@/components/common/LoadingWrapper";
import { useNavigate } from "react-router-dom";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <LoadingWrapper
      appName="Raptor"
      showLoader={false}
      cardBackdropClassName="backdrop-blur-xs dark:backdrop-blur-sm"
      cardClassName="max-w-lg px-11 pt-[52px] pb-12"
      glassOverlayStyle={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.01) 100%)",
      }}
    >
      <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight mb-2">
        Page not found
      </h1>
      <p className="text-sm text-neutral-500 dark:text-white/45 mb-8 max-w-xs mx-auto leading-relaxed text-center">
        The page you’re looking for doesn’t exist or has been moved. Check the
        address or head back to the dashboard.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/" className="btn-primary btn-md inline-flex items-center gap-2">
          <Home className="w-4 h-4" />
          Go to dashboard
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-secondary btn-md inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </button>
      </div>
    </LoadingWrapper>
  );
};

export default NotFound;