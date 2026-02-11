-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  triggers TEXT[] DEFAULT '{}',
  strategies JSONB DEFAULT '[]',
  prompt_templates JSONB,
  source TEXT NOT NULL CHECK (source IN ('generated', 'awesome-claude-skills')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill embeddings table
CREATE TABLE IF NOT EXISTS skill_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(skill_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
CREATE INDEX IF NOT EXISTS idx_skill_embeddings_skill_id ON skill_embeddings(skill_id);

-- Vector similarity index using ivfflat (for faster similarity search)
-- Note: This requires at least some data to be effective. Create after indexing skills.
-- CREATE INDEX idx_skill_embeddings_vector ON skill_embeddings 
-- USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function for similarity search
CREATE OR REPLACE FUNCTION match_skills(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  triggers text[],
  strategies jsonb,
  prompt_templates jsonb,
  source text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.description,
    s.triggers,
    s.strategies,
    s.prompt_templates,
    s.source,
    s.created_at,
    s.updated_at,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM skills s
  JOIN skill_embeddings se ON s.id = se.skill_id
  WHERE 1 - (se.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
