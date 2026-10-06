import { C, font } from "../theme";

/** Một mục trong trang StyleGuide (chỉ có ở bản dev). */
export function StyleSection({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2
        style={{
          fontFamily: font,
          fontSize: 22,
          fontWeight: 700,
          color: C.primaryDark,
          borderBottom: `2px solid ${C.border}`,
          paddingBottom: 8,
          marginBottom: 24,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
