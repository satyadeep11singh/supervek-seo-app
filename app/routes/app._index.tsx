import { useState, useRef, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
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
  const [tone, setTone] = useState("professional");
  const [audience, setAudience] = useState("general");
  const [wordCount, setWordCount] = useState("1000");

  const toneSelectRef = useRef<HTMLSelectElement>(null);
  const audienceSelectRef = useRef<HTMLSelectElement>(null);

  const fetcher = useFetcher<ActionData>();
  const isLoading = fetcher.state === "submitting";

  // Sync refs to state
  useEffect(() => {
    if (toneSelectRef.current) {
      toneSelectRef.current.value = tone;
    }
  }, [tone]);

  useEffect(() => {
    if (audienceSelectRef.current) {
      audienceSelectRef.current.value = audience;
    }
  }, [audience]);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("keyword", keyword);
    formData.append("tone", tone);
    formData.append("audience", audience);
    formData.append("wordCount", wordCount);

    fetcher.submit(formData, { method: "post", action: "/app/generate-blog" });
  };

  return (
    <s-page heading="AI Blog Generator">
      <s-button 
        slot="primary-action" 
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate Blog Post"}
      </s-button>

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
                label="Keyword"
                value={keyword}
                onChange={(e: any) => setKeyword(e.target.value)}
                placeholder="e.g., sustainable fashion"
                helpText="The main topic or keyword for your blog post"
              />

              <select
                style={{
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  width: "100%",
                }}
                ref={toneSelectRef}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>

              <label style={{ display: "block", marginTop: "16px", marginBottom: "8px", fontWeight: "500" }}>
                Target Audience
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
                ref={audienceSelectRef}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="general">General Public</option>
                <option value="beginners">Beginners</option>
                <option value="experts">Experts</option>
                <option value="business">Business Professionals</option>
              </select>

              <s-text-field
                label="Word Count"
                type="number"
                value={wordCount}
                onChange={(e: any) => setWordCount(e.target.value)}
                min="500"
                max="2000"
                helpText="Approximate word count (500-2000)"
              />
            </s-form-layout>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}
