import { useState, useRef, useEffect } from "react";
import { useFetcher, useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return { shop: session?.shop.replace(".myshopify.com", "") };
};

type ActionData = {
  success?: boolean;
  error?: string;
  articleId?: string;
  shop?: string;
};

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const [keyword, setKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [searchIntent, setSearchIntent] = useState("informational");
  const [targetCountry, setTargetCountry] = useState("US");
  const [audienceLevel, setAudienceLevel] = useState("intermediate");
  const [tone, setTone] = useState("authoritative");
  const [wordCount, setWordCount] = useState("1500");

  const searchIntentRef = useRef<HTMLSelectElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const levelRef = useRef<HTMLSelectElement>(null);
  const toneRef = useRef<HTMLSelectElement>(null);

  const fetcher = useFetcher<ActionData>();
  const isLoading = fetcher.state === "submitting";

  // Sync refs to state
  useEffect(() => {
    if (searchIntentRef.current) searchIntentRef.current.value = searchIntent;
    if (countryRef.current) countryRef.current.value = targetCountry;
    if (levelRef.current) levelRef.current.value = audienceLevel;
    if (toneRef.current) toneRef.current.value = tone;
  }, [searchIntent, targetCountry, audienceLevel, tone]);

  const handleSubmit = () => {
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

  return (
    <s-page heading="Supervek Blog Generator">
      {fetcher.data?.error && (
        <s-banner title="Error" tone="critical">
          <s-paragraph>{fetcher.data.error}</s-paragraph>
        </s-banner>
      )}

      {fetcher.data?.success && (
        <s-banner title="Blog Generated Successfully!" tone="success">
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

      <s-section heading="Generate SEO-Optimized Blog Post">
        <s-stack direction="block" gap="base">
          <s-box>
            <s-form-layout>
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
                helpText="Comma-separated secondary keywords and related topics"
              />

              <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", fontWeight: "500" }}>
                Search Intent
              </label>
              <select
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  width: "100%",
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

              <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", fontWeight: "500" }}>
                Target Country
              </label>
              <select
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  width: "100%",
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

              <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", fontWeight: "500" }}>
                Target Audience Level
              </label>
              <select
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  width: "100%",
                }}
                ref={levelRef}
                value={audienceLevel}
                onChange={(e) => setAudienceLevel(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>

              <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", fontWeight: "500" }}>
                Tone & Voice
              </label>
              <select
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  width: "100%",
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

              <s-text-field
                label="Word Count"
                type="number"
                value={wordCount}
                onChange={(e: any) => setWordCount(e.target.value)}
                min="1500"
                max="5000"
                helpText="Minimum 1,500 words for comprehensive SEO content"
              />
            </s-form-layout>

            <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                to="/app/articles"
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2e7d32",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "4px",
                  fontSize: "1.2rem",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1b5e20";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2e7d32";
                }}
              >
                📄 View All Articles
              </Link>

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: "0.8rem 2rem",
                  backgroundColor: isLoading ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1.4rem",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "#0056b3";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = "#007bff";
                  }
                }}
              >
                {isLoading ? "Generating..." : "Generate Blog Post"}
              </button>
            </div>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
