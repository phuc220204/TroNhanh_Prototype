import { supabase } from "../supabaseClient";

/**
 * Seeds mock landlord data (Properties, Rooms, Occupancies, Contracts, Invoices)
 * into Supabase for the current authenticated user.
 */
export async function seedMockDataForUser(user: { id: string }, profile: any) {
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
  const demandPostsToSeed = [
    {
      renter_id: user.id,
      kind: "RoomWanted",
      desired_districts: ["Bình Thạnh", "Gò Vấp"],
      price_min: 2500000,
      price_max: 3500000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoomWanted",
      desired_districts: ["Quận 7", "Nhà Bè"],
      price_min: 4000000,
      price_max: 6000000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoomWanted",
      desired_districts: ["Tân Bình", "Quận 10"],
      price_min: 2000000,
      price_max: 3000000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoomWanted",
      desired_districts: ["Gò Vấp"],
      price_min: 3000000,
      price_max: 4000000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoommateWanted",
      desired_districts: ["Quận 10"],
      price_min: 1800000,
      price_max: 1800000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoommateWanted",
      desired_districts: ["Bình Thạnh"],
      price_min: 2200000,
      price_max: 2200000,
      status: "Active",
    },
    {
      renter_id: user.id,
      kind: "RoommateWanted",
      desired_districts: ["Bình Thạnh"],
      price_min: 2500000,
      price_max: 2500000,
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
          // 7. Seed Invoices for June (Kỳ 2026-06)
          const invoicesToInsert = [
            { room_id: pvt_p102.id, contract_id: contract_pvt_p102.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 3170000, status: "Paid" },
            { room_id: pvt_p202.id, contract_id: contract_pvt_p202.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 3405000, status: "Unpaid" },
            { room_id: pvt_p203.id, contract_id: contract_pvt_p203.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 3230000, status: "Paid" },
            { room_id: pvt_p301.id, contract_id: contract_pvt_p301.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 4070000, status: "Paid" },
            { room_id: q7_a01.id, contract_id: contract_q7_a01.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 5770000, status: "Paid" },
            { room_id: td_p01.id, contract_id: contract_td_p01.id, owner_id: user.id, period: "2026-06", due_date: "2026-06-10", total_amount: 2430000, status: "Paid" }
          ];

          const { data: createdInvoices, error: invoicesError } = await supabase
            .from("invoices")
            .insert(invoicesToInsert)
            .select();

          if (invoicesError) throw invoicesError;

          // 8. Seed Invoice Items
          const invoiceItemsToInsert: any[] = [];
          createdInvoices.forEach((inv: any) => {
            let rent = 0;
            let elec = 0;
            let water = 0;
            let svc = 0;
            
            if (inv.room_id === pvt_p102.id) { rent = 2800000; elec = 180000; water = 90000; svc = 100000; }
            else if (inv.room_id === pvt_p202.id) { rent = 3000000; elec = 210000; water = 95000; svc = 100000; }
            else if (inv.room_id === pvt_p203.id) { rent = 2900000; elec = 150000; water = 80000; svc = 100000; }
            else if (inv.room_id === pvt_p301.id) { rent = 3600000; elec = 240000; water = 110000; svc = 120000; }
            else if (inv.room_id === q7_a01.id) { rent = 5200000; elec = 300000; water = 120000; svc = 150000; }
            else if (inv.room_id === td_p01.id) { rent = 2200000; elec = 120000; water = 60000; svc = 50000; }

            invoiceItemsToInsert.push(
              { invoice_id: inv.id, type: "Rent", description: "Tiền thuê phòng", quantity: 1, unit_price: rent, amount: rent },
              { invoice_id: inv.id, type: "Electricity", description: "Tiền điện", quantity: elec / 3500, unit_price: 3500, amount: elec },
              { invoice_id: inv.id, type: "Water", description: "Tiền nước", quantity: water / 15000, unit_price: 15000, amount: water },
              { invoice_id: inv.id, type: "Service", description: "Phí dịch vụ cố định", quantity: 1, unit_price: svc, amount: svc }
            );
          });

          const { error: itemsError } = await supabase
            .from("invoice_items")
            .insert(invoiceItemsToInsert);

          if (itemsError) throw itemsError;
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
