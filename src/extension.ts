import * as vscode from 'vscode';
import { MCPClient } from './mcp/client';
import { ContextAnalyzer } from './context/analyzer';
import { PreferencesManager } from './preferences/manager';
import { AssignmentManager } from './assignments/manager';
import { AdaptiveRenderer } from './adaptive/renderer';
import { AssignmentBreakdownService } from './breakdown/service';

let mcpClient: MCPClient;
let contextAnalyzer: ContextAnalyzer;
let preferencesManager: PreferencesManager;
let assignmentManager: AssignmentManager;
let adaptiveRenderer: AdaptiveRenderer;
let breakdownService: AssignmentBreakdownService;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
  console.log('NeuroCode Adapter is now active!');

  // Initialize managers
  const apiKey = vscode.workspace.getConfiguration('neurocode').get<string>('anthropicApiKey', '');
  mcpClient = new MCPClient(context.extensionPath, apiKey);
  contextAnalyzer = new ContextAnalyzer();
  preferencesManager = new PreferencesManager(context);
  assignmentManager = new AssignmentManager(context);
  adaptiveRenderer = new AdaptiveRenderer(preferencesManager.getPreferences());
  breakdownService = new AssignmentBreakdownService(mcpClient);

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = '$(book) NeuroCode';
  statusBarItem.tooltip = 'NeuroCode Adapter';
  statusBarItem.command = 'neurocode.openAssignment';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Connect to MCP server
  const connected = await mcpClient.connect();
  if (connected) {
    vscode.window.showInformationMessage('NeuroCode: MCP client connected');
    statusBarItem.text = '$(book) NeuroCode ✓';
  } else {
    vscode.window.showWarningMessage(
      'NeuroCode: Failed to connect to MCP server. Some features may be limited.'
    );
    statusBarItem.text = '$(book) NeuroCode ⚠';
  }

  // Register commands
  registerCommands(context);

  // Setup activity monitoring
  setupActivityMonitoring(context);

  // Setup auto-adaptation
  if (preferencesManager.getPreferences().adaptiveMode) {
    setupAutoAdaptation(context);
  }
}

function registerCommands(context: vscode.ExtensionContext) {
  // Open Assignment
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.openAssignment', async () => {
      const assignments = assignmentManager.getAllAssignments();
      
      if (assignments.length === 0) {
        const action = await vscode.window.showInformationMessage(
          'No assignments available. Would you like to import one?',
          'Import Assignment'
        );
        
        if (action === 'Import Assignment') {
          await vscode.commands.executeCommand('neurocode.importAssignment');
        }
        return;
      }

      const items = assignments.map((a) => ({
        label: a.title,
        description: a.metadata.difficulty,
        detail: a.description.substring(0, 100) + '...',
        assignment: a,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an assignment to open',
      });

      if (selected) {
        const userId = preferencesManager.getPreferences().userId;
        await assignmentManager.startAssignment(selected.assignment.id, userId);
        await adaptiveRenderer.renderAssignment(selected.assignment);
        
        vscode.window.showInformationMessage(
          `Started assignment: ${selected.assignment.title}`
        );
      }
    })
  );

  // Import Assignment
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.importAssignment', async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'Assignment Files': ['json', 'pdf'],
        },
        title: 'Select Assignment File',
      });

      if (fileUri && fileUri[0]) {
        try {
          const assignment = await assignmentManager.importAssignment(
            fileUri[0].fsPath
          );
          vscode.window.showInformationMessage(
            `Imported assignment: ${assignment.title}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to import assignment: ${error}`
          );
        }
      }
    })
  );

  // Configure Preferences
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.configurePreferences', async () => {
      await preferencesManager.showPreferencesUI();
    })
  );

  // Set Neurodiversity Profile
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.setNeurodiversityProfile', async () => {
      const prefs = preferencesManager.getPreferences();
      const current = prefs.learningProfile?.neurodiversityType ?? [];

      const items = [
        { label: 'ADHD', description: '注意力缺陷多动障碍', picked: current.includes('adhd') },
        { label: 'Dyslexia', description: '阅读障碍', picked: current.includes('dyslexia') },
        { label: 'Autism', description: '自闭症谱系障碍', picked: current.includes('autism') },
      ];

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: '选择你的神经多样性类型（可多选，留空表示无特殊需求）',
      });

      if (selected === undefined) {
        return; // user cancelled
      }

      const neurodiversityTypes = selected.map(item => item.label.toLowerCase());

      await preferencesManager.updatePreferences({
        learningProfile: {
          ...prefs.learningProfile,
          neurodiversityType: neurodiversityTypes,
          preferredLearningStyle: prefs.learningProfile?.preferredLearningStyle ?? [],
          accessibilityNeeds: prefs.learningProfile?.accessibilityNeeds ?? [],
          previousExperience: prefs.learningProfile?.previousExperience ?? 'beginner',
        },
      });

      const label = neurodiversityTypes.length > 0
        ? neurodiversityTypes.join(', ')
        : '无特殊需求';
      vscode.window.showInformationMessage(`神经多样性类型已更新：${label}`);
    })
  );

  // Toggle Adaptive Mode
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.toggleAdaptiveMode', async () => {
      const prefs = preferencesManager.getPreferences();
      const newMode = !prefs.adaptiveMode;
      
      await preferencesManager.updatePreferences({
        adaptiveMode: newMode,
      });

      vscode.window.showInformationMessage(
        `Adaptive mode ${newMode ? 'enabled' : 'disabled'}`
      );

      if (newMode) {
        setupAutoAdaptation(context);
      }
    })
  );

  // Export Progress
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.exportProgress', async () => {
      const currentAssignment = assignmentManager.getCurrentAssignment();
      
      if (!currentAssignment) {
        vscode.window.showWarningMessage('No active assignment');
        return;
      }

      try {
        const data = await assignmentManager.exportProgress(currentAssignment.id);
        
        const saveUri = await vscode.window.showSaveDialog({
          filters: {
            'JSON Files': ['json'],
          },
          defaultUri: vscode.Uri.file(
            `progress_${currentAssignment.id}_${Date.now()}.json`
          ),
        });

        if (saveUri) {
          await vscode.workspace.fs.writeFile(
            saveUri,
            Buffer.from(data, 'utf8')
          );
          vscode.window.showInformationMessage('Progress exported successfully');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export progress: ${error}`);
      }
    })
  );

  // Breakdown Assignment
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.breakdownAssignment', async () => {
      if (!mcpClient.isConnected()) {
        vscode.window.showErrorMessage(
          'NeuroCode MCP server is not running. Start it first via Tasks: Start MCP Server.'
        );
        return;
      }

      const assignments = assignmentManager.getAllAssignments();

      if (assignments.length === 0) {
        vscode.window.showWarningMessage('No assignments available. Import one first.');
        return;
      }

      const items = assignments.map((a) => ({
        label: a.title,
        description: a.metadata.difficulty,
        assignment: a,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an assignment to break down',
      });

      if (!selected) {
        return;
      }

      const preferences = preferencesManager.getPreferences();
      const profileTypes = preferences.learningProfile?.neurodiversityType ?? [];
      const profileLabel = profileTypes.length > 0 ? profileTypes.join(', ') : 'general';

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Breaking down assignment for profile: ${profileLabel}...`,
          cancellable: false,
        },
        async () => {
          try {
            const breakdown = await breakdownService.breakdown(
              selected.assignment,
              preferences
            );
            await adaptiveRenderer.renderBreakdown(breakdown);
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to break down assignment: ${error}`);
          }
        }
      );
    })
  );

  // Get AI Help
  context.subscriptions.push(
    vscode.commands.registerCommand('neurocode.getAIHelp', async () => {
      if (!mcpClient.isConnected()) {
        vscode.window.showErrorMessage(
          'MCP client not connected. Cannot provide AI help.'
        );
        return;
      }

      const question = await vscode.window.showInputBox({
        prompt: 'What do you need help with?',
        placeHolder: 'Describe your question or problem...',
      });

      if (!question) {
        return;
      }

      try {
        const context = await contextAnalyzer.getCurrentContext();
        const preferences = preferencesManager.getPreferences();

        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Getting AI help...',
            cancellable: false,
          },
          async () => {
            const response = await mcpClient.getAdaptiveHelp(
              question,
              context,
              preferences
            );

            // Show response in a new document
            const doc = await vscode.workspace.openTextDocument({
              content: response.content,
              language: 'markdown',
            });
            await vscode.window.showTextDocument(doc);

            // Record help request
            const currentAssignment = assignmentManager.getCurrentAssignment();
            if (currentAssignment) {
              const progress = assignmentManager.getProgress(currentAssignment.id);
              if (progress) {
                await assignmentManager.updateProgress(currentAssignment.id, {
                  helpRequests: progress.helpRequests + 1,
                });
              }
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to get help: ${error}`);
      }
    })
  );
}

