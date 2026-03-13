import { Assignment, UserPreferences, AssignmentBreakdown, SubTask } from '../types';
import { MCPClient } from '../mcp/client';

export class AssignmentBreakdownService {
  private mcpClient: MCPClient;

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }

  async breakdown(assignment: Assignment, preferences: UserPreferences): Promise<AssignmentBreakdown> {
    const neurodiversityTypes = preferences.learningProfile?.neurodiversityType ?? [];

    const parsed = await this.mcpClient.breakdownAssignment(assignment, neurodiversityTypes);

    return this.buildBreakdown(parsed, assignment, neurodiversityTypes);
  }

  private buildBreakdown(
    parsed: { overview: string; subTasks: any[] },
    assignment: Assignment,
    neurodiversityTypes: string[]
  ): AssignmentBreakdown {
    const subTasks: SubTask[] = (parsed.subTasks ?? []).map((t: any, i: number) => ({
      id: `subtask_${assignment.id}_${i + 1}`,
      order: t.order ?? i + 1,
      title: t.title ?? `Step ${i + 1}`,
      description: t.description ?? '',
      estimatedMinutes: t.estimatedMinutes ?? 10,
      hints: Array.isArray(t.hints) ? t.hints : [],
    }));

    return {
      assignmentId: assignment.id,
      neurodiversityTypes,
      overview: parsed.overview ?? assignment.description,
      subTasks,
      totalEstimatedMinutes: subTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      createdAt: new Date(),
    };
  }
}
