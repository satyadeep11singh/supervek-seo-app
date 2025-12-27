# Shopify AI Blog Generator - Complete Project Specification

## Project Overview

Build an embedded Shopify app that generates SEO-optimized blog posts using Google's Gemini AI. Users input a keyword and configuration options, and the app creates a draft blog post in their Shopify store.

## Tech Stack

- **Framework**: React Router v7
- **Language**: TypeScript
- **Frontend**: React with Shopify Polaris components
- **Backend**: React Router v7 (Node.js)
- **AI Provider**: Google Gemini API (@google/generative-ai)
- **Shopify API**: Admin GraphQL API
- **Authentication**: Shopify OAuth (handled by CLI via @shopify/shopify-app-react-router)

## Prerequisites

- Node.js v18 or higher
- Shopify Partner Account
- Shopify Development Store
- Google AI Studio API Key (Gemini)
- Shopify CLI installed globally

## Project Setup

### Step 1: Create New Shopify App

```bash
npm init @shopify/app@latest
```

**Configuration:**
- App name: `supervek-seo-app`
- Template: React Router
- Language: TypeScript

### Step 2: Navigate and Install Dependencies

```bash
cd supervek-seo-app
npm install @google/generative-ai @shopify/polaris
```

### Step 3: Environment Variables

Create `.env` file in project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Add to `.gitignore`:
```
.env
```



## Implementation Details

### File 1: `app/routes/app._index.tsx` (Frontend UI)

**Purpose**: Main user interface for blog generation

**Requirements**:
1. Form with the following fields:
   - Keyword (TextField, required)
   - Tone (Select: Professional, Casual, Friendly, Technical)
   - Target Audience (Select: General Public, Beginners, Experts, Business Professionals)
   - Word Count (TextField, number, default: 1000, range: 500-2000)
   - Generate Button

2. UI Components to use (Polaris):
   - `Page` - Main container
   - `Layout` - Page layout
   - `Card` - Content cards
   - `Form` - Form wrapper
   - `TextField` - Text inputs
   - `Select` - Dropdowns
   - `Button` - Actions
   - `Banner` - Success/error messages
   - `Spinner` - Loading state

3. State Management:
   - Form values
   - Loading state
   - Success/error messages
   - Generated blog ID (for redirect link)

4. Form Submission:
   - Use React Router `useFetcher` hook
   - Method: POST
   - Action: "/app/generate-blog"
   - Handle loading state during submission
   - Display success message with link to blog post in Shopify admin
   - Display error messages if generation fails

**Code Structure**:

```typescript
import { useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  Text,
  BlockStack,
} from "@shopify/polaris";
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

  const fetcher = useFetcher<ActionData>();
  const isLoading = fetcher.state === "submitting";

  const toneOptions = [
    { label: "Professional", value: "professional" },
    { label: "Casual", value: "casual" },
    { label: "Friendly", value: "friendly" },
    { label: "Technical", value: "technical" },
  ];

  const audienceOptions = [
    { label: "General Public", value: "general" },
    { label: "Beginners", value: "beginners" },
    { label: "Experts", value: "experts" },
    { label: "Business Professionals", value: "business" },
  ];

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("keyword", keyword);
    formData.append("tone", tone);
    formData.append("audience", audience);
    formData.append("wordCount", wordCount);

    fetcher.submit(formData, { method: "post", action: "/app/generate-blog" });
  };

  return (
    <Page title="AI Blog Generator">
      <Layout>
        <Layout.Section>
          {fetcher.data?.error && (
            <Banner tone="critical" title="Error">
              {fetcher.data.error}
            </Banner>
          )}

          {fetcher.data?.success && (
            <Banner tone="success" title="Blog Generated Successfully!">
              <p>
                Your blog post has been created as a draft.{" "}
                <a
                  href={`https://admin.shopify.com/store/${shop}/articles/${fetcher.data.articleId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View in Shopify Admin
                </a>
              </p>
            </Banner>
          )}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Generate SEO-Optimized Blog Post
              </Text>

              <FormLayout>
                <TextField
                  label="Keyword"
                  value={keyword}
                  onChange={setKeyword}
                  placeholder="e.g., sustainable fashion"
                  autoComplete="off"
                  helpText="The main topic or keyword for your blog post"
                />

                <Select
                  label="Tone"
                  options={toneOptions}
                  value={tone}
                  onChange={setTone}
                />

                <Select
                  label="Target Audience"
                  options={audienceOptions}
                  value={audience}
                  onChange={setAudience}
                />

                <TextField
                  label="Word Count"
                  type="number"
                  value={wordCount}
                  onChange={setWordCount}
                  min="500"
                  max="2000"
                  helpText="Approximate word count (500-2000)"
                />

                <Button
                  primary
                  onClick={handleSubmit}
                  loading={isLoading}
                  disabled={!keyword || isLoading}
                >
                  Generate Blog Post
                </Button>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
