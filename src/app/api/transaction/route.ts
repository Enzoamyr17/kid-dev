import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Fetch all transactions for a project (optionally filtered by category)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");
        const categoryId = searchParams.get("categoryId");

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        const whereClause: {
            projectId: number;
            categoryId?: number;
        } = {
            projectId: parseInt(projectId),
        };

        if (categoryId) {
            whereClause.categoryId = parseInt(categoryId);
        }

        const transactions = await prisma.projectTransaction.findMany({
            where: whereClause,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Empty array is valid - return it without error
        if (transactions.length === 0) {
            return NextResponse.json([]);
        }

        const formattedTransactions = transactions.map((transaction) => ({
            id: transaction.id,
            projectId: transaction.projectId,
            categoryId: transaction.categoryId,
            category: transaction.category,
            description: transaction.description,
            amount: Number(transaction.amount),
            attachment: transaction.attachment,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
        }));

        return NextResponse.json(formattedTransactions);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}

// POST - Create a new transaction
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, categoryId, description, amount, attachment } = body;

        if (!projectId || !categoryId || !description || amount === undefined) {
            return NextResponse.json(
                { error: "Project ID, category ID, description, and amount are required" },
                { status: 400 }
            );
        }

        const transaction = await prisma.projectTransaction.create({
            data: {
                projectId: parseInt(projectId),
                categoryId: parseInt(categoryId),
                description,
                amount: parseFloat(amount),
                attachment: attachment || null,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });

        return NextResponse.json({
            id: transaction.id,
            projectId: transaction.projectId,
            categoryId: transaction.categoryId,
            category: transaction.category,
            description: transaction.description,
            amount: Number(transaction.amount),
            attachment: transaction.attachment,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}

// PATCH - Update a transaction
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, categoryId, description, amount, attachment } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        const updateData: {
            categoryId?: number;
            description?: string;
            amount?: number;
            attachment?: string | null;
        } = {};

        if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
        if (description !== undefined) updateData.description = description;
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (attachment !== undefined) updateData.attachment = attachment || null;

        const transaction = await prisma.projectTransaction.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                    },
                },
            },
        });

        return NextResponse.json({
            id: transaction.id,
            projectId: transaction.projectId,
            categoryId: transaction.categoryId,
            category: transaction.category,
            description: transaction.description,
            amount: Number(transaction.amount),
            attachment: transaction.attachment,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
        });
    } catch (error) {
        console.error("Error updating transaction:", error);
        return NextResponse.json(
            { error: "Failed to update transaction" },
            { status: 500 }
        );
    }
}

// DELETE - Delete a transaction
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        await prisma.projectTransaction.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return NextResponse.json(
            { error: "Failed to delete transaction" },
            { status: 500 }
        );
    }
}
