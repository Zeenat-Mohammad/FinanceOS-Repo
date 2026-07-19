import financialKnowledgeRaw from '../../../../docs/financial_knowledge.md?raw';

export type FinancialKnowledgeSection = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'what', 'how', 'does', 'are', 'you',
  'your', 'have', 'about', 'should', 'financial', 'money', 'explain'
]);

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%/+\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseSections(markdown: string): FinancialKnowledgeSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: FinancialKnowledgeSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (match) {
      if (current) {
        const content = current.lines.join('\n').trim();
        if (content) sections.push(toSection(current.title, content));
      }
      current = { title: match[2].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) {
    const content = current.lines.join('\n').trim();
    if (content) sections.push(toSection(current.title, content));
  }
  return sections;
}

function toSection(title: string, content: string): FinancialKnowledgeSection {
  const titleTokens = normalize(title).split(' ').filter((token) => token.length > 1);
  const phrases = [normalize(title), ...titleTokens];
  if (title.includes('/')) phrases.push(...title.split('/').map(normalize));
  return { id: `financial-${slug(title)}`, title, content, keywords: [...new Set(phrases)] };
}

export const FINANCIAL_KNOWLEDGE_SECTIONS = parseSections(financialKnowledgeRaw);

export function findFinancialKnowledge(query: string, limit = 3) {
  const normalized = normalize(query);
  const tokens = normalized.split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  return FINANCIAL_KNOWLEDGE_SECTIONS.map((section) => {
    const title = normalize(section.title);
    const body = normalize(section.content);
    let score = 0;
    if (normalized === title) score += 20;
    if (normalized.includes(title) || title.includes(normalized)) score += 10;
    for (const keyword of section.keywords) {
      if (normalized.includes(keyword)) score += keyword.includes(' ') ? 8 : 3;
    }
    for (const token of tokens) {
      if (title.includes(token)) score += 4;
      else if (body.includes(token)) score += 0.35;
    }
    return { section, score };
  })
    .filter((match) => match.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
