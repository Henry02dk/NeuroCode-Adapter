import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Assignment, Progress, TestResult } from '../types';

export class AssignmentManager {
  private context: vscode.ExtensionContext;
  private assignments: Map<string, Assignment> = new Map();
  private currentAssignment: Assignment | null = null;
  private progressMap: Map<string, Progress> = new Map();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadAssignments();
    this.loadProgress();
  }

  private async loadAssignments(): Promise<void> {
    const stored = this.context.globalState.get<any[]>('assignments', []);
    for (const data of stored) {
      const assignment: Assignment = {
        ...data,
        metadata: {
          ...data.metadata,
          created: new Date(data.metadata.created),
          updated: new Date(data.metadata.updated),
        },
      };
      this.assignments.set(assignment.id, assignment);
    }
  }

  private async loadProgress(): Promise<void> {
    const stored = this.context.globalState.get<any[]>('progress', []);
    for (const data of stored) {
      const progress: Progress = {
        ...data,
        started: new Date(data.started),
        lastUpdated: new Date(data.lastUpdated),
        codeSnapshots: data.codeSnapshots.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        })),
      };
      this.progressMap.set(progress.assignmentId, progress);
    }
  }

  private async saveAssignments(): Promise<void> {
    const data = Array.from(this.assignments.values());
    await this.context.globalState.update('assignments', data);
  }

  private async saveProgress(): Promise<void> {
    const data = Array.from(this.progressMap.values());
    await this.context.globalState.update('progress', data);
  }

  async importAssignment(filePath: string): Promise<Assignment> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const assignment: Assignment = {
      id: data.id || this.generateId(),
      title: data.title,
      description: data.description,
      instructions: data.instructions,
      starterCode: data.starterCode,
      testCases: data.testCases || [],
      metadata: {
        author: data.metadata?.author || 'Unknown',
        created: new Date(data.metadata?.created || Date.now()),
        updated: new Date(),
        difficulty: data.metadata?.difficulty || 'intermediate',
        topics: data.metadata?.topics || [],
        estimatedTime: data.metadata?.estimatedTime || 60,
        language: data.metadata?.language || 'javascript',
      },
      adaptations: data.adaptations,
    };

    this.assignments.set(assignment.id, assignment);
    await this.saveAssignments();

    return assignment;
  }

  async createAssignment(assignment: Assignment): Promise<void> {
    if (!assignment.id) {
      assignment.id = this.generateId();
    }
    this.assignments.set(assignment.id, assignment);
    await this.saveAssignments();
  }

  getAssignment(id: string): Assignment | undefined {
    return this.assignments.get(id);
  }

  getAllAssignments(): Assignment[] {
    return Array.from(this.assignments.values());
  }

  async deleteAssignment(id: string): Promise<void> {
    this.assignments.delete(id);
    this.progressMap.delete(id);
    await this.saveAssignments();
    await this.saveProgress();
  }

  async startAssignment(assignmentId: string, userId: string): Promise<void> {
    const assignment = this.assignments.get(assignmentId);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    this.currentAssignment = assignment;

    // Initialize progress
    const progress: Progress = {
      assignmentId,
      userId,
      started: new Date(),
      lastUpdated: new Date(),
      completed: false,
      testsPassed: 0,
      testsTotal: assignment.testCases?.length || 0,
      timeSpent: 0,
      helpRequests: 0,
      codeSnapshots: [],
    };

    this.progressMap.set(assignmentId, progress);
    await this.saveProgress();

    // Create workspace for assignment
    await this.setupAssignmentWorkspace(assignment);
  }

  private async setupAssignmentWorkspace(assignment: Assignment): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }

    const assignmentDir = path.join(
      workspaceFolder.uri.fsPath,
      'assignments',
      assignment.id
    );

    // Create directory
    if (!fs.existsSync(assignmentDir)) {
      fs.mkdirSync(assignmentDir, { recursive: true });
    }

    // Create starter code file
    const codeFile = path.join(assignmentDir, `solution.${this.getFileExtension(assignment.metadata.language)}`);
    fs.writeFileSync(codeFile, assignment.starterCode || '// Start coding here\n');

    // Create README with instructions
    const readmeFile = path.join(assignmentDir, 'README.md');
    const readme = `# ${assignment.title}

${assignment.description}

## Instructions

${assignment.instructions}

## Test Cases

${assignment.testCases?.map((tc, i) => `
### Test ${i + 1}: ${tc.description}
- Hidden: ${tc.hidden ? 'Yes' : 'No'}
`).join('\n') || 'No test cases provided'}

---
*Assignment ID: ${assignment.id}*
`;
    fs.writeFileSync(readmeFile, readme);

    // Open files
    const codeDoc = await vscode.workspace.openTextDocument(codeFile);
    await vscode.window.showTextDocument(codeDoc, vscode.ViewColumn.One);

    const readmeDoc = await vscode.workspace.openTextDocument(readmeFile);
    await vscode.window.showTextDocument(readmeDoc, vscode.ViewColumn.Two);
  }

  private getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
    };
    return extensions[language.toLowerCase()] || 'txt';
  }

  getCurrentAssignment(): Assignment | null {
    return this.currentAssignment;
  }

  getProgress(assignmentId: string): Progress | undefined {
    return this.progressMap.get(assignmentId);
  }

  async updateProgress(
    assignmentId: string,
    updates: Partial<Progress>
  ): Promise<void> {
    const progress = this.progressMap.get(assignmentId);
    if (!progress) {
      throw new Error('Progress not found');
    }

    Object.assign(progress, updates);
    progress.lastUpdated = new Date();

    this.progressMap.set(assignmentId, progress);
    await this.saveProgress();
  }

  async recordCodeSnapshot(
    assignmentId: string,
    code: string,
    testResults: TestResult[]
  ): Promise<void> {
    const progress = this.progressMap.get(assignmentId);
    if (!progress) {
      throw new Error('Progress not found');
    }

    progress.codeSnapshots.push({
      timestamp: new Date(),
      code,
      testResults,
    });

    // Keep only last 20 snapshots
    if (progress.codeSnapshots.length > 20) {
      progress.codeSnapshots = progress.codeSnapshots.slice(-20);
    }

    await this.saveProgress();
  }

  async exportProgress(assignmentId: string): Promise<string> {
    const progress = this.progressMap.get(assignmentId);
    if (!progress) {
      throw new Error('Progress not found');
    }

    const assignment = this.assignments.get(assignmentId);
    
    const exportData = {
      assignment: assignment,
      progress: progress,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  private generateId(): string {
    return `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}