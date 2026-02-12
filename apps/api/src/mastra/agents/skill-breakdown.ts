import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { loadFewShotExamples, getFewShotExamplesPrompt } from "../../examples/load-examples.js";

const subSkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  triggers: z.array(z.string()).min(5).max(8), // Enforce 5-8 triggers
  strategies: z.array(
    z.object({
      title: z.string(),
      content: z.string().min(2500), // Enforce minimum ~500 words (roughly 2500 chars)
    })
  ).min(4).max(6), // Enforce 4-6 strategies per sub-skill
});

const skillBreakdownSchema = z.object({
  mainSkill: z.object({
    name: z.string(),
    description: z.string(),
  }),
  subSkills: z.array(subSkillSchema).min(2).max(8), // Reduced minimum to 2 for flexibility
});

export const skillBreakdownAgent = new Agent({
  id: "skill-breakdown",
  name: "Skill Breakdown",
  instructions: `You are an expert at breaking down complex skills or trades into specific, actionable sub-skills. Each sub-skill must be as detailed, comprehensive, and lengthy as the examples in the awesome-claude-skills repository.

When given a skill or trade name (e.g., "plumbing", "web development", "crypto trading"), you must:

1. Identify 3-8 specific sub-skills that are essential components of the main skill (MUST generate at least 3, preferably 4-6)
2. Each sub-skill should be:
   - A specific, actionable aspect (e.g., "water leak repair", "toilet installation", "pipe repair" for plumbing)
   - Self-contained with its own comprehensive description, triggers, and detailed strategies
   - Related to the main skill but distinct enough to be its own node
   - Practical and useful on its own
   - AS DETAILED AS THE TRAINING EXAMPLES - each strategy should be 500-1200 words minimum

3. For each sub-skill, generate:
   - A clear, specific name (2-4 words)
   - A comprehensive description (3-5 sentences explaining what this sub-skill covers, its value, and key concepts)
   - 5-8 trigger phrases users might say (include variations and synonyms)
   - 4-6 strategies with titles and EXTENSIVE, DETAILED content (500-1200 words each)
   
   Each strategy MUST include:
   a) PREREQUISITES (if applicable):
      - Required tools, accounts, or setup
      - Dependencies and connections needed
      - Pre-flight checks
      - **IF THE SKILL INVOLVES API AUTOMATION OR EXTERNAL SERVICES**: Include Rube MCP setup:
        * "Rube MCP must be connected (RUBE_SEARCH_TOOLS available)"
        * "Active [service] connection via RUBE_MANAGE_CONNECTIONS with toolkit [toolkit_name]"
        * "Always call RUBE_SEARCH_TOOLS first to get current tool schemas"
   
   b) SETUP (if applicable):
      - Step-by-step setup instructions
      - Configuration details
      - Authentication requirements
      - Verification steps
      - **IF USING RUBE MCP**: Include:
        * "Get Rube MCP: Add https://rube.app/mcp as an MCP server in your client configuration. No API keys needed — just add the endpoint and it works."
        * Steps to verify Rube MCP is available
        * Steps to manage connections via RUBE_MANAGE_CONNECTIONS
        * OAuth/auth link instructions if needed
   
   c) CORE WORKFLOWS (3-5 workflows):
      Each workflow MUST have:
      - **Title**: Clear, descriptive workflow name
      - **When to use**: Specific use case scenarios (2-3 sentences)
      - **Tool sequence**: Detailed step-by-step tool usage with:
        * Tool names in order
        * Required vs optional tools
        * Prerequisites for each step
        * **IF USING RUBE MCP**: Always mention calling RUBE_SEARCH_TOOLS first
      - **Key parameters**: For each tool, list:
        * Parameter name
        * What it does
        * Required vs optional
        * Example values
        * Common pitfalls
        * Type constraints
        * Validation rules
      - **Pitfalls**: Common mistakes (5-8 specific pitfalls with solutions)
      - **Error Points**: Potential failure points and how to handle them:
        * Common error messages and their meanings
        * What causes each error
        * Step-by-step resolution
        * Prevention strategies
      - **Example scenarios**: Real-world examples (3-5 detailed examples)
      - **Advanced tips**: Pro tips for power users (3-5 tips)
      - **Troubleshooting**: Common issues and solutions (3-5 issues)

QUALITY STANDARDS:
- Each strategy content should be 500-1200 words minimum (longer is better)
- Use markdown formatting (bold, lists, code blocks)
- Include specific tool names, parameters, and values
- Provide extensive troubleshooting and error handling guidance
- Write in a professional, instructional tone
- Be comprehensive - cover edge cases, error scenarios, and advanced usage
- Match the depth and quality of awesome-claude-skills examples
- Include Rube MCP instructions when dealing with API automation or external service integrations

CRITICAL: You MUST follow these requirements exactly:
- Generate 4-6 strategies per sub-skill (NOT 2, NOT 3 - MUST be 4-6)
- Each strategy MUST be 500-1200 words minimum (count words, not characters)
- Include ALL required sections: Prerequisites, Setup, Core Workflows (3-5 workflows), Error Points, Troubleshooting
- Each workflow MUST have: Title, When to use, Tool sequence, Key parameters, Pitfalls (5-8), Error Points, Example scenarios (3-5), Advanced tips (3-5), Troubleshooting (3-5 issues)

Example for "plumbing":
- Sub-skill: "water leak repair"
  Description: "Comprehensive guide to diagnosing and fixing water leaks in pipes, fixtures, and appliances. Covers leak identification techniques, repair method selection, material requirements, and preventive measures. Essential for maintaining plumbing systems and preventing water damage."
  Triggers: ["fix water leak", "repair leak", "water leak", "leaking pipe", "dripping faucet", "pipe burst", "water damage repair"]
  Strategies: [
    {
      "title": "Leak Detection and Assessment",
      "content": "Detailed 500-1200 word guide covering leak detection methods, assessment techniques, severity evaluation, and initial response procedures. MUST include: Prerequisites section with tools and materials, Setup section with step-by-step instructions, 3-5 Core Workflows each with When to use, Tool sequence, Key parameters, 5-8 Pitfalls, Error Points with common errors and resolutions, 3-5 Example scenarios, 3-5 Advanced tips, and 3-5 Troubleshooting issues..."
    },
    {
      "title": "Repair Methods and Techniques",
      "content": "Comprehensive 500-1200 word guide covering various repair methods, tool selection, material requirements, step-by-step procedures. MUST include: Prerequisites, Setup, 3-5 Core Workflows, Error Points, Troubleshooting..."
    },
    {
      "title": "Preventive Maintenance",
      "content": "500-1200 word guide on preventing leaks through regular maintenance..."
    },
    {
      "title": "Emergency Response Procedures",
      "content": "500-1200 word guide on immediate actions for major leaks..."
    }
  ]

Return only valid JSON matching the schema.`,
  model: "openai/gpt-4o",
  tools: {},
});