```

---

### File 2: `app/routes/app.generate-blog.tsx` (Backend API)

**Purpose**: Handle blog generation request, call Gemini API, create Shopify blog post

**Requirements**:
1. Accept POST request with form data
2. Validate input data
3. Call Gemini API to generate blog content
4. Parse Gemini response
5. Create blog article in Shopify as draft using GraphQL
6. Return success/error response

**Process Flow**:
1. Authenticate request with Shopify
2. Extract form data
3. Build prompt for Gemini
4. Call Gemini API
5. Parse JSON response from Gemini
6. Create article via Shopify Admin API
7. Return result

**Code Structure**:

```typescript
import { json, type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
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
      return json({ error: "Keyword is required" }, { status: 400 });
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
      return json(
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

    const blogsData = await blogsResponse.json();
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
      const createBlogData = await createBlogResponse.json();
      if (createBlogData.data.blogCreate.userErrors.length > 0) {
        return json({ error: "Failed to create blog" }, { status: 500 });
      }
      blogId = createBlogData.data.blogCreate.blog.id;
    }

    // 9. Create article in Shopify
    console.log("Creating article in Shopify...");
    const createArticleResponse = await admin.graphql(
      `mutation createArticle($input: ArticleCreateInput!) {
        articleCreate(input: $input) {
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
          input: {
            blogId: blogId,
            title: blogData.title,
            bodyHtml: blogData.content,
            summary: blogData.metaDescription,
            tags: blogData.tags,
            published: false, // Save as draft
          },
        },
      }
    );

    const articleData = await createArticleResponse.json();

    // 10. Check for errors
    if (articleData.data.articleCreate.userErrors.length > 0) {
      console.error(
        "Shopify API errors:",
        articleData.data.articleCreate.userErrors
      );
      return json(
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
    return json({
      success: true,
      articleId: articleId,
      articleTitle: article.title,
      shop: session?.shop.replace(".myshopify.com", "") || "",
    });
  } catch (error) {
    console.error("Error generating blog:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return json({ error: errorMessage }, { status: 500 });
  }
};
```

---

## GraphQL Queries Reference

### Get First Blog

```graphql
query {
  blogs(first: 1) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

### Create Blog (if needed)

```graphql
mutation {
  blogCreate(blog: { title: "News" }) {
    blog {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}
```

### Create Article

```graphql
mutation createArticle($input: ArticleCreateInput!) {
  articleCreate(input: $input) {
    article {
      id
      title
      handle
      bodyHtml
      summary
      tags
      published
    }
    userErrors {
      field
      message
    }
  }
}
```

## Gemini API Integration

### Prompt Engineering Best Practices

1. **Be Specific**: Clearly state word count, tone, audience
2. **Request JSON**: Ask for structured JSON output
3. **Provide Examples**: Show the exact format you want
4. **HTML Formatting**: Request proper HTML tags for blog content
5. **SEO Requirements**: Emphasize SEO optimization

### Error Handling

Handle these scenarios:
- API rate limits
- Invalid API key
- Malformed JSON responses
- Network timeouts
- Parsing errors

## Testing Checklist

### Manual Testing Steps

1. **Setup Verification**
   - [ ] App installs on development store
   - [ ] App loads in Shopify admin
   - [ ] Environment variables are set

2. **UI Testing**
   - [ ] All form fields render correctly
   - [ ] Dropdowns show correct options
   - [ ] Validation works (empty keyword)
   - [ ] Loading state displays during generation

3. **Generation Testing**
   - [ ] Generate blog with keyword "sustainable fashion"
   - [ ] Verify professional tone
   - [ ] Check word count is approximately 1000
   - [ ] Confirm blog appears as draft in Shopify
   - [ ] Verify title, content, meta description, tags are populated

4. **Error Testing**
   - [ ] Test with empty keyword
   - [ ] Test with invalid Gemini API key
   - [ ] Test network failure scenarios

5. **Edge Cases**
   - [ ] Very short keywords (1-2 characters)
   - [ ] Very long keywords (20+ words)
   - [ ] Special characters in keywords
   - [ ] Minimum word count (500)
   - [ ] Maximum word count (2000)

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This will:
1. Start the Remix development server
2. Open ngrok tunnel for Shopify to reach your local app
3. Open the app in your browser

### Deploy to Production

```bash
npm run deploy
```

## Common Issues & Solutions

### Issue 1: "Cannot find blog"
**Solution**: The app creates a default "News" blog if none exists

### Issue 2: Gemini returns markdown instead of JSON
**Solution**: The code strips markdown code blocks (```) from response

### Issue 3: Article not appearing in Shopify
**Solution**: Check that the blog exists first, verify GraphQL response

### Issue 4: "Failed to parse AI response"
**Solution**: Log the raw response, adjust prompt to enforce JSON format

## Environment Variables Summary

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Shopify (automatically set by CLI)
SHOPIFY_API_KEY=auto_generated
SHOPIFY_API_SECRET=auto_generated
```

## API Rate Limits & Considerations

### Gemini API
- Free tier: 60 requests per minute
- Consider adding rate limiting in production
- Handle 429 (Too Many Requests) errors

### Shopify API
- Rate limited by app type
- Embedded apps: 4 requests/second
- Handle rate limit errors gracefully

## Security Considerations

1. **Environment Variables**: Never commit `.env` file
2. **API Keys**: Store securely, rotate regularly
3. **Input Validation**: Sanitize user inputs
4. **Error Messages**: Don't expose sensitive info in errors

## Future Enhancements (Out of Scope for MVP)

- Save generation history
- Edit AI-generated content before saving
- Multiple blog post generation
- Custom prompt templates
- Image generation with AI
- Automatic publishing scheduling
- Analytics on generated posts

## Support Resources

- [Shopify Remix App Docs](https://shopify.dev/docs/apps/build/cli-for-apps)
- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Polaris Components](https://polaris.shopify.com/)

---

## Quick Start Commands

```bash
# Install Shopify CLI
npm install -g @shopify/cli@latest

# Create new app
npm init @shopify/app@latest

# Navigate to app
cd ai-blog-generator

# Install Gemini dependency
npm install @google/generative-ai

# Create .env file with your Gemini API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start development
npm run dev
```

---

**Note to AI Developer**: Follow this specification exactly. All code snippets are complete and production-ready. The implementation prioritizes simplicity and clarity for a first-time Shopify app developer while maintaining best practices.