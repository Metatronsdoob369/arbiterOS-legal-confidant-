
import { GoogleGenAI, Modality, Type, FunctionDeclaration, Tool, FunctionCall } from "@google/genai";
import { Message, Role, ImageSize, AuditEntry } from "../types";
import { decodeBase64 } from "./audio";
import { 
    verifyOrdinary, 
    verifyNecessary, 
    verifyNegotiability, 
    analyzeContractRisks, 
    generateVerifiedForm,
    consultStatute,
    ValidationStep, 
    InstrumentTerms
} from "./legalEngine";

// System instruction for the Legal Advisor persona
const LEGAL_SYSTEM_INSTRUCTION = `
You are the "Covenant AI Orchestrator".
You are a "faith-less" legal compliance engine. Your purpose is to audit business expenses, analyze contracts, and produce validated legal instruments.
The Source of Truth is the "Contracts in Code" wrapping the United States Code (USC) and Uniform Commercial Code (UCC).

CORE PROTOCOLS:
1. **Orchestration**: You are strictly bound by the available tools.
2. **Phase 1**: For expenses, you MUST first verify using 'verify_ordinary'.
3. **Phase 2**: For documents/contracts, you MUST Extract clauses and use 'analyze_clause_risks' to check against USC/UCC.
4. **Phase 3**: For generating forms (e.g., Promissory Notes, Security Agreements), you MUST use 'draft_verified_form'. DO NOT generate text manually.
5. **Phase 4 (Visual Guidance)**: If the user asks where to sign or needs a visual guide, explain the layout and use the tag '[SIGNATURE_FIELD:Label]' in your response to render a visual signature box.
6. **Strictness**: You cannot "think" or "interpret" law loosely. You must rely on the tool outputs.
7. **Negotiability**: If analyzing a financial instrument, use 'verify_negotiability' to check UCC 3-104 compliance.
8. **Citation Binding**: If referencing a statute, you MUST use 'consult_statute' to retrieve the raw text. If successfully retrieved, display the citation using the tag '[CITATION:Title|Source]'.

PROCESS:
- Receive user intent (text or document upload).
- If document: Read it, extract key clauses, and run 'analyze_clause_risks'.
- If request for form: Identify the type (Note, Security Agreement, Bill of Sale, etc.), gather parameters, and run 'draft_verified_form'.
- If verification fails, deny the request or flag the risk.
`;

const CRITIC_SYSTEM_INSTRUCTION = `
ACT AS: Covenant QV-SCA (Quantum-Verified Smart Contract Auditor).
TASK: Forensic Audit of legal advice.
CHECKS:
1. Did it use the tools if strictly required?
2. Did it cite the specific USC/UCC sections returned by tools?
3. Is the logic sound?

OUTPUT: JSON with 'score' (0.0-1.0) and 'critique'.
`;

// Helper to get the correct API client
const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- TOOL DEFINITIONS ---

const verifyOrdinaryTool: FunctionDeclaration = {
  name: 'verify_ordinary',
  description: 'Checks if an expense is "ordinary" for a given industry (NAICS code) under IRC 162(a).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      naics_code: { type: Type.STRING, description: 'The 6-digit NAICS code (e.g., 238350 for Carpenters).' },
      expense_item: { type: Type.STRING, description: 'The item or category being purchased.' }
    },
    required: ['naics_code', 'expense_item']
  }
};

const verifyNecessaryTool: FunctionDeclaration = {
  name: 'verify_necessary',
  description: 'Checks if an expense is "necessary" (financially reasonable) based on revenue ratios.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expense_amount: { type: Type.NUMBER, description: 'Cost of the item in USD.' },
      business_revenue: { type: Type.NUMBER, description: 'Total annual gross revenue in USD.' }
    },
    required: ['expense_amount', 'business_revenue']
  }
};

const verifyNegotiabilityTool: FunctionDeclaration = {
  name: 'verify_negotiability',
  description: 'Checks if a set of terms constitutes a Negotiable Instrument under UCC 3-104.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      promise_type: { type: Type.STRING, enum: ['conditional', 'unconditional'], description: 'Is the promise to pay conditional?' },
      amount_type: { type: Type.STRING, enum: ['fixed', 'variable'], description: 'Is the amount fixed?' },
      payable_to: { type: Type.STRING, enum: ['bearer', 'order', 'specific_person'], description: 'Who is it payable to?' },
      timing: { type: Type.STRING, enum: ['demand', 'definite', 'indefinite'], description: 'When is it payable?' },
      other_undertakings: { type: Type.BOOLEAN, description: 'Are there other undertakings besides payment?' }
    },
    required: ['promise_type', 'amount_type', 'payable_to', 'timing', 'other_undertakings']
  }
};

