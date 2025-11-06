import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuditUser } from "@/lib/audit-context";
import { getSessionUserId } from "@/lib/get-session-user";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updateData: {
            approvedBudget?: number | string;
            description?: string;
            code?: string;
            workflowstage?: { connect: { id: number } };
        } = {};

        if (body.approvedBudget !== undefined) updateData.approvedBudget = body.approvedBudget;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.code !== undefined) updateData.code = body.code;
        if (body.workflowStageId !== undefined) {
            updateData.workflowstage = { connect: { id: Number(body.workflowStageId) } };
        }

        const userId = await getSessionUserId();

        const updatedProject = await withAuditUser(userId, async (tx) => {
            return await tx.project.update({
                where: { id: Number(id) },
                data: updateData,
            });
        });

        return NextResponse.json({
            ...updatedProject,
        });
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json({ error: "Error updating project" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try{
        const { id } = await params;
        const project = await prisma.project.findUnique({
            where: { id: Number(id) },
            include: {
                company: { include: { companyProponents: true, companyAddresses: true } },
                workflow: true,
                workflowstage: true,
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error in API route:", error);
        return NextResponse.json({ error: "Error fetching project" }, { status: 500 });
    }
}