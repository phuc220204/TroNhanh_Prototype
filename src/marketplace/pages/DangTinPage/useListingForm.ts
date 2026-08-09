import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { createListing, updateListing, boostListing } from "../../services/listing-mutations";
import { getListingById } from "../../services/listing-queries";
import { publicUrl, uploadListingImages, type UploadedMedia } from "../../../shared/services/media-service";
import { formatVND, cleanVND, appendMetadataToDescription, parseMetadataFromDescription, type ListingMetadata } from "../../utils/listingMetadata";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { AMENITY_OPTIONS, amenityKeyToLabel } from "../../../shared/constants/amenities";
import { NEARBY_CATEGORY_META } from "../../../shared/constants/nearby";
import { isValidLatLng } from "../../../shared/components/common/LeafletMap";
import type { PhotoFileItem } from "./Step3Photos";

/**
 * Gói đẩy tin mặc định khi người dùng bật boost ngay lúc đăng tin.
 * Phải là một giá trị có trong `platform_settings.boost_config.days`
 * (hiện là 7 / 15 / 30), nếu không RPC raise `INVALID_BOOST_PACKAGE`.
 * Muốn chọn gói khác thì dùng nút "Đẩy tin" ở `/tai-khoan/tin-cho-thue`.
 */
const DEFAULT_BOOST_DAYS = 7;

const step1Schema = Yup.object().shape({
  title: Yup.string().min(10, "Tiêu đề quá ngắn (tối thiểu 10 ký tự)").required("Vui lòng nhập tiêu đề"),
  address: Yup.string().required("Vui lòng nhập địa chỉ cụ thể"),
  district: Yup.string().required("Vui lòng chọn phường/xã"),
  wardCode: Yup.number().nullable().required("Vui lòng chọn phường/xã"),
  area: Yup.number()
    .typeError("Diện tích phải là số")
    .required("Vui lòng nhập diện tích")
    .positive("Diện tích phải lớn hơn 0"),
  price: Yup.string().required("Vui lòng nhập giá thuê"),
  phone: Yup.string()
    .required("Số điện thoại chưa hợp lệ")
    .matches(/^0\d{8,9}$/, "Số điện thoại chưa hợp lệ"),
  curfewType: Yup.string().oneOf(["free", "curfew"]).required(),
  curfewTime: Yup.string().when("curfewType", {
    is: "curfew",
    then: (schema) => schema.required("Vui lòng nhập chi tiết giờ giới nghiêm"),
    otherwise: (schema) => schema.optional(),
  }),
});

const step2Schema = Yup.object().shape({
  description: Yup.string().min(10, "Mô tả chi tiết nên có ít nhất 10 ký tự").required("Vui lòng viết mô tả chi tiết"),
});

const step3Schema = Yup.object().shape({
  photos: Yup.array().min(3, "Vui lòng tải lên ít nhất 3 ảnh của phòng"),
});

const step4Schema = Yup.object().shape({
  electric: Yup.string().required("Vui lòng nhập tiền điện"),
  water: Yup.string().required("Vui lòng nhập tiền nước"),
});

