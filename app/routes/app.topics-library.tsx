import { useState } from "react";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";

interface Topic {
  id: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  contentAngle: string;
  targetAudience: string;
  trendJustification: string;
  competitiveGap: string;
  category: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop.replace(".myshopify.com", "") || "";

  const topics = await prisma.blogTopicResearch.findMany({
    where: { shop },
    orderBy: { category: "asc" },
  });

  const parsedTopics: Topic[] = topics.map((t) => ({
    id: t.id,
    title: t.title,
    primaryKeyword: t.primaryKeyword,
    secondaryKeywords: JSON.parse(t.secondaryKeywords),
    searchIntent: t.searchIntent,
    contentAngle: t.contentAngle,
    targetAudience: t.targetAudience,
    trendJustification: t.trendJustification,
    competitiveGap: t.competitiveGap,
    category: t.category,
  }));

  return { topics: parsedTopics, shop };
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Product Education": { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  "Comparison & Reviews": { bg: "#fce7f3", border: "#ec4899", text: "#831843" },
  "Problem-Solution": { bg: "#dcfce7", border: "#22c55e", text: "#15803d" },
  "Trend & News": { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  "Lifestyle & Inspiration": { bg: "#f3e8ff", border: "#a855f7", text: "#581c87" },
};

export default function TopicsLibrary() {
  const { topics, shop } = useLoaderData<typeof loader>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [...new Set(topics.map((t) => t.category))];
  const filtered = selectedCategory
    ? topics.filter((t) => t.category === selectedCategory)
    : topics;

  if (topics.length === 0) {
    return (
      <>
        <s-page heading="Content Research Library" />
        <div style={{ padding: "2rem" }}>
          <s-banner tone="info">
            <p><strong>No Topics Yet</strong></p>
            <p>Run the research to generate blog topics for your store.</p>
          </s-banner>
          <div style={{ marginTop: "2rem" }}>
            <Link
              to="/app"
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              ← Back to Generator
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <s-page heading="Content Research Library" />

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.875rem", fontWeight: "700", color: "#1f2937", margin: "0 0 0.5rem 0" }}>
              {filtered.length} Blog Topics
            </h2>
            <p style={{ color: "#6b7280", margin: "0", fontSize: "1rem" }}>
              {selectedCategory ? `${selectedCategory}` : `All ${topics.length} research topics`}
            </p>
          </div>
          <Link
            to="/app"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#4b5563";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#6b7280";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            ← Back to Generator
          </Link>
        </div>

        {/* Category Filter */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: "0.5rem 1rem",
              border: "2px solid",
              borderColor: selectedCategory === null ? "#3b82f6" : "#e5e7eb",
              backgroundColor: selectedCategory === null ? "#eff6ff" : "#fff",
              borderRadius: "6px",
              fontWeight: "600",
              color: selectedCategory === null ? "#3b82f6" : "#6b7280",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            All ({topics.length})
          </button>
          {categories.map((cat) => {
            const count = topics.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "2px solid",
                  borderColor: selectedCategory === cat ? "#3b82f6" : "#e5e7eb",
                  backgroundColor: selectedCategory === cat ? "#eff6ff" : "#fff",
                  borderRadius: "6px",
                  fontWeight: "600",
                  color: selectedCategory === cat ? "#3b82f6" : "#6b7280",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Topics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
          {filtered.map((topic) => {
            const colors = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS["Product Education"];
            const isExpanded = expandedId === topic.id;

            return (
              <div
                key={topic.id}
                style={{
                  border: `2px solid ${colors.border}`,
                  borderRadius: "8px",
                  padding: "1.5rem",
                  backgroundColor: "#fff",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 10px 15px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Category Badge */}
                <div
                  style={{
                    display: "inline-block",
                    padding: "0.375rem 0.75rem",
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                  }}
                >
                  {topic.category}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#1f2937", margin: "0.75rem 0" }}>
                  {topic.title}
                </h3>

                {/* Primary Keyword */}
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0" }}>
                    <strong>Primary Keyword:</strong>
                  </p>
                  <p style={{ fontSize: "1rem", fontWeight: "600", color: "#3b82f6", margin: "0.25rem 0" }}>
                    {topic.primaryKeyword}
                  </p>
                </div>

                {/* Secondary Keywords */}
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0" }}>
                    <strong>Secondary Keywords:</strong>
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    {topic.secondaryKeywords.slice(0, 2).map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          color: "#4b5563",
                        }}
                      >
                        {kw}
                      </span>
                    ))}
                    {topic.secondaryKeywords.length > 2 && (
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "#f3f4f6",
                          borderRadius: "4px",
                          fontSize: "0.8rem",
                          color: "#4b5563",
                        }}
                      >
                        +{topic.secondaryKeywords.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1rem", marginTop: "1rem" }}>
                    <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                      <strong>Search Intent:</strong> {topic.searchIntent}
                    </p>
                    <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                      <strong>Content Angle:</strong> {topic.contentAngle}
                    </p>
                    <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                      <strong>Target Audience:</strong> {topic.targetAudience}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : topic.id)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      backgroundColor: "#f3f4f6",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "#4b5563",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#e5e7eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#f3f4f6";
                    }}
                  >
                    {isExpanded ? "Show Less" : "Show More"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
