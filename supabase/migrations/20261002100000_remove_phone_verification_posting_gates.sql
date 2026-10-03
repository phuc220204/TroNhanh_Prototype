-- Phone ownership is not a prerequisite for posting or using landlord SaaS in
-- the review release. Keep the legacy OTP tables/RPCs for safe rollback, but
-- remove the database triggers that blocked these workflows.
drop trigger if exists rental_listings_require_verified_phone on public.rental_listings;
drop trigger if exists demand_posts_require_verified_phone on public.demand_posts;

drop function if exists public.require_verified_phone_for_posting();
drop function if exists public.current_user_has_verified_phone();

comment on column public.profiles.contact_phone_verified_at is
  'Legacy OTP metadata retained for compatibility; not used as a requirement or proof of ownership in the review release.';
