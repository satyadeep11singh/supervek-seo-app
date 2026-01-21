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

// Helper function to fetch and parse sitemap URLs - with SSRF protection
async function fetchSitemapUrls(
  sitemapUrl: string
): Promise<string[]> {
  try {
    // SECURITY: Validate URL is HTTPS and on supervek.in domain only
    const url = new URL(sitemapUrl);
    if (url.hostname !== 'supervek.in') {
      console.error(`Security: Invalid sitemap URL hostname: ${url.hostname}`);
      return [];
    }
    if (url.protocol !== 'https:') {
      console.error('Security: Invalid sitemap URL protocol (must be HTTPS)');
      return [];
    }

    // SECURITY: Add timeout to prevent hanging requests (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Supervek-SEO-App/1.0' },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    
    // SECURITY: Limit response size to 5MB to prevent DoS
    const text = await response.text();
    if (text.length > 5 * 1024 * 1024) {
      console.error('Security: Sitemap response too large');
      return [];
    }
    
    // Extract all <loc> tags from the XML
    const urlMatches = text.match(/<loc>([^<]+)<\/loc>/g);
    if (!urlMatches) return [];
    
    return urlMatches
      .map((match) => match.replace(/<\/?loc>/g, ""))
      .filter((url) => url.includes("supervek.in"));
  } catch (error) {
    // SECURITY: Don't expose full error details - log safely
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('Sitemap fetch timeout (security: request aborted after 5s)');
      } else {
        console.error('Sitemap fetch error:', error.name);
      }
    }
    return [];
  }
}

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
  productCollectionLinks?: string[];
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

    // 3.5 Fetch product and collection URLs from sitemaps for internal linking
    const isDev = env.NODE_ENV === 'development';
    if (isDev) console.log("Fetching product and collection URLs from sitemaps...");
    
    const [productUrls, collectionUrls] = await Promise.all([
      fetchSitemapUrls("https://supervek.in/sitemap_products_1.xml"),
      fetchSitemapUrls("https://supervek.in/sitemap_collections_1.xml"),
    ]);
    
    // Format URLs for the prompt (take a sample of each for context)
    const productSample = productUrls.slice(0, 10).join("\n    ");
    const collectionSample = collectionUrls.slice(0, 5).join("\n    ");
    
    if (isDev) {
      console.log(
        `Fetched ${productUrls.length} product URLs and ${collectionUrls.length} collection URLs`
      );
    }

    // 4. Create comprehensive SEO prompt - USE VALIDATED VARIABLES ONLY
    const prompt = `# ELITE SEO CONTENT STRATEGIST & ARCHITECT

You are an expert SEO strategist combining:
- Competitive SERP Analysis
- Google EEAT & Quality Rater Guidelines (E-E-A-T signals critical)
- Semantic Search & NLP Optimization
- Content Differentiation Strategy
- Technical SEO Implementation
- AI Answer Snippet Optimization (GEO for ChatGPT/Perplexity/Google AI Overviews)
- Pillar-Cluster Content Architecture

Your goal: Create a data-driven, strategically differentiated blog article designed to outrank competitors through superior value and AI visibility.

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
PUBLICATION: Supervek Blog (Fashion & Accessories brand, India-focused)

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
PHASE 2B: SUPERVEK PRODUCT & COLLECTION INTERNAL LINKING
═══════════════════════════════════════════════════════════

AVAILABLE INTERNAL LINKS FROM SUPERVEK STORE:

SAMPLE PRODUCT URLS (use contextually relevant ones):
${productSample}

SAMPLE COLLECTION URLS (use contextually relevant ones):
${collectionSample}

INTERNAL LINKING STRATEGY:
✓ Link 2-3 relevant PRODUCTS when discussing specific items, styles, or solutions
✓ Link 1-2 relevant COLLECTIONS when discussing product categories
✓ Use natural, contextual anchor text (e.g., "Fanny Pack collection", "Carbon Black Slinger")
✓ Anchor text must match product/collection name or relevant keyword variation
✓ Distribute links naturally throughout article (not all in one section)
✓ Link to products that solve the reader's problem mentioned in the blog
✓ Example: "For campus carry, the [Carbon Black Slinger collection](link) provides..."
✓ Example: "Check out our [Fanny Packs collection](link) for various styles..."

LINKING RULES:
- NEVER force a product link where it doesn't fit contextually
- Links should enhance reader experience and provide solution
- Maximum 3-4 product/collection links per article
- Prioritize high-relevance products/collections over forcing all links
- Use descriptive anchor text with keywords when possible
═══════════════════════════════════════════════════════════

Include 10-15 core entities Google expects:
- Related concepts, terminology, industry tools
- Common problems and solutions
- Alternative approaches and methodologies
- Key industry figures or companies
- Complementary topics and processes

Use natural LSI keywords and question-based phrases throughout.

═══════════════════════════════════════════════════════════
PHASE 4: CONTENT ARCHITECTURE & STRUCTURE
═══════════════════════════════════════════════════════════

ARTICLE TYPE DETERMINATION:
- If word count > 3500: PILLAR PAGE (comprehensive, links to all clusters)
- If word count < 2500: CLUSTER PAGE (focused, links back to pillar)
- PILLAR: 3000-5000+ words, Table of Contents, covers all subtopics
- CLUSTER: 1500-2500 words, single subtopic focus, direct answer in first paragraph

PILLAR PAGE STRUCTURE:
├─ H1: Primary keyword - Benefit statement (50-60 chars)
├─ Table of Contents (anchor-linked for navigation)
├─ Introduction + Comprehensive Overview
├─ Definition/Core Concept Section (40-50 word direct answer)
├─ Must-Have Competitive Subtopics (all major angles competitors cover)
├─ YOUR UNIQUE DIFFERENTIATION SECTION (specific angle, original research, case studies)
├─ Step-by-Step Process/How-To (numbered for featured snippets)
├─ Common Mistakes/Pitfalls + Solutions
├─ Expert Tips & Best Practices
├─ FAQPage Section (6-8 Q&As for "People Also Ask")
├─ Conclusion & Next Steps
└─ Author Bio with E-E-A-T credentials + LinkedProfilePage schema

CLUSTER PAGE STRUCTURE:
├─ H1: Long-tail keyword variation
├─ Introduction (answer query directly in first 40-50 words)
├─ Definition/Overview (if needed for this specific subtopic)
├─ Core Content Sections (3-5 focused H2s)
├─ Comparison/Table (if applicable for snippet opportunity)
├─ FAQ Section (3-5 Q&As targeting related "People Also Ask")
├─ Link Back to Pillar + Cross-link Related Clusters
└─ Author Bio + Breadcrumb Navigation

FORMATTING REQUIREMENTS:
✓ H1: One per page (primary keyword, benefit-focused)
✓ H2→H3→H4: Proper hierarchy (no skipping levels)
✓ Question-based H2s: Format as "What is...?", "How to...?", "Why...?" for snippet optimization
✓ Paragraphs: Max 3 sentences (mobile scannable)
✓ Lists: Bullets for benefits/features; Numbers for processes
✓ Tables: Clean HTML for data comparisons (featured snippet opportunity)
✓ Bold: Key takeaways (1-2 per section for emphasis)
✓ Examples: Specific, named examples instead of generic "many companies"
✓ Transitions: Smooth, natural between sections

═══════════════════════════════════════════════════════════
PHASE 5: AI ANSWER SNIPPET OPTIMIZATION (GEO - CRITICAL)
═══════════════════════════════════════════════════════════

For maximum visibility in ChatGPT, Perplexity, Google AI Overviews:

✓ Include 2-3 statistics per article with citations (30-40% higher AI visibility)
✓ Cite authoritative sources (.gov, .edu, industry research)
✓ Clear definitions immediately after H2 headings (40-50 words for AI extraction)
✓ Structured format: Bulleted lists, numbered steps, tables (AI-parsable)
✓ Fresh content: "Last Updated: [Today's date]" visible at top
✓ Brand mentions: Get mentioned on other sites for AI inclusion
✓ Featured Snippet targets:
  - Definition box: "What is [keyword]?" → 40-50 word answer
  - List snippet: "How to [keyword]" → Numbered steps (5-7 items)
  - Table snippet: Comparisons with clear column headers
  - FAQ snippet: Diverse question angles with concise answers

CRITICAL FOR AI SYSTEMS:
- Open with strongest claim/insight (AI extracts top paragraphs)
- Use specific numbers/data (AI prioritizes quantified statements)
- Link claims to sources (AI checks citation authority)
- Vary question formats ("What vs Why vs How vs When" for PAA diversity)
- Include expert quotes with attribution
- Provide contrarian insights (challenges common wisdom)

═══════════════════════════════════════════════════════════
PHASE 6: EEAT IMPLEMENTATION
═══════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════
PHASE 6: EEAT IMPLEMENTATION
═══════════════════════════════════════════════════════════

MANDATORY TRUST SIGNALS (Expertise, Experience, Authoritativeness, Trustworthiness):
1. **Author credentials**: Explicit expertise level + years in field
2. **Author page**: ProfilePage schema with LinkedIn link for verification
3. **Citations**: 4-6 authoritative sources (.gov, .edu, industry leaders, peer-reviewed)
4. **Original evidence**: Specific case studies, real-world examples, unique methodology
5. **Transparency**: Affiliate disclosures, limitations acknowledged, balanced perspective
6. **Expert sourcing**: Direct quotes from recognized authorities with attribution
7. **Last Updated**: Visible date showing freshness (updates = trust signal)
8. **Brand authority**: Mention in other reputable publications (off-site E-E-A-T)

═══════════════════════════════════════════════════════════
PHASE 7: SCHEMA MARKUP IMPLEMENTATION
═══════════════════════════════════════════════════════════

REQUIRED SCHEMA MARKUP (JSON-LD format):

1. **Article Schema** (ALL pages):
   - @type: Article
   - headline: Exact H1 title
   - author: Person object with @id reference to ProfilePage
   - datePublished: Publish date
   - dateModified: Today's date
   - image: Featured image URL(s)
   - publisher: Organization (Supervek)

2. **ProfilePage Schema** (Author credibility):
   - @type: ProfilePage
   - @id: https://supervek.in/author/[author-name]
   - name: Author name with credentials
   - url: Author profile URL
   - sameAs: LinkedIn profile

3. **FAQPage Schema** (For FAQ sections):
   - @type: FAQPage
   - mainEntity: Array of Question objects
   - Each question: text + acceptedAnswer with text
   - Validates in Google Rich Results Test

4. **BreadcrumbList Schema** (Navigation hierarchy):
   - @type: BreadcrumbList
   - itemListElement: ["Home", "Category", "Pillar", "Article"]
   - Format: Home > Category > [Article Type] > [Current Article]

═══════════════════════════════════════════════════════════
PHASE 8: ANTI-AI DETECTION & HUMAN AUTHENTICITY
═══════════════════════════════════════════════════════════

AVOID (AI detector red flags):
❌ Generic openings: "In today's digital world..."
❌ Hedging: "might," "could," "may," "possibly"
❌ Overused transitions: "Moreover," "Furthermore," "In addition"
❌ Formulaic conclusions: "In conclusion, [keyword] is important..."
❌ List overload: Making every point a bullet
❌ Perfect formatting: Too rigid/mechanical without natural flow

USE INSTEAD (Human authenticity signals):
✅ Strong hooks: Surprising stats, contrarian takes, specific scenarios
✅ Conversational tone: "Here's the thing," "I've seen," "Let's be honest"
✅ Definitive statements: Show expertise with confidence
✅ Specific examples: Named brands, real case studies, concrete details
✅ Varied sentence structure: Mix short punchy (3-5 words) with longer explanatory
✅ Natural keyword placement: Only because it's contextually necessary
✅ Personality: Analogies, humor, relatable examples, personal insights
✅ Non-obvious insights: Challenge common wisdom where appropriate

═══════════════════════════════════════════════════════════
PHASE 9: TECHNICAL SEO OPTIMIZATION
═══════════════════════════════════════════════════════════

ON-PAGE SEO REQUIREMENTS:
✓ Title (50-60 chars): Keyword early, benefit-driven, compelling
✓ Meta description (155-160 chars): Keyword, value prop, clear CTA
✓ URL slug: Primary keyword, 3-5 words, lowercase hyphens
✓ H1 contains primary keyword naturally
✓ First 100 words include primary keyword
✓ Secondary keywords in H2/H3 headings (naturally, not forced)
✓ Keyword density: 0.5-1.5% (natural distribution, never stuffed)
✓ 3-5 internal links with descriptive anchor text to related content
✓ 2-3 external links to authoritative sources (.gov, .edu, industry leaders)
✓ FAQ section optimized for featured snippets (clear Q&As)
✓ Image alt text with keywords + descriptive
✓ Paragraphs: 2-3 sentences max for mobile scannability
✓ Page speed: Optimized images < 200KB each
✓ Mobile-friendly: Responsive design verified

═══════════════════════════════════════════════════════════
PHASE 10: FAQ SECTION - FEATURED SNIPPET & PAA OPTIMIZATION
═══════════════════════════════════════════════════════════

Create 6-8 FAQs targeting "People Also Ask" queries:
- **Pillar pages**: 6-8 diverse questions covering topic breadth
- **Cluster pages**: 3-5 focused questions for specific subtopic
- Start with direct answer (40-60 words for featured snippet extraction)
- Questions include: Definition, How-to, Why important, Comparison, Common mistakes, When to use
- Format naturally with H3 questions + paragraph answers (not bulleted)
- Ensure each answer stands alone (AI systems pull individual answers)

═══════════════════════════════════════════════════════════
FINAL OUTPUT (JSON ONLY - NO MARKDOWN BLOCKS, NO EXTRA TEXT)
═══════════════════════════════════════════════════════════

{
  "articleType": "PILLAR or CLUSTER (based on content scope and word count)",
  
  "competitiveIntelligence": {
    "avgWordCount": "Estimated min-max word count of top 10 competitors (e.g., '2500-4500')",
    "contentGaps": ["Unaddressed angle 1", "Unaddressed topic 2", "Missing perspective 3"],
    "mustHaveSubtopics": ["Essential topic competitors all cover 1", "Must-include section 2", "Core concept 3"],
    "serpFeatures": ["Featured snippet opportunity", "FAQ box potential", "Comparison table", "Video carousel"],
    "differentiationOpportunity": "Your specific unique angle to outrank competitors and fill gaps"
  },

  "differentiationStrategy": {
    "primaryAngle": "The main unique selling point vs competitors (e.g., original research, contrarian view, deeper analysis)",
    "uniqueElements": ["Original case study with results", "Specific methodology or framework", "Updated 2025 data/insights", "Expert interviews", "Comprehensive comparison table"],
    "valueProposition": "One clear sentence: What specific reader problem does this solve better than competitors?"
  },

  "titleOptions": [
    "Title 1 - Keyword-focused, benefit-driven (50-60 chars, search-optimized)",
    "Title 2 - Alternative angle (comparison, question-based, or how-to)",
    "Title 3 - Question-based approach (What is, How to, Why should)",
    "Title 4 - List/How-to angle (for listicle or process-based topics)",
    "Title 5 - Comparison angle (vs alternative, showdown, battle format)"
  ],

  "selectedTitle": "The highest-performing title from the options above",

  "metaDescription": "155-160 character description including primary keyword, clear value proposition, and subtle CTA",

  "urlSlug": "primary-keyword-format-3-5-words",

  "articleContent": "Complete HTML article structure: <h1>Title</h1> through full content with proper H2/H3 hierarchy. Include: Introduction, Definition section (40-50 word answer), Must-have competitive subtopics, YOUR unique differentiation section with original elements, Step-by-step process (numbered for snippets), Common mistakes to avoid, Expert tips & best practices, and strong Conclusion. For PILLAR: Table of Contents at top, link to all related clusters. For CLUSTER: Link back to parent pillar. Natural keyword placement (0.5-1.5% density). Paragraphs max 3 sentences. Minimum ${validatedWordCount} words.",

  "tableOfContents": ["Section 1", "Section 2", "Section 3", "..."] (PILLAR PAGES ONLY - provides anchor navigation),

  "faqSection": [
    {
      "question": "What is ${validatedKeyword}?",
      "answer": "Direct definition in 40-60 words with primary keyword and key differentiators"
    },
    {
      "question": "How [does it work / should you use] ${validatedKeyword}?",
      "answer": "Clear process explanation with 3-5 concrete steps or practical guidance"
    },
    {
      "question": "Why is ${validatedKeyword} important [for your audience]?",
      "answer": "Value proposition, benefits, and real-world impact explanation (40-60 words)"
    },
    {
      "question": "When should you [use / consider] ${validatedKeyword}?",
      "answer": "Specific use cases, scenarios, and circumstances where it applies"
    },
    {
      "question": "What are common ${validatedKeyword} mistakes to avoid?",
      "answer": "Specific pitfalls, red flags, and how to prevent them"
    },
    {
      "question": "${validatedKeyword} vs [alternative/competitor]: What's the difference?",
      "answer": "Direct comparison highlighting unique advantages of primary option"
    }
  ],

  "schemaMarkup": {
    "types": [
      "Article (with author Person object with @id, datePublished, dateModified)",
      "ProfilePage (for author credibility and E-E-A-T)",
      "FAQPage (for FAQ section with Question/Answer pairs)",
      "BreadcrumbList (for content hierarchy navigation)"
    ],
    "implementation": "Implement all 4 schema types using JSON-LD format in article template. Validate with Google Rich Results Test.",
    "articleSchema": {
      "headline": "[Article title]",
      "author": {
        "@type": "Person",
        "@id": "https://supervek.in/author/[name]",
        "name": "Expert name with credentials"
      },
      "datePublished": "[Today's date]",
      "dateModified": "[Today's date]",
      "image": "[Featured image URL]",
      "publisher": {
        "@type": "Organization",
        "name": "Supervek"
      }
    }
  },

  "eeatSignals": {
    "authorBio": "Author name: [Specific title/expertise] with [X] years experience. Featured in [publications/recognition]. LinkedIn: [URL]",
    "citationPlan": [
      "[Authoritative .gov/.edu source] for [specific claim/statistic]",
      "[Industry research/study] supporting [specific data point]",
      "[Named expert/thought leader] regarding [specific insight]",
      "[Academic study/whitepaper] for [fact/finding]",
      "[Industry leader/brand] example demonstrating [concept]"
    ],
    "originalElements": [
      "Specific case study with measurable results",
      "Proprietary methodology or framework unique to this article",
      "Original data point, survey result, or research finding",
      "Contrarian perspective challenging common industry wisdom",
      "Exclusive expert interview or quote"
    ]
  },

  "internalLinkingSuggestions": [
    "Link [Pillar page title] with anchor '[keyword variation]' - appears in [specific section] for context",
    "Link [Related cluster article] with anchor '[specific subtopic phrase]' - cross-linking with related content",
    "Link [Supporting guide] with anchor '[descriptive phrase]' - for deeper reader exploration",
    "Link [Foundational article] with anchor '[terminology]' - helping readers understand prerequisites",
    "Link [Supervek Product/Collection] with anchor '[product name/category]' from provided URLs - contextually relevant solution for reader"
  ],

  "productCollectionLinks": [
    "Use 2-3 contextually relevant PRODUCT links from the provided Supervek product URLs",
    "Use 1-2 contextually relevant COLLECTION links from the provided Supervek collection URLs",
    "Example: When discussing college carry options, link to relevant fanny pack products/collections",
    "Example: When discussing wallet materials, link to relevant wallet collections or specific wallet products",
    "Example: When discussing headwear styles, link to relevant cap/hat collections or specific designs",
    "Only link products/collections that solve a problem mentioned in the blog content"
  ],

  "externalLinkingSuggestions": [
    "Cite [.gov/.edu/industry source] for [specific claim] - Link: [URL]",
    "Reference [industry research/study] for [statistic/data] - Link: [URL]",
    "Quote [recognized expert] for [insight] - Link: [expert profile or publication]",
    "Link to [authoritative publication/blog] for [information type] - Link: [URL]"
  ],

  "imageRequirements": [
    "Featured/Hero image: [Specific description] - Size: 1200x630px (16:9 ratio), Filename: [descriptive-name].jpg",
    "Inline image 1: [Concept to visualize] - Size: 800-1200px width, Alt text: [keyword-rich description]",
    "Inline image 2: [Comparison or process diagram] - Size: 800-1200px width, Alt text: [relevant keywords]",
    "Inline image 3: [Additional visual element] - Size: 800-1200px width, Alt text: [descriptive]"
  ],

  "technicalSEOChecklist": {
    "completed": [
      "✓ Primary keyword '${validatedKeyword}' in: title (first 60 chars), H1, first 100 words, last paragraph",
      "✓ Secondary keywords in H2/H3 headings: [list keywords placed]",
      "✓ Keyword density: 0.5-1.5% (natural distribution, zero stuffing)",
      "✓ Proper H1→H2→H3 hierarchy: No skipped heading levels throughout",
      "✓ Word count: [actual count] words (meets/exceeds ${validatedWordCount} minimum and competitor benchmarks)",
      "✓ Paragraphs: All limited to 2-3 sentences max for mobile scannability",
      "✓ Lists: Strategic use of bullets for benefits/features and numbers for processes",
      "✓ Tables: [X] comparison tables with clean HTML structure for snippet optimization",
      "✓ FAQ section: [X] Q&As targeting People Also Ask queries with featured snippet formatting",
      "✓ Internal links: [X] contextual links to related pillar/cluster articles with keyword-rich anchor text",
      "✓ External links: [X] citations to authoritative sources (.gov, .edu, industry leaders)",
      "✓ Meta description: 155-160 characters with primary keyword, value prop, and CTA",
      "✓ Images: [X] images optimized < 200KB with descriptive filenames and keyword-rich alt text",
      "✓ 'Last Updated' date: Visible at top/bottom for freshness signal",
      "✓ Author bio: Present with E-E-A-T credentials and social/professional links"
    ]
  },

  "contentSummary": "2-3 sentence summary of key value proposition, main takeaways, and why this content uniquely serves the reader's search intent",

  "contentStrategy": {
    "pageType": "PILLAR (3000-5000+ words, comprehensive, links to clusters) OR CLUSTER (1500-2500 words, focused, links to pillar)",
    "linkedContent": "PILLAR links to: [list of 6-7 related cluster articles]. CLUSTER links back to: [parent pillar name] and cross-links: [2-3 related clusters]",
    "targetAIVisibility": "Optimized for ChatGPT, Perplexity, Google AI Overviews through featured snippet targeting, statistics with citations, and structured data markup"
  },

  "tags": ["primary-keyword", "secondary-keyword", "topic-category", "use-case", "audience-segment", "related-concept", "industry-term"],

  "postPublishChecklist": [
    "Add author bio section with E-E-A-T credentials (title, experience, social links, LinkedProfilePage schema)",
    "Add 'Last Updated: [Today's date]' prominently at top for freshness signal",
    "Implement all 4 schema markups: Article, FAQPage, ProfilePage, BreadcrumbList (validate with Google Rich Results Test)",
    "Optimize and compress all images to < 200KB each with descriptive filenames",
    "Add internal links from 3-5 related existing articles pointing TO this article",
    "Create Google Search Console tracking for this URL and keyword tracking",
    "Set up Google Analytics events for engagement (time on page, scroll depth, internal link clicks)",
    "Add to internal linking map for future content strategy",
    "Plan content refresh date (6 months) for 'Last Updated' maintenance and fresh insights",
    "Submit sitemap to Google Search Console for faster indexing"
  ]
}

═══════════════════════════════════════════════════════════
EXECUTION INSTRUCTIONS (10-PHASE PROCESS)
═══════════════════════════════════════════════════════════

1. **ARTICLE TYPE**: Determine if PILLAR (3000-5000+ words) or CLUSTER (1500-2500 words)
2. **COMPETITIVE ANALYSIS**: Understand top 10 competitors, gaps, must-have topics, word counts, SERP features
3. **DIFFERENTIATION**: Define what makes this uniquely better (research, contrarian view, deeper analysis, original data)
4. **SEMANTIC ENTITIES**: Map 10-15 concepts Google expects for this topic
5. **CONTENT ARCHITECTURE**: Structure with clear H1→H2→H3 hierarchy, proper sections, Table of Contents (if pillar)
6. **AI SNIPPET OPTIMIZATION**: Include 2-3 statistics with citations, structured format, direct 40-50 word answers
7. **EEAT IMPLEMENTATION**: Author credentials, citations, original evidence, transparency, expert sourcing
8. **SCHEMA MARKUP**: Plan Article, ProfilePage, FAQPage, BreadcrumbList JSON-LD implementation
9. **HUMAN AUTHENTICITY**: Write with personality, specific examples, conversational tone (not robotic)
10. **TECHNICAL SEO**: Validate all on-page SEO, keyword density, internal/external links, meta tags, images

CRITICAL QUALITY GATES:
✓ Genuinely better value than competitors (user-first, SEO-second)
✓ No generic AI patterns ("In today's world..." etc)
✓ E-E-A-T signals present and verifiable
✓ Proper schema markup for AI visibility
✓ Scannable formatting with mobile in mind
✓ Match or EXCEED competitor word counts
✓ Every claim substantiated with specific examples or citations
✓ For PILLAR: Links to all relevant cluster articles
✓ For CLUSTER: Links back to parent pillar + cross-links

NOW EXECUTE: Create the complete article following all 10 phases and 3 quality gates above.
Return ONLY the JSON object with all fields populated. No markdown code blocks. No extra text. No exceptions.`;

    // 5. Call Gemini API
    console.log("Calling Gemini API...");
    
    // SECURITY: Validate prompt size to prevent token exhaustion
    const estimatedTokens = Math.ceil(prompt.length / 4); // Rough estimate: ~4 chars per token
    const MAX_TOKENS = 100000;
    
    if (estimatedTokens > MAX_TOKENS) {
      return Response.json(
        { 
          error: `Request too large (estimated ${estimatedTokens} tokens, max ${MAX_TOKENS}). Reduce keyword or secondary keyword length.` 
        },
        { status: 413 } // Payload Too Large
      );
    }
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 6. Parse response
    console.log("Parsing Gemini response...");
    let blogData: BlogData;
    try {
      // Strip markdown code fence if present
      let cleanedText = text;
      // Remove opening markdown code fence
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```[\w]*\n?/, "");
      }
      // Remove closing markdown code fence
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.replace(/\n?```$/, "");
      }
      cleanedText = cleanedText.trim();

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
      const articleContentCheck = blogData.articleContent || (blogData as unknown as Record<string, unknown>).content;
      if (!articleContentCheck) {
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
    const articleContent = blogData.articleContent || (blogData as unknown as Record<string, unknown>).content || "";
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