export async function breakDownSkill(skillName: string): Promise<z.infer<typeof skillBreakdownSchema>> {
  // Load few-shot examples for better quality
  const examples = loadFewShotExamples();
  const examplesPrompt = getFewShotExamplesPrompt(examples, 5);
  
  const prompt = `${examplesPrompt}

---

Break down the skill or trade "${skillName}" into 3-8 specific, actionable sub-skills.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. Generate 4-6 sub-skills (minimum 3, but prefer 4-6 for better coverage)
2. Each sub-skill MUST have exactly 4-6 strategies (NOT 2, NOT 3 - MUST be 4-6 strategies per sub-skill)
3. Each strategy MUST be 500-1200 words minimum (count actual words - verify before returning)
4. Each strategy MUST include ALL required sections:
   - Prerequisites (if applicable) with tools, accounts, setup requirements
   - Setup (if applicable) with step-by-step instructions, configuration, verification
   - Core Workflows (3-5 workflows, each with: Title, When to use, Tool sequence, Key parameters, Pitfalls (5-8), Error Points, Example scenarios (3-5), Advanced tips (3-5), Troubleshooting (3-5 issues))
   - Error Points section for each workflow (common errors, causes, resolutions, prevention)
   - Troubleshooting section with 3-5 common issues and solutions

QUALITY VERIFICATION CHECKLIST - Before returning, verify:
✓ Each sub-skill has 4-6 strategies (count them)
✓ Each strategy has 500-1200 words (count words, not characters)
✓ Each strategy includes all required sections
✓ Each workflow has 3-5 workflows with full details
✓ Each workflow has 5-8 pitfalls with solutions
✓ Each workflow has error points with resolutions
✓ Each workflow has 3-5 example scenarios
✓ Each workflow has 3-5 advanced tips
✓ Each workflow has 3-5 troubleshooting issues

If the skill involves API automation, external services, or integrations, include Rube MCP setup instructions in prerequisites and setup sections.

Match the structure, depth, and quality of the examples provided above. The examples show the MINIMUM quality - your output should match or exceed them in length and detail.`;

  const result = await skillBreakdownAgent.generate(prompt, {
    structuredOutput: {
      schema: skillBreakdownSchema,
      errorStrategy: "fallback",
      fallbackValue: {
        mainSkill: {
          name: skillName,
          description: `Comprehensive skill pack for ${skillName}.`,
        },
        subSkills: [
          {
            name: `${skillName} basics`,
            description: `Fundamental aspects of ${skillName}.`,
            triggers: [`${skillName}`, `help with ${skillName}`],
            strategies: [{ title: "Overview", content: "Basic information about this skill." }],
          },
        ],
      },
    },
    modelSettings: {
      maxOutputTokens: 32768,
      temperature: 0.7,
    },
  });

  const parsed = skillBreakdownSchema.safeParse(result?.object);
  if (!parsed.success) {
    throw new Error(`Failed to parse skill breakdown: ${parsed.error.message}`);
  }

  return parsed.data;
}
