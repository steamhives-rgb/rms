// POST /api/ai/comment — generate a teacher or principal comment using Claude
//
// Bug 6 fix:
//   - Validates ANTHROPIC_API_KEY is set before attempting the call
//   - Builds a rich, context-aware prompt from student/result data
//   - Returns { comment: string } or { error: string }
//
// Body: { studentName, className, term, session, average, grade, type }
//   type: "teacher" | "principal"
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authSchool, AuthError } from '@/lib/auth';
import { ok, err } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await authSchool();  // teachers + admins can use this

    if (!process.env.ANTHROPIC_API_KEY) {
      return err('AI comment generation is not configured. Ask your administrator to set ANTHROPIC_API_KEY.', 503);
    }

    const body = await req.json();
    const { studentName, className, term, session, average, grade, type } = body;

    if (!studentName || !className || !term || !session) {
      return err('studentName, className, term, and session are required.');
    }

    const avg     = typeof average === 'number' ? average.toFixed(1) : String(average ?? 'N/A');
    const gradeStr = grade ?? 'N/A';

    const prompt = type === 'principal'
      ? `You are a school principal writing a brief, formal comment for a student's end-of-term report card.
         Student: ${studentName}
         Class: ${className}
         Term: ${term}, Session: ${session}
         Average Score: ${avg}%, Grade: ${gradeStr}

         Write 1-2 sentences. Be encouraging and professional. Acknowledge performance and motivate improvement or continued excellence. Do not use generic filler phrases.`
      : `You are a class teacher writing a brief, warm comment for a student's end-of-term report card.
         Student: ${studentName}
         Class: ${className}
         Term: ${term}, Session: ${session}
         Average Score: ${avg}%, Grade: ${gradeStr}

         Write 1-2 sentences. Be personal, warm, and specific to their performance level. Encourage effort and growth. Avoid generic statements.`;

    const client  = new Anthropic();
    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages:   [{ role: 'user', content: prompt }],
    });

    const comment = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
    if (!comment) return err('AI returned an empty comment. Please try again.', 500);

    return ok({ comment });
  } catch (e) {
    if (e instanceof AuthError) return err(e.message, e.status);
    console.error('[ai/comment] error:', e);
    return err('Could not generate comment. Please try again.', 500);
  }
}
