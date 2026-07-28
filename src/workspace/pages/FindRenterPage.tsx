import { LandlordShell } from "../../shared/components/LandlordShell";
import { EmptyState } from "../../shared/components/common/EmptyState";
import { Users } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";

export function FindRenterPage() {
  return (
    <LandlordShell active="overview" mobileTitle="Tìm người thuê">
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: `${space[8]}px ${space[8]}px` }}>
        <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: space[5] }}>Tìm người thuê phù hợp</h1>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: `${space[10]}px ${space[6]}px` }}>
          <EmptyState icon={Users} title="Tìm người thuê" description="Tìm kiếm và chủ động liên hệ người đang có nhu cầu thuê trọ." />
        </div>
      </div>
    </LandlordShell>
  );
}

export default FindRenterPage;
