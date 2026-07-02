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
    <section id={id} className="mb-12">
      <h2
        style={{
          fontFamily: "'Be Vietnam Pro', Inter, system-ui, sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#5C4632",
          borderBottom: "2px solid #DDD0BC",
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
