import { type LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { safeJsonParse } from "../utils/validation.server";

interface Topic {
  id: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
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
        hasTopics: false,
        suggestions: [],
        totalTopics: 0,
        message: "No research topics yet. Run research first!",
      };
    }

    // Pick top 3-5 suggestions for today
    // Strategy: Rotate based on date to show different topics daily
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000
    );
    const rotationIndex = dayOfYear % allTopics.length;
    
    // Get 3 suggestions starting from rotation index
    const suggestions: Topic[] = [];
    for (let i = 0; i < Math.min(3, allTopics.length); i++) {
      const topic = allTopics[(rotationIndex + i) % allTopics.length];
      suggestions.push({
        id: topic.id,
        title: topic.title,
        primaryKeyword: topic.primaryKeyword,
        secondaryKeywords: safeJsonParse(topic.secondaryKeywords, []),
        category: topic.category,
      });
    }

    return {
      hasTopics: true,
      suggestions,
      totalTopics: allTopics.length,
      lastUpdated: allTopics[0]?.updatedAt || null,
    };
  } catch (error) {
    console.error("Failed to get suggestions:", error);
    return {
      hasTopics: false,
      suggestions: [],
      totalTopics: 0,
      error: "Failed to load suggestions",
    };
  }
};
