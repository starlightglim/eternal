/**
 * Desk Assistant Route (Workers AI)
 *
 * POST /api/assistant - Send message to Llama 3.3
 *
 * The assistant has context about the user's desktop items and can help
 * organize files, find things, and answer questions in a retro "help desk" style.
 */

import type { Env } from '../index';
import type { AuthContext } from '../middleware/auth';
import type { DesktopItem } from '../types';

interface AssistantRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

interface ToolResult {
  success: boolean;
  message: string;
}

interface AssistantResponse {
  response: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

// System prompt for the desk assistant
const SYSTEM_PROMPT = `You are the EternalOS Desk Assistant — a helpful, slightly retro-flavored AI that lives inside a classic Macintosh desktop environment from the 1990s.

## Your Personality
- Warm, helpful, and occasionally nostalgic
- Speak in a friendly, slightly formal tone reminiscent of old Mac help dialogs
- Keep responses concise (2-4 sentences typically, unless the user asks for more detail)
- Use classic Mac terminology (e.g., "trash" not "recycle bin", "folder" not "directory")
- Occasionally reference the good old days of computing

## Your Core Capabilities
- Help users organize their files and folders
- Find items by description or name
- Suggest folder structures for better organization
- Describe what's on the user's desktop
- Answer general questions about the desktop contents
- Provide a friendly presence in their digital sanctuary

## CUSTOMIZATION CAPABILITIES
You can help users customize their desktop using TOOL CALLS. When a user wants to make a customization change, respond with your explanation AND include a tool call in JSON format.

### Available Tools

1. **setAccentColor** - Change the accent color (selection, highlights, buttons)
   Usage: \`{"tool": "setAccentColor", "args": {"color": "#HEX"}}\`
   Example colors: Blue #000080, Purple #6B2FA0, Red #CC0000, Orange #FF8C00, Green #228B22, Teal #008080, Graphite #666666, Pink #FF69B4

2. **setDesktopColor** - Change the desktop background color (the surface behind icons)
   Usage: \`{"tool": "setDesktopColor", "args": {"color": "#HEX"}}\`
   Presets: Platinum #C0C0C0 (default), Blue #4A6FA5, Purple #6B5B95, Teal #4A7C7A, Green #6B8E6B, Rose #D4A5A5, Warm Gray #A89B8E, Dark #2C2C2C

3. **setWindowBgColor** - Change the window content area background
   Usage: \`{"tool": "setWindowBgColor", "args": {"color": "#HEX"}}\`
   Presets: White #FFFFFF (default), Cream #FFFEF0, Light Gray #F0F0F0, Light Blue #F0F8FF, Light Green #F0FFF0, Light Pink #FFF0F5, Light Yellow #FFFFD9, Dark #1C1C1C

4. **setWallpaper** - Set a wallpaper pattern
   Usage: \`{"tool": "setWallpaper", "args": {"value": "PATTERN"}}\`
   Patterns: none, dots, diagonal, grid, checkerboard, waves, zigzag, crosses, diamonds, bricks

5. **setItemIcon** - Change an item's icon (folders, files)
   Usage: \`{"tool": "setItemIcon", "args": {"itemId": "ID", "icon": "ICON_NAME"}}\`
   Colored folders: folder-red, folder-blue, folder-green, folder-purple, folder-orange, folder-pink
   Symbols: star, heart, sparkle, diamond, flag
   Objects: book, game-controller, coffee, clock, mail, key, lock, gift, lightbulb, rocket, palette, pencil
   Nature: planet, lightning, fire, leaf, sun, moon, cloud, rainbow
   Media: music-note, camera, photo, headphones, terminal

6. **addWidget** - Create a new desktop widget
   Usage: \`{"tool": "addWidget", "args": {"widgetType": "TYPE", "config": {...}}}\`
   Types:
   - sticky-note: \`{"widgetType": "sticky-note", "config": {"color": "#FFFACD", "text": "Note text"}}\`
     Colors: yellow #FFFACD, pink #FFD1DC, blue #D6EAFF, green #D1FFD6, purple #E8D1FF, orange #FFE5D1
   - guestbook: \`{"widgetType": "guestbook", "config": {"entries": []}}\`
   - music-player: \`{"widgetType": "music-player", "config": {"tracks": [{"title": "Name", "url": "URL"}]}}\`
   - pixel-canvas: \`{"widgetType": "pixel-canvas", "config": {"grid": [], "palette": [...]}}\`
   - link-board: \`{"widgetType": "link-board", "config": {"links": [{"title": "Name", "url": "URL"}]}}\`

7. **applyCustomCSS** - Apply custom CSS styling (advanced)
   Usage: \`{"tool": "applyCustomCSS", "args": {"css": "CSS_RULES"}}\`
   Available selectors: .window, .titleBar, .desktopIcon, .icon-label, .menuBar, .window-content
   Example: .window { border-radius: 8px; } .titleBar { background: linear-gradient(to right, #6B2FA0, #9B59B6); }

### How to Use Tools
When a user asks to customize something, provide a helpful response AND include the tool call in this format:

\`\`\`json
{"tool": "toolName", "args": {...}}
\`\`\`

For example, if a user says "make my accent color purple", respond with something like:
"I'll set your accent color to a lovely purple shade!"
\`\`\`json
{"tool": "setAccentColor", "args": {"color": "#6B2FA0"}}
\`\`\`

### Creative Suggestions
When users describe a mood or theme, get creative with your suggestions:
- "Rainy day vibe" → Dark blue desktop, gray window backgrounds, moody accent colors
- "Retro gaming" → Bright accent colors, pixel-canvas widget, game controller icons
- "Cozy workspace" → Warm cream colors, sticky notes, coffee icon on folders
- "Night mode" → Dark colors throughout, moon icon, purple/blue accents
- "Nature themed" → Green tones, leaf/sun/rainbow icons, organic wallpaper patterns

Remember: This is EternalOS — a place of quiet, curated digital ownership. No social media, no feeds, no likes. Just a personal desktop that visitors can browse.

## Current Desktop State
`;

interface UserProfile {
  username: string;
  displayName: string;
  wallpaper: string;
  accentColor?: string;
  desktopColor?: string;
  windowBgColor?: string;
  customCSS?: string;
}

// Valid tool names for security
const VALID_TOOLS = new Set([
  'setAccentColor',
  'setDesktopColor',
  'setWindowBgColor',
  'setWallpaper',
  'setItemIcon',
  'addWidget',
  'applyCustomCSS',
]);

// Valid wallpaper patterns
const VALID_WALLPAPERS = new Set([
  'none', 'dots', 'diagonal', 'grid', 'checkerboard',
  'waves', 'zigzag', 'crosses', 'diamonds', 'bricks',
]);

// Valid widget types
const VALID_WIDGET_TYPES = new Set([
  'sticky-note', 'guestbook', 'music-player', 'pixel-canvas', 'link-board',
]);

// Valid custom icon names (built-in library)
const VALID_ICONS = new Set([
  'folder-red', 'folder-blue', 'folder-green', 'folder-purple', 'folder-orange', 'folder-pink',
  'star', 'heart', 'music-note', 'camera', 'book', 'game-controller', 'coffee', 'planet',
  'lightning', 'fire', 'sparkle', 'clock', 'mail', 'key', 'lock', 'gift', 'flag', 'leaf',
  'sun', 'moon', 'cloud', 'rainbow', 'diamond', 'lightbulb', 'rocket', 'palette', 'pencil',
  'terminal', 'photo', 'headphones', 'home',
]);

/**
 * Extract tool calls from the AI response text
 * Looks for JSON objects in code blocks or inline
 */
function extractToolCalls(responseText: string): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // Match JSON in code blocks: ```json {...} ```
  const codeBlockRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;
  let match;

