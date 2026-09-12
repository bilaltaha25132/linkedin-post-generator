-- Default monitoring topics, aligned to Bilal's expertise and audience.
-- Editable later from the /sources page; safe to re-run (no duplicates).

insert into sources (kind, value, label)
select kind, value, label
from (values
  ('search', 'RAG retrieval augmented generation production engineering', 'RAG in production'),
  ('search', 'LLM agents LangGraph agent orchestration', 'Agents & orchestration'),
  ('search', 'prompt injection LLM security guardrails', 'LLM security'),
  ('search', 'vector database pgvector semantic search embeddings', 'Vector search'),
  ('search', 'AI coding agents software engineering workflow', 'Agentic coding'),
  ('search', 'LLM observability evaluation hallucination', 'Eval & observability'),
  ('search', 'new AI model release OpenAI Anthropic Google', 'Model releases')
) as seed(kind, value, label)
where not exists (select 1 from sources s where s.value = seed.value);
