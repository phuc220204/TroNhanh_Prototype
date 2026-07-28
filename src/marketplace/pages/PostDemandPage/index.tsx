import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { PublicNavbar } from "../../../shared/components/PublicNavbar";
import { Home, Users, ArrowLeft, Save, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { REGIONS, PROPERTY_TYPES } from "../../../shared/constants/catalog";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { createDemandPost, updateDemandPost, getDemandPostById } from "../../services/demand-post-service";
import { toUserMessage } from "../../../shared/services/supabase-error";
import { RoomWantedForm } from "./RoomWantedForm";
import { RoommateWantedForm } from "./RoommateWantedForm";

export function PostDemandPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id?: string }>();
  const { user } = useAuth();

  const [kind, setKind] = useState<"RoomWanted" | "RoommateWanted" | null>(() => {
    const k = searchParams.get("kind");
    if (k === "tim-phong") return "RoomWanted";
    if (k === "o-ghep") return "RoommateWanted";
    return null;
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("2000000");
  const [priceMax, setPriceMax] = useState("5000000");

  // RoomWanted fields
  const [propertyType, setPropertyType] = useState<string>(PROPERTY_TYPES[0] || "Phòng trọ");
  const [minArea, setMinArea] = useState("20");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [moveInDate, setMoveInDate] = useState("");
  const [occupantCount, setOccupantCount] = useState("1");

  // RoommateWanted fields
  const [currentAddress, setCurrentAddress] = useState("");
  const [district, setDistrict] = useState(REGIONS[0] || "Quận 1");
  const [sharePrice, setSharePrice] = useState("2500000");
  const [neededCount, setNeededCount] = useState("1");
  const [genderReq, setGenderReq] = useState<"Any" | "Male" | "Female">("Any");
  const [selectedReqs, setSelectedReqs] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!editId) return;
    const fetchExisting = async () => {
      try {
        setLoading(true);
        const data = await getDemandPostById(editId);
        if (data) {
          setKind(data.kind);
          setTitle(data.title);
          setDescription(data.description || "");
          setContactName(data.contact_name || "");
          setContactPhone(data.contact_phone || "");
          setSelectedDistricts(data.desired_districts || []);
          setPriceMin(String(data.price_min || 0));
          setPriceMax(String(data.price_max || 0));

          if (data.kind === "RoomWanted") {
            if (data.property_type) setPropertyType(data.property_type);
            if (data.min_area) setMinArea(String(data.min_area));
            setSelectedAmenities(data.desired_amenities || []);
            setMoveInDate(data.move_in_date || "");
            setOccupantCount(String(data.occupant_count || 1));
          } else {
            setCurrentAddress(data.current_address || "");
            if (data.district) setDistrict(data.district);
            setSharePrice(String(data.share_price || 0));
            setNeededCount(String(data.needed_count || 1));
            if (data.gender_requirement) setGenderReq(data.gender_requirement);
            setSelectedReqs(data.requirements || []);
          }
        }
      } catch (err) {
        // Error handling
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/dang-nhap?redirect=/dang-tin-nhu-cau");
      return;
    }
    if (!kind) return;

    const minP = Number(priceMin) || 0;
    const maxP = Number(priceMax) || 0;

    if (maxP < minP) {
      setErrorMsg("Khoảng giá không hợp lệ: Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.");
      return;
    }

    if (kind === "RoommateWanted" && (!neededCount || Number(neededCount) < 1)) {
      setErrorMsg("Vui lòng nhập số người cần tìm (ít nhất 1 người).");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const payload = {
        kind,
        title: title.trim() || (kind === "RoomWanted" ? "Tìm phòng trọ" : "Tìm bạn ở ghép"),
        description: description.trim(),
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim(),
        desired_districts: selectedDistricts,
        price_min: minP,
        price_max: maxP,
        ...(kind === "RoomWanted"
          ? {
              property_type: propertyType,
              min_area: Number(minArea) || 0,
              desired_amenities: selectedAmenities,
              move_in_date: moveInDate || null,
              occupant_count: Number(occupantCount) || 1,
            }
          : {
              current_address: currentAddress.trim(),
              district,
              share_price: Number(sharePrice) || 0,
              needed_count: Number(neededCount) || 1,
              gender_requirement: genderReq,
              requirements: selectedReqs,
            }),
      };

      if (editId) {
        await updateDemandPost(editId, payload);
      } else {
        await createDemandPost(payload);
      }

      navigate("/tin-nhu-cau");
    } catch (err: any) {
      setErrorMsg(toUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleDistrict = (d: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 60px" }}>
        {!kind ? (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, textAlign: "center" }}>
            <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 900, color: C.textPrimary, marginBottom: 8 }}>
              Bạn muốn đăng tin nhu cầu nào?
            </h1>
            <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, marginBottom: 32 }}>
              Lựa chọn đúng danh mục giúp thông tin nhu cầu của bạn tiếp cận người dùng phù hợp nhất.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div
                onClick={() => setKind("RoomWanted")}
                style={{
                  border: `2px solid ${C.primary}`,
                  borderRadius: 16,
                  padding: 28,
                  cursor: "pointer",
                  background: C.caramelSoft,
                  transition: "transform 0.15s",
                }}
              >
                <Home size={36} color={C.primary} style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
                  Đăng tin tìm phòng
                </h3>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
                  Dành cho người thuê muốn đăng nhu cầu tìm chỗ ở phù hợp.
                </p>
              </div>

              <div
                onClick={() => setKind("RoommateWanted")}
                style={{
                  border: `2px solid ${C.secondary}`,
                  borderRadius: 16,
                  padding: 28,
                  cursor: "pointer",
                  background: C.cream,
                  transition: "transform 0.15s",
                }}
              >
                <Users size={36} color={C.secondary} style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
                  Tìm bạn ở ghép
                </h3>
                <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
                  Dành cho người đang ở trọ cần tìm thêm người chia sẻ tiền phòng.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button type="button" onClick={() => setKind(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <ArrowLeft size={20} color={C.textPrimary} />
              </button>
              <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                {editId ? "Sửa tin nhu cầu" : kind === "RoomWanted" ? "Đăng tin tìm phòng trọ" : "Đăng tin tìm bạn ở ghép"}
              </h1>
            </div>

            {errorMsg && (
              <div style={{ background: C.cream, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: font, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                  Tiêu đề tin đăng *
                </label>
                <input
                  type="text"
                  required
                  placeholder={kind === "RoomWanted" ? "VD: Tìm phòng trọ khép kín gần ĐH Bách Khoa" : "VD: Tìm 1 bạn nữ ở ghép căn hộ 2PN Quận 7"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                  Khu vực mong muốn (chọn các quận) *
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {REGIONS.map((r) => {
                    const active = selectedDistricts.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleDistrict(r)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 999,
                          border: `1px solid ${active ? C.primary : C.border}`,
                          background: active ? C.primary : C.white,
                          color: active ? "white" : C.textPrimary,
                          fontFamily: font,
                          fontSize: 12.5,
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                    Ngân sách tối thiểu (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                    Ngân sách tối đa (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {kind === "RoomWanted" ? (
                <RoomWantedForm
                  propertyType={propertyType}
                  setPropertyType={setPropertyType}
                  minArea={minArea}
                  setMinArea={setMinArea}
                  moveInDate={moveInDate}
                  setMoveInDate={setMoveInDate}
                  occupantCount={occupantCount}
                  setOccupantCount={setOccupantCount}
                  selectedAmenities={selectedAmenities}
                  setSelectedAmenities={setSelectedAmenities}
                />
              ) : (
                <RoommateWantedForm
                  neededCount={neededCount}
                  setNeededCount={setNeededCount}
                  genderReq={genderReq}
                  setGenderReq={setGenderReq}
                  sharePrice={sharePrice}
                  setSharePrice={setSharePrice}
                  selectedReqs={selectedReqs}
                  setSelectedReqs={setSelectedReqs}
                />
              )}

              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={4}
                  placeholder="Nhập thông tin thêm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => navigate(-1)} style={{ padding: "12px 20px", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, color: C.textSecondary, cursor: "pointer" }}>Hủy</button>
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="demand-submit-btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 24px",
                    background: C.primary,
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontFamily: font,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <Save size={16} /> {loading ? "Đang lưu..." : editId ? "Cập nhật tin" : "Đăng tin nhu cầu"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDemandPage;
