import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// MCP Server for NeuroCode Adapter
// LLM calls are delegated to the Client via MCP sampling/createMessage
class NeuroCodeMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'neurocode-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  // Send sampling request to the Client, which calls the LLM on our behalf
  private async callLLM(systemPrompt: string, userPrompt: string, maxTokens = 2048): Promise<string> {
    const result = await this.server.createMessage({
      messages: [{ role: 'user', content: { type: 'text', text: userPrompt } }],
      systemPrompt,
      maxTokens,
    });
    return result.content.type === 'text' ? result.content.text : '';
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.handleToolCall(request)
    );
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'analyze_context',
        description: 'Analyze the current coding context and provide adaptive insights',
        inputSchema: {
          type: 'object',
          properties: {
            context: {
              type: 'object',
              description: 'Current coding context including file, cursor position, and user activity',
            },
          },
          required: ['context'],
        },
      },
      {
        name: 'get_adaptive_help',
        description: 'Get adaptive help based on user question and preferences',
        inputSchema: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'User question or problem description',
            },
            context: {
              type: 'object',
              description: 'Current coding context',
            },
            preferences: {
              type: 'object',
              description: 'User preferences and learning profile',
            },
          },
          required: ['question', 'context', 'preferences'],
        },
      },
      {
        name: 'generate_adaptations',
        description: 'Generate adaptive presentation configurations based on user profile',
        inputSchema: {
          type: 'object',
          properties: {
            assignmentId: {
              type: 'string',
              description: 'Assignment identifier',
            },
            userProfile: {
              type: 'object',
              description: 'User learning profile and preferences',
            },
            context: {
              type: 'object',
              description: 'Current context and progress',
            },
          },
          required: ['assignmentId', 'userProfile'],
        },
      },
      {
        name: 'evaluate_code',
        description: 'Evaluate student code and provide adaptive feedback',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Student code to evaluate',
            },
            assignmentId: {
              type: 'string',
              description: 'Assignment identifier',
            },
            testCases: {
              type: 'array',
              description: 'Test cases for validation',
            },
          },
          required: ['code', 'assignmentId'],
        },
      },
      {
        name: 'breakdown_assignment',
        description: 'Break down a programming assignment into neurodiversity-adaptive sub-tasks',
        inputSchema: {
          type: 'object',
          properties: {
            assignment: {
              type: 'object',
              description: 'The full assignment object (title, description, instructions, metadata, testCases)',
            },
            neurodiversityTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of neurodiversity types, e.g. ["dyslexia", "adhd", "autism"]',
            },
          },
          required: ['assignment', 'neurodiversityTypes'],
        },
      },
    ];
  }

  private async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'analyze_context':
        return await this.analyzeContext(args.context);
      case 'get_adaptive_help':
        return await this.getAdaptiveHelp(args.question, args.context, args.preferences);
      case 'generate_adaptations':
        return await this.generateAdaptations(args.assignmentId, args.userProfile, args.context);
      case 'evaluate_code':
        return await this.evaluateCode(args.code, args.assignmentId, args.testCases);
      case 'breakdown_assignment':
        return await this.breakdownAssignment(args.assignment, args.neurodiversityTypes);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async analyzeContext(context: any) {
    const systemPrompt = `You are an adaptive learning assistant for programming education.
Analyze the coding context provided and respond as JSON with fields: content, suggestions, adaptations, confidence`;

    const userPrompt = `Analyze the following coding context:

Current File: ${context.currentFile}
Cursor Position: Line ${context.cursorPosition.line}, Column ${context.cursorPosition.character}
Selected Text: ${context.selectedText || 'None'}
Surrounding Code:
\`\`\`
${context.surroundingCode}
\`\`\`
Error Messages: ${context.errorMessages.join(', ') || 'None'}

User Activity:
- Last Edit: ${context.userActivity.lastEditTime}
- Edit Frequency: ${context.userActivity.editFrequency}
- Pause Duration: ${context.userActivity.pauseDuration}s
- Struggling Indicators: ${context.userActivity.strugglingIndicators.join(', ') || 'None'}

Provide:
1. A brief analysis of what the student might be working on
2. Any potential issues or areas of confusion
3. Suggested adaptations to the learning interface
4. Confidence level (0-1)`;

    const responseText = await this.callLLM(systemPrompt, userPrompt, 1024);
    return { content: [{ type: 'text', text: responseText }] };
  }

  private async getAdaptiveHelp(question: string, context: any, preferences: any) {
    const systemPrompt = `You are an adaptive programming tutor. Provide help adapted to the student's learning style and needs. Be clear, structured, actionable, and encouraging.`;

    const userPrompt = `A student needs help with:

Question: ${question}

Context:
- Current Code:
\`\`\`
${context.surroundingCode}
\`\`\`
- Recent Errors: ${context.errorMessages.join(', ') || 'None'}

Student Profile:
- Learning Style: ${preferences.learningProfile?.preferredLearningStyle || 'Not specified'}
- Accessibility Needs: ${preferences.learningProfile?.accessibilityNeeds || 'Not specified'}
- Previous Experience: ${preferences.learningProfile?.previousExperience || 'Beginner'}

Format: Plain text with clear sections. Use bullet points sparingly.`;

    const responseText = await this.callLLM(systemPrompt, userPrompt, 2048);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ content: responseText, suggestions: [], adaptations: {}, confidence: 0.8 }),
      }],
    };
  }

  private async generateAdaptations(assignmentId: string, userProfile: any, _context?: any) {
    const systemPrompt = `You are an expert in adaptive learning design. Generate UI/UX adaptation configurations as JSON with three categories: visual, structural, interaction.`;

    const userPrompt = `Generate adaptive presentation configurations for assignment: ${assignmentId}

User Profile:
- Neurodiversity: ${userProfile.learningProfile?.neurodiversityType || 'Not specified'}
- Learning Styles: ${userProfile.learningProfile?.preferredLearningStyle || 'Not specified'}
- Accessibility Needs: ${userProfile.learningProfile?.accessibilityNeeds || 'Not specified'}

Current Preferences:
- Visual: ${JSON.stringify(userProfile.visualPreferences)}
- Structural: ${JSON.stringify(userProfile.structuralPreferences)}
- Interaction: ${JSON.stringify(userProfile.interactionPreferences)}

Provide recommendations for:
1. Visual adaptations (colors, fonts, spacing)
2. Structural adaptations (chunking, disclosure)
3. Interaction adaptations (hints, focus mode)`;

    const responseText = await this.callLLM(systemPrompt, userPrompt, 1024);
    return { content: [{ type: 'text', text: responseText }] };
  }

  private async evaluateCode(code: string, assignmentId: string, testCases?: any[]) {
    const systemPrompt = `You are a supportive programming educator. Evaluate student code with constructive, encouraging feedback.`;

    const userPrompt = `Evaluate the following student code for assignment ${assignmentId}:

\`\`\`
${code}
\`\`\`

${testCases ? `Test Cases: ${JSON.stringify(testCases)}` : ''}

Provide:
1. Whether the code is functionally correct
2. Code quality assessment
3. Constructive feedback adapted for learning
4. Suggestions for improvement
5. Encouragement and next steps`;

    const responseText = await this.callLLM(systemPrompt, userPrompt, 2048);
    return { content: [{ type: 'text', text: responseText }] };
  }

  private async breakdownAssignment(assignment: any, neurodiversityTypes: string[]) {
    const typeInstructions: Record<string, string> = {
      dyslexia: `
- Break content into very small, focused steps (one idea per step).
- Use simple, short sentences. Avoid long paragraphs.
- Each step title should be 3-6 words.
- Provide a brief 1-2 sentence description per step.
- Include a concrete "what does success look like?" checkpoint.
- Estimated time per step: 5-15 minutes.`,
      adhd: `
- Create micro-tasks that each take 5-10 minutes MAX.
- Start with the most immediately rewarding or concrete task.
- Each step must have a clear, unambiguous done condition.
- Keep descriptions to 2-3 sentences. No walls of text.
- Include an energizing hint (e.g., "Quick win:", "Just do this one thing:").
- Estimated time per step: 5-10 minutes.`,
      autism: `
- Be completely explicit — no implied steps or assumed knowledge.
- Use consistent, predictable structure across all steps.
- Mention ALL edge cases and expected behaviors upfront.
- Number every sub-action within a step.
- Avoid vague language like "implement", "handle", "deal with" — always say exactly what to do.
- Estimated time per step: 10-20 minutes.`,
    };

    const relevantInstructions = neurodiversityTypes
      .map((t) => typeInstructions[t.toLowerCase()])
      .filter(Boolean)
      .join('\n');

    const systemPrompt = `You are an expert educational assistant specializing in neurodiversity-adaptive learning.
Your task is to break down a programming assignment into a series of sequential sub-tasks
tailored to the learner's neurodiversity profile.

${relevantInstructions || 'Break the assignment into clear, manageable sequential steps of 10-15 minutes each.'}

You MUST respond with valid JSON only — no markdown, no explanation, just raw JSON.
The JSON must match this exact structure:
{
  "overview": "A 1-2 sentence summary of the full assignment in simple terms.",
  "subTasks": [
    {
      "order": 1,
      "title": "Short step title",
      "description": "What to do in this step.",
      "estimatedMinutes": 10,
      "hints": ["Hint 1", "Hint 2"]
    }
  ]
}`;

    const profileLabel = neurodiversityTypes.length > 0
      ? neurodiversityTypes.join(', ')
      : 'general learner';

    const visibleTests = (assignment.testCases ?? [])
      .filter((tc: any) => !tc.hidden)
      .map((tc: any) => `- ${tc.description}: input=${JSON.stringify(tc.input)}, expected=${JSON.stringify(tc.expectedOutput)}`)
      .join('\n');

    const userPrompt = `Please break down this assignment for a learner with profile: ${profileLabel}.

ASSIGNMENT TITLE: ${assignment.title}

DESCRIPTION:
${assignment.description}

INSTRUCTIONS:
${assignment.instructions}

DIFFICULTY: ${assignment.metadata?.difficulty ?? 'intermediate'}
ESTIMATED TIME: ${assignment.metadata?.estimatedTime ?? 60} minutes
LANGUAGE: ${assignment.metadata?.language ?? 'unknown'}
${visibleTests ? `\nTEST CASES:\n${visibleTests}` : ''}

Break this into sequential sub-tasks. Each sub-task should be self-contained and completable independently.
Respond with valid JSON only.`;

    const responseText = await this.callLLM(systemPrompt, userPrompt, 4096);
    return { content: [{ type: 'text', text: responseText }] };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('NeuroCode MCP Server running on stdio');
  }
}

// Start server
const server = new NeuroCodeMCPServer();
server.start().catch(console.error);
