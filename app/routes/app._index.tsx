import { useState, useRef, useEffect } from "react";
import { useFetcher, useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { TYPOGRAPHY_STYLES, buttonHoverEffect, cardHoverEffect } from "../utils/typography";

interface Suggestion {
  id: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
}

interface LoaderData {
  shop: string;
  suggestions: Suggestion[];
  hasTopics: boolean;
  lastUpdated: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop.replace(".myshopify.com", "") || "";
  
  try {
    // Get all topics for this shop
    const allTopics = await prisma.blogTopicResearch.findMany({
      where: { shop },
      orderBy: { createdAt: "desc" },
    });

    // If no topics exist, return empty
    if (allTopics.length === 0) {
      return {
        shop,
        suggestions: [],
        hasTopics: false,
        lastUpdated: null,
      } as LoaderData;
    }

    // Pick top 3 suggestions for today
    // Strategy: Rotate based on date to show different topics daily
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000
    );
    const rotationIndex = dayOfYear % allTopics.length;
    
    // Get 4 suggestions starting from rotation index
    const suggestions: Suggestion[] = [];
    for (let i = 0; i < Math.min(4, allTopics.length); i++) {
      const topic = allTopics[(rotationIndex + i) % allTopics.length];
      suggestions.push({
        id: topic.id,
        title: topic.title,
        primaryKeyword: topic.primaryKeyword,
        secondaryKeywords: JSON.parse(topic.secondaryKeywords),
        category: topic.category,
      });
    }

    return {
      shop,
      suggestions,
      hasTopics: true,
      lastUpdated: allTopics[0]?.updatedAt?.toISOString() || null,
    } as LoaderData;
  } catch (error) {
    console.error("Failed to load suggestions:", error);
    return {
      shop,
      suggestions: [],
      hasTopics: false,
      lastUpdated: null,
    } as LoaderData;
  }
};

type ActionData = {
  success?: boolean;
  error?: string;
  articleId?: string;
  shop?: string;
};

