import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPostedAgo,
  getListingPostedAt,
  isNewlyPosted,
} from "../../src/marketplace/utils/posted-time.ts";

const now = new Date("2026-10-06T10:00:00+07:00");
const ago = (ms) => new Date(now.getTime() - ms).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("posted time is the first publication, not a later re-approval", () => {
  assert.equal(getListingPostedAt({
    first_published_at: "2026-08-20T00:00:00Z",
    approved_at: "2026-10-05T00:00:00Z",
    created_at: "2026-08-19T00:00:00Z",
  }), "2026-08-20T00:00:00Z");
});

test("posted time falls back to approval, then creation time", () => {
  assert.equal(getListingPostedAt({ approved_at: "2026-10-05T00:00:00Z", created_at: "2026-10-01T00:00:00Z" }), "2026-10-05T00:00:00Z");
  assert.equal(getListingPostedAt({ approved_at: null, created_at: "2026-10-01T00:00:00Z" }), "2026-10-01T00:00:00Z");
  assert.equal(getListingPostedAt({}), null);
});

test("relative labels cover minutes, hours, days and fall back to a date", () => {
  assert.equal(formatPostedAgo(ago(2 * MIN), now), "Vừa đăng");
  assert.equal(formatPostedAgo(ago(25 * MIN), now), "Đăng 25 phút trước");
  assert.equal(formatPostedAgo(ago(3 * HOUR), now), "Đăng 3 giờ trước");
  assert.equal(formatPostedAgo(ago(DAY + HOUR), now), "Đăng 1 ngày trước");
  assert.equal(formatPostedAgo(ago(4 * DAY), now), "Đăng 4 ngày trước");
  assert.equal(formatPostedAgo(ago(30 * DAY), now), "Đăng 30 ngày trước");
  assert.equal(formatPostedAgo("2026-08-01T05:00:00Z", now), "Đăng 01/08/2026");
});

test("clock skew and bad input never produce nonsense labels", () => {
  assert.equal(formatPostedAgo(new Date(now.getTime() + 3 * MIN).toISOString(), now), "Vừa đăng");
  assert.equal(formatPostedAgo(null, now), null);
  assert.equal(formatPostedAgo("not-a-date", now), null);
});

test("'Mới đăng' window is 72 hours from the posted time", () => {
  assert.equal(isNewlyPosted(ago(71 * HOUR), now), true);
  assert.equal(isNewlyPosted(ago(73 * HOUR), now), false);
  assert.equal(isNewlyPosted(null, now), false);
});
