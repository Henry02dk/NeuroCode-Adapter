import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';

// MCP Server for NeuroCode Adapter
class NeuroCodeMCPServer {
  private server: Server;
  private anthropic: Anthropic;

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

    // Initialize Anthropic client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({ apiKey });

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
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
    ];
  }

  private async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'analyze_context':
        return await this.analyzeContext(args.context);
      case 'get_adaptive_help':
        return await this.getAdaptiveHelp(
          args.question,
          args.context,
          args.preferences
        );
      case 'generate_adaptations':
        return await this.generateAdaptations(
          args.assignmentId,
          args.userProfile,
          args.context
        );
      case 'evaluate_code':
        return await this.evaluateCode(
          args.code,
          args.assignmentId,
          args.testCases
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async analyzeContext(context: any) {
    const prompt = `You are an adaptive learning assistant for programming education. 
Analyze the following coding context and provide insights:

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
4. Confidence level (0-1)

Format your response as JSON with fields: content, suggestions, adaptations, confidence`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    try {
      return { content: [{ type: 'text', text: responseText }] };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            content: responseText,
            suggestions: [],
            adaptations: {},
            confidence: 0.5,
          }),
        }],
      };
    }
  }

  private async getAdaptiveHelp(
    question: string,
    context: any,
    preferences: any
  ) {
    const prompt = `You are an adaptive programming tutor. A student needs help with:

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

Provide help that is:
1. Adapted to the student's learning style and needs
2. Clear and structured (use simple language if preferred)
3. Actionable with specific next steps
4. Encouraging and supportive

Format: Plain text with clear sections. Use bullet points sparingly.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          content: responseText,
          suggestions: [],
          adaptations: {},
          confidence: 0.8,
        }),
      }],
    };
  }

  private async generateAdaptations(
    assignmentId: string,
    userProfile: any,
    context?: any
  ) {
    const prompt = `Generate adaptive presentation configurations for a programming assignment.

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
3. Interaction adaptations (hints, focus mode)

Format as JSON with these three categories.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    return { content: [{ type: 'text', text: responseText }] };
  }

  private async evaluateCode(
    code: string,
    assignmentId: string,
    testCases?: any[]
  ) {
    const prompt = `Evaluate the following student code for assignment ${assignmentId}:

\`\`\`
${code}
\`\`\`

${testCases ? `Test Cases: ${JSON.stringify(testCases)}` : ''}

Provide:
1. Whether the code is functionally correct
2. Code quality assessment
3. Constructive feedback adapted for learning
4. Suggestions for improvement
5. Encouragement and next steps

Be supportive and educational in your feedback.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

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