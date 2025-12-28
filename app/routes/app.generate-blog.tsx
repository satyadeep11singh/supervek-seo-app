import { type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.server";
import {
  validateKeyword,
  validateSecondaryKeywords,
  validateSearchIntent,
  validateTone,
  validateAudienceLevel,
  validateCountry,
  validateWordCount,
} from "../utils/validation.server";
import { rateLimitCheck } from "../utils/rateLimit.server";

interface BlogData {
  competitiveIntelligence: {
    avgWordCount: string;
    contentGaps: string[];
    mustHaveSubtopics: string[];
    serpFeatures: string[];
    differentiationOpportunity: string;
  };
  differentiationStrategy: {
    primaryAngle: string;
    uniqueElements: string[];
    valueProposition: string;
  };
  titleOptions: string[];
  selectedTitle: string;
  metaDescription: string;
  urlSlug: string;
  articleContent: string;
  faqSection: Array<{ question: string; answer: string }>;
  eeatSignals: {
    authorBio: string;
    citationPlan: string[];
    originalElements: string[];
  };
  internalLinkingSuggestions: string[];
  externalLinkingSuggestions: string[];
  imageRequirements: string[];
  technicalSEOChecklist: {
    completed: string[];
  };
  schemaMarkup: {
    types: string[];
    implementation: string;
  };
  contentSummary: string;
  tags: string[];
  postPublishChecklist: string[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { admin, session } = await authenticate.admin(request);
  
  // RATE LIMITING: Check if shop exceeded limits
  const shop = session?.shop.replace(".myshopify.com", "") || "";
  const rateLimitError = await rateLimitCheck(shop, 'blog-generation');
  if (rateLimitError) {
    return Response.json(
      { error: rateLimitError },
      { status: 429 } // Too Many Requests
    );
  }

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

    // 2. VALIDATE ALL INPUTS - PREVENT PROMPT INJECTION
    let validatedKeyword: string;
    let validatedSecondaryKeywords: string;
    let validatedSearchIntent: string;
    let validatedTone: string;
    let validatedAudienceLevel: string;
    let validatedCountry: string;
    let validatedWordCount: number;

    try {
      validatedKeyword = validateKeyword(keyword);
      validatedSecondaryKeywords = validateSecondaryKeywords(secondaryKeywords);
      validatedSearchIntent = validateSearchIntent(searchIntent);
      validatedTone = validateTone(tone);
      validatedAudienceLevel = validateAudienceLevel(audienceLevel);
      validatedCountry = validateCountry(targetCountry);
      validatedWordCount = validateWordCount(wordCount);
    } catch (validationError) {
      return Response.json(
        { error: validationError instanceof Error ? validationError.message : "Invalid input" },
        { status: 400 }
      );
    }

    // 3. Initialize Gemini AI with validated env
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // 4. Create comprehensive SEO prompt - USE VALIDATED VARIABLES ONLY
    const prompt = `# ELITE SEO CONTENT STRATEGIST & ARCHITECT

You are an expert SEO strategist combining:
- Competitive SERP Analysis
- Google EEAT & Quality Rater Guidelines
- Semantic Search & NLP Optimization
- Content Differentiation Strategy
- Technical SEO Implementation

Your goal: Create a data-driven, strategically differentiated blog article designed to outrank competitors through superior value, not just word count.

═══════════════════════════════════════════════════════════
INPUT PARAMETERS
═══════════════════════════════════════════════════════════

PRIMARY KEYWORD: "${validatedKeyword}"
SECONDARY KEYWORDS: ${validatedSecondaryKeywords || "Not specified"}
SEARCH INTENT: ${validatedSearchIntent}
TARGET AUDIENCE: ${validatedAudienceLevel}
CONTENT TONE: ${validatedTone}
WORD COUNT TARGET: ${validatedWordCount}+ words minimum
TARGET COUNTRY: ${validatedCountry}
AUTHOR CREDENTIALS: Expert content strategist with 15+ years SEO experience

═══════════════════════════════════════════════════════════
PHASE 1: COMPETITIVE INTELLIGENCE ANALYSIS
═══════════════════════════════════════════════════════════

Analyze the competitive landscape for "${validatedKeyword}":

SERP ANALYSIS (Assume top 10 competitors):
- Average word count: 2500-4500 words (estimate based on keyword type)
- Common content types: Guides, comparison articles, how-tos, listicles
- Must-have subtopics: The topics ALL top competitors cover
- Content gaps: Questions/angles competitors DON'T adequately address
- SERP features: Featured snippets, PAA boxes, video carousels, image packs
- User pain points: What readers struggle with on this topic

═══════════════════════════════════════════════════════════
PHASE 2: DIFFERENTIATION STRATEGY
═══════════════════════════════════════════════════════════

Define UNIQUE VALUE. Use 2+ of these:
✓ Original research, methodology, or case studies
✓ Contrarian perspectives that challenge common wisdom
✓ Comparison/evaluation competitors don't offer
✓ Updated 2024-2025 data and insights
✓ Expert interviews or quotes
✓ Specific, named examples instead of generic ones
✓ Visual assets (infographics, diagrams, screenshots)
✓ Downloadable tools or templates
✓ Exceptional depth on one critical subtopic

═══════════════════════════════════════════════════════════
PHASE 3: SEMANTIC ENTITY & NLP OPTIMIZATION
═══════════════════════════════════════════════════════════

Include 10-15 core entities Google expects:
- Related concepts, terminology, industry tools
- Common problems and solutions
- Alternative approaches and methodologies
- Key industry figures or companies
- Complementary topics and processes

Use natural LSI keywords and question-based phrases throughout.

═══════════════════════════════════════════════════════════
PHASE 4: CONTENT ARCHITECTURE
═══════════════════════════════════════════════════════════

Structure:
H1: [Keyword] - [Benefit] (50-60 chars)
├─ H2: Introduction/Overview
├─ H2: Core Concept/Definition
├─ H2: [Must-Have Competitive Subtopic]
├─ H2: [YOUR UNIQUE DIFFERENTIATION ANGLE]
├─ H2: Step-by-Step Process/How-To
├─ H2: Common Mistakes/Pitfalls
├─ H2: Expert Tips & Best Practices
├─ H2: FAQ Section
└─ H2: Conclusion & Next Steps

FORMATTING:
✓ Paragraphs: Max 3 sentences (scannable on mobile)
✓ Lists: Bullets for benefits, numbers for steps
✓ Tables: For comparisons and data
✓ Bold: Key takeaways (1-2 per section)
✓ Examples: Specific, named examples throughout
✓ Transitions: Smooth, natural flow between sections

═══════════════════════════════════════════════════════════
PHASE 5: EEAT IMPLEMENTATION
═══════════════════════════════════════════════════════════

MANDATORY TRUST SIGNALS:
1. Author credentials: Why you're qualified for this topic
2. Citations: 4-6 authoritative sources (.gov, .edu, industry leaders)
3. Original evidence: Specific examples, real scenarios, case studies
4. Transparency: Affiliate disclosures, limitations, balanced view
5. Expert sourcing: Quotes, research, data from recognized authorities

═══════════════════════════════════════════════════════════
PHASE 6: ANTI-AI DETECTION
═══════════════════════════════════════════════════════════

AVOID:
❌ Generic openings: "In today's digital world..."
❌ Hedging: "might," "could," "may," "possibly"
❌ Overused transitions: "Moreover," "Furthermore," "In addition"
❌ Formulaic conclusions: "In conclusion, [keyword] is important..."
❌ List overload: Making every point a bullet

USE INSTEAD:
✅ Strong hooks: Surprising stats, contrarian takes, specific scenarios
✅ Conversational tone: "Here's the thing," "I've seen," "Let's be honest"
✅ Definitive statements: Show expertise with confidence
✅ Specific examples: Adobe, HubSpot, and Salesforce vs. "many companies"
✅ Varied sentence structure: Mix short punchy with longer explanatory
✅ Natural keyword placement: Because it's contextually necessary
✅ Personality: Analogies, humor, relatable examples
✅ Non-obvious insights: Challenge common wisdom where appropriate

═══════════════════════════════════════════════════════════
PHASE 7: TECHNICAL SEO
═══════════════════════════════════════════════════════════

ON-PAGE SEO REQUIREMENTS:
✓ Title (50-60 chars): Keyword early, benefit-driven
✓ Meta description (150-160 chars): Keyword, value prop, CTA
✓ URL slug: Primary keyword, 3-5 words, hyphens
✓ H1 contains primary keyword
✓ First 100 words include primary keyword
✓ Secondary keywords in H2/H3 headings
✓ Keyword density: 0.5-1.5% (natural, not forced)
✓ 3-5 internal links to related content
✓ 2-3 external links to authoritative sources
✓ FAQ section optimized for featured snippets
✓ Image alt text with relevant keywords

═══════════════════════════════════════════════════════════
PHASE 8: FAQ SECTION - FEATURED SNIPPET OPTIMIZATION
═══════════════════════════════════════════════════════════

Create 6-8 FAQs targeting "People Also Ask" queries:
- Start with direct answer (40-60 words for snippet)
- Answer: "What is [keyword]?" "How does it work?" "Why is it important?"
- Include: Use cases, comparisons, benefits, common mistakes
- Format naturally with H3 questions + paragraph answers

═══════════════════════════════════════════════════════════
FINAL OUTPUT (JSON ONLY - NO MARKDOWN BLOCKS, NO EXTRA TEXT)
═══════════════════════════════════════════════════════════

{
  "competitiveIntelligence": {
    "avgWordCount": "Estimated min-max word count of top competitors",
    "contentGaps": ["Gap 1", "Gap 2", "Gap 3"],
    "mustHaveSubtopics": ["Topic 1", "Topic 2", "Topic 3"],
    "serpFeatures": ["Feature 1", "Feature 2"],
    "differentiationOpportunity": "Your specific angle to outrank competitors"
  },

  "differentiationStrategy": {
    "primaryAngle": "What makes this uniquely better than competitors",
    "uniqueElements": ["Element 1", "Element 2", "Element 3"],
    "valueProposition": "One-sentence reader benefit/promise"
  },

  "titleOptions": [
    "Title 1 - Keyword focused, benefit-driven (50-60 chars)",
    "Title 2 - Alternative angle",
    "Title 3 - Question-based approach",
    "Title 4 - List/How-to angle",
    "Title 5 - Comparison angle"
  ],

  "selectedTitle": "The highest-performing title from above",

  "metaDescription": "150-160 char description with primary keyword, clear value proposition, and subtle CTA",

  "urlSlug": "primary-keyword-format",

  "articleContent": "Complete HTML article <h1>Title</h1> through full content with H2s, H3s, paragraphs (max 3 sentences each), lists, tables, specific examples, conversational yet authoritative tone. Include all sections: intro, core concepts, competitive must-haves, YOUR unique differentiation section, step-by-step process, common mistakes, expert tips, conclusion. Natural keyword placement. Minimum ${wordCount} words.",

  "faqSection": [
    {
      "question": "What is ${keyword}?",
      "answer": "Direct definition in 40-60 words with keyword and key points"
    },
    {
      "question": "How does ${keyword} work?",
      "answer": "Clear process explanation with concrete details"
    },
    {
      "question": "Why is ${keyword} important?",
      "answer": "Value proposition, benefits, and impact explanation"
    },
    {
      "question": "When should you use ${keyword}?",
      "answer": "Specific use cases and scenarios where it applies"
    },
    {
      "question": "What are common ${keyword} mistakes?",
      "answer": "Pitfalls to avoid and how to prevent them"
    },
    {
      "question": "${keyword} vs alternatives?",
      "answer": "Comparison highlighting unique advantages"
    }
  ],

  "eeatSignals": {
    "authorBio": "Author name: [Expert title/credential] with [specific experience]. Featured in [publications/recognition]. Connect at [LinkedIn/website]",
    "citationPlan": [
      "[Authoritative .gov/.edu source] for [specific claim/statistic]",
      "[Industry research/study] supporting [data point]",
      "[Expert/thought leader] regarding [specific insight]",
      "[Academic study/whitepaper] for [fact/finding]",
      "[Industry leader] example demonstrating [concept]"
    ],
    "originalElements": ["Specific case study with results", "Personal methodology/framework", "Original data point or research", "Unique perspective on topic"]
  },

  "internalLinkingSuggestions": [
    "Link to [related pillar page] with anchor '[keyword variation]'",
    "Link to [subtopic guide] with anchor '[specific topic]'",
    "Link to [related article] with anchor '[contextual phrase]'",
    "Link to [supporting resource] with anchor '[descriptive text]'"
  ],

  "externalLinkingSuggestions": [
    "Cite [.gov/.edu source] for [specific claim]",
    "Link to [industry research] for [statistic/data]",
    "Reference [recognized expert] for [insight]",
    "Link to [authoritative blog/publication] for [information]"
  ],

  "imageRequirements": [
    "Hero image: [Specific description of ideal featured image]",
    "Infographic: [Concept that needs visual representation]",
    "Process diagram: [Step-by-step process to visualize]",
    "Comparison table visual: [Comparison to illustrate]"
  ],

  "technicalSEOChecklist": {
    "completed": [
      "✓ Primary keyword in title, H1, first 100 words, conclusion",
      "✓ Secondary keywords naturally in H2/H3 headings",
      "✓ Keyword density: 0.5-1.5% (natural distribution)",
      "✓ Proper H1→H2→H3 hierarchy throughout",
      "✓ Word count: [actual] words (meets/exceeds competitors)",
      "✓ Paragraphs: 2-3 sentences max for mobile scannability",
      "✓ Lists: Formatted for readability (bullets vs numbers)",
      "✓ FAQ section: [X] optimized questions for snippets",
      "✓ Internal links: [X] contextual links to related content",
      "✓ External links: [X] citations to authoritative sources",
      "✓ Meta description: 150-160 chars with primary keyword and CTA"
    ]
  },

  "schemaMarkup": {
    "types": ["Article (with author, datePublished, dateModified)", "FAQ (for question/answer sections)", "Breadcrumb"],
    "implementation": "Implement using JSON-LD format in article template"
  },

  "contentSummary": "2-3 sentence summary of key value proposition and main takeaways for quick reference",

  "tags": ["primary-keyword", "secondary-keyword", "topic-category", "use-case", "industry-term", "audience-level", "related-concept"],

  "postPublishChecklist": [
    "Add author bio section at bottom with credentials and social links",
    "Include 'Last Updated: [Today's date]' at top of article",
    "Implement schema markup using JSON-LD format",
    "Compress and optimize all images (<200KB each)",
    "Add internal links from 3-5 related existing articles",
    "Set up Google Search Console tracking for this URL",
    "Monitor with Google Analytics for traffic and engagement",
    "Plan content refresh date (6 months out for updates)"
  ]
}

═══════════════════════════════════════════════════════════
EXECUTION INSTRUCTIONS
═══════════════════════════════════════════════════════════

1. Start with competitive analysis - understand what you're up against
2. Define your differentiation - what makes this better?
3. Map semantic entities - what concepts must be included?
4. Structure logically - match content to search intent
5. Write like an expert - confident, specific, conversational
6. Optimize technically - follow all SEO requirements
7. Validate quality - genuinely better than competitors?

CRITICAL REMINDERS:
- Match or EXCEED top competitor word count
- Every claim must be specific and substantiated
- Avoid generic AI patterns - write with personality
- Focus on user value FIRST, SEO second (include both)
- Make content scannable with strategic formatting
- Include conversational elements for human touch
- End with clear next steps or strong CTA

NOW EXECUTE: Create the complete article following all 8 phases above.
Return ONLY the JSON object with all fields populated. No markdown code blocks. No extra text.`;

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
          throw new Error(
            `Invalid JSON from AI at position ${position}. The AI response format was incorrect. Please try again.`
          );
        }
        throw new Error("Failed to parse AI response. Please try again.");
      }

      // Validate required fields for new comprehensive structure
      const requiredFields = [
        "selectedTitle",
        "articleContent",
        "metaDescription",
        "competitiveIntelligence",
        "differentiationStrategy",
        "eeatSignals",
        "technicalSEOChecklist",
      ];
      const missingFields = requiredFields.filter(
        (field) => !blogData[field as keyof BlogData]
      );

      if (missingFields.length > 0) {
        throw new Error(
          `AI response missing critical fields: ${missingFields.join(", ")}. The generated content is incomplete. Please try again.`
        );
      }

      // Ensure articleContent exists and fallback to content if not
      const articleContent = blogData.articleContent || (blogData as Record<string, unknown>).content;
      if (!articleContent) {
        throw new Error(
          "No article content generated. Please try again."
        );
      }
    } catch (parseError: unknown) {
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
    const articleContent = blogData.articleContent || (blogData as Record<string, unknown>).content || "";
    const articleSlug = blogData.urlSlug || blogData.selectedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
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
            body: articleContent,
            summary: blogData.metaDescription,
            handle: articleSlug,
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
