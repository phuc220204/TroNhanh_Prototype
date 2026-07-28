import { useQuery } from "@tanstack/react-query";
import { qk } from "../../shared/query/keys";
import {
  searchListings,
  getFeaturedListings,
  getListingById,
  ListingQueryParams,
} from "../services/listing-queries";

function mapSortOption(sort?: string): "newest" | "priceAsc" | "priceDesc" | "areaDesc" {
  if (sort === "price-asc" || sort === "priceAsc") return "priceAsc";
  if (sort === "price-desc" || sort === "priceDesc") return "priceDesc";
  if (sort === "area-desc" || sort === "areaDesc") return "areaDesc";
  return "newest";
}

export function useListingSearch(params: ListingQueryParams) {
  return useQuery({
    queryKey: qk.listings.search({
      keyword: params.keyword,
      districts: params.districts,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
      areaMin: params.areaMin,
      areaMax: params.areaMax,
      propertyTypes: params.propertyTypes,
      amenities: params.amenities,
      sort: mapSortOption(params.sort),
      page: params.page,
      pageSize: params.pageSize,
    }),
    queryFn: () => searchListings(params),
    staleTime: 30_000,
  });
}

export function useFeaturedListings(limit = 6) {
  return useQuery({
    queryKey: qk.listings.featured(limit),
    queryFn: () => getFeaturedListings(limit),
    staleTime: 60_000,
  });
}

export function useListingDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.listings.detail(id || ""),
    queryFn: () => getListingById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
