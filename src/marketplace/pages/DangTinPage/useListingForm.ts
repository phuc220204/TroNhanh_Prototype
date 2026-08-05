import { useState } from "react";
import { useNavigate } from "react-router";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { createListing } from "../../services/listing-mutations";
import { uploadListingImages, type UploadedMedia } from "../../../shared/services/media-service";
import { formatVND, cleanVND, appendMetadataToDescription, type ListingMetadata } from "../../utils/listingMetadata";
import { logError } from "../../../shared/services/supabase-error";
import { amenityKeyToLabel } from "../../../shared/constants/amenities";
import { NEARBY_CATEGORY_META } from "../../../shared/constants/nearby";
import { isValidLatLng } from "../../../shared/components/common/LeafletMap";

export interface PhotoFileItem {
  file: File;
  previewUrl: string;
}

const step1Schema = Yup.object().shape({
  title: Yup.string().min(10, "Tiêu đề quá ngắn (tối thiểu 10 ký tự)").required("Vui lòng nhập tiêu đề"),
  address: Yup.string().required("Vui lòng nhập địa chỉ cụ thể"),
  district: Yup.string().required("Vui lòng chọn khu vực"),
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

export function useListingForm(prefill: any = {}, showToast: (msg: string) => void) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRoomId, setNewRoomId] = useState("");

  const [photos, setPhotos] = useState<PhotoFileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const formik = useFormik({
    initialValues: {
      title: prefill.title || "",
      roomType: prefill.roomType || "Phòng trọ",
      address: prefill.address || "",
      district: prefill.district || "Quận 7",
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

  const handlePostSubmit = async (activateBoost: boolean) => {
    if (!user) {
      showToast("Vui lòng đăng nhập để đăng tin");
      navigate("/dang-nhap");
      return;
    }
    setIsSubmitting(true);
    setShowPayment(false);

    try {
      // Client pre-generates listingId for Storage path consistency
      const listingId = crypto.randomUUID();

      // Upload photos to Supabase Storage bucket 'listing-images'
      let uploadedMedia: UploadedMedia[] = [];
      if (photos.length > 0) {
        const filesToUpload = photos.map((p) => p.file);
        uploadedMedia = await uploadListingImages(
          user.id,
          listingId,
          filesToUpload,
          (current, total) => setUploadProgress({ current, total })
        );
      }

      const boostExpire = activateBoost
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
        // Gom phẳng -> theo nhóm, bỏ nhóm rỗng. Trước đây chỗ này ghi cứng `[]`
        // nên trang chi tiết không bao giờ có dữ liệu và rơi về danh sách mock.
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
      // `listing_amenities.amenity` lưu LABEL tiếng Việt — bộ lọc ở AllListingsPage
      // và mapAmenityToKey() đều so theo label. Ghi `key` vào DB làm lọc + icon chết im lặng.
      const amenityLabels = formik.values.amenities.map(amenityKeyToLabel);

      const createdId = await createListing({
        id: listingId,
        title: formik.values.title,
        description: finalDescription,
        propertyType: formik.values.roomType,
        price: parseFloat(cleanVND(formik.values.price)),
        area: parseFloat(formik.values.area),
        address: formik.values.address,
        district: formik.values.district,
        contactPhone: formik.values.phone,
        contactName: user.email || "Chủ nhà",
        boostExpireAt: boostExpire,
        amenities: amenityLabels,
        media: uploadedMedia,
        // Cột thật trong rental_listings — trước đây chỉ nằm trong khối metadata
        // nhồi vào description, nên không lọc/hiển thị theo cột được.
        latitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lat : null,
        longitude: isValidLatLng(formik.values.coords) ? formik.values.coords.lng : null,
        metadata,
      });

      setNewRoomId(createdId || listingId);
      setSuccess(true);
    } catch (err: any) {
      logError("useListingForm.handlePostSubmit", err);
      showToast("Lỗi khi đăng tin: " + (err.message || "Đã xảy ra lỗi không xác định"));
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
  };
}
