import { processChat } from '@/lib/chat-engine'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    const result = await processChat(
      messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    )
    return Response.json(result)
  } catch (err) {
    console.error('Chat error:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
