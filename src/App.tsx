import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./shared/query/queryClient";
import { router } from "./routes";
import { AuthProvider } from "./shared/contexts/AuthContext";
import { SubscriptionProvider } from "./shared/contexts/SubscriptionContext";
import { configError } from "./shared/config";
import { MissingEnvScreen } from "./shared/components/MissingEnvScreen";

export default function App() {
  // Chặn TRƯỚC khi render router: thiếu env thì mọi query sẽ fail và người dùng
  // chỉ thấy màn hình trắng. Hiển thị hướng dẫn đọc được thay vì để app chết im.
  if (configError) {
    return <MissingEnvScreen message={configError} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <RouterProvider router={router} />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