export default function Index() {
  const loaderData = useLoaderData<LoaderData>();
  const { shop, suggestions, hasTopics } = loaderData;
  const [keyword, setKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [searchIntent, setSearchIntent] = useState("informational");
  const [targetCountry, setTargetCountry] = useState("IN");
  const [audienceLevel, setAudienceLevel] = useState("intermediate");
  const [tone, setTone] = useState("authoritative");
  const [wordCount, setWordCount] = useState("1500");
  const [researchLoading, setResearchLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  const searchIntentRef = useRef<HTMLSelectElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const toneRef = useRef<HTMLSelectElement>(null);

  const fetcher = useFetcher<ActionData>();
  const isLoading = fetcher.state === "submitting";

  // Check for selected topic from topics library
  useEffect(() => {
    const selectedTopic = sessionStorage.getItem("selectedTopic");
    if (selectedTopic) {
      try {
        const { keyword: topicKeyword, secondaryKeywords: topicSecondaryKeywords } = JSON.parse(selectedTopic);
        setKeyword(topicKeyword);
        setSecondaryKeywords(topicSecondaryKeywords);
        // Clear the stored data after using it
        sessionStorage.removeItem("selectedTopic");
      } catch (e) {
        console.error("Error parsing selected topic:", e);
      }
    }
  }, []);

  // Sync refs to state
  useEffect(() => {
    if (searchIntentRef.current) searchIntentRef.current.value = searchIntent;
    if (countryRef.current) countryRef.current.value = targetCountry;
    if (levelRef.current) levelRef.current.value = audienceLevel;
    if (toneRef.current) toneRef.current.value = tone;
  }, [searchIntent, targetCountry, audienceLevel, tone]);

  // Hide spinner when generation completes
  useEffect(() => {
    if (fetcher.data?.success || fetcher.data?.error) {
      setShowSpinner(false);
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Show spinner
    setShowSpinner(true);
    
    const formData = new FormData();
    formData.append("keyword", keyword);
    formData.append("secondaryKeywords", secondaryKeywords);
    formData.append("searchIntent", searchIntent);
    formData.append("targetCountry", targetCountry);
    formData.append("audienceLevel", audienceLevel);
    formData.append("tone", tone);
    formData.append("wordCount", wordCount);

    fetcher.submit(formData, { method: "post", action: "/app/generate-blog" });
  };

  const handleRunResearch = async () => {
    setResearchLoading(true);
    try {
      const response = await fetch("/app/research-topics", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Research error:", error);
    } finally {
      setResearchLoading(false);
    }
  };

  const useSuggestion = (suggestion: Suggestion) => {
    setKeyword(suggestion.primaryKeyword);
    setSecondaryKeywords(suggestion.secondaryKeywords.join(", "));
  };

  return (
    <s-page heading="Supervek Blog Generator">
      {/* Spinner Overlay */}
      {showSpinner && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                border: "4px solid rgba(255, 255, 255, 0.3)",
                borderTop: "4px solid #fff",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <p style={{ color: "#fff", fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
              ✨ Generating Your Blog Post...
            </p>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {fetcher.data?.error && (
        <s-banner title="⚠️ Generation Error" tone="critical">
          <s-paragraph>{fetcher.data.error}</s-paragraph>
          <s-paragraph style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#666" }}>
            💡 <strong>Troubleshooting tip:</strong> Try with a different keyword or simpler search term. If the issue persists, wait a moment and try again.
          </s-paragraph>
        </s-banner>
      )}

      {fetcher.data?.success && (
        <s-banner title="✅ Blog Generated Successfully!" tone="success">
          <s-paragraph>
            Your blog post has been created as a draft.{" "}
            <s-link
              href={`https://admin.shopify.com/store/${shop}/articles/${fetcher.data.articleId}`}
              target="_blank"
            >
              View in Shopify Admin
            </s-link>
          </s-paragraph>
        </s-banner>
      )}

      {/* AI Suggestions Section */}
      {!hasTopics ? (
        <s-section>
          <div style={{ padding: "2rem", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "2px solid #0ea5e9", marginBottom: "2rem" }}>
            <h3 style={{ ...TYPOGRAPHY_STYLES.headingSubsection, color: "#0c4a6e", marginBottom: "0.75rem" }}>
              🚀 Generate Research Topics
            </h3>
            <p style={{ ...TYPOGRAPHY_STYLES.body, color: "#0c4a6e", marginBottom: "1rem" }}>
              Run AI research to discover 20-30 blog topics tailored to your niche. This will analyze trends, competitors, and customer needs.
            </p>
            <button
              onClick={handleRunResearch}
              disabled={researchLoading}
              style={{
                ...TYPOGRAPHY_STYLES.buttonPrimary,
                backgroundColor: researchLoading ? "#cbd5e1" : "#0284c7",
                color: "#fff",
              }}
              {...(researchLoading ? {} : buttonHoverEffect("#0284c7", "#0369a1"))}
            >
              {researchLoading ? "⏳ Running Research..." : "🔍 Run Research"}
            </button>
          </div>
        </s-section>
      ) : (
        <s-section>
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ ...TYPOGRAPHY_STYLES.headingSubsection, margin: "0" }}>
                💡 Today's Recommended Topics
              </h3>
              <Link
                to="/app/topics-library"
                style={{
                  ...TYPOGRAPHY_STYLES.buttonSecondary,
                  backgroundColor: "#8b5cf6",
                  color: "#fff",
                  textDecoration: "none",
                }}
              >
                View All Topics
              </Link>
            </div>

            {suggestions.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    style={{
                      padding: "1.25rem",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      transition: "all 0.2s ease",
                    }}
                    {...cardHoverEffect()}
                  >
                    <p style={{ ...TYPOGRAPHY_STYLES.labelSmall, color: "#8b5cf6", marginBottom: "0.5rem" }}>
                      {suggestion.category}
                    </p>
                    <h4 style={{ ...TYPOGRAPHY_STYLES.headingCard, marginBottom: "0.75rem" }}>
                      {suggestion.title}
                    </h4>
                    <p style={{ ...TYPOGRAPHY_STYLES.body, marginBottom: "1rem" }}>
                      <strong>Keyword:</strong> {suggestion.primaryKeyword}
                    </p>
                    <button
                      onClick={() => useSuggestion(suggestion)}
                      style={{
                        width: "100%",
                        ...TYPOGRAPHY_STYLES.buttonSecondary,
                        backgroundColor: "#8b5cf6",
                        color: "#fff",
                      }}
                      {...buttonHoverEffect("#8b5cf6", "#7c3aed")}
                    >
                      Use This Topic
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </s-section>
      )}

      <s-section>
        <s-stack direction="block" gap="base">
          <div style={{ padding: "2rem", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <s-form-layout>
              {/* Primary Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ ...TYPOGRAPHY_STYLES.headingSubsection, marginBottom: "1rem" }}>Content Keywords</h3>
                <s-stack direction="block" gap="base">
                  <s-text-field
                    label="Primary Keyword"
                    value={keyword}
                    onChange={(e: any) => setKeyword(e.target.value)}
                    placeholder="e.g., sustainable fashion"
                    helpText="The main topic your article will rank for"
                  />

                  <s-text-field
                    label="Secondary Keywords"
                    value={secondaryKeywords}
                    onChange={(e: any) => setSecondaryKeywords(e.target.value)}
                    placeholder="e.g., eco-friendly clothing, ethical fashion brands"
                    helpText="Comma-separated keywords and related topics"
                  />
                </s-stack>
              </div>

              {/* SEO Settings Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ ...TYPOGRAPHY_STYLES.headingSubsection, marginBottom: "1rem" }}>SEO Settings</h3>
                <s-stack direction="block" gap="base">
                  <div>
                    <label style={{ ...TYPOGRAPHY_STYLES.label, display: "block", marginBottom: "0.5rem" }}>
                      Search Intent
                    </label>
                    <select
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                        fontSize: "1rem",
                        width: "100%",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                      ref={searchIntentRef}
                      value={searchIntent}
                      onChange={(e) => setSearchIntent(e.target.value)}
                    >
                      <option value="informational">Informational (Learn/Understand)</option>
                      <option value="commercial">Commercial (Compare/Evaluate)</option>
                      <option value="transactional">Transactional (Buy/Sign Up)</option>
                      <option value="navigational">Navigational (Find Specific Site)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ ...TYPOGRAPHY_STYLES.label, display: "block", marginBottom: "0.5rem" }}>
                      Target Country
                    </label>
                    <select
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                        fontSize: "1rem",
                        width: "100%",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                      ref={countryRef}
                      value={targetCountry}
                      onChange={(e) => setTargetCountry(e.target.value)}
                    >
                      <option value="US">United States</option>
                      <option value="UK">United Kingdom</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                </s-stack>
              </div>

              {/* Audience & Tone Section */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ ...TYPOGRAPHY_STYLES.headingSubsection, marginBottom: "1rem" }}>Audience & Voice</h3>
                <s-stack direction="block" gap="base">
                  <div>
                    <label style={{ ...TYPOGRAPHY_STYLES.label, display: "block", marginBottom: "0.5rem" }}>
                      Target Audience Level
                    </label>
                    <select
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                        fontSize: "1rem",
                        width: "100%",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                      ref={levelRef}
                      value={audienceLevel}
                      onChange={(e) => setAudienceLevel(e.target.value)}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ ...TYPOGRAPHY_STYLES.label, display: "block", marginBottom: "0.5rem" }}>
                      Tone & Voice
                    </label>
                    <select
                      style={{
                        padding: "0.75rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontFamily: "inherit",
                        fontSize: "1rem",
                        width: "100%",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                      }}
                      ref={toneRef}
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                    >
                      <option value="authoritative">Authoritative (Expert, Confident)</option>
                      <option value="friendly">Friendly (Approachable, Warm)</option>
                      <option value="professional">Professional (Formal, Business-like)</option>
                      <option value="conversational">Conversational (Casual, Engaging)</option>
                    </select>
                  </div>
                </s-stack>
              </div>

              {/* Content Length */}
              <div style={{ marginBottom: "0" }}>
                <s-text-field
                  label="Word Count"
                  type="number"
                  value={wordCount}
                  onChange={(e: any) => setWordCount(e.target.value)}
                  min="1500"
                  max="5000"
                  helpText="Minimum 1,500 words for comprehensive SEO content"
                />
              </div>
            </s-form-layout>

            <div style={{ marginTop: "2.5rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <Link
                to="/app/articles"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#10b981",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#059669";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#10b981";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                📄 View All Articles
              </Link>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: "0.75rem 2rem",
                  backgroundColor: isLoading ? "#9ca3af" : "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "#1d4ed8";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "#3b82f6";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isLoading ? "⏳ Generating..." : "✨ Generate Blog Post"}
              </button>
            </div>
          </div>
        </s-stack>
      </s-section>
    </s-page>
  );
}