export function useListingForm(prefill: any = {}, showToast: (msg: string) => void, listingId?: string) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isLoadingListing, setIsLoadingListing] = useState<boolean>(Boolean(listingId));
  const [notFound, setNotFound] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState<string>("");

  const [photos, setPhotos] = useState<PhotoFileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const formik = useFormik({
    initialValues: {
      title: prefill.title || "",
      roomType: prefill.roomType || "Phòng trọ",
      address: prefill.address || "",
      district: prefill.district || "",
      // Mã khu vực theo mô hình 2 cấp. `district` chỉ còn là TÊN hiển thị.
      provinceCode: (prefill.provinceCode ?? null) as number | null,
      wardCode: (prefill.wardCode ?? null) as number | null,
      area: prefill.area || "",
      price: prefill.price ? formatVND(prefill.price) : "",
      maxPeople: prefill.maxPeople || "",
      floor: prefill.floor || "",
      phone: prefill.phone || "",
      curfewType: "free" as "free" | "curfew",
      curfewTime: "",
      coords: { lat: 10.7712, lng: 106.6823, address: "" },
      
      amenities: [] as string[],
      description: "",
      nearby: [] as Array<{ category: string; name: string; dist: string }>,
      
      electric: "",
      water: "",
      waterUnit: "person" as "person" | "cubic",
      service: "",
      deposit: "",
      other: "",
    },
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async () => {
      if (isBoosted) {
        setShowPayment(true);
      } else {
        handlePostSubmit(false);
      }
    },
  });

  useEffect(() => {
    if (!listingId) return;

    let isMounted = true;
    setIsLoadingListing(true);

    getListingById(listingId)
      .then((listing) => {
        if (!isMounted) return;
        if (!listing) {
          setNotFound(true);
          setIsLoadingListing(false);
          return;
        }

        const meta = (listing.metadata || {}) as ListingMetadata;
        const parsedDesc = parseMetadataFromDescription(listing.description || "");

        // CHECK constraint: access_policy chỉ nhận 'Free' | 'Restricted'.
        // Tin cũ (trước migration 0300) chỉ có metadata.curfew nên vẫn đọc kèm.
        const curfewType =
          listing.access_policy === "Restricted" || meta.curfew?.type === "curfew" ? "curfew" : "free";
        const curfewTime = listing.access_close_time
          ? listing.access_close_time
          : meta.curfew?.time || "";

        let coords = { lat: 10.7712, lng: 106.6823, address: listing.address || "" };
        if (listing.latitude != null && listing.longitude != null && isValidLatLng({ lat: Number(listing.latitude), lng: Number(listing.longitude) })) {
          coords = {
            lat: Number(listing.latitude),
            lng: Number(listing.longitude),
            address: listing.address || "",
          };
        } else if (meta.coords && isValidLatLng(meta.coords)) {
          coords = {
            lat: meta.coords.lat,
            lng: meta.coords.lng,
            address: listing.address || meta.coords.address || "",
          };
        }

        const nearby: Array<{ category: string; name: string; dist: string }> = [];
        if (Array.isArray(meta.nearby)) {
          meta.nearby.forEach((cat: any) => {
            if (cat.places && Array.isArray(cat.places)) {
              cat.places.forEach((p: any) => {
                if (p.name) {
                  nearby.push({ category: cat.key || "truong-hoc", name: p.name, dist: p.dist || "" });
                }
              });
            } else if (cat.category && cat.name) {
              nearby.push(cat);
            }
          });
        }

        const amenityKeys: string[] = [];
        if (Array.isArray(listing.listing_amenities)) {
          listing.listing_amenities.forEach((a: any) => {
            const labelOrKey = (a.amenity || "").trim();
            const found = AMENITY_OPTIONS.find(
              (opt) => opt.label.toLowerCase() === labelOrKey.toLowerCase() || opt.key === labelOrKey.toLowerCase()
            );
            if (found && !amenityKeys.includes(found.key)) {
              amenityKeys.push(found.key);
            }
          });
        }

        const electric = listing.electricity_price != null ? String(listing.electricity_price) : meta.costs?.electric || "";
        const water = listing.water_price != null ? String(listing.water_price) : meta.costs?.water || "";
        const waterUnit = (listing.water_unit || meta.costs?.waterUnit || "person") as "person" | "cubic";
        const service = listing.service_price != null ? String(listing.service_price) : meta.costs?.service || "";
        const deposit = listing.deposit != null ? String(listing.deposit) : meta.costs?.deposit || "";
        const other = meta.costs?.other || "";

        formik.setValues({
          title: listing.title || "",
          roomType: listing.property_type || "Phòng trọ",
          address: listing.address || "",
          district: listing.district || "",
          provinceCode: listing.province_code ?? null,
          wardCode: listing.ward_code ?? null,
          area: listing.area ? String(listing.area) : "",
          price: listing.price ? formatVND(listing.price) : "",
          maxPeople: meta.costs ? (meta as any).maxPeople || "" : "",
          floor: (meta as any).floor || "",
          phone: listing.contact_phone || "",
          curfewType,
          curfewTime,
          coords,
          amenities: amenityKeys,
          description: parsedDesc.cleanDescription,
          nearby,
          electric,
          water,
          waterUnit,
          service,
          deposit,
          other,
        });

        if (Array.isArray(listing.listing_media) && listing.listing_media.length > 0) {
          const sortedMedia = [...listing.listing_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
          const mediaItems: PhotoFileItem[] = sortedMedia.map((m: any) => ({
            storagePath: m.storage_path,
            previewUrl: publicUrl(m.storage_path),
          }));
          setPhotos(mediaItems);
        }

        setIsLoadingListing(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        logError("useListingForm.getListingById", err);
        setNotFound(true);
        setIsLoadingListing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const next = async () => {
    formik.setErrors({});
    if (step === 0) {
      try {
        await step1Schema.validate(formik.values, { abortEarly: false });
        setStep(1);
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    } else if (step === 1) {
      try {
        await step2Schema.validate(formik.values, { abortEarly: false });
        setStep(2);
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    } else if (step === 2) {
      try {
        await step3Schema.validate({ photos }, { abortEarly: false });
        setStep(3);
      } catch (err: any) {
        showToast(err.message || "Vui lòng tải lên ít nhất 3 ảnh");
      }
    } else if (step === 3) {
      try {
        await step4Schema.validate(formik.values, { abortEarly: false });
        formik.handleSubmit();
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handlePostSubmit = async (activateBoost: boolean, isDraft?: boolean) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để đăng tin");
      navigate("/dang-nhap");
      return;
    }
    setIsSubmitting(true);
    setShowPayment(false);

    try {
      const isEditMode = Boolean(listingId);
      const targetListingId = listingId || crypto.randomUUID();

      const newPhotoFiles = photos.filter((p) => p.file).map((p) => p.file as File);
      let newUploadedMedia: UploadedMedia[] = [];
      if (newPhotoFiles.length > 0) {
        newUploadedMedia = await uploadListingImages(
          user.id,
          targetListingId,
          newPhotoFiles,
          (current, total) => setUploadProgress({ current, total })
        );
      }

      let newMediaIdx = 0;
      const finalMedia: UploadedMedia[] = photos.map((item, idx) => {
        if (item.file) {
          const uploaded = newUploadedMedia[newMediaIdx++];
          return {
            storage_path: uploaded ? uploaded.storage_path : "",
            sort_order: idx,
            size_bytes: uploaded?.size_bytes ?? null,
            mime_type: uploaded?.mime_type ?? null,
          };
        } else {
          return {
            storage_path: item.storagePath || "",
            sort_order: idx,
          };
        }
      }).filter((m) => Boolean(m.storage_path));

      const metadata: ListingMetadata = {
        curfew: {
          type: formik.values.curfewType,
          time: formik.values.curfewTime,
        },
        costs: {
          electric: formik.values.electric,
          water: formik.values.water,
          waterUnit: formik.values.waterUnit,
          service: formik.values.service,
          deposit: formik.values.deposit,
          other: formik.values.other,
        },
        nearby: NEARBY_CATEGORY_META
          .map((cat) => ({
            key: cat.key,
            label: cat.label,
            places: (formik.values.nearby || [])
              .filter((n: { category: string }) => n.category === cat.key)
              .map((n: { name: string; dist: string }) => ({ name: n.name, dist: n.dist })),
          }))
          .filter((cat) => cat.places.length > 0),
        coords: formik.values.coords,
      };

      const finalDescription = appendMetadataToDescription(formik.values.description, metadata);
      const amenityLabels = formik.values.amenities.map(amenityKeyToLabel);

      const electricPrice = formik.values.electric ? parseFloat(cleanVND(formik.values.electric)) : null;
      const waterPrice = formik.values.water ? parseFloat(cleanVND(formik.values.water)) : null;
      const servicePrice = formik.values.service ? parseFloat(cleanVND(formik.values.service)) : null;
      const depositPrice = formik.values.deposit ? parseFloat(cleanVND(formik.values.deposit)) : null;

      if (isEditMode && listingId) {
        const returnedStatus = await updateListing({
          id: listingId,
          title: formik.values.title,
          description: finalDescription,
          propertyType: formik.values.roomType,
          price: parseFloat(cleanVND(formik.values.price)),
          area: parseFloat(formik.values.area),
          address: formik.values.address,
          district: formik.values.district,
          provinceCode: formik.values.provinceCode,
          wardCode: formik.values.wardCode,
          contactPhone: formik.values.phone,
          contactName: user.email || "Chủ nhà",
          electricityPrice: electricPrice,
          waterPrice: waterPrice,
          waterUnit: formik.values.waterUnit,
          servicePrice: servicePrice,
          deposit: depositPrice,
          accessPolicy: formik.values.curfewType === "curfew" ? "Restricted" : "Free",
          accessCloseTime: formik.values.curfewType === "curfew" ? formik.values.curfewTime : null,
          latitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lat : null,
          longitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lng : null,
          metadata,
          amenities: amenityLabels,
          media: finalMedia,
        });

        setUpdatedStatus(returnedStatus);
        if (returnedStatus === "PendingApproval") {
          showToast("Tin của bạn đã được cập nhật và cần duyệt lại trước khi hiển thị.");
        } else {
          showToast("Cập nhật tin đăng thành công!");
        }
        setNewRoomId(listingId);
        setSuccess(true);
      } else {
        const createdId = await createListing({
          id: targetListingId,
          title: formik.values.title,
          description: finalDescription,
          propertyType: formik.values.roomType,
          price: parseFloat(cleanVND(formik.values.price)),
          area: parseFloat(formik.values.area),
          address: formik.values.address,
          district: formik.values.district,
          provinceCode: formik.values.provinceCode,
          wardCode: formik.values.wardCode,
          contactPhone: formik.values.phone,
          contactName: user.email || "Chủ nhà",
          amenities: amenityLabels,
          media: finalMedia,
          latitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lat : null,
          longitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lng : null,
          metadata,
          submit: isDraft ? false : true,
        });

        if (isDraft) {
          setUpdatedStatus("Draft");
          showToast("Đã lưu bản nháp thành công!");
        } else {
          const boostedListingId = createdId || targetListingId;
          if (activateBoost && boostedListingId) {
            await boostListing(boostedListingId, DEFAULT_BOOST_DAYS);
          }
        }

        setNewRoomId(createdId || targetListingId);
        setSuccess(true);
      }
    } catch (err: any) {
      logError("useListingForm.handlePostSubmit", err);
      showToast(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return {
    step,
    setStep,
    next,
    prev,
    formik,
    photos,
    setPhotos,
    uploadProgress,
    isBoosted,
    setIsBoosted,
    showPayment,
    setShowPayment,
    isSubmitting,
    success,
    newRoomId,
    handlePostSubmit,
    isLoadingListing,
    notFound,
    updatedStatus,
    isEditMode: Boolean(listingId),
  };
}
