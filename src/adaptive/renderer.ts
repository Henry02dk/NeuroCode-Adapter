import * as vscode from 'vscode';
import { marked } from 'marked';
import { Assignment, UserPreferences, AdaptationConfig, AssignmentBreakdown } from '../types';

export class AdaptiveRenderer {
  private preferences: UserPreferences;

  constructor(preferences: UserPreferences) {
    this.preferences = preferences;
  }

  updatePreferences(preferences: UserPreferences) {
    this.preferences = preferences;
  }

  async renderBreakdown(breakdown: AssignmentBreakdown): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'neurocodeBreakdown',
      `Breakdown: ${breakdown.subTasks.length} steps`,
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    panel.webview.html = this.generateBreakdownHTML(breakdown);
  }

  private generateBreakdownHTML(breakdown: AssignmentBreakdown): string {
    const visual = this.preferences.visualPreferences;
    const customCSS = this.generateCustomCSS(visual);
    const profileLabel = breakdown.neurodiversityTypes.length > 0
      ? breakdown.neurodiversityTypes.join(', ')
      : 'General';

    const profileBadgeColor: Record<string, string> = {
      dyslexia: '#6a8fd8',
      adhd: '#e87d2b',
      autism: '#5aab6f',
    };

    const profileColors = breakdown.neurodiversityTypes
      .map((t) => profileBadgeColor[t.toLowerCase()])
      .filter(Boolean);
    const accentColor = profileColors[0] ?? '#6a8fd8';

    const stepsHTML = breakdown.subTasks.map((task) => {
      const hintsHTML = task.hints.length > 0
        ? `<div class="hints">
            <span class="hints-label">Hints</span>
            <ul>${task.hints.map((h) => `<li>${h}</li>`).join('')}</ul>
           </div>`
        : '';

      return `
      <div class="step" id="step-${task.order}">
        <div class="step-header">
          <span class="step-number">${task.order}</span>
          <h3 class="step-title">${task.title}</h3>
          <span class="step-time">~${task.estimatedMinutes} min</span>
        </div>
        <div class="step-body">
          <p class="step-description">${task.description}</p>
          ${hintsHTML}
        </div>
        <div class="step-footer">
          <label class="done-label">
            <input type="checkbox" onchange="markDone(${task.order}, this.checked)">
            Done
          </label>
        </div>
      </div>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assignment Breakdown</title>
  <style>
    ${this.getBaseCSS()}
    ${customCSS}

    :root { --accent: ${accentColor}; }

    .breakdown-header {
      padding: 20px;
      border-bottom: 2px solid var(--accent);
      margin-bottom: 24px;
    }
    .breakdown-header h1 { font-size: 1.4em; margin-bottom: 8px; }
    .profile-badge {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      border-radius: 12px;
      padding: 3px 12px;
      font-size: 0.8em;
      margin-right: 8px;
    }
    .total-time {
      font-size: 0.9em;
      opacity: 0.75;
      margin-top: 6px;
    }
    .overview {
      background: var(--vscode-textBlockQuote-background);
      border-left: 4px solid var(--accent);
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 24px;
      font-size: 0.95em;
    }
    .progress-bar-wrap {
      background: var(--vscode-panel-border);
      border-radius: 6px;
      height: 8px;
      margin: 10px 0 20px;
      overflow: hidden;
    }
    .progress-bar {
      height: 8px;
      background: var(--accent);
      border-radius: 6px;
      transition: width 0.3s ease;
      width: 0%;
    }
    .step {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .step.done {
      border-color: var(--accent);
      opacity: 0.65;
    }
    .step-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--vscode-editor-background);
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-weight: bold;
      font-size: 0.85em;
      flex-shrink: 0;
    }
    .step-title { flex: 1; margin: 0; font-size: 1em; }
    .step-time {
      font-size: 0.8em;
      opacity: 0.7;
      white-space: nowrap;
    }
    .step-body { padding: 14px 16px; }
    .step-description { margin: 0 0 10px; line-height: 1.6; }
    .hints { margin-top: 10px; }
    .hints-label {
      font-size: 0.8em;
      font-weight: bold;
      text-transform: uppercase;
      opacity: 0.6;
      letter-spacing: 0.05em;
    }
    .hints ul { margin: 6px 0 0 16px; padding: 0; }
    .hints li { margin-bottom: 4px; font-size: 0.9em; }
    .step-footer {
      padding: 8px 16px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    .done-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 0.9em;
    }
    .done-label input { cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="breakdown-header">
      <h1>Assignment Breakdown</h1>
      <span class="profile-badge">${profileLabel}</span>
      <div class="total-time">Total estimated time: ${breakdown.totalEstimatedMinutes} min &nbsp;|&nbsp; ${breakdown.subTasks.length} steps</div>
    </div>

    <div class="overview">${breakdown.overview}</div>

    <div class="progress-bar-wrap">
      <div class="progress-bar" id="progress-bar"></div>
    </div>

    <div id="steps">
      ${stepsHTML}
    </div>
  </div>

  <script>
    const total = ${breakdown.subTasks.length};
    let completed = 0;

    function markDone(order, isDone) {
      const step = document.getElementById('step-' + order);
      if (isDone) {
        step.classList.add('done');
        completed++;
      } else {
        step.classList.remove('done');
        completed--;
      }
      document.getElementById('progress-bar').style.width = (completed / total * 100) + '%';
    }
  </script>
</body>
</html>`;
  }

  async renderAssignment(assignment: Assignment): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'neurocodeAssignment',
      assignment.title,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.generateAssignmentHTML(assignment);
  }

  private generateAssignmentHTML(assignment: Assignment): string {
    const visual = this.preferences.visualPreferences;
    const structural = this.preferences.structuralPreferences;
    const interaction = this.preferences.interactionPreferences;

    // Convert markdown to HTML
    const descriptionHTML = marked.parse(assignment.description) as string;
    const instructionsHTML = marked.parse(assignment.instructions) as string;

    // Apply structural adaptations
    let contentSections = [];

    if (structural.summaryFirst) {
      contentSections.push(this.generateSummarySection(assignment));
    }

    if (structural.progressiveDisclosure) {
      contentSections.push(this.generateCollapsibleSection('Description', descriptionHTML));
      contentSections.push(this.generateCollapsibleSection('Instructions', instructionsHTML));
    } else {
      contentSections.push(`<div class="section"><h2>Description</h2>${descriptionHTML}</div>`);
      contentSections.push(`<div class="section"><h2>Instructions</h2>${instructionsHTML}</div>`);
    }

    if (assignment.testCases && assignment.testCases.length > 0) {
      contentSections.push(this.generateTestCasesSection(assignment.testCases));
    }

    // Generate CSS based on visual preferences
    const customCSS = this.generateCustomCSS(visual);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${assignment.title}</title>
    <style>
        ${this.getBaseCSS()}
        ${customCSS}
        ${interaction.focusMode ? this.getFocusModeCSS() : ''}
    </style>
</head>
<body class="${this.getBodyClasses()}">
    <div class="container">
        <header>
            <h1>${assignment.title}</h1>
            <div class="metadata">
                <span class="badge difficulty-${assignment.metadata.difficulty}">
                    ${assignment.metadata.difficulty}
                </span>
                <span class="time">⏱️ ${assignment.metadata.estimatedTime} min</span>
                <span class="language">📝 ${assignment.metadata.language}</span>
            </div>
        </header>

        <main>
            ${contentSections.join('\n')}
        </main>

        ${interaction.textToSpeech ? this.getTTSControls() : ''}
    </div>

    <script>
        ${this.getInteractionScripts(interaction)}
    </script>
</body>
</html>`;
  }

  private generateSummarySection(assignment: Assignment): string {
    return `
    <div class="section summary-section">
        <h2>📋 Summary</h2>
        <div class="summary-content">
            <p><strong>Topic:</strong> ${assignment.metadata.topics.join(', ')}</p>
            <p><strong>Difficulty:</strong> ${assignment.metadata.difficulty}</p>
            <p><strong>Estimated Time:</strong> ${assignment.metadata.estimatedTime} minutes</p>
            <p><strong>What you'll learn:</strong> ${this.extractKeyLearnings(assignment.description)}</p>
        </div>
    </div>`;
  }

  private extractKeyLearnings(description: string): string {
    // Simple extraction - in production, use NLP
    const sentences = description.split('.').filter(s => s.trim().length > 0);
    return sentences[0] || 'Programming concepts';
  }

  private generateCollapsibleSection(title: string, content: string): string {
    const id = title.toLowerCase().replace(/\s+/g, '-');
    return `
    <div class="section collapsible">
        <h2 class="collapsible-header" onclick="toggleSection('${id}')">
            <span class="toggle-icon">▼</span>
            ${title}
        </h2>
        <div id="${id}" class="collapsible-content">
            ${content}
        </div>
    </div>`;
  }

  private generateTestCasesSection(testCases: any[]): string {
    const visibleTests = testCases.filter(tc => !tc.hidden);
    
    if (visibleTests.length === 0) {
      return '<div class="section"><h2>Test Cases</h2><p>Test cases are hidden for this assignment.</p></div>';
    }

    const testsHTML = visibleTests.map((tc, i) => `
      <div class="test-case">
        <h4>Test ${i + 1}: ${tc.description}</h4>
        <div class="test-details">
          <div class="test-input">
            <strong>Input:</strong>
            <pre><code>${JSON.stringify(tc.input, null, 2)}</code></pre>
          </div>
          <div class="test-output">
            <strong>Expected Output:</strong>
            <pre><code>${JSON.stringify(tc.expectedOutput, null, 2)}</code></pre>
          </div>
        </div>
      </div>
    `).join('\n');

    return `
    <div class="section">
        <h2>🧪 Test Cases</h2>
        <div class="test-cases">
            ${testsHTML}
        </div>
    </div>`;
  }

  private getBaseCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.6;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        h1 {
            margin-bottom: 15px;
            font-size: 2em;
        }

        h2 {
            margin: 20px 0 10px 0;
            font-size: 1.5em;
        }

        .metadata {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .badge {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
        }

        .difficulty-beginner {
            background-color: #28a745;
            color: white;
        }

        .difficulty-intermediate {
            background-color: #ffc107;
            color: black;
        }

        .difficulty-advanced {
            background-color: #dc3545;
            color: white;
        }

        .section {
            margin-bottom: 30px;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .collapsible-header {
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .collapsible-header:hover {
            opacity: 0.8;
        }

        .toggle-icon {
            transition: transform 0.2s;
        }

        .collapsible-content {
            overflow: hidden;
            transition: max-height 0.3s ease;
        }

        .collapsible-content.collapsed {
            max-height: 0;
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
        }

        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }

        .test-case {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
        }

        .test-details {
            margin-top: 10px;
        }

        .test-input, .test-output {
            margin-bottom: 10px;
        }
    `;
  }

  private generateCustomCSS(visual: any): string {
    const fontSizeMap: { [key: string]: string } = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px',
    };

    const fontFamilyMap: { [key: string]: string } = {
      'default': 'var(--vscode-font-family)',
      'dyslexia-friendly': '"OpenDyslexic", "Comic Sans MS", sans-serif',
      'monospace': '"Courier New", Courier, monospace',
    };

    let css = `
        body {
            font-size: ${fontSizeMap[visual.fontSize] || '16px'};
            font-family: ${fontFamilyMap[visual.fontFamily] || 'var(--vscode-font-family)'};
            line-height: ${visual.lineSpacing};
        }
    `;

    // Color scheme adaptations
    if (visual.colorScheme === 'high-contrast') {
      css += `
        body {
            background-color: #000;
            color: #fff;
        }
        .section {
            border-color: #fff;
            background-color: #111;
        }
      `;
    } else if (visual.colorScheme === 'dyslexia-friendly') {
      css += `
        body {
            background-color: #faf8f2;
            color: #1a1a1a;
        }
        .section {
            background-color: #fff;
        }
      `;
    } else if (visual.colorScheme === 'low-blue') {
      css += `
        body {
            filter: sepia(0.1) saturate(1.2);
        }
      `;
    }

    if (visual.animationsReduced) {
      css += `
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
      `;
    }

    return css;
  }

  private getFocusModeCSS(): string {
    return `
        .container {
            max-width: 700px;
        }
        
        .section {
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        body {
            padding: 40px 20px;
        }
    `;
  }

  private getBodyClasses(): string {
    const classes = [];
    if (this.preferences.interactionPreferences.focusMode) {
      classes.push('focus-mode');
    }
    if (this.preferences.visualPreferences.animationsReduced) {
      classes.push('reduced-motion');
    }
    return classes.join(' ');
  }

  private getTTSControls(): string {
    return `
    <div class="tts-controls">
        <button onclick="speakContent()" class="tts-button">🔊 Read Content</button>
        <button onclick="stopSpeaking()" class="tts-button">⏹️ Stop</button>
    </div>
    <style>
        .tts-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
        }
        .tts-button {
            padding: 10px 15px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .tts-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
    `;
  }

  private getInteractionScripts(interaction: any): string {
    return `
        function toggleSection(id) {
            const content = document.getElementById(id);
            const icon = content.previousElementSibling.querySelector('.toggle-icon');
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.style.transform = 'rotate(0deg)';
            } else {
                content.classList.add('collapsed');
                content.style.maxHeight = '0';
                icon.style.transform = 'rotate(-90deg)';
            }
        }

        ${interaction.textToSpeech ? `
        let speechSynthesis = window.speechSynthesis;
        let currentUtterance = null;

        function speakContent() {
            if (currentUtterance) {
                speechSynthesis.cancel();
            }

            const main = document.querySelector('main');
            const text = main.innerText;
            
            currentUtterance = new SpeechSynthesisUtterance(text);
            currentUtterance.rate = 0.9;
            currentUtterance.pitch = 1.0;
            
            speechSynthesis.speak(currentUtterance);
        }

        function stopSpeaking() {
            speechSynthesis.cancel();
            currentUtterance = null;
        }
        ` : ''}

        // Initialize collapsed sections if progressive disclosure is enabled
        ${interaction.progressiveDisclosure ? `
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.collapsible-content').forEach(content => {
                content.style.maxHeight = content.scrollHeight + 'px';
            });
        });
        ` : ''}
    `;
  }
}