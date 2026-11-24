import test from "node:test";
import assert from "node:assert/strict";
import { numberToVietnameseWords as w, vndToWords } from "../../src/shared/utils/number-to-words.ts";

test("số tiền thuê/cọc thường gặp", () => {
  assert.equal(vndToWords(3_800_000), "Ba triệu tám trăm nghìn đồng");
  assert.equal(vndToWords(3_500_000), "Ba triệu năm trăm nghìn đồng");
  assert.equal(vndToWords(2_800_000), "Hai triệu tám trăm nghìn đồng");
  assert.equal(vndToWords(120_000), "Một trăm hai mươi nghìn đồng");
});

test("quy tắc linh / mười / mốt / lăm / tư", () => {
  assert.equal(w(0), "không");
  assert.equal(w(5), "năm");
  assert.equal(w(10), "mười");
  assert.equal(w(15), "mười lăm");
  assert.equal(w(21), "hai mươi mốt");
  assert.equal(w(24), "hai mươi tư");
  assert.equal(w(25), "hai mươi lăm");
  assert.equal(w(105), "một trăm linh năm");
  assert.equal(w(110), "một trăm mười");
  assert.equal(w(1_000), "một nghìn");
});

test("nhóm giữa bằng 0 và nhóm sau đọc đủ 'không trăm'", () => {
  assert.equal(w(1_005_000), "một triệu không trăm linh năm nghìn");
  assert.equal(w(1_000_000), "một triệu");
  assert.equal(w(2_000_500), "hai triệu năm trăm");
  assert.equal(w(2_000_050), "hai triệu không trăm năm mươi");
  assert.equal(w(3_926_666), "ba triệu chín trăm hai mươi sáu nghìn sáu trăm sáu mươi sáu");
  assert.equal(w(1_000_000_000), "một tỷ");
});
