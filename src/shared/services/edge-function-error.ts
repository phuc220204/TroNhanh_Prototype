/**
 * Edge Function payOS trả lỗi dạng `{ error: CODE }`. `supabase.functions.invoke`
 * bọc nó trong `FunctionsHttpError` — rút CODE ra để `toUserMessage` map tiếng Việt.
 */
export async function toFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: { clone?: () => { json: () => Promise<unknown> } } } | null)?.context;
  try {
    if (context?.clone) {
      const payload = await context.clone().json();
      const code = (payload as { error?: unknown } | null)?.error;
      if (typeof code === "string") return new Error(code);
    }
  } catch {
    // dùng lỗi gốc bên dưới
  }
  return error instanceof Error ? error : new Error("PAYMENT_UNAVAILABLE");
}
