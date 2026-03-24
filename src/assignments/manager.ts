import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Assignment, Progress, TestResult, AssignmentSection, AssignmentItem, SubTask } from '../types';

interface ParsedAcademicAssignment {
  title: string;
  courseName: string;
  instructors: string[];
  description: string;
  instructions: string;
  sections: AssignmentSection[];
  subTasks: SubTask[];
  topics: string[];
  estimatedTime: number;
  language: string;
}
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
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      return await this.importFromJson(filePath);
    }

    if (ext === '.pdf') {
      return await this.importFromPdf(filePath);
    }

    throw new Error(`Unsupported file type: ${ext}`);
  }

    private async importFromJson(filePath: string): Promise<Assignment> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const assignment = this.normalizeAssignment(data);
    this.assignments.set(assignment.id, assignment);
    await this.saveAssignments();
    return assignment;
  }

private async importFromPdf(filePath: string): Promise<Assignment> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const pdfParseModule: any = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    const text = result.text?.trim();

    if (!text) {
      throw new Error('Could not extract text from PDF');
    }

    const assignment = this.buildAssignmentFromText(text, filePath);

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const jsonPath = path.join(dir, `${base}.generated.assignment.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(assignment, null, 2), 'utf-8');
    vscode.window.showInformationMessage(`Generated JSON: ${jsonPath}`);

    this.assignments.set(assignment.id, assignment);
    await this.saveAssignments();

    return assignment;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

  private normalizeAssignment(data: any): Assignment {
    return {
      id: data.id || this.generateId(),
      title: data.title || 'Untitled Assignment',
      description: data.description || '',
      instructions: data.instructions || '',
      starterCode: data.starterCode || '',
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
      courseName: data.courseName || '',
      instructors: data.instructors || [],
      sections: data.sections || [],
      subTasks: data.subTasks || [],
      sourceText: data.sourceText || '',
      };
  }

private buildAssignmentFromText(text: string, filePath: string): Assignment {
  const parsed = this.parseAcademicAssignment(text, filePath);

  return {
    id: this.generateId(),
    title: parsed.title,
    description: parsed.description || parsed.courseName,
    instructions: parsed.instructions,
    starterCode: '',
    testCases: [],
    metadata: {
      author: parsed.instructors.join(', ') || 'Imported from PDF',
      created: new Date(),
      updated: new Date(),
      difficulty: 'intermediate',
      topics: parsed.topics,
      estimatedTime: parsed.estimatedTime,
      language: parsed.language,
    },
    adaptations: undefined,

    courseName: parsed.courseName,
    instructors: parsed.instructors,
    sections: parsed.sections,
    subTasks: parsed.subTasks,
    sourceText: text,
  };
}

private extractAssignmentTitle(lines: string[], assignmentIndex: number, filePath: string): string {
  const fallback = path.basename(filePath, path.extname(filePath));

  if (assignmentIndex < 0 || !lines[assignmentIndex]) {
    return fallback;
  }

  let title = lines[assignmentIndex].trim();

  const nextLine = lines[assignmentIndex + 1]?.trim();
  if (
    nextLine &&
    !this.looksLikeAuthorLine(nextLine) &&
    !this.isSectionHeading(nextLine) &&
    !this.looksLikeIntroParagraph(nextLine) &&
    !/^(this|you|deadline|submit)\b/i.test(nextLine)
  ) {
    title += ' ' + nextLine;
  }

  return title;
}

private parseAcademicAssignment(text: string, filePath: string): ParsedAcademicAssignment {
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const fallbackTitle = path.basename(filePath, path.extname(filePath));
  const assignmentIndex = lines.findIndex(line => /^assignment\b/i.test(line));
  const title = this.extractAssignmentTitle(lines, assignmentIndex, filePath);

  const courseName = this.findCourseName(lines, assignmentIndex);
  const instructors = this.findInstructors(lines, assignmentIndex);

  const firstSectionIndex = lines.findIndex(line => this.isSectionHeading(line));

  const introStartIndex = assignmentIndex >= 0 ? assignmentIndex + 1 : 0;

  const introLines = firstSectionIndex >= 0
    ? lines.slice(introStartIndex, firstSectionIndex)
    : lines.slice(introStartIndex);

  const bodyLines = firstSectionIndex >= 0
    ? lines.slice(firstSectionIndex)
    : [];

  const filteredIntroLines = introLines.filter(line => {
    if (line === courseName) return false;
    if (instructors.includes(line)) return false;
    return true;
  });

  const introText = filteredIntroLines.join('\n').trim();
  const sections = this.extractSections(bodyLines);
  const subTasks = this.buildSubTasksFromSections(sections);

  return {
    title,
    courseName,
    instructors,
    description: introText.slice(0, 500),
    instructions: introText,
    sections,
    subTasks,
    topics: this.extractTopics(normalized),
    estimatedTime: Math.max(60, subTasks.length * 30),
    language: this.extractLanguage(normalized),
  };
}

private isSectionHeading(line: string): boolean {
  return /^\d+\s+[A-Z][\s\S]*$/.test(line) && !/^\d+\.\s+/.test(line);
}

private isSubQuestionStart(line: string): boolean {
  return /^\d+\.\s+/.test(line);
}

private findCourseName(lines: string[], assignmentIndex: number): string {
  if (assignmentIndex <= 0) {
    return '';
  }

  const candidates = lines.slice(Math.max(0, assignmentIndex - 5), assignmentIndex);

  for (let i = candidates.length - 1; i >= 0; i--) {
    const line = candidates[i];
    if (
      line &&
      !/^assignment\b/i.test(line) &&
      !this.looksLikeAuthorLine(line) &&
      !this.looksLikeIntroParagraph(line)
    ) {
      return line;
    }
  }

  return candidates[0] || '';
}

private findInstructors(lines: string[], assignmentIndex: number): string[] {
  if (assignmentIndex < 0) {
    return [];
  }

  let searchStart = assignmentIndex + 1;

  const nextLine = lines[assignmentIndex + 1]?.trim();
  if (
    nextLine &&
    !this.looksLikeAuthorLine(nextLine) &&
    !this.isSectionHeading(nextLine) &&
    !this.looksLikeIntroParagraph(nextLine) &&
    !/^(this|you|deadline|submit)\b/i.test(nextLine)
  ) {
    // 说明这一行被当成标题续行了，作者往后再找
    searchStart = assignmentIndex + 2;
  }

  const candidates = lines.slice(searchStart, searchStart + 4);

  for (const line of candidates) {
    if (this.looksLikeAuthorLine(line)) {
      if (line.includes(',')) {
        return line.split(',').map(name => name.trim()).filter(Boolean);
      }
      return [line.trim()];
    }
  }

  return [];
}

private looksLikeAuthorLine(line: string): boolean {
  if (!line) return false;

  const trimmed = line.trim();

  if (trimmed.length > 80) return false;
  if (/[.!?:]/.test(trimmed)) return false;
  if (/\d/.test(trimmed)) return false;

  if (/\b(course|assignment|deadline|submit|vision|calculus|linear algebra|image processing|this|you|goal)\b/i.test(trimmed)) {
    return false;
  }

  if (trimmed.includes(',')) {
    return true;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length < 2 || words.length > 6) {
    return false;
  }

  const capitalizedWords = words.filter(word => /^[A-Z][a-zA-Z-]*$/.test(word));
  return capitalizedWords.length >= 2;
}


private looksLikeIntroParagraph(line: string): boolean {
  return line.length > 100 || /^this\b/i.test(line) || /^you\b/i.test(line);
}



private extractAcademicDescription(
  headerLines: string[],
  title: string,
  courseName: string,
  instructors: string[]
): string {
  const instructorLine = instructors.join(', ');

  const filtered = headerLines.filter(line => {
    if (line === title) return false;
    if (line === courseName) return false;
    if (instructorLine && line === instructorLine) return false;
    return true;
  });

  return filtered.slice(0, 2).join(' ').slice(0, 300);
}

private extractAcademicInstructions(headerLines: string[]): string {
  return headerLines.join('\n').trim();
}

private extractSections(lines: string[]): AssignmentSection[] {
  const sections: AssignmentSection[] = [];

  let currentSection: AssignmentSection | null = null;
  let currentItemLines: string[] = [];
  let itemOrder = 0;
  let sectionContentLines: string[] = [];

  const flushCurrentItem = () => {
    if (currentSection && currentItemLines.length > 0) {
      currentSection.items.push({
        order: itemOrder,
        content: currentItemLines.join('\n').trim(),
      });
      currentItemLines = [];
    }
  };

const flushCurrentSection = () => {
  flushCurrentItem();

  if (currentSection) {
    if (currentSection.items.length === 0 && sectionContentLines.length > 0) {
      currentSection.items.push({
        order: 1,
        content: sectionContentLines.join('\n').trim(),
      });
    }

    sections.push(currentSection);
    currentSection = null;
    sectionContentLines = [];
  }
};

  for (const line of lines) {
    if (this.isSectionHeading(line)) {
      flushCurrentSection();

      const match = line.match(/^(\d+)\s+(.*)$/);
      currentSection = {
        order: match ? Number(match[1]) : sections.length + 1,
        title: match ? match[2].trim() : line,
        items: [],
      };
      itemOrder = 0;
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (this.isSubQuestionStart(line)) {
      flushCurrentItem();
      itemOrder += 1;
      currentItemLines.push(line);
      continue;
    }

    if (currentItemLines.length > 0) {
      currentItemLines.push(line);
    } else {
      sectionContentLines.push(line);
    }
  }

  flushCurrentSection();

  return sections;
}

private buildSubTasksFromSections(sections: AssignmentSection[]): SubTask[] {
  return sections.map(section => ({
    id: `subtask_${section.order}_${Date.now()}`,
    title: section.title,
    description: section.items.length > 0
      ? section.items.map(item => item.content).join('\n\n')
      : '',
    estimatedMinutes: Math.max(15, section.items.length * 15),
    hints: [],
    order: section.order,
  }));
}

private extractTestCases(text: string) {
  const testCases: {
    id: string;
    input: any;
    expectedOutput: any;
    description: string;
    hidden: boolean;
  }[] = [];

  const lines = text.split('\n');
  let currentInput: string | null = null;
  let currentOutput: string | null = null;
  let counter = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const inputMatch = line.match(/^(input|sample input|example input)\s*:?\s*(.+)$/i);
    const outputMatch = line.match(/^(output|expected output|sample output|example output)\s*:?\s*(.+)$/i);

    if (inputMatch) {
      currentInput = inputMatch[2].trim();
    }

    if (outputMatch) {
      currentOutput = outputMatch[2].trim();
    }

    if (currentInput !== null && currentOutput !== null) {
      testCases.push({
        id: `test_${counter}`,
        input: currentInput,
        expectedOutput: currentOutput,
        description: `Extracted from PDF example ${counter}`,
        hidden: false,
      });

      counter++;
      currentInput = null;
      currentOutput = null;
    }
  }

  return testCases;
}

private extractLanguage(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('typescript')) return 'typescript';
  if (lower.includes('javascript')) return 'javascript';
  if (lower.includes('python')) return 'python';
  if (lower.includes('java')) return 'java';
  if (lower.includes('c++')) return 'cpp';
  if (lower.includes('c#') || lower.includes('csharp')) return 'csharp';

  return 'javascript';
}

private extractTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];

  const candidates = [
    'array',
    'string',
    'recursion',
    'dynamic programming',
    'graph',
    'tree',
    'sorting',
    'search',
    'linked list',
    'stack',
    'queue',
    'greedy',
    'dfs',
    'bfs',
  ];

  for (const topic of candidates) {
    if (lower.includes(topic)) {
      topics.push(topic);
    }
  }

  return topics;
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