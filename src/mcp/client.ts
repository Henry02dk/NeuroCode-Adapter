import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as vscode from 'vscode';
import { ContextAnalysis, AIResponse } from '../types';

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;
  private outputChannel: vscode.OutputChannel;
  private extensionPath: string;
  private anthropic: Anthropic;

  constructor(extensionPath: string, apiKey: string) {
    this.extensionPath = extensionPath;
    this.anthropic = new Anthropic({ apiKey });
    this.outputChannel = vscode.window.createOutputChannel('NeuroCode MCP');
  }

  async connect(): Promise<boolean> {
    try {
      const serverPath = path.join(this.extensionPath, 'dist', 'mcp', 'server.js');
      this.outputChannel.appendLine(`Spawning MCP server: node ${serverPath}`);

      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined)
          ) as Record<string, string>,
        },
      });

      this.client = new Client({
        name: 'neurocode-adapter',
        version: '0.1.0'
      }, {
        capabilities: {
          roots: { listChanged: true }
        }
      });

      await this.client.connect(this.transport);
      this.connected = true;

      this.outputChannel.appendLine('MCP client connected successfully');
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to connect: ${error}`);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.connected = false;
    this.outputChannel.appendLine('MCP client disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async callClaude(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens = 2048
  ): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });
    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  private async getPromptAndCall(
    promptName: string,
    promptArgs: Record<string, string>,
    maxTokens = 2048
  ): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    this.outputChannel.appendLine(`Getting prompt: ${promptName}`);
    const prompt = await this.client!.getPrompt({ name: promptName, arguments: promptArgs });

    const systemPrompt = prompt.description ?? '';
    const messages = prompt.messages.map((m) => ({
      role: m.role,
      content: m.content.type === 'text' ? m.content.text : '',
    }));

    this.outputChannel.appendLine(`Calling Claude for: ${promptName}`);
    return this.callClaude(systemPrompt, messages, maxTokens);
  }

  async analyzeContext(context: ContextAnalysis): Promise<AIResponse> {
    try {
      const text = await this.getPromptAndCall('analyze_context', {
        context: JSON.stringify(context),
      }, 1024);
      return JSON.parse(text) as AIResponse;
    } catch (error) {
      this.outputChannel.appendLine(`Context analysis failed: ${error}`);
      throw error;
    }
  }

  async getAdaptiveHelp(
    question: string,
    context: ContextAnalysis,
    userPreferences: any
  ): Promise<AIResponse> {
    try {
      const text = await this.getPromptAndCall('get_adaptive_help', {
        question,
        context: JSON.stringify(context),
        preferences: JSON.stringify(userPreferences),
      }, 2048);
      return { content: text, suggestions: [], adaptations: {}, confidence: 0.8 } as AIResponse;
    } catch (error) {
      this.outputChannel.appendLine(`Adaptive help failed: ${error}`);
      throw error;
    }
  }

  async generateAdaptations(
    assignmentId: string,
    userProfile: any,
    _currentContext?: ContextAnalysis
  ): Promise<any> {
    try {
      const text = await this.getPromptAndCall('generate_adaptations', {
        assignmentId,
        userProfile: JSON.stringify(userProfile),
      }, 1024);
      return JSON.parse(text);
    } catch (error) {
      this.outputChannel.appendLine(`Adaptation generation failed: ${error}`);
      throw error;
    }
  }

  async evaluateCode(
    code: string,
    assignmentId: string,
    testCases: any[]
  ): Promise<any> {
    try {
      const text = await this.getPromptAndCall('evaluate_code', {
        code,
        assignmentId,
        testCases: JSON.stringify(testCases),
      }, 2048);
      return text;
    } catch (error) {
      this.outputChannel.appendLine(`Code evaluation failed: ${error}`);
      throw error;
    }
  }

  async breakdownAssignment(
    assignment: any,
    neurodiversityTypes: string[]
  ): Promise<{ overview: string; subTasks: any[] }> {
    try {
      const text = await this.getPromptAndCall('breakdown_assignment', {
        assignment: JSON.stringify(assignment),
        neurodiversityTypes: JSON.stringify(neurodiversityTypes),
      }, 4096);
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      this.outputChannel.appendLine(`Breakdown assignment failed: ${error}`);
      throw error;
    }
  }
}
