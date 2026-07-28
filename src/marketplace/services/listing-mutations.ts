import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface CreateListingInput {
  sellerId: string;
  title: string;
  description: string;
  propertyType: string;
  price: number;
  area: number;
  address: string;
  district: string;
  contactPhone: string;
  contactName: string;
  boostExpireAt?: string | null;
  amenities?: string[];
}

/**
 * Create a new rental listing and insert associated amenities into DB.
 */
export async function createListing(input: CreateListingInput): Promise<{ id: string } | null> {
  try {
    const { data: listingData, error: listingError } = await supabase
      .from("rental_listings")
      .insert({
        seller_id: input.sellerId,
        title: input.title,
        description: input.description,
        property_type: input.propertyType,
        price: input.price,
        area: input.area,
        address: input.address,
        district: input.district,
        contact_phone: input.contactPhone,
        contact_name: input.contactName,
        status: "Active",
        boost_expire_at: input.boostExpireAt || null,
      })
      .select("id")
      .single();

    if (listingError) throw listingError;

    if (listingData && input.amenities && input.amenities.length > 0) {
      const ams = input.amenities.map((amenityLabel) => ({
        listing_id: listingData.id,
        amenity: amenityLabel,
      }));
      const { error: amError } = await supabase.from("listing_amenities").insert(ams);
      if (amError) logError("listing-mutations.insertAmenities", amError);
    }

    // Update profile is_seller flag
    if (input.sellerId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_seller: true })
        .eq("user_id", input.sellerId);
      if (profileError) logError("listing-mutations.updateProfileSeller", profileError);
    }

    return listingData;
  } catch (err) {
    logError("listing-mutations.createListing", err);
    throw err;
  }
}
