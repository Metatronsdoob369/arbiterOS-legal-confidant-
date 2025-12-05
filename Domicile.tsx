import React from 'react';

export const Domicile: React.FC = () => {
  return (
    <div className="p-8 text-neutral-200 font-mono h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6 text-white uppercase tracking-widest">Domicile Setup Guide</h1>
      
      <p className="mb-6 text-sm leading-relaxed">
        Given that the Brain cannot function without the Foundation, I strongly recommend we Deploy the Schema first.
      </p>

      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-white border-b border-neutral-700 pb-2">🏛️ Step 1: The Domicile Schema (SQL)</h2>
        <p className="mb-4 text-xs text-neutral-400">Run this in your Supabase SQL Editor. This sets up the Physics, Biology, and Memory of your organism.</p>
        
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre">
{`-- 1. EXTENSIONS
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- 2. THE CONSTITUTION (Brand Rules)
create table brand_constitution (
  id uuid primary key default uuid_generate_v4(),
  version text not null,
  rules jsonb not null, -- { "tone": "professional", "banned_words": [...] }
  active boolean default false,
  created_at timestamptz default now()
);

-- 3. THE HIPPOCAMPUS (Memory Store)
create table content_memory (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  platform text not null, -- 'linkedin', 'twitter', etc.
  embedding vector(1536), -- OpenAI Embedding
  
  -- The Outcome Data (Reinforcement Learning)
  engagement_score float default 0, -- Normalized 0-100
  posted_at timestamptz,
  
  metadata jsonb, -- { "topics": [...], "original_nerve_signal_id": ... }
  created_at timestamptz default now()
);

-- Index for fast vector search
create index on content_memory using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. THE AUDIT LEDGER (Immutable Log)
create table audit_receipts (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null, -- From the Code Node
  action_type text not null, -- 'CONTENT_POSTED', 'REJECTED'
  
  -- The Proof
  content_hash text not null,
  signature text not null, -- HMAC
  
  -- The Trace
  execution_id text not null,
  decision_chain jsonb, -- { "critic_score": 92, "rationale": ... }
  
  timestamp timestamptz not null
);

-- 5. RPC FUNCTION (The Memory Recall Logic)
create or replace function query_cacao_memory(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_platform text
)
returns table (
  id uuid,
  content text,
  similarity float,
  engagement_score float
)
language sql stable
as $$
  select
    id,
    content,
    1 - (content_memory.embedding <=> query_embedding) as similarity,
    engagement_score
  from content_memory
  where 1 - (content_memory.embedding <=> query_embedding) > match_threshold
  and platform = filter_platform
  order by similarity desc
  limit match_count;
$$;`}
          </pre>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-white border-b border-neutral-700 pb-2">🧠 Step 2: The Cognition Hub (The Brain)</h2>
        <p className="mb-2 text-xs text-neutral-400">Now that the database exists, here is the Logic for COG-001 (The n8n workflow that Thinks).</p>
        <p className="mb-4 text-xs text-neutral-400">I will provide the JavaScript Code for the Critic Loop, as that is the hardest part to get right in n8n.</p>
        
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-blue-400 uppercase">Node: CRITIC_LOOP_CONTROLLER</span>
            <span className="text-[10px] text-neutral-500">(Place this after the Critic Agent node)</span>
          </div>
          <pre className="text-xs text-yellow-400 font-mono whitespace-pre">
{`// Input: The output from the Critic Agent (LLM)
const critic = items[0].json;
const originalSignal = $('NERVE_SIGNAL_FACTORY').first().json; // The Start Node

// 1. EXTRACT SCORE
const score = critic.score || 0;
const MAX_RETRIES = 2;
const currentRetries = originalSignal._meta.retryCount || 0;

// 2. DECISION LOGIC
if (score >= 90) {
  // PASSED: Route to Action Hub
  return [
    {
      json: {
        ...originalSignal,
        payload: {
          ...originalSignal.payload,
          approved: critic.generatedContent || originalSignal.payload.generated
        },
        scores: {
          criticScore: score,
          verdict: 'APPROVE',
          rationale: critic.rationale
        },
        _route: 'ACTION'
      }
    }
  ];
} else if (currentRetries < MAX_RETRIES) {
  // REVISE: Route back to Generator
  return [
    {
      json: {
        ...originalSignal,
        _meta: {
          ...originalSignal._meta,
          retryCount: currentRetries + 1
        },
        // Inject Feedback into the next prompt
        memory: {
          ...originalSignal.memory,
          criticFeedback: critic.rationale,
          revisionReqs: critic.revisionSuggestions
        },
        _route: 'RETRY'
      }
    }
  ];
} else {
  // FAILED: Route to Audit Logger (Death)
  return [
    {
      json: {
        ...originalSignal,
        scores: {
          criticScore: score,
          verdict: 'REJECT',
          rationale: "Max retries exceeded. Content killed."
        },
        _route: 'AUDIT_FAIL'
      }
    }
  ];
}`}
          </pre>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-white border-b border-neutral-700 pb-2">The Path Forward</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-300">
          <li>Execute the SQL in Supabase immediately.</li>
          <li>Create 4 empty Workflows in n8n (SENS, COG, ACT, AUD).</li>
          <li>Paste the Constitution Enforcer Code into the start of each one.</li>
        </ul>
      </div>
    </div>
  );
};
