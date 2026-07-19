-- RAG foundation for Finlo's financial assistant.
-- Stores embedded knowledge chunks and exposes a similarity-search RPC.

create extension if not exists vector with schema extensions;

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  source_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists rag_documents_set_updated_at on public.rag_documents;
create trigger rag_documents_set_updated_at
before update on public.rag_documents
for each row execute function public.set_updated_at();

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.rag_documents(id) on delete cascade,
  chunk_index integer not null,
  title text not null,
  content text not null,
  token_count integer not null default 0,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, chunk_index),
  constraint rag_chunks_chunk_index_nonnegative check (chunk_index >= 0),
  constraint rag_chunks_token_count_nonnegative check (token_count >= 0)
);

drop trigger if exists rag_chunks_set_updated_at on public.rag_chunks;
create trigger rag_chunks_set_updated_at
before update on public.rag_chunks
for each row execute function public.set_updated_at();

create index if not exists rag_chunks_document_idx
on public.rag_chunks (document_id, chunk_index);

create index if not exists rag_chunks_embedding_idx
on public.rag_chunks
using ivfflat (embedding extensions.vector_cosine_ops)
with (lists = 100)
where embedding is not null;

alter table public.rag_documents enable row level security;
alter table public.rag_chunks enable row level security;

drop policy if exists "rag documents readable by authenticated users" on public.rag_documents;
create policy "rag documents readable by authenticated users"
on public.rag_documents for select
to authenticated
using (true);

drop policy if exists "rag chunks readable by authenticated users" on public.rag_chunks;
create policy "rag chunks readable by authenticated users"
on public.rag_chunks for select
to authenticated
using (true);

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(1536),
  match_count integer default 6,
  min_similarity double precision default 0.72
)
returns table (
  id uuid,
  document_id uuid,
  title text,
  content text,
  source_path text,
  similarity double precision,
  metadata jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    c.title,
    c.content,
    d.source_path,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.metadata || jsonb_build_object('documentTitle', d.title, 'chunkIndex', c.chunk_index) as metadata
  from public.rag_chunks c
  join public.rag_documents d on d.id = c.document_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$$;

comment on function public.match_rag_chunks(extensions.vector, integer, double precision)
is 'Similarity search over Finlo RAG knowledge chunks. Embeddings are generated outside Postgres and stored in rag_chunks.embedding.';

revoke all on function public.match_rag_chunks(extensions.vector, integer, double precision) from public;
grant execute on function public.match_rag_chunks(extensions.vector, integer, double precision) to authenticated;
