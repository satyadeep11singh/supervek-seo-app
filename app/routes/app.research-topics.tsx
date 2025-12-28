import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../db.server";
import { env } from "../env.server";
import { rateLimitCheck } from "../utils/rateLimit.server";

interface TopicResearch {
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

  // Get existing topics for this shop
  const existingTopics = await prisma.blogTopicResearch.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  return {
    shop,
    topicCount: existingTopics.length,
    lastResearchDate: existingTopics[0]?.createdAt || null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { session } = await authenticate.admin(request);
  const shop = session?.shop.replace(".myshopify.com", "") || "";

  // RATE LIMITING
  const rateLimitError = await rateLimitCheck(shop, 'research-topics');
  if (rateLimitError) {
    return Response.json(
      { error: rateLimitError },
      { status: 429 }
    );
  }

  try {
    // Initialize Gemini AI with validated env
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Research prompt
    const prompt = `You are an expert SEO content strategist and market researcher. Conduct comprehensive research on an ecommerce business and develop a strategic list of blog topics with SEO keywords.

Target Website: https://supervek.in

Research Process:

Phase 1: Website & Product Analysis
- Main product categories: Fashion accessories, footwear, apparel
- Target audience: Fashion-conscious, eco-conscious, value-seeking shoppers
- USPs: Sustainable fashion, ethical brands, affordable alternatives

Phase 2: Competitive Intelligence
- Research competitor blogs (Sustainable fashion brands, ethical fashion retailers)
- Identify content gaps and opportunities

Phase 3: Market Trends Research
- Current sustainable fashion trends
- Seasonal patterns (holidays, seasons, trends)
- Recent innovations in eco-friendly materials

Phase 4: Social Media & Forum Analysis
- Common customer questions on Reddit/Quora about sustainable fashion
- Pain points: finding affordable sustainable options
- Trending topics: fast fashion alternatives, eco-friendly choices

Phase 5: Search Intent Analysis
- High-volume keywords in sustainable fashion space
- Long-tail keyword opportunities
- Customer journey keywords

Generate 20-30 blog topics organized into these categories:
1. Product Education (How-to, guides, tutorials)
2. Comparison & Reviews (vs. competitors, alternatives)
3. Problem-Solution (Addressing customer pain points)
4. Trend & News (Industry updates, seasonal content)
5. Lifestyle & Inspiration (Aspirational, use-case content)

For each topic, provide EXACT JSON format (no markdown, no extra text):
{
  "title": "...",
  "primaryKeyword": "...",
  "secondaryKeywords": ["...", "...", "..."],
  "searchIntent": "Informational|Commercial|Transactional",
  "contentAngle": "...",
  "targetAudience": "...",
  "trendJustification": "...",
  "competitiveGap": "...",
  "category": "Product Education|Comparison & Reviews|Problem-Solution|Trend & News|Lifestyle & Inspiration"
}

IMPORTANT: Return ONLY a JSON array. Start with [ and end with ]. No markdown. No other text.`;

    const response = await model.generateContent(prompt);
    const content = response.response.text();

    // Parse JSON response
    let topics: TopicResearch[] = [];
    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON array in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI research results");
    }

    // Delete old topics for this shop
    await prisma.blogTopicResearch.deleteMany({ where: { shop } });

    // Save new topics to database
    const createdTopics = await Promise.all(
      topics.map((topic) =>
        prisma.blogTopicResearch.create({
          data: {
            shop,
            title: topic.title,
            primaryKeyword: topic.primaryKeyword,
            secondaryKeywords: JSON.stringify(topic.secondaryKeywords),
            searchIntent: topic.searchIntent,
            contentAngle: topic.contentAngle,
            targetAudience: topic.targetAudience,
            trendJustification: topic.trendJustification,
            competitiveGap: topic.competitiveGap,
            category: topic.category,
          },
        })
      )
    );

    // Update cache to include all topic IDs
    const topicIds = createdTopics.map((t) => t.id);
    await prisma.keywordSuggestionCache.upsert({
      where: { shop },
      create: {
        shop,
        topicIds: JSON.stringify(topicIds),
      },
      update: {
        topicIds: JSON.stringify(topicIds),
        updatedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      topicCount: createdTopics.length,
      message: `Successfully generated ${createdTopics.length} blog topics!`,
    });
  } catch (error) {
    console.error("Research error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
};
