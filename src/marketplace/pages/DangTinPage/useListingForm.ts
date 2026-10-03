import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { createListing, submitDraftListing, updateListing } from "../../services/listing-mutations";
import { getListingById } from "../../services/listing-queries";
import { createBoostCheckout, getBoostCheckoutErrorMessage, redirectToBoostCheckout } from "../../services/boost-payment-service";
import { publicUrl, uploadListingImages, type UploadedMedia } from "../../../shared/services/media-service";
import { formatVND, cleanVND, mergeEditedListingMetadata, parseMetadataFromDescription, type ListingCoords, type ListingMetadata } from "../../utils/listingMetadata";
import { logError, toUserMessage } from "../../../shared/services/supabase-error";
import { AMENITY_OPTIONS, amenityKeyToLabel } from "../../../shared/constants/amenities";
import { NEARBY_CATEGORY_META } from "../../../shared/constants/nearby";
import { isValidLatLng } from "../../../shared/components/common/LeafletMap";
import type { PhotoFileItem } from "./Step3Photos";

export const LISTING_LIMITS = {
  titleMin: 10,
  titleMax: 120,
  addressMin: 5,
  addressMax: 255,
  descriptionMin: 10,
  descriptionMax: 5_000,
  areaMin: 5,
  areaMax: 1_000,
  priceMin: 100_000,
  priceMax: 1_000_000_000,
  utilityMax: 10_000_000,
  serviceMax: 100_000_000,
  depositMax: 1_000_000_000,
} as const;

function numericVndSchema(label: string, min: number, max: number, isRequired = false) {
  let schema = Yup.string().test("vnd-number", `${label} phải là số từ ${formatVND(min)} đến ${formatVND(max)} VND`, (value) => {
    if (!value) return !isRequired;
    if (/[-+]/.test(value) || !/\d/.test(value)) return false;
    const amount = Number(cleanVND(value));
    return Number.isFinite(amount) && amount >= min && amount <= max;
  });
  if (isRequired) schema = schema.required(`Vui lòng nhập ${label.toLowerCase()}`);
  return schema;
}

function editableLegacyCost(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return String(value);
  if (typeof value !== "string" || !/^\s*[\d.,]+\s*(?:đ|vnd)?\s*$/i.test(value)) return "";
  return cleanVND(value);
}

