import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CreateMessageRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import * as vscode from 'vscode';
import { ContextAnalysis, MCPRequest, MCPResponse, AIResponse } from '../types';

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

      // Create transport — StdioClientTransport spawns the process automatically
      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverPath],
        env: {
          ...Object.fromEntries(
            Object.entries(process.env).filter(([, v]) => v !== undefined)
          ) as Record<string, string>,
        },
      });

      // Create client
      this.client = new Client({
        name: 'neurocode-adapter',
        version: '0.1.0'
      }, {
        capabilities: {
          sampling: {},
          roots: {
            listChanged: true
          }
        }
      });

      // Register sampling handler BEFORE connecting.
      // When the Server calls this.server.createMessage(), the MCP SDK routes
      // the sampling/createMessage request back here, and we call the LLM.
      this.client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
        const { messages, systemPrompt, maxTokens } = request.params;

        this.outputChannel.appendLine('Sampling request received from MCP server — calling Claude');

        const response = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens ?? 4096,
          system: systemPrompt,
          messages: messages.map((m: any) => ({
            role: m.role,
            content: m.content.type === 'text' ? m.content.text : '',
          })),
        });

        const text = response.content[0]?.type === 'text' ? response.content[0].text : '';

        return {
          role: 'assistant' as const,
          content: { type: 'text' as const, text },
          model: response.model,
          stopReason: response.stop_reason === 'end_turn' ? 'endTurn' : (response.stop_reason ?? 'endTurn'),
        };
      });

      // Connect — this spawns the server subprocess
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

  async analyzeContext(context: ContextAnalysis): Promise<AIResponse> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.sendRequest({
        method: 'analyze_context',
        params: { context }
      });

      if (!response.success) {
        throw new Error(response.error || 'Analysis failed');
      }

      return response.data as AIResponse;
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
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.sendRequest({
        method: 'get_adaptive_help',
        params: { question, context, preferences: userPreferences }
      });

      if (!response.success) {
        throw new Error(response.error || 'Help request failed');
      }

      return response.data as AIResponse;
    } catch (error) {
      this.outputChannel.appendLine(`Adaptive help failed: ${error}`);
      throw error;
    }
  }

  async generateAdaptations(
    assignmentId: string,
    userProfile: any,
    currentContext: ContextAnalysis
  ): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.sendRequest({
        method: 'generate_adaptations',
        params: { assignmentId, userProfile, context: currentContext }
      });

      if (!response.success) {
        throw new Error(response.error || 'Adaptation generation failed');
      }

      return response.data;
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
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const response = await this.sendRequest({
        method: 'evaluate_code',
        params: { code, assignmentId, testCases }
      });

      if (!response.success) {
        throw new Error(response.error || 'Code evaluation failed');
      }

      return response.data;
    } catch (error) {
      this.outputChannel.appendLine(`Code evaluation failed: ${error}`);
      throw error;
    }
  }

  async breakdownAssignment(
    assignment: any,
    neurodiversityTypes: string[]
  ): Promise<{ overview: string; subTasks: any[] }> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client!.callTool({
        name: 'breakdown_assignment',
        arguments: { assignment, neurodiversityTypes },
      });

      const text = (result.content as any[])[0]?.text ?? '{}';
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      this.outputChannel.appendLine(`Breakdown assignment failed: ${error}`);
      throw error;
    }
  }

  async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    try {
      this.outputChannel.appendLine(`Sending request: ${request.method}`);

      const result = await this.client.request(
        {
          method: request.method,
          params: request.params
        },
        // @ts-ignore
        {}
      );

      this.outputChannel.appendLine(`Received response for: ${request.method}`);

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.outputChannel.appendLine(`Request failed: ${error}`);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  async listTools(): Promise<any[]> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client!.listTools();
      return result.tools || [];
    } catch (error) {
      this.outputChannel.appendLine(`Failed to list tools: ${error}`);
      return [];
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('MCP client not connected');
    }

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: args
      });
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Tool call failed: ${error}`);
      throw error;
    }
  }
}
