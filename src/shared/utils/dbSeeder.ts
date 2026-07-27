import { supabase } from "../supabaseClient";

/**
 * Seeds mock landlord data (Properties, Rooms, Occupancies, Contracts, Invoices)
 * into Supabase for the current authenticated user.
 */
export async function seedMockDataForUser(user: { id: string }, profile: any) {
  // ── Chống chạy trùng ────────────────────────────────────────────────────
  // Seeder KHÔNG idempotent: bấm lần 2 sẽ nhân đôi toàn bộ dữ liệu. Và nếu một
  // bước giữa chừng fail, các bước trước đã kịp ghi — nên lần bấm sau phải bị
  // chặn thay vì chồng thêm.
  const { count: existingListings } = await supabase
    .from("rental_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .is("deleted_at", null);

  const { count: existingProperties } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if ((existingListings ?? 0) > 0 || (existingProperties ?? 0) > 0) {
    throw new Error(
      "Tài khoản này đã có dữ liệu. Xóa dữ liệu cũ trước khi khởi tạo lại " +
      "(xem docs/cp4/06_QA_CHECKLIST.md — mục dọn dữ liệu demo).",
    );
  }

  // 1. Seed Listings
  const listingsToSeed = [
    {
      seller_id: user.id,
      title: "Studio Full Nội Thất gần ĐH RMIT",
      property_type: "Căn hộ dịch vụ",
      price: 5500000,
      district: "Quận 7",
      area: 30,
      status: "Active",
      boost_expire_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      contact_phone: profile?.contact_phone || "0901234567",
      contact_name: profile?.full_name || "Nguyễn Minh Anh",
      address: "123 Đường số 7, Tân Phong, Quận 7",
      description: "Phòng trọ đầy đủ nội thất cao cấp ngay sát đại học RMIT. Thích hợp cho sinh viên tiện đi học.",
    },
    {
      seller_id: user.id,
      title: "Duplex Ban Công View Đẹp, Full Nội Thất",
      property_type: "Căn hộ mini",
      price: 7200000,
      district: "Bình Thạnh",
      area: 45,
      status: "Active",
      boost_expire_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      contact_phone: profile?.contact_phone || "0901234567",
      contact_name: profile?.full_name || "Lê Thảo Nhi",
      address: "456 Điện Biên Phủ, Phường 25, Bình Thạnh",
      description: "Phòng thiết kế duplex thông tầng cực đẹp, thoáng mát, có ban công rộng rãi view Landmark 81.",
    },
    {
      seller_id: user.id,
      title: "Căn Hộ Mini Full Nội Thất Thủ Đức",
      property_type: "Căn hộ mini",
      price: 4800000,
      district: "Thủ Đức",
      area: 28,
      status: "Active",
      contact_phone: profile?.contact_phone || "0901234567",
      contact_name: profile?.full_name || "Trần Quốc Bảo",
      address: "789 Võ Văn Ngân, Linh Chiểu, Thủ Đức",
      description: "Căn hộ mini đầy đủ tiện ích cơ bản, nằm trong khu dân cư an ninh, yên tĩnh tại Thủ Đức.",
    },
    {
      seller_id: user.id,
      title: "Phòng Master Rộng, Có Ban Công Riêng",
      property_type: "Phòng trọ",
      price: 8000000,
      district: "Gò Vấp",
      area: 38,
      status: "Active",
      boost_expire_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      contact_phone: profile?.contact_phone || "0901234567",
      contact_name: profile?.full_name || "Phạm Gia Huy",
      address: "101 Quang Trung, Phường 10, Gò Vấp",
      description: "Phòng ngủ lớn master có nhà vệ sinh riêng bên trong, ban công đón gió mát rượi, giờ giấc tự do.",
    }
  ];

  const { data: createdListings, error: listingsError } = await supabase
    .from("rental_listings")
    .insert(listingsToSeed)
    .select();

  if (listingsError) throw listingsError;

  if (createdListings) {
    const amenitiesToSeed: any[] = [];
    const amenitiesMap: Record<number, string[]> = {
      0: ["Wifi", "Máy lạnh", "Chỗ để xe"],
      1: ["Wifi", "Máy lạnh", "WC riêng"],
      2: ["Wifi", "Máy lạnh", "Chỗ để xe"],
      3: ["Wifi", "Máy lạnh", "WC riêng"],
    };

    createdListings.forEach((listing: any, index: number) => {
      const chosen = amenitiesMap[index] || ["Wifi", "Máy lạnh"];
      chosen.forEach(amenity => {
        amenitiesToSeed.push({
          listing_id: listing.id,
          amenity
        });
      });
    });

    const { error: amenitiesError } = await supabase
      .from("listing_amenities")
      .insert(amenitiesToSeed);

    if (amenitiesError) throw amenitiesError;
  }

  // 2. Seed Demand Posts
  //
  // ⚠️ MỌI OBJECT PHẢI CÓ ĐỦ CÙNG BỘ KEY — kể cả khi giá trị là mảng rỗng.
  // Khi bulk insert, PostgREST lấy HỢP của tất cả key trong mảng và điền NULL
  // cho object thiếu key, thay vì bỏ qua để DEFAULT của cột áp dụng. Nên một
  // object RoommateWanted không khai `desired_amenities` sẽ ghi NULL vào cột
  // `text[] not null default '{}'` → lỗi not-null.
  // (Insert từng dòng một thì không dính, vì key vắng mặt mới dùng DEFAULT.)
  const emptyDemandFields = {
    description: null as string | null,
    contact_name: null as string | null,
    contact_phone: null as string | null,
    property_type: null as string | null,
    min_area: null as number | null,
    desired_amenities: [] as string[],
    move_in_date: null as string | null,
    occupant_count: null as number | null,
    current_address: null as string | null,
    district: null as string | null,
    share_price: null as number | null,
    needed_count: null as number | null,
    gender_requirement: null as string | null,
    requirements: [] as string[],
  };

  const demandPostsToSeed = [
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoomWanted",
      title: "Tìm phòng trọ khu Bình Thạnh / Gò Vấp, ưu tiên gần trường",
      desired_districts: ["Bình Thạnh", "Gò Vấp"],
      price_min: 2500000,
      price_max: 3500000,
      property_type: "Phòng trọ",
      min_area: 18,
      desired_amenities: ["Wifi", "WC riêng"],
      occupant_count: 1,
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoomWanted",
      title: "Cần thuê căn hộ mini Quận 7, có chỗ để xe",
      desired_districts: ["Quận 7", "Nhà Bè"],
      price_min: 4000000,
      price_max: 6000000,
      property_type: "Căn hộ mini",
      min_area: 25,
      desired_amenities: ["Máy lạnh", "Chỗ để xe", "WC riêng"],
      occupant_count: 2,
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoomWanted",
      title: "Tìm phòng trọ Tân Bình / Quận 10 cho sinh viên",
      desired_districts: ["Tân Bình", "Quận 10"],
      price_min: 2000000,
      price_max: 3000000,
      property_type: "Phòng trọ",
      min_area: 18,
      desired_amenities: ["Wifi", "Giờ giấc tự do"],
      occupant_count: 1,
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoomWanted",
      title: "Tìm phòng Gò Vấp, cần gác lửng",
      desired_districts: ["Gò Vấp"],
      price_min: 3000000,
      price_max: 4000000,
      property_type: "Phòng trọ",
      min_area: 20,
      desired_amenities: ["Gác lửng", "Wifi"],
      occupant_count: 1,
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoommateWanted",
      title: "Tìm 1 bạn nữ ở ghép Quận 10, phòng đã có sẵn",
      desired_districts: ["Quận 10"],
      price_min: 1800000,
      price_max: 1800000,
      district: "Quận 10",
      share_price: 1800000,
      needed_count: 1,
      gender_requirement: "Female",
      requirements: ["Sạch sẽ", "Không hút thuốc"],
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoommateWanted",
      title: "Cần 2 bạn ở ghép Bình Thạnh, gần Hàng Xanh",
      desired_districts: ["Bình Thạnh"],
      price_min: 2200000,
      price_max: 2200000,
      district: "Bình Thạnh",
      share_price: 2200000,
      needed_count: 2,
      gender_requirement: "Any",
      requirements: ["Đi làm giờ hành chính"],
      status: "Active",
    },
    {
      ...emptyDemandFields,
      renter_id: user.id,
      kind: "RoommateWanted",
      title: "Tìm bạn ở ghép Bình Thạnh, phòng rộng có ban công",
      desired_districts: ["Bình Thạnh"],
      price_min: 2500000,
      price_max: 2500000,
      district: "Bình Thạnh",
      share_price: 2500000,
      needed_count: 1,
      gender_requirement: "Male",
      requirements: ["Gọn gàng", "Không nuôi thú cưng"],
      status: "Active",
    }
  ];

  const { error: demandError } = await supabase
    .from("demand_posts")
    .insert(demandPostsToSeed);

  if (demandError) throw demandError;

  // 3. Seed Properties
  const propsToInsert = [
    {
      owner_id: user.id,
      name: "Khu trọ Phan Văn Trị",
      address: "123 Phan Văn Trị, Bình Thạnh, TP.HCM",
      district: "Bình Thạnh",
      floor_count: 3,
      electricity_unit_price: 3500,
      water_unit_price: 15000,
      service_fee: 100000,
      bank_name: "MB",
      bank_account_number: "0961234567",
      bank_account_name: "NGUYEN MINH ANH"
    },
    {
      owner_id: user.id,
      name: "Căn hộ Quận 7",
      address: "45 Nguyễn Thị Thập, Quận 7, TP.HCM",
      district: "Quận 7",
      floor_count: 2,
      electricity_unit_price: 4000,
      water_unit_price: 18000,
      service_fee: 150000,
      bank_name: "VCB",
      bank_account_number: "007123456789",
      bank_account_name: "LE THAO NHI"
    },
    {
      owner_id: user.id,
      name: "Nhà trọ Thủ Đức",
      address: "78 Võ Văn Ngân, Thủ Đức, TP.HCM",
      district: "Thủ Đức",
      floor_count: 1,
      electricity_unit_price: 3000,
      water_unit_price: 12000,
      service_fee: 50000,
      bank_name: "TCB",
      bank_account_number: "190123456789",
      bank_account_name: "TRAN QUOC BAO"
    }
  ];

  const { data: createdProps, error: propsError } = await supabase
    .from("properties")
    .insert(propsToInsert)
    .select();

  if (propsError) throw propsError;

  const pvtProp = createdProps?.find(p => p.name === "Khu trọ Phan Văn Trị");
  const q7Prop = createdProps?.find(p => p.name === "Căn hộ Quận 7");
  const tdProp = createdProps?.find(p => p.name === "Nhà trọ Thủ Đức");

  if (pvtProp && q7Prop && tdProp) {
    // 4. Seed Rooms
    const roomsToInsert = [
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P101", floor: 1, area: 25, price: 3200000, status: "Available" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P102", floor: 1, area: 28, price: 2800000, status: "Rented" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P201", floor: 2, area: 30, price: 3500000, status: "Hidden" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P202", floor: 2, area: 26, price: 3000000, status: "Rented" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P203", floor: 2, area: 24, price: 2900000, status: "Rented" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P301", floor: 3, area: 32, price: 3600000, status: "Rented" },
      { property_id: pvtProp.id, owner_id: user.id, room_code: "P302", floor: 3, area: 22, price: 2600000, status: "Available" },
      
      { property_id: q7Prop.id, owner_id: user.id, room_code: "A01", floor: 1, area: 35, price: 5200000, status: "Rented" },
      { property_id: q7Prop.id, owner_id: user.id, room_code: "A02", floor: 1, area: 33, price: 5000000, status: "Available" },
      { property_id: q7Prop.id, owner_id: user.id, room_code: "B01", floor: 2, area: 30, price: 4800000, status: "Available" },

      { property_id: tdProp.id, owner_id: user.id, room_code: "P01", floor: 1, area: 18, price: 2200000, status: "Rented" },
      { property_id: tdProp.id, owner_id: user.id, room_code: "P02", floor: 1, area: 18, price: 2200000, status: "Available" }
    ];

    const { data: createdRooms, error: roomsError } = await supabase
      .from("rooms")
      .insert(roomsToInsert)
      .select();

    if (roomsError) throw roomsError;

    const pvt_p102 = createdRooms?.find(r => r.room_code === "P102" && r.property_id === pvtProp.id);
    const pvt_p202 = createdRooms?.find(r => r.room_code === "P202" && r.property_id === pvtProp.id);
    const pvt_p203 = createdRooms?.find(r => r.room_code === "P203" && r.property_id === pvtProp.id);
    const pvt_p301 = createdRooms?.find(r => r.room_code === "P301" && r.property_id === pvtProp.id);
    const q7_a01 = createdRooms?.find(r => r.room_code === "A01" && r.property_id === q7Prop.id);
    const td_p01 = createdRooms?.find(r => r.room_code === "P01" && r.property_id === tdProp.id);

    if (pvt_p102 && pvt_p202 && pvt_p203 && pvt_p301 && q7_a01 && td_p01) {
      // 5. Seed Occupancies
      const occupanciesToInsert = [
        { room_id: pvt_p102.id, owner_id: user.id, full_name: "Nguyễn Văn An", phone_number: "0901 234 567", start_date: "2026-02-01", occupant_count: 2, is_active: true },
        { room_id: pvt_p202.id, owner_id: user.id, full_name: "Trần Minh Khoa", phone_number: "0938 765 432", start_date: "2025-06-15", occupant_count: 1, is_active: true },
        { room_id: pvt_p203.id, owner_id: user.id, full_name: "Lê Thị Hương", phone_number: "0977 111 222", start_date: "2025-06-20", occupant_count: 2, is_active: true },
        { room_id: pvt_p301.id, owner_id: user.id, full_name: "Phạm Quốc Bảo", phone_number: "0912 333 444", start_date: "2026-03-10", occupant_count: 3, is_active: true },
        { room_id: q7_a01.id, owner_id: user.id, full_name: "Đỗ Thu Trang", phone_number: "0966 888 999", start_date: "2026-01-01", occupant_count: 1, is_active: true },
        { room_id: td_p01.id, owner_id: user.id, full_name: "Vũ Đức Thành", phone_number: "0944 222 111", start_date: "2025-09-05", occupant_count: 2, is_active: true }
      ];

      const { data: createdOccs, error: occsError } = await supabase
        .from("occupancies")
        .insert(occupanciesToInsert)
        .select();

      if (occsError) throw occsError;

      const occ_pvt_p102 = createdOccs?.find(o => o.room_id === pvt_p102.id);
      const occ_pvt_p202 = createdOccs?.find(o => o.room_id === pvt_p202.id);
      const occ_pvt_p203 = createdOccs?.find(o => o.room_id === pvt_p203.id);
      const occ_pvt_p301 = createdOccs?.find(o => o.room_id === pvt_p301.id);
      const occ_q7_a01 = createdOccs?.find(o => o.room_id === q7_a01.id);
      const occ_td_p01 = createdOccs?.find(o => o.room_id === td_p01.id);

      if (occ_pvt_p102 && occ_pvt_p202 && occ_pvt_p203 && occ_pvt_p301 && occ_q7_a01 && occ_td_p01) {
        // 6. Seed Contracts
        const contractsToInsert = [
          { room_id: pvt_p102.id, occupancy_id: occ_pvt_p102.id, owner_id: user.id, start_date: "2026-02-01", end_date: "2026-10-01", rent_price: 2800000, deposit: 2800000, status: "Active" },
          { room_id: pvt_p202.id, occupancy_id: occ_pvt_p202.id, owner_id: user.id, start_date: "2025-06-15", end_date: "2026-07-15", rent_price: 3000000, deposit: 3000000, status: "Active" },
          { room_id: pvt_p203.id, occupancy_id: occ_pvt_p203.id, owner_id: user.id, start_date: "2025-06-20", end_date: "2026-06-20", rent_price: 2900000, deposit: 2900000, status: "Active" },
          { room_id: pvt_p301.id, occupancy_id: occ_pvt_p301.id, owner_id: user.id, start_date: "2026-03-10", end_date: "2027-03-10", rent_price: 3600000, deposit: 3600000, status: "Active" },
          { room_id: q7_a01.id, occupancy_id: occ_q7_a01.id, owner_id: user.id, start_date: "2026-01-01", end_date: "2027-01-01", rent_price: 5200000, deposit: 5200000, status: "Active" },
          { room_id: td_p01.id, occupancy_id: occ_td_p01.id, owner_id: user.id, start_date: "2025-09-05", end_date: "2026-09-05", rent_price: 2200000, deposit: 2200000, status: "Active" }
        ];

        const { data: createdContracts, error: contractsError } = await supabase
          .from("contracts")
          .insert(contractsToInsert)
          .select();

        if (contractsError) throw contractsError;

        const contract_pvt_p102 = createdContracts?.find(c => c.room_id === pvt_p102.id);
        const contract_pvt_p202 = createdContracts?.find(c => c.room_id === pvt_p202.id);
        const contract_pvt_p203 = createdContracts?.find(c => c.room_id === pvt_p203.id);
        const contract_pvt_p301 = createdContracts?.find(c => c.room_id === pvt_p301.id);
        const contract_q7_a01 = createdContracts?.find(c => c.room_id === q7_a01.id);
        const contract_td_p01 = createdContracts?.find(c => c.room_id === td_p01.id);

        if (contract_pvt_p102 && contract_pvt_p202 && contract_pvt_p203 && contract_pvt_p301 && contract_q7_a01 && contract_td_p01) {
          // ── 7. Seed 3 KỲ điện nước + hóa đơn + thanh toán ──────────────────
          //
          // Trước đây chỉ seed ĐÚNG MỘT kỳ hóa đơn và KHÔNG seed utility_readings
          // nào — nên drawer "Chi tiết phòng" không có gì để hiển thị ở tab lịch
          // sử, và chủ trọ không thấy được xu hướng tiêu thụ giữa các tháng.
          //
          // Sinh 3 kỳ gần nhất tính từ hôm nay để dữ liệu luôn còn thời sự.
          const ELECTRIC_UNIT = 3500;
          const WATER_UNIT = 15000;

          /** 3 kỳ gần nhất dạng YYYY-MM, cũ → mới. */
          const periods: string[] = [];
          for (let back = 2; back >= 0; back--) {
            const d = new Date();
            d.setDate(1);
            d.setMonth(d.getMonth() - back);
            periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
          }

          // rent · chỉ số điện đầu · tiêu thụ điện/kỳ · chỉ số nước đầu · tiêu thụ nước/kỳ · phí dịch vụ
          const billingPlan = [
            { room: pvt_p102, contract: contract_pvt_p102, rent: 2800000, elecStart: 1180, elecUse: 52, waterStart: 240, waterUse: 6, svc: 100000 },
            { room: pvt_p202, contract: contract_pvt_p202, rent: 3000000, elecStart: 940,  elecUse: 60, waterStart: 180, waterUse: 6, svc: 100000 },
            { room: pvt_p203, contract: contract_pvt_p203, rent: 2900000, elecStart: 1520, elecUse: 43, waterStart: 310, waterUse: 5, svc: 100000 },
            { room: pvt_p301, contract: contract_pvt_p301, rent: 3600000, elecStart: 2010, elecUse: 69, waterStart: 420, waterUse: 7, svc: 120000 },
            { room: q7_a01,   contract: contract_q7_a01,   rent: 5200000, elecStart: 3300, elecUse: 86, waterStart: 610, waterUse: 8, svc: 150000 },
            { room: td_p01,   contract: contract_td_p01,   rent: 2200000, elecStart: 760,  elecUse: 34, waterStart: 150, waterUse: 4, svc: 50000 },
          ];

          const readingsToInsert: any[] = [];
          const invoicesToInsert: any[] = [];

          billingPlan.forEach(plan => {
            periods.forEach((period, index) => {
              // Tiêu thụ dao động nhẹ giữa các kỳ để biểu đồ so sánh có ý nghĩa
              const drift = [0, 1.12, 0.93][index] ?? 1;
              const elecUse = Math.round(plan.elecUse * (index === 0 ? 1 : drift));
              const waterUse = Math.round(plan.waterUse * (index === 0 ? 1 : drift));

              const elecPrev = plan.elecStart + plan.elecUse * index;
              const waterPrev = plan.waterStart + plan.waterUse * index;

              readingsToInsert.push(
                { room_id: plan.room.id, owner_id: user.id, type: "Electricity", period,
                  previous_reading: elecPrev, current_reading: elecPrev + elecUse, unit_price: ELECTRIC_UNIT },
                { room_id: plan.room.id, owner_id: user.id, type: "Water", period,
                  previous_reading: waterPrev, current_reading: waterPrev + waterUse, unit_price: WATER_UNIT },
              );

              const elecAmount = elecUse * ELECTRIC_UNIT;
              const waterAmount = waterUse * WATER_UNIT;
              const total = plan.rent + elecAmount + waterAmount + plan.svc;

              // Kỳ cũ đã thu xong; riêng phòng P202 để nợ kỳ mới nhất → có công nợ để demo
              const isLatest = index === periods.length - 1;
              const leaveUnpaid = isLatest && plan.room.id === pvt_p202.id;

              invoicesToInsert.push({
                room_id: plan.room.id,
                contract_id: plan.contract.id,
                owner_id: user.id,
                period,
                due_date: `${period}-10`,
                total_amount: total,
                status: leaveUnpaid ? "Unpaid" : "Paid",
                _rent: plan.rent, _elec: elecAmount, _water: waterAmount, _svc: plan.svc,
                _elecUse: elecUse, _waterUse: waterUse, _paid: !leaveUnpaid,
              });
            });
          });

          const { error: readingsError } = await supabase
            .from("utility_readings")
            .insert(readingsToInsert);
          if (readingsError) throw readingsError;

          // Tách field nội bộ (_*) ra trước khi ghi — chúng chỉ để dựng items/payments
          const { data: createdInvoices, error: invoicesError } = await supabase
            .from("invoices")
            .insert(invoicesToInsert.map(({ _rent, _elec, _water, _svc, _elecUse, _waterUse, _paid, ...row }) => row))
            .select();

          if (invoicesError) throw invoicesError;

          // ── 8. Invoice items + payments ────────────────────────────────────
          const invoiceItemsToInsert: any[] = [];
          const paymentsToInsert: any[] = [];

          createdInvoices.forEach((inv: any) => {
            const plan = invoicesToInsert.find(
              i => i.room_id === inv.room_id && i.period === inv.period,
            );
            if (!plan) return;

            invoiceItemsToInsert.push(
              { invoice_id: inv.id, type: "Rent", description: "Tiền thuê phòng", quantity: 1, unit_price: plan._rent, amount: plan._rent },
              { invoice_id: inv.id, type: "Electricity", description: `Tiền điện (${plan._elecUse} kWh)`, quantity: plan._elecUse, unit_price: ELECTRIC_UNIT, amount: plan._elec },
              { invoice_id: inv.id, type: "Water", description: `Tiền nước (${plan._waterUse} m³)`, quantity: plan._waterUse, unit_price: WATER_UNIT, amount: plan._water },
              { invoice_id: inv.id, type: "Service", description: "Phí dịch vụ cố định", quantity: 1, unit_price: plan._svc, amount: plan._svc },
            );

            if (plan._paid) {
              paymentsToInsert.push({
                invoice_id: inv.id, owner_id: user.id, amount: inv.total_amount,
                method: "BankTransfer", paid_at: `${inv.period}-08T09:00:00Z`, purpose: "RentInvoice",
              });
            }
          });

          const { error: itemsError } = await supabase
            .from("invoice_items")
            .insert(invoiceItemsToInsert);
          if (itemsError) throw itemsError;

          const { error: paymentsError } = await supabase
            .from("payments")
            .insert(paymentsToInsert);
          if (paymentsError) throw paymentsError;
        }
      }
    }
  }

  // Update profile.is_seller to true if not already
  if (profile && !profile.is_seller) {
    await supabase
      .from("profiles")
      .update({ is_seller: true })
      .eq("user_id", user.id);
  }
}
