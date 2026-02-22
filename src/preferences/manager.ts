import * as vscode from 'vscode';
import { UserPreferences, VisualAdaptation, StructuralAdaptation, InteractionAdaptation } from '../types';

export class PreferencesManager {
  private context: vscode.ExtensionContext;
  private currentPreferences: UserPreferences;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.currentPreferences = this.loadPreferences();
  }

  private loadPreferences(): UserPreferences {
    const config = vscode.workspace.getConfiguration('neurocode');
    const stored = this.context.globalState.get<UserPreferences>('userPreferences');

    if (stored) {
      return stored;
    }

    // Default preferences
    return {
      userId: this.generateUserId(),
      adaptiveMode: config.get('adaptiveMode', true),
      visualPreferences: {
        colorScheme: config.get('colorScheme', 'default'),
        fontSize: config.get('fontSize', 'medium'),
        fontFamily: config.get('fontFamily', 'default'),
        lineSpacing: config.get('lineSpacing', 1.5),
        highlightEnabled: true,
        animationsReduced: false,
      },
      structuralPreferences: {
        chunking: true,
        progressiveDisclosure: true,
        summaryFirst: false,
        visualHierarchy: 'moderate',
      },
      interactionPreferences: {
        textToSpeech: config.get('textToSpeech', false),
        focusMode: config.get('focusMode', false),
        autoSave: true,
        hintAvailability: 'delayed',
      },
    };
  }

  private generateUserId(): string {
    const existing = this.context.globalState.get<string>('userId');
    if (existing) {
      return existing;
    }

    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.context.globalState.update('userId', newId);
    return newId;
  }

  getPreferences(): UserPreferences {
    return { ...this.currentPreferences };
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    this.currentPreferences = {
      ...this.currentPreferences,
      ...updates,
    };

    await this.savePreferences();
    await this.applyPreferences();
  }

  async updateVisualPreferences(updates: Partial<VisualAdaptation>): Promise<void> {
    this.currentPreferences.visualPreferences = {
      ...this.currentPreferences.visualPreferences,
      ...updates,
    };

    await this.savePreferences();
    await this.applyPreferences();
  }

  async updateStructuralPreferences(updates: Partial<StructuralAdaptation>): Promise<void> {
    this.currentPreferences.structuralPreferences = {
      ...this.currentPreferences.structuralPreferences,
      ...updates,
    };

    await this.savePreferences();
  }

  async updateInteractionPreferences(updates: Partial<InteractionAdaptation>): Promise<void> {
    this.currentPreferences.interactionPreferences = {
      ...this.currentPreferences.interactionPreferences,
      ...updates,
    };

    await this.savePreferences();
    await this.applyPreferences();
  }

  private async savePreferences(): Promise<void> {
    await this.context.globalState.update('userPreferences', this.currentPreferences);
  }

  private async applyPreferences(): Promise<void> {
    const config = vscode.workspace.getConfiguration('neurocode');
    const visual = this.currentPreferences.visualPreferences;
    const interaction = this.currentPreferences.interactionPreferences;

    // Apply visual preferences
    await config.update('colorScheme', visual.colorScheme, vscode.ConfigurationTarget.Global);
    await config.update('fontSize', visual.fontSize, vscode.ConfigurationTarget.Global);
    await config.update('fontFamily', visual.fontFamily, vscode.ConfigurationTarget.Global);
    await config.update('lineSpacing', visual.lineSpacing, vscode.ConfigurationTarget.Global);

    // Apply interaction preferences
    await config.update('textToSpeech', interaction.textToSpeech, vscode.ConfigurationTarget.Global);
    await config.update('focusMode', interaction.focusMode, vscode.ConfigurationTarget.Global);

    // Apply editor settings based on preferences
    await this.applyEditorSettings();
  }

  private async applyEditorSettings(): Promise<void> {
    const editorConfig = vscode.workspace.getConfiguration('editor');
    const visual = this.currentPreferences.visualPreferences;

    // Font size mapping
    const fontSizeMap = {
      'small': 12,
      'medium': 14,
      'large': 16,
      'extra-large': 18,
    };

    // Font family mapping
    const fontFamilyMap = {
      'default': 'Consolas, "Courier New", monospace',
      'dyslexia-friendly': 'OpenDyslexic, Consolas, monospace',
      'monospace': '"Courier New", Courier, monospace',
    };

    await editorConfig.update(
      'fontSize',
      fontSizeMap[visual.fontSize],
      vscode.ConfigurationTarget.Global
    );

    await editorConfig.update(
      'fontFamily',
      fontFamilyMap[visual.fontFamily],
      vscode.ConfigurationTarget.Global
    );

    await editorConfig.update(
      'lineHeight',
      visual.lineSpacing * 20, // Base line height ~20px
      vscode.ConfigurationTarget.Global
    );

    // Reduce animations if needed
    if (visual.animationsReduced) {
      await editorConfig.update(
        'cursorBlinking',
        'solid',
        vscode.ConfigurationTarget.Global
      );
    }
  }

  async showPreferencesUI(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'neurocodePreferences',
      'NeuroCode Preferences',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    panel.webview.html = this.getPreferencesHTML();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'updateVisual':
            await this.updateVisualPreferences(message.data);
            vscode.window.showInformationMessage('Visual preferences updated');
            break;
          case 'updateStructural':
            await this.updateStructuralPreferences(message.data);
            vscode.window.showInformationMessage('Structural preferences updated');
            break;
          case 'updateInteraction':
            await this.updateInteractionPreferences(message.data);
            vscode.window.showInformationMessage('Interaction preferences updated');
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  private getPreferencesHTML(): string {
    const prefs = this.currentPreferences;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuroCode Preferences</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        h2 {
            color: var(--vscode-foreground);
            margin-top: 0;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        select, input {
            width: 100%;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
        }
        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .checkbox-group input {
            width: auto;
        }
    </style>
</head>
<body>
    <h1>NeuroCode Preferences</h1>
    
    <div class="section">
        <h2>Visual Preferences</h2>
        <div class="form-group">
            <label for="colorScheme">Color Scheme:</label>
            <select id="colorScheme">
                <option value="default" ${prefs.visualPreferences.colorScheme === 'default' ? 'selected' : ''}>Default</option>
                <option value="high-contrast" ${prefs.visualPreferences.colorScheme === 'high-contrast' ? 'selected' : ''}>High Contrast</option>
                <option value="dyslexia-friendly" ${prefs.visualPreferences.colorScheme === 'dyslexia-friendly' ? 'selected' : ''}>Dyslexia Friendly</option>
                <option value="low-blue" ${prefs.visualPreferences.colorScheme === 'low-blue' ? 'selected' : ''}>Low Blue Light</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fontSize">Font Size:</label>
            <select id="fontSize">
                <option value="small" ${prefs.visualPreferences.fontSize === 'small' ? 'selected' : ''}>Small</option>
                <option value="medium" ${prefs.visualPreferences.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="large" ${prefs.visualPreferences.fontSize === 'large' ? 'selected' : ''}>Large</option>
                <option value="extra-large" ${prefs.visualPreferences.fontSize === 'extra-large' ? 'selected' : ''}>Extra Large</option>
            </select>
        </div>
        <div class="form-group">
            <label for="fontFamily">Font Family:</label>
            <select id="fontFamily">
                <option value="default" ${prefs.visualPreferences.fontFamily === 'default' ? 'selected' : ''}>Default</option>
                <option value="dyslexia-friendly" ${prefs.visualPreferences.fontFamily === 'dyslexia-friendly' ? 'selected' : ''}>Dyslexia Friendly</option>
                <option value="monospace" ${prefs.visualPreferences.fontFamily === 'monospace' ? 'selected' : ''}>Monospace</option>
            </select>
        </div>
        <div class="form-group">
            <label for="lineSpacing">Line Spacing: <span id="lineSpacingValue">${prefs.visualPreferences.lineSpacing}</span></label>
            <input type="range" id="lineSpacing" min="1.0" max="3.0" step="0.1" value="${prefs.visualPreferences.lineSpacing}">
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="animationsReduced" ${prefs.visualPreferences.animationsReduced ? 'checked' : ''}>
            <label for="animationsReduced">Reduce Animations</label>
        </div>
        <button onclick="saveVisual()">Save Visual Preferences</button>
    </div>

    <div class="section">
        <h2>Structural Preferences</h2>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="chunking" ${prefs.structuralPreferences.chunking ? 'checked' : ''}>
            <label for="chunking">Enable Content Chunking</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="progressiveDisclosure" ${prefs.structuralPreferences.progressiveDisclosure ? 'checked' : ''}>
            <label for="progressiveDisclosure">Progressive Disclosure</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="summaryFirst" ${prefs.structuralPreferences.summaryFirst ? 'checked' : ''}>
            <label for="summaryFirst">Show Summary First</label>
        </div>
        <button onclick="saveStructural()">Save Structural Preferences</button>
    </div>

    <div class="section">
        <h2>Interaction Preferences</h2>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="textToSpeech" ${prefs.interactionPreferences.textToSpeech ? 'checked' : ''}>
            <label for="textToSpeech">Text-to-Speech</label>
        </div>
        <div class="form-group checkbox-group">
            <input type="checkbox" id="focusMode" ${prefs.interactionPreferences.focusMode ? 'checked' : ''}>
            <label for="focusMode">Focus Mode</label>
        </div>
        <div class="form-group">
            <label for="hintAvailability">Hint Availability:</label>
            <select id="hintAvailability">
                <option value="always" ${prefs.interactionPreferences.hintAvailability === 'always' ? 'selected' : ''}>Always Available</option>
                <option value="delayed" ${prefs.interactionPreferences.hintAvailability === 'delayed' ? 'selected' : ''}>After Delay</option>
                <option value="on-request" ${prefs.interactionPreferences.hintAvailability === 'on-request' ? 'selected' : ''}>On Request Only</option>
            </select>
        </div>
        <button onclick="saveInteraction()">Save Interaction Preferences</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('lineSpacing').addEventListener('input', (e) => {
            document.getElementById('lineSpacingValue').textContent = e.target.value;
        });

        function saveVisual() {
            vscode.postMessage({
                command: 'updateVisual',
                data: {
                    colorScheme: document.getElementById('colorScheme').value,
                    fontSize: document.getElementById('fontSize').value,
                    fontFamily: document.getElementById('fontFamily').value,
                    lineSpacing: parseFloat(document.getElementById('lineSpacing').value),
                    animationsReduced: document.getElementById('animationsReduced').checked,
                }
            });
        }

        function saveStructural() {
            vscode.postMessage({
                command: 'updateStructural',
                data: {
                    chunking: document.getElementById('chunking').checked,
                    progressiveDisclosure: document.getElementById('progressiveDisclosure').checked,
                    summaryFirst: document.getElementById('summaryFirst').checked,
                }
            });
        }

        function saveInteraction() {
            vscode.postMessage({
                command: 'updateInteraction',
                data: {
                    textToSpeech: document.getElementById('textToSpeech').checked,
                    focusMode: document.getElementById('focusMode').checked,
                    hintAvailability: document.getElementById('hintAvailability').value,
                }
            });
        }
    </script>
</body>
</html>`;
  }
}