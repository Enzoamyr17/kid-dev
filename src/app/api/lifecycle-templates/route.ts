import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper function to convert BigInt to string
function serializeLifecycleTemplate(template: { id: bigint; [key: string]: unknown }) {
  return {
    ...template,
    id: template.id.toString(),
  };
}

// GET - Fetch all lifecycle templates with their stages
export async function GET() {
  try {
    const templates = await prisma.lifecycleTemplate.findMany({
      include: {
        lifecycleStages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const serializedTemplates = templates.map((template) => ({
      ...serializeLifecycleTemplate(template),
      stages: template.lifecycleStages.map((stage) => ({
        ...stage,
        id: stage.id.toString(),
        templateId: stage.templateId.toString(),
      })),
    }));

    return NextResponse.json(serializedTemplates);
  } catch (error) {
    console.error('Error fetching lifecycle templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lifecycle templates' },
      { status: 500 }
    );
  }
}
