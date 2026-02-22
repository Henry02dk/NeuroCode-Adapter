# Quick Start Guide - NeuroCode Adapter

Get started with NeuroCode Adapter in 5 minutes!

## Step 1: Installation

### Option A: From Source (Development)

```bash
# Clone repository
git clone https://github.com/yourusername/neurocode-adapter.git
cd neurocode-adapter

# Install dependencies
npm install

# Build extension
npm run compile
```

### Option B: From VSIX (Release)

1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded file

## Step 2: Configure API Access

For AI-powered features, you need an Anthropic API key:

1. Get your API key from https://console.anthropic.com/
2. Set environment variable:

**Linux/Mac:**
```bash
export ANTHROPIC_API_KEY=your_key_here
```

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY="your_key_here"
```

**Windows (Command Prompt):**
```cmd
set ANTHROPIC_API_KEY=your_key_here
```

## Step 3: Start MCP Server

The MCP server enables AI communication:

```bash
# In the project directory
node dist/mcp/server.js
```

Or add to your VS Code settings:
```json
{
  "neurocode.mcpServerCommand": "node /path/to/neurocode-adapter/dist/mcp/server.js"
}
```

## Step 4: Import Your First Assignment

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `NeuroCode: Import Assignment`
3. Select an example assignment:
   - `examples/array-sum.json` (Beginner)
   - `examples/fibonacci.json` (Intermediate)

## Step 5: Configure Your Preferences

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: `NeuroCode: Configure Preferences`
3. Adjust settings:
   - **Visual**: Color scheme, font size, spacing
   - **Structural**: Chunking, progressive disclosure
   - **Interaction**: Text-to-speech, focus mode, hints

### Recommended Settings by Profile

**For Dyslexia:**
```json
{
  "neurocode.colorScheme": "dyslexia-friendly",
  "neurocode.fontFamily": "dyslexia-friendly",
  "neurocode.fontSize": "large",
  "neurocode.lineSpacing": 2.0
}
```

**For ADHD:**
```json
{
  "neurocode.focusMode": true,
  "neurocode.structuralPreferences.chunking": true,
  "neurocode.interactionPreferences.hintAvailability": "delayed"
}
```

**For Autism (Sensory Sensitivity):**
```json
{
  "neurocode.colorScheme": "low-blue",
  "neurocode.visualPreferences.animationsReduced": true,
  "neurocode.focusMode": true
}
```

## Step 6: Start Working on Assignment

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: `NeuroCode: Open Assignment`
3. Select the imported assignment
4. Two windows will open:
   - **Left**: Your code editor
   - **Right**: Assignment instructions (adaptive)

## Using Key Features

### Getting AI Help

When stuck:
1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: `NeuroCode: Get AI Help`
3. Describe your problem
4. Receive personalized assistance

### Automatic Support

NeuroCode monitors your progress and offers help when:
- Long pauses detected (3+ minutes)
- Multiple errors accumulate
- Struggling indicators appear

### Exporting Progress

Save your work:
1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Type: `NeuroCode: Export Progress`
3. Choose save location

## Tips for Best Experience

### 1. Customize Your Environment

Adjust VS Code settings to complement NeuroCode:
- **Color Theme**: Choose a compatible VS Code theme
- **Font Size**: Match with your NeuroCode preference
- **Zoom Level**: Use `Ctrl/Cmd +/-` to adjust

### 2. Use Focus Mode

Enable for distraction-free coding:
- Hides non-essential UI elements
- Centers content
- Reduces visual noise

### 3. Leverage Text-to-Speech

Great for:
- Auditory learners
- Reducing reading fatigue
- Understanding complex instructions

Click the speaker icon 🔊 in assignment view

### 4. Progressive Disclosure

Click section headers to expand/collapse:
- Start with summary
- Expand as needed
- Reduce cognitive overload

### 5. Take Breaks

NeuroCode tracks your activity:
- Long pause? Take a break
- Multiple errors? Step away briefly
- Come back refreshed

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Open Assignment | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| Get AI Help | `Ctrl+Shift+H` | `Cmd+Shift+H` |
| Toggle Focus | `Ctrl+Shift+F` | `Cmd+Shift+F` |

*Note: Configure custom shortcuts in VS Code settings*

## Troubleshooting

### MCP Server Won't Connect

**Check:**
1. Server is running (`node dist/mcp/server.js`)
2. ANTHROPIC_API_KEY is set
3. No firewall blocking localhost

**Solution:**
```bash
# Restart server
pkill -f "mcp/server.js"
node dist/mcp/server.js
```

### AI Help Not Working

**Check:**
1. MCP connection status (check status bar)
2. API key is valid
3. Internet connection

**Solution:**
- Verify API key at https://console.anthropic.com/
- Check VS Code Output panel → NeuroCode MCP

### Assignment Won't Import

**Check:**
1. File is valid JSON
2. Contains required fields
3. File path is accessible

**Solution:**
- Validate JSON: https://jsonlint.com/
- Check example files for format
- Ensure file permissions

### Preferences Not Applying

**Check:**
1. Settings are saved
2. Extension is activated
3. Reload window needed

**Solution:**
```
1. Ctrl+Shift+P → "Reload Window"
2. Re-apply preferences
```

## Next Steps

Now that you're set up:

1. **Explore Examples**: Try different assignments
2. **Customize**: Fine-tune preferences for your needs
3. **Create Assignments**: Make your own using the format guide
4. **Share Feedback**: Help improve NeuroCode

## Getting Help

- 📖 Full Documentation: [README.md](README.md)
- 🐛 Report Issues: GitHub Issues
- 💬 Community: GitHub Discussions
- 📧 Email: support@neurocode.dev

## Join the Community

- Share your experience
- Suggest features
- Contribute assignments
- Help others

Happy coding! 🎉