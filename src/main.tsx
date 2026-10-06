
  // Phải đứng đầu: đổi link dạng đường dẫn (payOS returnUrl) sang hash trước khi router nạp.
  import "./shared/path-to-hash-redirect";
  import { createRoot } from "react-dom/client";
  import App from "./App";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  