const step1Schema = Yup.object().shape({
  title: Yup.string().trim().min(LISTING_LIMITS.titleMin, "Tiêu đề quá ngắn (tối thiểu 10 ký tự)").max(LISTING_LIMITS.titleMax, "Tiêu đề tối đa 120 ký tự").required("Vui lòng nhập tiêu đề"),
  address: Yup.string().trim().min(LISTING_LIMITS.addressMin, "Địa chỉ quá ngắn").max(LISTING_LIMITS.addressMax, "Địa chỉ tối đa 255 ký tự").required("Vui lòng nhập địa chỉ cụ thể"),
  district: Yup.string().required("Vui lòng chọn phường/xã"),
  wardCode: Yup.number().nullable().required("Vui lòng chọn phường/xã"),
  area: Yup.number()
    .typeError("Diện tích phải là số")
    .required("Vui lòng nhập diện tích")
    .min(LISTING_LIMITS.areaMin, `Diện tích tối thiểu ${LISTING_LIMITS.areaMin} m²`)
    .max(LISTING_LIMITS.areaMax, `Diện tích tối đa ${formatVND(LISTING_LIMITS.areaMax)} m²`),
  price: numericVndSchema("Giá thuê", LISTING_LIMITS.priceMin, LISTING_LIMITS.priceMax, true),
  phone: Yup.string()
    .required("Số điện thoại chưa hợp lệ")
    .matches(/^0\d{8,9}$/, "Số điện thoại chưa hợp lệ"),
  curfewType: Yup.string().oneOf(["free", "curfew"]).required(),
  curfewTime: Yup.string().when("curfewType", {
    is: "curfew",
    then: (schema) => schema.matches(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ đóng cửa chưa hợp lệ").required("Vui lòng chọn giờ đóng cửa"),
    otherwise: (schema) => schema.optional(),
  }),
});

const step2Schema = Yup.object().shape({
  description: Yup.string().trim().min(LISTING_LIMITS.descriptionMin, "Mô tả chi tiết nên có ít nhất 10 ký tự").max(LISTING_LIMITS.descriptionMax, "Mô tả tối đa 5.000 ký tự").required("Vui lòng viết mô tả chi tiết"),
});

const step3Schema = Yup.object().shape({
  photos: Yup.array().min(3, "Vui lòng tải lên ít nhất 3 ảnh của phòng"),
});

const step4Schema = Yup.object().shape({
  electric: numericVndSchema("Tiền điện", 1, LISTING_LIMITS.utilityMax, true),
  water: numericVndSchema("Tiền nước", 1, LISTING_LIMITS.utilityMax, true),
  service: numericVndSchema("Phí dịch vụ", 0, LISTING_LIMITS.serviceMax),
  deposit: numericVndSchema("Tiền đặt cọc", 0, LISTING_LIMITS.depositMax),
});

export function useListingForm(
  prefill: any = {},
  showToast: (msg: string) => void,
  listingId?: string,
  boostChoiceAvailable = false,
) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");
  const [isLoadingListing, setIsLoadingListing] = useState<boolean>(Boolean(listingId));
  const [notFound, setNotFound] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState<string>("");
  const [listingStatus, setListingStatus] = useState<string>("");
  const [selectedBoostDays, setSelectedBoostDays] = useState<number | null>(null);
  const [boostCheckoutError, setBoostCheckoutError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<PhotoFileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [legacyDepositCleared, setLegacyDepositCleared] = useState(false);
  const originalMetadataRef = useRef<ListingMetadata>({});
  const legacyDepositTextRef = useRef("");
  // Existing approved/rejected listings are deliberately not offered a new
  // plan during content editing. A new listing or an existing Draft can choose
  // a plan before it enters the review queue.
  const shouldShowBoostStep = !listingId || listingStatus === "Draft";

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
      coords: (prefill.coords ?? null) as ListingCoords | null,
      
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
    onSubmit: async () => handlePostSubmit(false, shouldShowBoostStep && boostChoiceAvailable ? selectedBoostDays : null),
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
        setListingStatus(listing.status || "");
        if (Number.isInteger(meta.boost_intent?.days) && (meta.boost_intent?.days ?? 0) > 0) {
          setSelectedBoostDays(meta.boost_intent!.days);
        }
        const parsedDesc = parseMetadataFromDescription(listing.description || "");
        const legacyMeta = parsedDesc.metadata;
        originalMetadataRef.current = {
          ...legacyMeta,
          ...meta,
          costs: { ...legacyMeta.costs, ...meta.costs },
        };

        // CHECK constraint: access_policy chỉ nhận 'Free' | 'Restricted'.
        // Tin cũ (trước migration 0300) chỉ có metadata.curfew nên vẫn đọc kèm.
        const curfewType =
          listing.access_policy === "Restricted" || meta.curfew?.type === "curfew" || legacyMeta.curfew?.type === "curfew" ? "curfew" : "free";
        const curfewTime = listing.access_close_time
          ? String(listing.access_close_time).slice(0, 5)
          : meta.curfew?.time || legacyMeta.curfew?.time || "";

        let coords: ListingCoords | null = null;
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
        } else if (!Object.prototype.hasOwnProperty.call(meta, "coords") && legacyMeta.coords && isValidLatLng(legacyMeta.coords)) {
          coords = {
            lat: legacyMeta.coords.lat,
            lng: legacyMeta.coords.lng,
            address: listing.address || legacyMeta.coords.address || "",
          };
        }

        const nearby: Array<{ category: string; name: string; dist: string }> = [];
        if (Array.isArray(originalMetadataRef.current.nearby)) {
          originalMetadataRef.current.nearby.forEach((cat: any) => {
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

        const legacyCosts = originalMetadataRef.current.costs || {};
        const electric = listing.electricity_price != null ? String(listing.electricity_price) : editableLegacyCost(legacyCosts.electric);
        const water = listing.water_price != null ? String(listing.water_price) : editableLegacyCost(legacyCosts.water);
        // Các row tạo bởi client cũ có `water_unit=person` do default RPC dù metadata
        // ghi cubic. Chỉ tin cột unit khi cột giá nước cũng đã được ghi canonical.
        const waterUnit = (listing.water_price != null
          ? listing.water_unit || "person"
          : legacyCosts.waterUnit || listing.water_unit || "person") as "person" | "cubic";
        const service = listing.service_price != null ? String(listing.service_price) : editableLegacyCost(legacyCosts.service);
        const deposit = listing.deposit != null ? String(listing.deposit) : editableLegacyCost(legacyCosts.deposit);
        legacyDepositTextRef.current = listing.deposit == null
          && typeof legacyCosts.deposit === "string"
          && !editableLegacyCost(legacyCosts.deposit)
          ? legacyCosts.deposit.trim()
          : "";
        setLegacyDepositCleared(false);
        const other = legacyCosts.other || "";

        formik.resetForm({ values: {
          title: listing.title || "",
          roomType: listing.property_type || "Phòng trọ",
          address: listing.address || "",
          district: listing.district || "",
          provinceCode: listing.province_code ?? null,
          wardCode: listing.ward_code ?? null,
          area: listing.area ? String(listing.area) : "",
          price: listing.price ? formatVND(listing.price) : "",
          maxPeople: (meta as any).maxPeople || (legacyMeta as any).maxPeople || "",
          floor: (meta as any).floor || (legacyMeta as any).floor || "",
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
        }});

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
        if (shouldShowBoostStep) setStep(4);
        else formik.handleSubmit();
      } catch (err: any) {
        const formikErrors: any = {};
        if (err.inner) {
          err.inner.forEach((e: any) => {
            if (e.path) formikErrors[e.path] = e.message;
          });
        }
        formik.setErrors(formikErrors);
      }
    } else if (step === 4 && shouldShowBoostStep) {
      formik.handleSubmit();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handlePostSubmit = async (isDraft = false, requestedBoostDays: number | null = null) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để đăng tin");
      navigate("/dang-nhap");
      return;
    }
    setIsSubmitting(true);
    setBoostCheckoutError(null);

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

      const baseMetadata = mergeEditedListingMetadata(originalMetadataRef.current, {
        curfew: {
          type: formik.values.curfewType,
          time: formik.values.curfewType === "curfew" ? formik.values.curfewTime : "",
        },
        costs: {
          electric: formik.values.electric,
          water: formik.values.water,
          waterUnit: formik.values.waterUnit,
          service: formik.values.service,
          deposit: formik.values.deposit,
          other: formik.values.other,
        },
        coords: isValidLatLng(formik.values.coords) ? formik.values.coords : null,
        nearby: NEARBY_CATEGORY_META
          .map((cat) => ({
            key: cat.key,
            label: cat.label,
            places: (formik.values.nearby || [])
              .filter((n: { category: string }) => n.category === cat.key)
              .map((n: { name: string; dist: string }) => ({ name: n.name, dist: n.dist })),
          }))
          .filter((cat) => cat.places.length > 0),
      }, legacyDepositCleared ? "" : legacyDepositTextRef.current);
      const metadata: ListingMetadata = { ...baseMetadata };
      if (shouldShowBoostStep) {
        // This is a seller preference only. The checkout RPC and verified
        // webhook independently control payment and Boost entitlement.
        if (requestedBoostDays !== null) {
          metadata.boost_intent = { days: requestedBoostDays, selected_at: new Date().toISOString() };
        } else {
          delete metadata.boost_intent;
        }
      }

      const finalDescription = formik.values.description.trim();
      const amenityLabels = formik.values.amenities.map(amenityKeyToLabel);

      const electricPrice = formik.values.electric ? parseFloat(cleanVND(formik.values.electric)) : null;
      const waterPrice = formik.values.water ? parseFloat(cleanVND(formik.values.water)) : null;
      const servicePrice = formik.values.service ? parseFloat(cleanVND(formik.values.service)) : null;
      const depositPrice = formik.values.deposit ? parseFloat(cleanVND(formik.values.deposit)) : null;

      if (isEditMode && listingId) {
        let returnedStatus = await updateListing({
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

        // `update_listing_with_details` intentionally leaves a Draft as Draft
        // so a seller can keep editing it. The final submit explicitly moves a
        // completed draft through the same server-side validation gate as a new
        // listing.
        if (!isDraft && listingStatus === "Draft") {
          returnedStatus = await submitDraftListing(listingId);
        }

        setUpdatedStatus(returnedStatus);
        setListingStatus(returnedStatus);
        if (returnedStatus === "PendingApproval") {
          showToast("Tin của bạn đã được cập nhật và cần duyệt lại trước khi hiển thị.");
        } else {
          showToast("Cập nhật tin đăng thành công!");
        }
        setNewRoomId(listingId);
        if (!isDraft && returnedStatus === "PendingApproval" && shouldShowBoostStep && requestedBoostDays !== null) {
          try {
            const checkout = await createBoostCheckout(listingId, requestedBoostDays);
            redirectToBoostCheckout(checkout);
            return;
          } catch (checkoutError) {
            const message = getBoostCheckoutErrorMessage(
              checkoutError,
              "Tin đã được gửi duyệt nhưng chưa mở được payOS. Bạn có thể thanh toán lại trong Quản lý tin đăng.",
            );
            logError("useListingForm.createBoostCheckout", checkoutError);
            setBoostCheckoutError(message);
            showToast(message);
          }
        }
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
          electricityPrice: electricPrice,
          waterPrice,
          waterUnit: formik.values.waterUnit,
          servicePrice,
          deposit: depositPrice,
          accessPolicy: formik.values.curfewType === "curfew" ? "Restricted" : "Free",
          accessCloseTime: formik.values.curfewType === "curfew" ? formik.values.curfewTime : null,
          amenities: amenityLabels,
          media: finalMedia,
          latitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lat : null,
          longitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lng : null,
          metadata,
          submit: isDraft ? false : true,
        });

        const savedListingId = createdId || targetListingId;
        setNewRoomId(savedListingId);

        if (isDraft) {
          setUpdatedStatus("Draft");
          setListingStatus("Draft");
          showToast("Đã lưu bản nháp thành công!");
        } else {
          // Production uses manual moderation. We retain this state in the UI
          // immediately; the database remains the source of truth for public
          // visibility and webhook-triggered Boost activation.
          setUpdatedStatus("PendingApproval");
          setListingStatus("PendingApproval");

          if (boostChoiceAvailable && requestedBoostDays !== null) {
            try {
              const checkout = await createBoostCheckout(savedListingId, requestedBoostDays);
              redirectToBoostCheckout(checkout);
              return;
            } catch (checkoutError) {
              const message = getBoostCheckoutErrorMessage(
                checkoutError,
                "Tin đã được gửi duyệt nhưng chưa mở được payOS. Bạn có thể thanh toán lại trong Quản lý tin đăng.",
              );
              logError("useListingForm.createBoostCheckout", checkoutError);
              setBoostCheckoutError(message);
              showToast(message);
            }
          }
        }

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
    isSubmitting,
    success,
    newRoomId,
    handlePostSubmit,
    isLoadingListing,
    notFound,
    updatedStatus,
    listingStatus,
    selectedBoostDays,
    setSelectedBoostDays,
    boostCheckoutError,
    legacyDepositText: legacyDepositTextRef.current,
    legacyDepositCleared,
    setLegacyDepositCleared,
    isEditMode: Boolean(listingId),
    shouldShowBoostStep,
  };
}
