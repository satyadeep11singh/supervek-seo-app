// app/utils/validation.server.ts
// Sanitize and validate all user inputs to prevent injection attacks

const MAX_KEYWORD_LENGTH = 100;
const MAX_WORDCOUNT = 5000;
const VALID_SEARCH_INTENTS = ['informational', 'commercial', 'transactional'];
const VALID_TONES = ['authoritative', 'casual', 'formal', 'friendly'];
const VALID_AUDIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_COUNTRIES = ['US', 'UK', 'CA', 'AU', 'IN', 'DE', 'FR', 'ES'];

export function validateKeyword(keyword: string): string {
  if (!keyword || typeof keyword !== 'string') {
    throw new Error('Keyword is required');
  }
  
  const trimmed = keyword.trim();
  
  if (trimmed.length === 0 || trimmed.length > MAX_KEYWORD_LENGTH) {
    throw new Error(`Keyword must be 1-${MAX_KEYWORD_LENGTH} characters`);
  }
  
  // Only allow alphanumeric, spaces, hyphens, underscores, parentheses
  if (!/^[a-zA-Z0-9\s\-_()]+$/.test(trimmed)) {
    throw new Error('Keyword contains invalid characters');
  }
  
  return trimmed;
}

export function validateSecondaryKeywords(keywords: string): string {
  if (!keywords || typeof keywords !== 'string') {
    return '';
  }
  
  const trimmed = keywords.trim();
  
  if (trimmed.length > 500) {
    throw new Error('Secondary keywords too long (max 500 characters)');
  }
  
  if (!/^[a-zA-Z0-9\s\-_(),]+$/.test(trimmed)) {
    throw new Error('Secondary keywords contain invalid characters');
  }
  
  return trimmed;
}

export function validateSearchIntent(intent: string): string {
  if (!VALID_SEARCH_INTENTS.includes(intent)) {
    throw new Error(`Invalid search intent: ${intent}`);
  }
  return intent;
}

export function validateTone(tone: string): string {
  if (!VALID_TONES.includes(tone)) {
    throw new Error(`Invalid tone: ${tone}`);
  }
  return tone;
}

export function validateAudienceLevel(level: string): string {
  if (!VALID_AUDIENCE_LEVELS.includes(level)) {
    throw new Error(`Invalid audience level: ${level}`);
  }
  return level;
}

export function validateCountry(country: string): string {
  if (!VALID_COUNTRIES.includes(country)) {
    throw new Error(`Invalid country: ${country}`);
  }
  return country;
}

export function validateWordCount(count: string): number {
  const num = parseInt(count, 10);
  
  if (isNaN(num) || num < 500 || num > MAX_WORDCOUNT) {
    throw new Error(`Word count must be 500-${MAX_WORDCOUNT}`);
  }
  
  return num;
}

export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
