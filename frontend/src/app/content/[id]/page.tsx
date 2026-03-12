"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ContentItem = {
  id: string;
  title: string;
  text: string;
};

export default function ContentPage() {
  const params = useParams();
  const id = params.id as string;

  const [content, setContent] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    if (!token) {
      setError("Nema tokena.");
      return;
    }

    fetch(`http://localhost:5000/api/content/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Greška pri učitavanju sadržaja.");
        }

        return data;
      })
      .then((data) => {
        setContent(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Došlo je do greške.");
      });
  }, [id]);

  if (error) {
    return <p style={{ padding: 20 }}>{error}</p>;
  }

  if (!content) {
    return <p style={{ padding: 20 }}>Loading...</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>{content.title}</h1>
      <p>{content.text}</p>
      <p>
        <strong>ID:</strong> {content.id}
      </p>
    </div>
  );
}
