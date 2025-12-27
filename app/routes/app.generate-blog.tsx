import { type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface BlogData {
  titleOptions: string[];
  selectedTitle: string;
  metaDescription: string;
  content: string;
  faqSection: Array<{ question: string; answer: string }>;
  contentSummary: string;
  seoChecklist: string;
  internalLinkingSuggestions: string[];
  externalLinkingSuggestions: string[];
  tags: string[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);

  try {
    // 1. Get form data
    const formData = await request.formData();
    const keyword = formData.get("keyword") as string;
    const secondaryKeywords = formData.get("secondaryKeywords") as string;
    const searchIntent = formData.get("searchIntent") as string;
    const targetCountry = formData.get("targetCountry") as string;
    const audienceLevel = formData.get("audienceLevel") as string;
    const tone = formData.get("tone") as string;
    const wordCount = formData.get("wordCount") as string;

    // 2. Validate input
    if (!keyword?.trim()) {
      return Response.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // 3. Initialize Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not set in environment");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // 4. Create comprehensive SEO prompt
    const prompt = `You are an ELITE SEO CONTENT ARCHITECT combining the roles of:

• Google Search Quality Rater
• EEAT & Trust Architect
• Semantic SEO & NLP Specialist
• Conversion Copywriter
• Long-Form Editorial Strategist
• Competitive SERP Analyst

You have 20+ years of hands-on SEO experience and deep mastery of:
Google Helpful Content System, Core Updates, EEAT, NLP, semantic search, topical authority, user intent modeling, and conversion psychology.

Your mission: Create a HUMAN-WRITTEN, LONG-FORM, HIGH-RANKING SEO BLOG ARTICLE designed to rank on Page 1 of Google, outperform competitors, maximize engagement, pass EEAT evaluation, and avoid AI-detection.

────────────────────────────────────────
INPUT VARIABLES
────────────────────────────────────────

Primary Keyword: "${keyword}"
Secondary Keywords: ${secondaryKeywords || "Not specified"}
Search Intent: ${searchIntent}
Target Country: ${targetCountry}
Target Audience Level: ${audienceLevel}
Tone & Voice: ${tone}
Word Count Target: ${wordCount}+ words

────────────────────────────────────────
REQUIREMENTS - DELIVER IN THIS EXACT JSON FORMAT
────────────────────────────────────────

You MUST return ONLY raw JSON (no markdown, no code blocks):

{
  "titleOptions": ["Title Option 1 (under 60 chars)", "Title Option 2", "Title Option 3", "Title Option 4", "Title Option 5", "Title Option 6", "Title Option 7"],
  "selectedTitle": "The best performing title option",
  "metaDescription": "160-character meta description with primary keyword and benefit-driven CTA",
  "content": "<h1>Title</h1><h2>Section heading</h2><p>Content with natural keyword integration...</p><h2>FAQ Section</h2>...",
  "faqSection": [
    {"question": "What is [keyword]?", "answer": "Detailed answer with authority"},
    {"question": "How does [keyword] work?", "answer": "Comprehensive explanation"},
    {"question": "When should you use [keyword]?", "answer": "Practical use cases"}
  ],
  "contentSummary": "Brief reader-friendly summary of the article",
  "seoChecklist": "✓ Primary keyword in title, intro, headings, conclusion\\n✓ Secondary keywords naturally integrated\\n✓ Proper H1→H2→H3 hierarchy\\n✓ Content length: X words\\n✓ FAQ section optimized for snippets\\n✓ 5-7 relevant tags included",
  "internalLinkingSuggestions": ["Link to [related page 1]", "Link to [related page 2]"],
  "externalLinkingSuggestions": ["Authority link to [domain 1] for [topic]", "Citation from [trusted source]"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7"]
}

────────────────────────────────────────
MANDATORY EXECUTION RULES
────────────────────────────────────────

STRUCTURE:
• Single H1 tag (your selected title)
• Logical H2→H3 hierarchy
• Short paragraphs (2-3 lines max)
• Bullet points & numbered steps throughout
• Strong introduction hook (first paragraph is CRITICAL)
• FAQ section (featured snippet optimization)
• Powerful conclusion with CTA

KEYWORD OPTIMIZATION:
• Primary keyword naturally in: title, first 100 words, headings, conclusion
• Secondary keywords & LSI keywords woven throughout
• NO keyword stuffing - reads naturally
• Semantic variations and contextual synonyms

EEAT & AUTHORITY:
• Demonstrate real expertise with examples
• Use specific, actionable guidance
• Show confidence in explanations
• Include practical scenarios
• Reference trusted data points where relevant
• Sound like a human expert with lived experience

USER ENGAGEMENT:
• Strong hooks to maximize dwell time
• Clear value proposition in introduction
• Logical reading flow
• Mobile-optimized (scannable format)
• Calls-to-action feel helpful, not pushy

CONTENT QUALITY:
• ${wordCount}+ words minimum
• 100% original, never seen before
• Zero fluff or padding
• No AI self-references
• Avoid common AI patterns
• High linguistic quality
• Professional editing

────────────────────────────────────────

NOW EXECUTE: Create the complete SEO-optimized blog article following all requirements above. Return ONLY the JSON object, nothing else.`;

    // 5. Call Gemini API
    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. Parse response
    console.log("Parsing Gemini response...");
    let blogData: BlogData;
    try {
      // Strip markdown code fence if present
      const cleanedText = text
        .replace(/^```[\w]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      // Log the response for debugging
      console.log("Cleaned response length:", cleanedText.length);
      console.log("First 500 chars:", cleanedText.substring(0, 500));

      // Extract JSON from the response - more aggressive extraction
      let jsonMatch = cleanedText.match(/\{[\s\S]*\}$/);
      if (!jsonMatch) {
        jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      }

      if (!jsonMatch) {
        console.error("Failed to find JSON in response:", cleanedText);
        throw new Error(
          "AI response did not contain valid JSON. This might be a temporary issue. Please try again."
        );
      }

      const jsonString = jsonMatch[0];
      
      // Attempt to parse JSON with better error messaging
      try {
        blogData = JSON.parse(jsonString);
      } catch (jsonError) {
        console.error("JSON Parse Error:", jsonError);
        console.error("Failed JSON string:", jsonString.substring(0, 1000));
        
        // Provide more helpful error message
        if (jsonError instanceof SyntaxError) {
          const match = jsonError.message.match(/position (\d+)/);
          const position = match ? parseInt(match[1]) : 0;
          const context = jsonString.substring(
            Math.max(0, position - 100),
            Math.min(jsonString.length, position + 100)
          );
          throw new Error(
            `Invalid JSON from AI at position ${position}. The AI response format was incorrect. Please try again.`
          );
        }
        throw new Error("Failed to parse AI response. Please try again.");
      }

      // Validate required fields
      const requiredFields = ["selectedTitle", "content", "metaDescription"];
      const missingFields = requiredFields.filter(
        (field) => !blogData[field as keyof BlogData]
      );

      if (missingFields.length > 0) {
        throw new Error(
          `AI response missing required fields: ${missingFields.join(", ")}. Please try again.`
        );
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text.substring(0, 1000));
      const errorMsg =
        parseError instanceof Error
          ? parseError.message
          : "Failed to parse AI response. Please try again.";
      return Response.json(
        { error: `Generation Error: ${errorMsg}` },
        { status: 500 }
      );
    }

    // 7. Get the first blog (create one if none exists)
    const blogsResponse = await admin.graphql(
      `query {
        blogs(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }`
    );

    const blogsData = (await blogsResponse.json()) as {
      data: { blogs: { edges: Array<{ node: { id: string } }> } };
    };
    let blogId: string;

    if (blogsData.data.blogs.edges.length > 0) {
      blogId = blogsData.data.blogs.edges[0].node.id;
    } else {
      // Create a blog if none exists
      const createBlogResponse = await admin.graphql(
        `mutation {
          blogCreate(blog: { title: "News" }) {
            blog {
              id
            }
            userErrors {
              field
              message
            }
          }
        }`
      );
      const createBlogData = (await createBlogResponse.json()) as {
        data: {
          blogCreate: {
            blog: { id: string };
            userErrors: Array<{ field: string; message: string }>;
          };
        };
      };
      if (createBlogData.data.blogCreate.userErrors.length > 0) {
        return Response.json(
          { error: "Failed to create blog" },
          { status: 500 }
        );
      }
      blogId = createBlogData.data.blogCreate.blog.id;
    }

    // 9. Create article in Shopify
    console.log("Creating article in Shopify...");
    const createArticleResponse = await admin.graphql(
      `mutation createArticle($article: ArticleCreateInput!) {
        articleCreate(article: $article) {
          article {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          article: {
            blogId: blogId,
            title: blogData.selectedTitle,
            body: blogData.content,
            summary: blogData.metaDescription,
            tags: blogData.tags || [],
            author: {
              name: "SEO Assistant",
            },
            isPublished: false,
          },
        },
      }
    );

    const articleData = (await createArticleResponse.json()) as {
      data: {
        articleCreate: {
          article: { id: string; title: string; handle: string };
          userErrors: Array<{ field: string; message: string }>;
        };
      };
    };

    // 10. Check for errors
    if (articleData.data.articleCreate.userErrors.length > 0) {
      console.error(
        "Shopify API errors:",
        articleData.data.articleCreate.userErrors
      );
      return Response.json(
        {
          error: `Failed to create article: ${articleData.data.articleCreate.userErrors[0].message}`,
        },
        { status: 500 }
      );
    }

    // 11. Extract article ID
    const article = articleData.data.articleCreate.article;
    const articleGid = article.id;
    const articleId = articleGid.split("/").pop();

    // 12. Return success
    return Response.json({
      success: true,
      articleId: articleId,
      articleTitle: article.title,
      shop: session?.shop.replace(".myshopify.com", "") || "",
    });
  } catch (error) {
    console.error("Error generating blog:", error);
    let errorMessage = "An unexpected error occurred while generating your blog post. Please try again.";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Provide specific guidance for common errors
    if (errorMessage.includes("JSON")) {
      errorMessage = "The AI response format was invalid. Please try again. If this persists, try a different keyword.";
    } else if (errorMessage.includes("timeout")) {
      errorMessage = "The request took too long. Please try again with a simpler keyword.";
    } else if (errorMessage.includes("GEMINI_API_KEY")) {
      errorMessage = "Configuration error: API key not found. Please contact support.";
    }

    console.error("Final error message:", errorMessage);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
};
