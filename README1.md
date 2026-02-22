# NeuroCode Adapter

An adaptive VS Code extension designed to create inclusive programming assignment experiences for neurodiverse learners.

## Overview

NeuroCode Adapter transforms how programming assignments are presented and experienced, adapting to individual cognitive and perceptual needs. It supports students with diverse learning styles including those with dyslexia, autism, ADHD, and other neurodivergent characteristics.

## Features

###  Visual Adaptations
- **Multiple Color Schemes**: Default, High Contrast, Dyslexia-Friendly, Low Blue Light
- **Flexible Typography**: Adjustable font sizes and dyslexia-friendly fonts
- **Customizable Spacing**: Variable line spacing for improved readability
- **Animation Control**: Reduced motion options for sensitive users

###  Structural Adaptations
- **Content Chunking**: Break down complex instructions into manageable sections
- **Progressive Disclosure**: Reveal information gradually to reduce cognitive load
- **Summary-First Approach**: Optional overview before detailed content
- **Adaptive Hierarchy**: Adjustable visual emphasis and structure

###  Interaction Adaptations
- **Text-to-Speech**: Audio playback of instructions and content
- **Focus Mode**: Distraction-reduced interface
- **Adaptive Hints**: Context-aware assistance with customizable availability
- **Auto-Save**: Automatic progress preservation

###  AI-Powered Support
- **Context Analysis**: Real-time understanding of student progress and struggles
- **Adaptive Help**: Personalized assistance based on learning profile
- **Smart Suggestions**: Proactive support when confusion is detected
- **Code Evaluation**: Constructive, encouraging feedback

## Installation

### Prerequisites
- VS Code 1.85.0 or higher
- Node.js 18.x or higher
- Anthropic API key (for AI features)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/neurocode-adapter.git
cd neurocode-adapter
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

4. Build the extension:
```bash
npm run compile
```

5. Open in VS Code and press F5 to launch Extension Development Host

## Usage

### Opening an Assignment

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type "NeuroCode: Open Assignment"
3. Select an assignment from the list

### Importing Assignments

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "NeuroCode: Import Assignment"
3. Select a JSON assignment file

### Configuring Preferences

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "NeuroCode: Configure Preferences"
3. Adjust visual, structural, and interaction settings

### Getting AI Help

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type "NeuroCode: Get AI Help"
3. Describe your question or problem

## Assignment Format

Assignments are JSON files with the following structure:

```json
{
  "id": "unique_id",
  "title": "Assignment Title",
  "description": "Brief description",
  "instructions": "Detailed instructions (Markdown supported)",
  "starterCode": "// Starting code",
  "testCases": [
    {
      "id": "test1",
      "description": "Test description",
      "input": "test input",
      "expectedOutput": "expected output",
      "hidden": false
    }
  ],
  "metadata": {
    "author": "Author Name",
    "difficulty": "beginner|intermediate|advanced",
    "topics": ["topic1", "topic2"],
    "estimatedTime": 30,
    "language": "javascript"
  }
}
```

See `examples/` directory for sample assignments.

## Architecture

### Core Components

1. **MCP Integration** (`src/mcp/`)
   - Client for communicating with AI services
   - Server implementation for handling requests
   - Protocol definitions and message handling

2. **Context Analysis** (`src/context/`)
   - Real-time activity monitoring
   - Struggle detection
   - User behavior analysis

3. **Preferences Management** (`src/preferences/`)
   - User preference storage
   - Profile management
   - Settings synchronization

4. **Assignment Management** (`src/assignments/`)
   - Assignment import/export
   - Progress tracking
   - Workspace setup

5. **Adaptive Rendering** (`src/adaptive/`)
   - Dynamic UI generation
   - Preference-based styling
   - Accessibility features

### Technology Stack

- **TypeScript**: Type-safe development
- **VS Code Extension API**: IDE integration
- **Model Context Protocol (MCP)**: LLM communication
- **Anthropic Claude**: AI-powered assistance
- **esbuild**: Fast bundling

## Configuration

### Extension Settings

- `neurocode.adaptiveMode`: Enable/disable adaptive features
- `neurocode.colorScheme`: Visual theme selection
- `neurocode.fontSize`: Text size preference
- `neurocode.fontFamily`: Font selection
- `neurocode.lineSpacing`: Line height multiplier
- `neurocode.focusMode`: Distraction reduction
- `neurocode.textToSpeech`: Audio playback
- `neurocode.mcpServerUrl`: MCP server endpoint

## Development

### Project Structure

```
neurocode-adapter/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── types/                # TypeScript definitions
│   ├── mcp/                  # MCP client/server
│   ├── context/              # Context analysis
│   ├── preferences/          # User preferences
│   ├── assignments/          # Assignment management
│   └── adaptive/             # Adaptive rendering
├── examples/                 # Sample assignments
├── package.json             # Extension manifest
├── tsconfig.json           # TypeScript config
└── esbuild.js              # Build configuration
```

### Building

```bash
# Development build
npm run compile

# Watch mode
npm run watch

# Production build
npm run package
```

### Testing

```bash
npm run test
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Research Foundation

This project is built on research in:
- Universal Design for Learning (UDL)
- Neurodiversity-affirming education
- Adaptive learning technologies
- Accessibility in programming education

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Anthropic for Claude AI and MCP
- The neurodivergent developer community
- Accessibility researchers and advocates
- VS Code extension developers

## Support

- 📧 Email: support@neurocode.dev
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/neurocode-adapter/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/neurocode-adapter/discussions)

## Roadmap

- [ ] Integration with popular LMS platforms
- [ ] Collaborative features for pair programming
- [ ] Enhanced AI tutoring capabilities
- [ ] Mobile companion app
- [ ] Analytics dashboard for educators
- [ ] Support for more programming languages
- [ ] Community assignment marketplace

## Citation

If you use NeuroCode Adapter in your research, please cite:

```bibtex
@software{neurocode2024,
  title={NeuroCode Adapter: Adaptive Programming Assignment Experience for Neurodiverse Learners},
  author={Your Name},
  year={2024},
  url={https://github.com/yourusername/neurocode-adapter}
}
```