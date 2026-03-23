// Core type definitions for NeuroCode Adapter

export interface Assignment {
    id: string;
    title: string;
    description: string;
    instructions: string;
    starterCode?: string;
    testCases?: TestCase[];
    metadata: AssignmentMetadata;
    adaptations?: AdaptationConfig;
  }
  
  export interface AssignmentMetadata {
    author: string;
    created: Date;
    updated: Date;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topics: string[];
    estimatedTime: number; // in minutes
    language: string;
  }
  
  export interface TestCase {
    id: string;
    input: any;
    expectedOutput: any;
    description: string;
    hidden: boolean;
  }
  
  export interface AdaptationConfig {
    visualAdaptations: VisualAdaptation;
    structuralAdaptations: StructuralAdaptation;
    interactionAdaptations: InteractionAdaptation;
  }
  
  export interface VisualAdaptation {
    colorScheme: 'default' | 'high-contrast' | 'dyslexia-friendly' | 'low-blue';
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    fontFamily: 'default' | 'dyslexia-friendly' | 'monospace';
    lineSpacing: number;
    highlightEnabled: boolean;
    animationsReduced: boolean;
  }
  
  export interface StructuralAdaptation {
    chunking: boolean;
    progressiveDisclosure: boolean;
    summaryFirst: boolean;
    visualHierarchy: 'flat' | 'moderate' | 'strong';
  }
  
  export interface InteractionAdaptation {
    textToSpeech: boolean;
    focusMode: boolean;
    autoSave: boolean;
    hintAvailability: 'always' | 'delayed' | 'on-request';
  }
  
  export interface UserPreferences {
    userId: string;
    adaptiveMode: boolean;
    visualPreferences: VisualAdaptation;
    structuralPreferences: StructuralAdaptation;
    interactionPreferences: InteractionAdaptation;
    learningProfile?: LearningProfile;
  }
  
  export interface LearningProfile {
    neurodiversityType?: string[];
    preferredLearningStyle: string[];
    accessibilityNeeds: string[];
    previousExperience: string;
  }
  
  export interface ContextAnalysis {
    timestamp: Date;
    currentFile: string;
    cursorPosition: {
      line: number;
      character: number;
    };
    selectedText: string;
    surroundingCode: string;
    errorMessages: string[];
    userActivity: UserActivity;
  }
  
  export interface UserActivity {
    lastEditTime: Date;
    editFrequency: number;
    pauseDuration: number;
    strugglingIndicators: string[];
  }
  
  export interface AIResponse {
    content: string;
    suggestions: string[];
    adaptations: Partial<AdaptationConfig>;
    confidence: number;
  }
  
  export interface Progress {
    assignmentId: string;
    userId: string;
    started: Date;
    lastUpdated: Date;
    completed: boolean;
    testsPassed: number;
    testsTotal: number;
    timeSpent: number;
    helpRequests: number;
    codeSnapshots: CodeSnapshot[];
  }
  
  export interface CodeSnapshot {
    timestamp: Date;
    code: string;
    testResults: TestResult[];
  }
  
  export interface TestResult {
    testId: string;
    passed: boolean;
    actualOutput: any;
    error?: string;
  }
  
  export interface SubTask {
    id: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    hints: string[];
    order: number;
  }

  export interface AssignmentBreakdown {
    assignmentId: string;
    neurodiversityTypes: string[];
    overview: string;
    subTasks: SubTask[];
    totalEstimatedMinutes: number;
    createdAt: Date;
  }

  export interface MCPRequest {
    method: string;
    params: any;
    context?: ContextAnalysis;
  }

  export interface MCPResponse {
    success: boolean;
    data?: any;
    error?: string;
  }