function setupActivityMonitoring(context: vscode.ExtensionContext) {
  // Monitor for long pauses (might indicate confusion)
  let pauseCheckInterval = setInterval(async () => {
    const prefs = preferencesManager.getPreferences();
    if (!prefs.adaptiveMode) {
      return;
    }

    try {
      const context = await contextAnalyzer.getCurrentContext();
      
      // If user has been inactive for 3+ minutes, offer help
      if (context.userActivity.pauseDuration > 180) {
        const action = await vscode.window.showInformationMessage(
          'You seem to be paused. Would you like some help?',
          'Get Help',
          'Dismiss'
        );

        if (action === 'Get Help') {
          await vscode.commands.executeCommand('neurocode.getAIHelp');
        }

        // Reset pause tracking
        contextAnalyzer.resetActivity();
      }
    } catch (error) {
      // No active editor, skip
    }
  }, 60000); // Check every minute

  context.subscriptions.push({
    dispose: () => clearInterval(pauseCheckInterval),
  });
}

function setupAutoAdaptation(context: vscode.ExtensionContext) {
  // Periodically analyze context and suggest adaptations
  let adaptationInterval = setInterval(async () => {
    if (!mcpClient.isConnected()) {
      return;
    }

    const currentAssignment = assignmentManager.getCurrentAssignment();
    if (!currentAssignment) {
      return;
    }

    try {
      const context = await contextAnalyzer.getCurrentContext();
      
      // Only analyze if there are struggling indicators
      if (context.userActivity.strugglingIndicators.length > 0) {
        const response = await mcpClient.analyzeContext(context);
        
        // If confidence is high and suggestions exist
        if (response.confidence > 0.7 && response.suggestions.length > 0) {
          const action = await vscode.window.showInformationMessage(
            'I noticed you might be struggling. Would you like adaptive suggestions?',
            'Show Suggestions',
            'Not Now'
          );

          if (action === 'Show Suggestions') {
            const doc = await vscode.workspace.openTextDocument({
              content: response.suggestions.join('\n\n'),
              language: 'markdown',
            });
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
          }
        }
      }
    } catch (error) {
      console.error('Auto-adaptation error:', error);
    }
  }, 120000); // Check every 2 minutes

  context.subscriptions.push({
    dispose: () => clearInterval(adaptationInterval),
  });
}

export async function deactivate() {
  // Cleanup
  if (mcpClient) {
    await mcpClient.disconnect();
  }
  
  if (contextAnalyzer) {
    contextAnalyzer.dispose();
  }

  console.log('NeuroCode Adapter deactivated');
}
