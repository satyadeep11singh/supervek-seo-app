import { type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface BlogData {
  title: string;
  metaDescription: string;
  content: string;
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
    const tone = formData.get("tone") as string;
    const audience = formData.get("audience") as string;
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

    // 4. Create prompt
    const prompt = `You are an expert SEO content writer. Generate a comprehensive, SEO-optimized blog post based on the following requirements:

Keyword: "${keyword}"
Tone: ${tone}
Target Audience: ${audience}
Approximate Word Count: ${wordCount} words

Requirements:
1. Create an engaging, SEO-friendly title (under 60 characters)
2. Write a compelling meta description (150-160 characters)
3. Generate well-structured blog content with:
   - Clear introduction
   - Multiple sections with subheadings (use <h2> and <h3> tags)
   - Engaging paragraphs
   - Bullet points or numbered lists where appropriate
   - Strong conclusion
   - Natural keyword integration
   - HTML formatting (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>)
4. Provide 5-7 relevant SEO tags

Return your response in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{
  "title": "SEO-optimized title here",
  "metaDescription": "Compelling meta description here",
  "content": "<p>Full HTML-formatted blog content here</p>",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    // 5. Call Gemini API
    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. Parse response
    console.log("Parsing Gemini response...");
    let blogData: BlogData;
    try {
      // Strip markdown code fence if present (Gemini often wraps in ```json ... ```)
      const cleanedText = text
        .replace(/^```[\w]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      // Try to extract JSON from the response
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Gemini response: " + text);
      }

      blogData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      const errorMsg =
        parseError instanceof Error
          ? parseError.message
          : "Failed to parse AI response";
      return Response.json({ error: errorMsg }, { status: 500 });
    }

    // 7. Validate blog data structure
    if (!blogData.title || !blogData.content || !blogData.metaDescription) {
      return Response.json(
        { error: "Invalid blog data structure from AI" },
        { status: 500 }
      );
    }

    // 8. Get the first blog (create one if none exists)
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
            title: blogData.title,
            body: blogData.content,
            summary: blogData.metaDescription,
            tags: blogData.tags,
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
          error: `Shopify error: ${articleData.data.articleCreate.userErrors[0].message}`,
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
    const errorMessage =
      error instanceof Error && error.message
        ? error.message
        : "An unexpected error occurred";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
};
