import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Build update data object dynamically based on what's sent
        const updateData: {
            bidPercentage?: bigint;
            approvedBudgetCost?: bigint | null;
            description?: string;
            code?: string;
        } = {};

        if (body.bidPercentage !== undefined) {
            updateData.bidPercentage = BigInt(body.bidPercentage);
        }
        if (body.approvedBudgetCost !== undefined) {
            updateData.approvedBudgetCost = body.approvedBudgetCost ? BigInt(body.approvedBudgetCost) : null;
        }
        if (body.description !== undefined) {
            updateData.description = body.description;
        }
        if (body.code !== undefined) {
            updateData.code = body.code;
        }

        const updatedProject = await prisma.project.update({
            where: { id: BigInt(id) },
            data: updateData,
        });

        return NextResponse.json({
            ...updatedProject,
            id: updatedProject.id.toString(),
            companyId: updatedProject.companyId.toString(),
            bidPercentage: updatedProject.bidPercentage.toString(),
            approvedBudgetCost: updatedProject.approvedBudgetCost?.toString() || null,
        });
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json({ error: "Error updating project" }, { status: 500 });
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try{
        const { id } = await params;
        // DEBUG: Log what ID we're searching for
        console.log("Searching for project with ID:", id);
        console.log("Converted to BigInt:", BigInt(id));

        const project = await prisma.project.findUnique({
            where: { id: BigInt(id) },
            include: {
                company: {
                    include: {
                        companyProponents: true,
                        companyAddresses: true,
                    },
                },
                lifecycles: {
                    include: {
                        lifecycleStage: true,
                        lifecycleTemplate: true,
                    },
                },
            },
        });

        // DEBUG: Log what we found (or didn't find)
        console.log("Found project:", project);

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }



        // Convert ALL BigInt fields to strings before sending JSON
        return NextResponse.json({
            ...project,
            id: project.id.toString(),
            companyId: project.companyId.toString(),
            bidPercentage: project.bidPercentage.toString(),
            company: {
                id: project.company.id.toString(),
                companyName: project.company.companyName,
                tinNumber: project.company.tinNumber,
                type: project.company.type,
                companyProponents: project.company.companyProponents.map(proponent => ({
                    id: proponent.id.toString(),
                    companyId: proponent.companyId.toString(),
                    contactPerson: proponent.contactPerson,
                    contactNumber: proponent.contactNumber,
                })),
                companyAddresses: project.company.companyAddresses.map(address => ({
                    id: address.id.toString(),
                    companyId: address.companyId.toString(),
                    houseNo: address.houseNo,
                    street: address.street,
                    subdivision: address.subdivision,
                    region: address.region,
                    province: address.province,
                    cityMunicipality: address.cityMunicipality,
                    barangay: address.barangay,
                })),
            },
            lifecycles: project.lifecycles.map(lifecycle => ({
                id: lifecycle.id.toString(),
                templateId: lifecycle.templateId.toString(),
                projectId: lifecycle.projectId.toString(),
                stageId: lifecycle.stageId.toString(),
                status: lifecycle.status,
                createdAt: lifecycle.createdAt,
                updatedAt: lifecycle.updatedAt,
                lifecycleStage: {
                    id: lifecycle.lifecycleStage.id.toString(),
                    templateId: lifecycle.lifecycleStage.templateId.toString(),
                    name: lifecycle.lifecycleStage.name,
                    code: lifecycle.lifecycleStage.code,
                    order: lifecycle.lifecycleStage.order,
                    requiresApproval: lifecycle.lifecycleStage.requiresApproval,
                    approvalType: lifecycle.lifecycleStage.approvalType,
                    stageOwner: lifecycle.lifecycleStage.stageOwner,
                },
                lifecycleTemplate: {
                    id: lifecycle.lifecycleTemplate.id.toString(),
                    name: lifecycle.lifecycleTemplate.name,
                    description: lifecycle.lifecycleTemplate.description,
                },
            })),
            approvedBudgetCost: project.approvedBudgetCost?.toString() || null
        });
    } catch (error) {
        // DEBUG: Log the actual error
        console.error("Error in API route:", error);
        return NextResponse.json({ error: "Error fetching project" }, { status: 500 });
    }
}