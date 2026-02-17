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

interface AssistantResponse {
  response: string;
}

// System prompt for the desk assistant
const SYSTEM_PROMPT = `You are the EternalOS Desk Assistant — a helpful, slightly retro-flavored AI that lives inside a classic Macintosh desktop environment from the 1990s.

Your personality:
- Warm, helpful, and occasionally nostalgic
- Speak in a friendly, slightly formal tone reminiscent of old Mac help dialogs
- Keep responses concise (2-4 sentences typically)
- Use classic Mac terminology when appropriate (e.g., "trash" not "recycle bin", "folder" not "directory")
- Occasionally reference the good old days of computing

Your capabilities:
- Help users organize their files and folders
- Find items by description or name
- Suggest folder structures for better organization
- Describe what's on the user's desktop
- Answer general questions about the desktop contents
- Provide a friendly presence in their digital sanctuary

Remember: This is EternalOS — a place of quiet, curated digital ownership. No social media, no feeds, no likes. Just a personal desktop that visitors can browse.

Here are the items currently on the user's desktop:
`;

/**
 * Build desktop context string from items
 */
function buildDesktopContext(items: DesktopItem[]): string {
  if (items.length === 0) {
    return '(The desktop is empty — no items yet)';
  }

  // Group items by location
  const rootItems = items.filter(i => !i.parentId);
  const folderContents = new Map<string, DesktopItem[]>();

  items.forEach(item => {
    if (item.parentId) {
      const existing = folderContents.get(item.parentId) || [];
      existing.push(item);
      folderContents.set(item.parentId, existing);
    }
  });

  let context = '';

  // List root items
  context += 'On the desktop:\n';
  rootItems.forEach(item => {
    const typeLabel = item.type === 'folder' ? '📁' :
                      item.type === 'image' ? '🖼️' :
                      item.type === 'text' ? '📄' : '🔗';
    const visibility = item.isPublic ? '(public)' : '(private)';
    context += `  ${typeLabel} "${item.name}" ${visibility}\n`;
  });

  // List folder contents
  folderContents.forEach((contents, folderId) => {
    const folder = items.find(i => i.id === folderId);
    if (folder) {
      context += `\nInside "${folder.name}":\n`;
      contents.forEach(item => {
        const typeLabel = item.type === 'folder' ? '📁' :
                          item.type === 'image' ? '🖼️' :
                          item.type === 'text' ? '📄' : '🔗';
        context += `  ${typeLabel} "${item.name}"\n`;
      });
    }
  });

  // Summary
  const imageCount = items.filter(i => i.type === 'image').length;
  const textCount = items.filter(i => i.type === 'text').length;
  const folderCount = items.filter(i => i.type === 'folder').length;
  const linkCount = items.filter(i => i.type === 'link').length;

  context += `\nSummary: ${items.length} total items (${folderCount} folders, ${imageCount} images, ${textCount} text files, ${linkCount} links)`;

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

    // Fetch user's desktop items from Durable Object
    const doId = env.USER_DESKTOP.idFromName(auth.uid);
    const stub = env.USER_DESKTOP.get(doId);
    const doResponse = await stub.fetch(new Request('http://internal/items'));

    let items: DesktopItem[] = [];
    if (doResponse.ok) {
      const data = await doResponse.json() as { items: DesktopItem[] };
      items = data.items || [];
    }

    // Build the system prompt with desktop context
    const desktopContext = buildDesktopContext(items);
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

    const response: AssistantResponse = {
      response: responseText,
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