  while ((match = codeBlockRegex.exec(responseText)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.tool && VALID_TOOLS.has(parsed.tool) && parsed.args) {
        toolCalls.push({ tool: parsed.tool, args: parsed.args });
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Also try to find inline JSON with "tool" key (outside code blocks)
  // This is more lenient but helps catch cases where AI doesn't use code blocks
  if (toolCalls.length === 0) {
    const inlineRegex = /\{[^{}]*"tool"\s*:\s*"([^"]+)"[^{}]*\}/g;
    while ((match = inlineRegex.exec(responseText)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.tool && VALID_TOOLS.has(parsed.tool) && parsed.args) {
          toolCalls.push({ tool: parsed.tool, args: parsed.args });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  return toolCalls;
}

/**
 * Validate a hex color string
 */
function isValidHexColor(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate and sanitize CSS (basic security checks)
 */
function validateCSS(css: unknown): string | null {
  if (typeof css !== 'string') return null;
  if (css.length > 10240) return null; // Max 10KB

  // Block dangerous patterns
  const dangerous = [
    '@import',
    'url(',
    'expression(',
    'javascript:',
    'vbscript:',
    'data:',
    '-moz-binding',
    'behavior:',
    '<script',
    '</script',
  ];

  const lowerCSS = css.toLowerCase();
  for (const pattern of dangerous) {
    if (lowerCSS.includes(pattern)) return null;
  }

  return css;
}

/**
 * Execute a tool call against the Durable Object
 */
async function executeTool(
  toolCall: ToolCall,
  stub: DurableObjectStub,
  items: DesktopItem[],
): Promise<ToolResult> {
  const { tool, args } = toolCall;

  try {
    switch (tool) {
      case 'setAccentColor': {
        const color = args.color;
        if (!isValidHexColor(color)) {
          return { success: false, message: 'Invalid accent color format. Use #RRGGBB format.' };
        }
        const response = await stub.fetch(new Request('http://internal/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accentColor: color }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to update accent color.' };
        }
        return { success: true, message: `Accent color set to ${color}` };
      }

      case 'setDesktopColor': {
        const color = args.color;
        if (!isValidHexColor(color)) {
          return { success: false, message: 'Invalid desktop color format. Use #RRGGBB format.' };
        }
        const response = await stub.fetch(new Request('http://internal/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ desktopColor: color }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to update desktop color.' };
        }
        return { success: true, message: `Desktop color set to ${color}` };
      }

      case 'setWindowBgColor': {
        const color = args.color;
        if (!isValidHexColor(color)) {
          return { success: false, message: 'Invalid window background color format. Use #RRGGBB format.' };
        }
        const response = await stub.fetch(new Request('http://internal/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ windowBgColor: color }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to update window background color.' };
        }
        return { success: true, message: `Window background color set to ${color}` };
      }

      case 'setWallpaper': {
        const value = args.value;
        if (typeof value !== 'string' || !VALID_WALLPAPERS.has(value)) {
          return { success: false, message: `Invalid wallpaper pattern. Valid options: ${Array.from(VALID_WALLPAPERS).join(', ')}` };
        }
        const response = await stub.fetch(new Request('http://internal/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallpaper: value }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to update wallpaper.' };
        }
        return { success: true, message: `Wallpaper pattern set to "${value}"` };
      }

      case 'setItemIcon': {
        const { itemId, icon } = args;
        if (typeof itemId !== 'string' || typeof icon !== 'string') {
          return { success: false, message: 'Invalid item ID or icon name.' };
        }
        // Verify item exists
        const itemExists = items.some(i => i.id === itemId && !i.isTrashed);
        if (!itemExists) {
          return { success: false, message: `Item with ID "${itemId}" not found.` };
        }
        // Verify icon is valid
        if (!VALID_ICONS.has(icon)) {
          return { success: false, message: `Invalid icon name "${icon}". Try: folder-red, folder-blue, star, heart, etc.` };
        }
        const response = await stub.fetch(new Request('http://internal/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: itemId, customIcon: icon }] }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to update item icon.' };
        }
        return { success: true, message: `Icon for item set to "${icon}"` };
      }

      case 'addWidget': {
        const widgetType = args.widgetType;
        const config = args.config as Record<string, unknown> | undefined;
        if (typeof widgetType !== 'string' || !VALID_WIDGET_TYPES.has(widgetType)) {
          return { success: false, message: `Invalid widget type. Valid types: ${Array.from(VALID_WIDGET_TYPES).join(', ')}` };
        }
        // Basic config validation based on widget type
        let widgetConfig: Record<string, unknown> = {};
        switch (widgetType) {
          case 'sticky-note':
            widgetConfig = {
              color: isValidHexColor(config?.color) ? config.color : '#FFFACD',
              text: typeof config?.text === 'string' ? (config.text as string).slice(0, 1000) : '',
            };
            break;
          case 'guestbook':
            widgetConfig = { entries: [] };
            break;
          case 'music-player':
            widgetConfig = { tracks: Array.isArray(config?.tracks) ? (config.tracks as unknown[]).slice(0, 20) : [] };
            break;
          case 'pixel-canvas':
            widgetConfig = { grid: [], palette: ['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#800080', '#FFA500'] };
            break;
          case 'link-board':
            widgetConfig = { links: Array.isArray(config?.links) ? (config.links as unknown[]).slice(0, 20) : [] };
            break;
        }
        // Find a good position for the widget
        const existingPositions = new Set(
          items.filter(i => !i.parentId && !i.isTrashed).map(i => `${i.position.x},${i.position.y}`)
        );
        let widgetPos = { x: 1, y: 1 };
        for (let y = 1; y <= 10; y++) {
          for (let x = 1; x <= 10; x++) {
            if (!existingPositions.has(`${x},${y}`)) {
              widgetPos = { x, y };
              break;
            }
          }
          if (!existingPositions.has(`${widgetPos.x},${widgetPos.y}`)) break;
        }
        // Create the widget
        const widgetName = widgetType.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const response = await stub.fetch(new Request('http://internal/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'widget',
            name: widgetName,
            position: widgetPos,
            isPublic: true,
            widgetType,
            widgetConfig,
          }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to create widget.' };
        }
        return { success: true, message: `Created a new ${widgetName} widget on your desktop!` };
      }

      case 'applyCustomCSS': {
        const css = validateCSS(args.css);
        if (css === null) {
          return { success: false, message: 'Invalid or unsafe CSS. Ensure it does not contain @import, url(), or script tags, and is under 10KB.' };
        }
        const response = await stub.fetch(new Request('http://internal/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customCSS: css }),
        }));
        if (!response.ok) {
          return { success: false, message: 'Failed to apply custom CSS.' };
        }
        return { success: true, message: 'Custom CSS applied!' };
      }

      default:
        return { success: false, message: `Unknown tool: ${tool}` };
    }
  } catch (error) {
    console.error('Tool execution error:', error);
    return { success: false, message: 'An error occurred while executing the tool.' };
  }
}

/**
 * Build desktop context string from items and profile
 */
function buildDesktopContext(items: DesktopItem[], profile?: UserProfile): string {
  let context = '';

  // Include current appearance settings
  if (profile) {
    context += '### Current Appearance Settings\n';
    context += `- Wallpaper pattern: ${profile.wallpaper || 'none'}\n`;
    if (profile.accentColor) {
      context += `- Accent color: ${profile.accentColor}\n`;
    }
    if (profile.desktopColor) {
      context += `- Desktop color: ${profile.desktopColor}\n`;
    }
    if (profile.windowBgColor) {
      context += `- Window background: ${profile.windowBgColor}\n`;
    }
    if (profile.customCSS) {
      context += `- Custom CSS: ${profile.customCSS.length} bytes applied\n`;
    }
    context += '\n';
  }

  // Items context
  if (items.length === 0) {
    context += '### Desktop Items\n(The desktop is empty — no items yet)\n';
    return context;
  }

  // Filter out trashed items
  const activeItems = items.filter(i => !i.isTrashed);

  // Group items by location
  const rootItems = activeItems.filter(i => !i.parentId);
  const folderContents = new Map<string, DesktopItem[]>();

  activeItems.forEach(item => {
    if (item.parentId) {
      const existing = folderContents.get(item.parentId) || [];
      existing.push(item);
      folderContents.set(item.parentId, existing);
    }
  });

  context += '### Desktop Items\n';
  context += 'On the desktop:\n';
  rootItems.forEach(item => {
    const typeLabel = item.type === 'folder' ? '📁' :
                      item.type === 'image' ? '🖼️' :
                      item.type === 'text' ? '📄' :
                      item.type === 'widget' ? '🔲' :
                      item.type === 'audio' ? '🎵' :
                      item.type === 'video' ? '🎬' :
                      item.type === 'pdf' ? '📑' : '🔗';
    const visibility = item.isPublic ? '(public)' : '(private)';
    const customIcon = item.customIcon ? ` [icon: ${item.customIcon}]` : '';
    const widgetInfo = item.type === 'widget' && item.widgetType ? ` [${item.widgetType}]` : '';
    context += `  ${typeLabel} "${item.name}"${widgetInfo}${customIcon} ${visibility} (id: ${item.id})\n`;
  });

  // List folder contents
  folderContents.forEach((contents, folderId) => {
    const folder = activeItems.find(i => i.id === folderId);
    if (folder) {
      context += `\nInside "${folder.name}" (id: ${folder.id}):\n`;
      contents.forEach(item => {
        const typeLabel = item.type === 'folder' ? '📁' :
                          item.type === 'image' ? '🖼️' :
                          item.type === 'text' ? '📄' :
                          item.type === 'widget' ? '🔲' :
                          item.type === 'audio' ? '🎵' :
                          item.type === 'video' ? '🎬' :
                          item.type === 'pdf' ? '📑' : '🔗';
        const customIcon = item.customIcon ? ` [icon: ${item.customIcon}]` : '';
        context += `  ${typeLabel} "${item.name}"${customIcon} (id: ${item.id})\n`;
      });
    }
  });

  // Summary
  const imageCount = activeItems.filter(i => i.type === 'image').length;
  const textCount = activeItems.filter(i => i.type === 'text').length;
  const folderCount = activeItems.filter(i => i.type === 'folder').length;
  const linkCount = activeItems.filter(i => i.type === 'link').length;
  const widgetCount = activeItems.filter(i => i.type === 'widget').length;
  const audioCount = activeItems.filter(i => i.type === 'audio').length;
  const videoCount = activeItems.filter(i => i.type === 'video').length;
  const pdfCount = activeItems.filter(i => i.type === 'pdf').length;

  const counts = [];
  if (folderCount > 0) counts.push(`${folderCount} folders`);
  if (imageCount > 0) counts.push(`${imageCount} images`);
  if (textCount > 0) counts.push(`${textCount} text files`);
  if (linkCount > 0) counts.push(`${linkCount} links`);
  if (widgetCount > 0) counts.push(`${widgetCount} widgets`);
  if (audioCount > 0) counts.push(`${audioCount} audio files`);
  if (videoCount > 0) counts.push(`${videoCount} videos`);
  if (pdfCount > 0) counts.push(`${pdfCount} PDFs`);

  context += `\nSummary: ${activeItems.length} total items (${counts.join(', ')})`;

  return context;
}

/**
 * Handle assistant chat request
 * POST /api/assistant
 */
export async function handleAssistant(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as AssistantRequest;

    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Limit message length
    if (body.message.length > 2000) {
      return Response.json(
        { error: 'Message too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Fetch user's desktop items and profile from Durable Object
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);

    // Fetch items and profile in parallel
    const [itemsResponse, profileResponse] = await Promise.all([
      stub.fetch(new Request('http://internal/items')),
      stub.fetch(new Request('http://internal/profile')),
    ]);

    let items: DesktopItem[] = [];
    if (itemsResponse.ok) {
      const data = await itemsResponse.json() as { items: DesktopItem[] };
      items = data.items || [];
    }

    let profile: UserProfile | undefined;
    if (profileResponse.ok) {
      const data = await profileResponse.json() as { profile: UserProfile };
      profile = data.profile;
    }

    // Build the system prompt with desktop context
    const desktopContext = buildDesktopContext(items, profile);
    const fullSystemPrompt = SYSTEM_PROMPT + desktopContext;

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: fullSystemPrompt },
    ];

    // Add conversation history if provided (limit to last 10 exchanges)
    if (body.conversationHistory && Array.isArray(body.conversationHistory)) {
      const recentHistory = body.conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    // Add the current message
    messages.push({ role: 'user', content: body.message });

    // Call Workers AI
    const aiResponse = await env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      { messages }
    );

    // Extract response text
    const responseText = typeof aiResponse === 'object' && aiResponse !== null && 'response' in aiResponse
      ? (aiResponse as { response: string }).response
      : 'I apologize, but I encountered an issue processing your request. Please try again.';

    // Parse and execute any tool calls in the response
    const toolCalls = extractToolCalls(responseText);
    const toolResults: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await executeTool(toolCall, stub, items);
      toolResults.push(result);
    }

    const response: AssistantResponse = {
      response: responseText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    };

    return Response.json(response);

  } catch (error) {
    console.error('Assistant error:', error);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
