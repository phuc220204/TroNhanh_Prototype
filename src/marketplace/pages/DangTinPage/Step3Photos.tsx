import { useRef, useEffect } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, AlertCircle } from "lucide-react";
import { C, font } from "../../../shared/theme";

export interface PhotoFileItem {
  file?: File;
  previewUrl: string;
  storagePath?: string;
}

interface Step3PhotosProps {
  photos: PhotoFileItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoFileItem[]>>;
  error?: string;
  uploadProgress?: { current: number; total: number } | null;
}

export function Step3Photos({ photos, setPhotos, error, uploadProgress }: Step3PhotosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.file) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);

    const newItems: PhotoFileItem[] = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const target = prev[index];
      if (target?.file) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleMovePhoto = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= photos.length) return;

    setPhotos((prev) => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[targetIdx]!;
      arr[targetIdx] = temp!;
      return arr;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          Hình ảnh thực tế phòng trọ
        </h2>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: 0 }}>
          Tải lên ít nhất 3 hình ảnh rõ nét. Tin đăng có hình ảnh chân thực giúp tăng 300% lượng liên hệ.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${error ? C.repairing : C.primary}`,
          borderRadius: 16,
          background: C.caramelSoft,
          padding: "36px 24px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          data-testid="photo-upload-input"
          style={{ display: "none" }}
        />

        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.primary,
            boxShadow: "0 4px 12px rgba(138,106,69,0.15)",
          }}
        >
          <Upload size={24} strokeWidth={2.2} />
        </div>

        <div>
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 4px" }}>
            Nhấp vào đây để chọn ảnh hoặc kéo thả hình ảnh vào
          </p>
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0 }}>
            Hỗ trợ định dạng PNG, JPG, WEBP. Dung lượng tối đa 10MB/ảnh.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.repairing }}>
          <AlertCircle size={14} />
          <span style={{ fontFamily: font, fontSize: 13, fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
            <span>Đang nén & tải ảnh lên Supabase Storage...</span>
            <span>{uploadProgress.current}/{uploadProgress.total}</span>
          </div>
          <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                background: C.primary,
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {/* Photos Grid & Preview List */}
      {photos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: font, fontSize: 13.5, fontWeight: 700, color: C.textPrimary }}>
              Danh sách ảnh ({photos.length} ảnh)
            </span>
            <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              Ảnh đầu tiên sẽ được dùng làm ảnh bìa tin đăng
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {photos.map((item, idx) => (
              <div
                key={item.previewUrl}
                data-testid="photo-item"
                style={{
                  position: "relative",
                  background: C.white,
                  border: `1.5px solid ${idx === 0 ? C.primary : C.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Thumbnail Image */}
                <div style={{ position: "relative", width: "100%", height: 130, background: "#f0f0f0" }}>
                  <img
                    src={item.previewUrl}
                    alt={`Preview ${idx + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />

                  {idx === 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: C.primary,
                        color: "white",
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      }}
                    >
                      Ảnh bìa
                    </span>
                  )}
                </div>

                {/* Photo Actions Toolbar */}
                <div
                  style={{
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: C.white,
                    borderTop: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMovePhoto(idx, "up")}
                      title="Chuyển lên trước"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: C.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === 0 ? "not-allowed" : "pointer",
                        opacity: idx === 0 ? 0.4 : 1,
                      }}
                    >
                      <ArrowUp size={14} color={C.textPrimary} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === photos.length - 1}
                      onClick={() => handleMovePhoto(idx, "down")}
                      title="Chuyển xuống sau"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                        background: C.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === photos.length - 1 ? "not-allowed" : "pointer",
                        opacity: idx === photos.length - 1 ? 0.4 : 1,
                      }}
                    >
                      <ArrowDown size={14} color={C.textPrimary} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    data-testid="photo-remove-btn"
                    title="Xóa ảnh này"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      background: C.cream,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: C.error,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
