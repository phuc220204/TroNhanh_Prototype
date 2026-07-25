import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { configError } from "./shared/config";
import { MissingEnvScreen } from "./shared/components/MissingEnvScreen";

export default function App() {
  // Chặn TRƯỚC khi render router: thiếu env thì mọi query sẽ fail và người dùng
  // chỉ thấy màn hình trắng. Hiển thị hướng dẫn đọc được thay vì để app chết im.
  if (configError) {
    return <MissingEnvScreen message={configError} />;
  }

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
