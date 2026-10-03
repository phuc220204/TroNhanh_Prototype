import { Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "../shared/contexts/AuthContext";
import { consumePostAuthRedirect } from "../shared/utils/auth-redirect";
import { BoostPaymentReturnNotice } from "../shared/components/BoostPaymentReturnNotice";

function Fallback() {
  return <div style={{ minHeight: "100vh", background: "#F5EFE4" }} />;
}

export default function Root() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const redirect = consumePostAuthRedirect();
    if (redirect) navigate(redirect, { replace: true });
  }, [navigate, user]);
  return (
    <Suspense fallback={<Fallback />}>
      <Outlet />
      <BoostPaymentReturnNotice />
    </Suspense>
  );
}
