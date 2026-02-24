export default function ContentPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: 16 }}>
      <h1>Content: {params.id}</h1>
      <p>Dinamička ruta /content/[id] (zaštićena).</p>
    </div>
  );
}
