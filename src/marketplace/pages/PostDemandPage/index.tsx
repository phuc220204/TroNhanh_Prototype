import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router";
import { PublicNavbar } from "../../../shared/components/PublicNavbar";
import { Home, Users, ArrowLeft, Save, AlertCircle, X } from "lucide-react";
import { C, font } from "../../../shared/theme";
import { PROPERTY_TYPES } from "../../../shared/constants/catalog";
import { AreaSelect } from "../../../shared/components/common";
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
  // Khu vực đang chọn dở ở ô picker — bấm "Thêm" mới đẩy vào danh sách.
  const [areaDraft, setAreaDraft] = useState<{ provinceCode: number | null; wardCode: number | null }>({
    provinceCode: null,
    wardCode: null,
  });
  const [areaDraftName, setAreaDraftName] = useState<string>("");
  // Song song hai mảng: mã để LỌC, tên để HIỂN THỊ. Cùng thứ tự, cùng độ dài.
  const [selectedWardCodes, setSelectedWardCodes] = useState<number[]>([]);
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
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
          setSelectedWardCodes(data.desired_ward_codes || []);
          setProvinceCode(data.desired_province_code ?? null);
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

    if (selectedWardCodes.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất một khu vực mong muốn.");
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
        desired_province_code: provinceCode,
        desired_ward_codes: selectedWardCodes,
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
              // Phường của chỗ đang ở = khu vực đầu tiên người dùng chọn. Bản
              // cũ để `district` mặc định là `REGIONS[0]` ("Quận 7") và KHÔNG
              // có ô nhập nào — nên mọi tin ở ghép đều ghi Quận 7 bất kể thực
              // tế, chỉ là không ai để ý vì card không hiện field này.
              district: selectedDistricts[0] ?? null,
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

  const addArea = () => {
    if (areaDraft.wardCode == null || !areaDraftName) return;
    if (selectedWardCodes.includes(areaDraft.wardCode)) return;
    setSelectedWardCodes((prev) => [...prev, areaDraft.wardCode as number]);
    setSelectedDistricts((prev) => [...prev, areaDraftName]);
    // Tỉnh lấy từ lần chọn đầu: một tin nhu cầu nhắm nhiều phường TRONG cùng
    // một tỉnh. Muốn đổi tỉnh thì xóa hết khu vực đã chọn — trộn phường của hai
    // tỉnh vào một tin thì bộ lọc theo tỉnh không còn nghĩa gì.
    setProvinceCode((prev) => prev ?? areaDraft.provinceCode);
  };

  const removeAreaAt = (index: number) => {
    setSelectedWardCodes((prev) => prev.filter((_, i) => i !== index));
    setSelectedDistricts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setProvinceCode(null);
      return next;
    });
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
                data-testid="demand-kind-room-wanted"
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
                data-testid="demand-kind-roommate-wanted"
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
              <div data-testid="demand-error" style={{ background: C.cream, border: `1px solid ${C.error}`, color: C.error, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontFamily: font, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
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
                  data-testid="demand-title-input"
                  placeholder={kind === "RoomWanted" ? "VD: Tìm phòng trọ khép kín gần ĐH Bách Khoa" : "VD: Tìm 1 bạn nữ ở ghép căn hộ 2PN Quận 7"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", padding: "11px 14px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 10, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                  Khu vực mong muốn *
                </label>
                {/* Chọn từng phường rồi bấm "Thêm": người tìm trọ thường nhắm
                    2–3 khu chứ không phải một, mà `AreaSelect` là ô chọn đơn.
                    Gộp chúng lại ở đây thay vì làm `AreaSelect` hỗ trợ đa chọn —
                    năm chỗ còn lại đều chỉ cần chọn một. */}
                <AreaSelect
                  value={areaDraft}
                  onChange={(a) => {
                    setAreaDraft({ provinceCode: a.provinceCode, wardCode: a.wardCode });
                    setAreaDraftName(a.wardName ?? "");
                  }}
                  layout="inline"
                  labels={false}
                  testIdPrefix="demand-area"
                />
                <button
                  type="button"
                  onClick={addArea}
                  disabled={areaDraft.wardCode == null}
                  data-testid="demand-area-add"
                  style={{
                    marginTop: 8, padding: "7px 14px",
                    background: areaDraft.wardCode == null ? C.border : C.primary,
                    color: areaDraft.wardCode == null ? C.textSecondary : C.white,
                    border: "none", borderRadius: 999,
                    fontFamily: font, fontSize: 12.5, fontWeight: 700,
                    cursor: areaDraft.wardCode == null ? "not-allowed" : "pointer",
                  }}
                >
                  + Thêm khu vực
                </button>

                {selectedDistricts.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {selectedDistricts.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        data-testid="demand-area-chip"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "6px 10px", borderRadius: 999,
                          background: C.caramelSoft, border: `1px solid ${C.border}`,
                          fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textPrimary,
                        }}
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => removeAreaAt(i)}
                          aria-label={`Bỏ ${name}`}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0, color: C.textSecondary }}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                  data-testid="demand-description-input"
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
