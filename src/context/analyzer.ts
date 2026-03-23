import * as vscode from 'vscode';
import { ContextAnalysis, UserActivity } from '../types';

export class ContextAnalyzer {
  private lastEditTime: Date = new Date();
  private editCount: number = 0;
  private editTimestamps: Date[] = [];
  private pauseStartTime: Date | null = null;
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('neurocode');
    this.setupListeners();
  }

  private setupListeners() {
    // Monitor text document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      this.onDocumentChange(event);
    });

    // Monitor cursor position changes
    vscode.window.onDidChangeTextEditorSelection((event) => {
      this.onSelectionChange(event);
    });

    // Monitor diagnostics (errors/warnings)
    vscode.languages.onDidChangeDiagnostics(() => {
      this.onDiagnosticsChange();
    });
  }

  private onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    const now = new Date();
    this.editTimestamps.push(now);
    this.lastEditTime = now;
    this.editCount++;
    this.pauseStartTime = null;

    // Keep only last 50 edits for frequency calculation
    if (this.editTimestamps.length > 50) {
      this.editTimestamps.shift();
    }
  }

  private onSelectionChange(event: vscode.TextEditorSelectionChangeEvent) {
    // Track cursor movements for activity analysis
  }

  private onDiagnosticsChange() {
    // Errors detected - might indicate struggling
  }

  async getCurrentContext(): Promise<ContextAnalysis> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      throw new Error('No active editor');
    }

    const document = editor.document;
    const selection = editor.selection;
    const cursorPosition = selection.active;

    // Get surrounding code (10 lines before and after)
    const startLine = Math.max(0, cursorPosition.line - 10);
    const endLine = Math.min(document.lineCount - 1, cursorPosition.line + 10);
    const surroundingRange = new vscode.Range(startLine, 0, endLine, 1000);
    const surroundingCode = document.getText(surroundingRange);

    // Get selected text
    const selectedText = document.getText(selection);

    // Get error messages
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const errorMessages = diagnostics
      .filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
      .map((d) => d.message);

    // Analyze user activity
    const userActivity = this.analyzeUserActivity();

    return {
      timestamp: new Date(),
      currentFile: document.uri.fsPath,
      cursorPosition: {
        line: cursorPosition.line,
        character: cursorPosition.character,
      },
      selectedText,
      surroundingCode,
      errorMessages,
      userActivity,
    };
  }

  private analyzeUserActivity(): UserActivity {
    const now = new Date();
    
    // Calculate edit frequency (edits per minute)
    let editFrequency = 0;
    if (this.editTimestamps.length > 1) {
      const timeSpanMs = now.getTime() - this.editTimestamps[0].getTime();
      const timeSpanMin = timeSpanMs / (1000 * 60);
      editFrequency = this.editTimestamps.length / timeSpanMin;
    }

    // Calculate pause duration
    let pauseDuration = 0;
    if (this.pauseStartTime) {
      pauseDuration = (now.getTime() - this.pauseStartTime.getTime()) / 1000;
    } else if (this.editTimestamps.length > 0) {
      const lastEdit = this.editTimestamps[this.editTimestamps.length - 1];
      pauseDuration = (now.getTime() - lastEdit.getTime()) / 1000;
      
      // Set pause start if pause is longer than 30 seconds
      if (pauseDuration > 30) {
        this.pauseStartTime = lastEdit;
      }
    }

    // Detect struggling indicators
    const strugglingIndicators: string[] = [];
    
    // Low edit frequency might indicate confusion
    if (editFrequency < 2 && this.editTimestamps.length > 5) {
      strugglingIndicators.push('low-activity');
    }
    
    // Long pause might indicate confusion
    if (pauseDuration > 120) {
      strugglingIndicators.push('long-pause');
    }
    
    // Recent errors
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
      const errorCount = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      ).length;
      
      if (errorCount > 3) {
        strugglingIndicators.push('multiple-errors');
      }
    }

    return {
      lastEditTime: this.lastEditTime,
      editFrequency,
      pauseDuration,
      strugglingIndicators,
    };
  }

  resetActivity() {
    this.editTimestamps = [];
    this.editCount = 0;
    this.pauseStartTime = null;
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}