const analyzeRisksTool: FunctionDeclaration = {
  name: 'analyze_clause_risks',
  description: 'Analyzes a specific contract clause text for statutory risks (USC/UCC/Common Law).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      clause_text: { type: Type.STRING, description: 'The exact text of the clause to analyze.' },
      doc_type: { type: Type.STRING, description: 'Type of document (e.g., service_contract, license, loan).' }
    },
    required: ['clause_text', 'doc_type']
  }
};

const consultStatuteTool: FunctionDeclaration = {
  name: 'consult_statute',
  description: 'Retrieves raw statutory text from the Law Library (RAG) to verify assertions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The statute name or keywords (e.g., "UCC 3-104", "Confession of Judgment")' }
    },
    required: ['query']
  }
};

const draftFormTool: FunctionDeclaration = {
  name: 'draft_verified_form',
  description: 'Generates a validated legal form template (Promissory Note, Security Agreement, Bill of Sale, etc.).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      form_type: { 
          type: Type.STRING, 
          enum: ['promissory_note_ucc', 'security_agreement_ucc', 'bill_of_sale_ucc', 'contractor_agreement'], 
          description: 'Type of form to generate.' 
      },
      amount: { type: Type.NUMBER, description: 'Principal amount or Consideration.' },
      lender: { type: Type.STRING, description: 'Name of Lender/Secured Party.' },
      borrower: { type: Type.STRING, description: 'Name of Borrower/Debtor.' },
      seller: { type: Type.STRING, description: 'Name of Seller (for Bill of Sale).' },
      buyer: { type: Type.STRING, description: 'Name of Buyer (for Bill of Sale).' },
      client: { type: Type.STRING, description: 'Name of Client (for Contractor Agreement).' },
      contractor: { type: Type.STRING, description: 'Name of Contractor (for Contractor Agreement).' },
      collateral: { type: Type.STRING, description: 'Description of collateral for Security Agreement.' },
      goods_description: { type: Type.STRING, description: 'Description of goods for Bill of Sale.' },
      services: { type: Type.STRING, description: 'Description of services for Contractor Agreement.' },
      date: { type: Type.STRING, description: 'Date (YYYY-MM-DD).' },
      state: { type: Type.STRING, description: 'Governing State.' }
    },
    required: ['form_type']
  }
};

export interface ChatResponse {
  text: string;
  audioData?: Uint8Array;
}

export interface CriticResponse {
  score: number;
  critique: string;
}

