import { findFinancialKnowledge } from '../knowledge/financialKnowledge';
import { FINLO_KNOWLEDGE, type KnowledgeArticle } from '../knowledge/finloKnowledge';

export type RagSource = {
  id: string;
  title: string;
  excerpt: string;
  sourcePath: string;
  similarity: number;
};

export type RagResult = {
  answer: string;
  sources: RagSource[];
  confidence: number;
  relatedRoutes?: string[];
  articleId?: string;
};

function clip(value: string, length = 520) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= length ? clean : `${clean.slice(0, length).trim()}…`;
}

function confidenceFromScore(score: number) {
  if (score >= 18) return 0.92;
  if (score >= 12) return 0.82;
  if (score >= 8) return 0.7;
  return 0.58;
}

function formatSources(sources: RagSource[]) {
  if (!sources.length) return '';
  return `\n\nSources:\n${sources.map((source, index) => `[${index + 1}] ${source.title} — ${source.sourcePath}`).join('\n')}`;
}

export async function retrieveRagAnswer(query: string): Promise<RagResult | null> {
  const financialMatches = findFinancialKnowledge(query, 5);
  if (financialMatches.length > 0) {
    const top = financialMatches[0];
    const sources = financialMatches.slice(0, 3).map((match) => ({
      id: match.section.id,
      title: match.section.title,
      excerpt: clip(match.section.content),
      sourcePath: 'docs/financial_knowledge.md',
      similarity: Math.min(0.98, match.score / 24)
    }));
    const related = financialMatches.slice(1, 3).map((match) => match.section.title);
    return {
      articleId: top.section.id,
      confidence: confidenceFromScore(top.score),
      sources,
      relatedRoutes: financialRoutes(top.section.title),
      answer: `**${top.section.title}**\n\n${top.section.content}${related.length ? `\n\nRelated: ${related.join(' · ')}` : ''}${formatSources(sources)}`
    };
  }

  const productMatches = findKnowledgeMatches(query, 4);
  if (!productMatches.length) return null;

  const top = productMatches[0];
  const sources = productMatches.slice(0, 3).map((match) => ({
    id: match.article.id,
    title: match.article.title,
    excerpt: clip(match.article.answer),
    sourcePath: 'src/features/assistant/knowledge/finloKnowledge.ts',
    similarity: Math.min(0.96, match.score / 20)
  }));

  const extras =
    productMatches.length > 1
      ? `\n\nRelated: ${productMatches
          .slice(1)
          .map((m) => m.article.title)
          .join(' · ')}`
      : '';

  return {
    articleId: top.article.id,
    confidence: confidenceFromScore(top.score),
    sources,
    relatedRoutes: top.article.relatedRoutes,
    answer: `**${top.article.title}**\n\n${top.article.answer}${extras}${formatSources(sources)}`
  };
}

function findKnowledgeMatches(query: string, limit = 4): Array<{ article: KnowledgeArticle; score: number }> {
  const normalized = query.toLowerCase().replace(/[^\w\s+/.-]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = normalized.split(' ').filter((token) => token.length > 2);
  return FINLO_KNOWLEDGE.map((article) => {
    const haystack = `${article.title} ${article.summary} ${article.keywords.join(' ')} ${article.answer}`.toLowerCase();
    let score = haystack.includes(normalized) ? 10 : 0;
    for (const token of tokens) {
      if (article.title.toLowerCase().includes(token)) score += 4;
      else if (haystack.includes(token)) score += 1;
    }
    for (const keyword of article.keywords) {
      if (normalized.includes(keyword.toLowerCase())) score += keyword.includes(' ') ? 6 : 2;
    }
    return { article, score };
  })
    .filter((match) => match.score >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function financialRoutes(title: string): string[] {
  const value = title.toLowerCase();
  if (value.includes('budget') || value.includes('cash flow')) return ['/budget', '/categories'];
  if (value.includes('goal') || value.includes('sinking') || value.includes('emergency')) return ['/goals', '/savings'];
  if (value.includes('debt') || value.includes('apr') || value.includes('loan') || value.includes('credit')) return ['/debt'];
  if (value.includes('invest') || value.includes('asset') || value.includes('diversif') || value.includes('risk')) return ['/net-worth'];
  if (value.includes('forecast') || value.includes('inflation') || value.includes('cpi')) return ['/forecast'];
  return [];
}
