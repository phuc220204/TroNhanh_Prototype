/**
 * Trang “Tất cả phòng” dùng chung một nguồn hiển thị với trang tìm kiếm.
 *
 * Trước đây hai trang sao chép gần như toàn bộ bộ lọc, card và nút “Bản đồ”,
 * nên một bản được sửa còn bản kia vẫn giữ placeholder/overflow cũ. URL
 * `/tat-ca-phong` không có query vẫn thể hiện đúng toàn bộ tin đang hoạt động;
 * nếu có query, SearchResultsPage cũng khởi tạo bộ lọc từ URL như `/tim-phong`.
 */
export { SearchResultsPage as AllListingsPage } from "./SearchResultsPage";