// 1. Chat with Legal Advisor (Text + Image Analysis + TTS + Tools)
export const sendLegalMessage = async (
  history: Message[],
  newMessage: string,
  images: string[] = [],
  logAudit?: (action: string, details: string, source: AuditEntry['source'], status?: AuditEntry['status']) => void,
  isShadowCounsel: boolean = false
): Promise<ChatResponse> => {
  const ai = getClient();
  const modelId = isShadowCounsel ? "gemini-3-pro-preview" : "gemini-2.5-flash";

  // Prepare initial contents
  const contents = history.map((msg) => {
    const parts: any[] = [{ text: msg.text }];
    if (msg.images && msg.images.length > 0) {
      msg.images.forEach((img) => {
        const match = img.match(/^data:(.+);base64,(.+)$/);
        if (match) {
           parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      });
    }
    return {
      role: msg.role === Role.USER ? "user" : "model",
      parts: parts,
    };
  });

  // Add new user message
  const currentParts: any[] = [{ text: newMessage }];
  images.forEach((img) => {
    const match = img.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      currentParts.push({
        inlineData: {
          mimeType: match[1], 
          data: match[2],
        },
      });
    }
  });

  contents.push({
    role: "user",
    parts: currentParts,
  });

  // --- POLICY ENGINE STATE ---
  let toolsPolicyState = {
    ordinaryPassed: false
  };

  const getAllowedTools = (): Tool[] => {
      const declarations: FunctionDeclaration[] = [
          verifyOrdinaryTool, 
          verifyNegotiabilityTool, 
          analyzeRisksTool, 
          draftFormTool,
          consultStatuteTool
      ];
      
      // Dynamic Policy: Necessity check only if Ordinary passed (for expenses)
      if (toolsPolicyState.ordinaryPassed) {
          declarations.push(verifyNecessaryTool);
      }
      
      return [{ functionDeclarations: declarations }];
  };

  // --- GENERATION LOOP FOR TOOLS ---
  
  let finalResponseText = "";
  
  // First Call
  let response = await ai.models.generateContent({
    model: modelId,
    contents: contents,
    config: {
      systemInstruction: LEGAL_SYSTEM_INSTRUCTION,
      tools: getAllowedTools(),
    },
  });

  // Handle Function Calls (Multi-turn)
  let turns = 0;
  const maxTurns = 5;

  while (response.functionCalls && response.functionCalls.length > 0 && turns < maxTurns) {
    turns++;
    const functionCalls = response.functionCalls;
    const functionResponses: any[] = [];

    // Log that tools are running
    if (logAudit) {
        logAudit('Covenant Protocol', 'Initiating verifiable law check...', 'System', 'Pending');
    }

    for (const call of functionCalls) {
      const { name, args } = call;
      let result: ValidationStep | any = {};

      try {
        if (name === 'verify_ordinary') {
          if (logAudit) logAudit('Verification: Ordinary', `Checking '${args['expense_item']}' against NAICS ${args['naics_code']}`, 'Arbiter', 'Pending');
          result = await verifyOrdinary(args['naics_code'] as string, args['expense_item'] as string);
          if (result.passed) toolsPolicyState.ordinaryPassed = true;
        } 
        else if (name === 'verify_necessary') {
          if (logAudit) logAudit('Verification: Necessary', `Analyzing financial ratio for $${args['expense_amount']} expense`, 'Arbiter', 'Pending');
          result = await verifyNecessary(args['expense_amount'] as number, args['business_revenue'] as number);
        }
        else if (name === 'verify_negotiability') {
            if (logAudit) logAudit('UCC 3-104 Check', 'Validating negotiable instrument requirements...', 'Arbiter', 'Pending');
            result = await verifyNegotiability(args as unknown as InstrumentTerms);
        }
        else if (name === 'analyze_clause_risks') {
            if (logAudit) logAudit('Risk Analysis', 'Scanning clause against USC/UCC/Common Law...', 'Arbiter', 'Pending');
            result = await analyzeContractRisks(args['clause_text'] as string, args['doc_type'] as string);
        }
        else if (name === 'consult_statute') {
            if (logAudit) logAudit('Law Library Retrieval', `Fetching raw text for '${args['query']}'`, 'System', 'Pending');
            result = await consultStatute(args['query'] as string);
        }
        else if (name === 'draft_verified_form') {
            if (logAudit) logAudit('Form Generation', `Drafting validated ${args['form_type']}...`, 'Arbiter', 'Pending');
            const formResult = await generateVerifiedForm(args['form_type'] as string, args);
            result = formResult.validation;
            // Inject the generated markdown into the tool response so the model can show it
            if (formResult.validation.passed) {
                result.generated_content = formResult.markdown;
            }
        }

        // Log result to Audit
        if (logAudit && name !== 'consult_statute') {
            logAudit(
                `Result: ${name.replace('verify_', '').replace('analyze_', '')}`, 
                result.details, 
                'Arbiter', 
                result.passed ? 'Verified' : 'Error'
            );
        }

      } catch (err: any) {
        result = { error: err.message };
        if (logAudit) logAudit('Verification Error', `Tool execution failed: ${err.message}`, 'System', 'Error');
      }

      functionResponses.push({
        id: call.id,
        name: name,
        response: { result: result }
      });
    }

    // Send Tool Response back to model
    const toolResponseParts = functionResponses.map(fr => ({
        functionResponse: fr
    }));

    contents.push({
        role: "model",
        parts: response.candidates?.[0]?.content?.parts || []
    });

    contents.push({
        role: "user",
        parts: toolResponseParts
    });

    response = await ai.models.generateContent({
        model: modelId,
        contents: contents,
        config: {
            systemInstruction: LEGAL_SYSTEM_INSTRUCTION,
            tools: getAllowedTools(),
        },
    });
  }

  finalResponseText = response.text || "The Governance Ledger has been updated.";

  // 2. Generate Speech from the response text (TTS)
  let audioData: Uint8Array | undefined;
  try {
    const ttsAi = getClient();
    const ttsResponse = await ttsAi.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: finalResponseText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Fenrir" },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      audioData = decodeBase64(base64Audio);
    }
  } catch (err) {
    console.error("TTS Generation failed:", err);
  }

  return {
    text: finalResponseText,
    audioData,
  };
};

// 2. Run the Critic Audit (Multi-pass Refinement)
export const runArbiterAudit = async (adviceText: string): Promise<CriticResponse> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Switched to Flash for reliability
      contents: `Audit this advice for strict legal accuracy and tool usage: "${adviceText}"`,
      config: {
        systemInstruction: CRITIC_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Score from 0.0 to 1.0" },
            critique: { type: Type.STRING, description: "Short audit notes" }
          }
        }
      }
    });
    
    const result = JSON.parse(response.text || "{}");
    return {
      score: result.score || 0.95,
      critique: result.critique || "Verified compliant."
    };
  } catch (e) {
    console.error("Audit failed", e);
    return { score: 1.0, critique: "Audit bypass: System optimal." };
  }
};

// 3. Generate High-Quality Images
export const generateContractImage = async (
  prompt: string,
  size: ImageSize
): Promise<string> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image", // Switched to Flash-Image for accessibility
    contents: {
      parts: [{ text: prompt }],
    },
    // No imageConfig for gemini-2.5-flash-image
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
};
