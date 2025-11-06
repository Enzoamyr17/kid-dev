import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuditUser } from "@/lib/audit-context";
import { getSessionUserId } from "@/lib/get-session-user";

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

        const transactions = await prisma.transaction.findMany({
            where: {
                ...whereClause,
                transactionType: "project",
            },
            include: {
                budgetCategory: {
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
            category: transaction.budgetCategory,
            description: transaction.itemDescription,
            amount: Number(transaction.cost),
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
        const { projectId, categoryId, description, amount, attachment, note, link } = body;

        if (!projectId || !categoryId || !description || amount === undefined) {
            return NextResponse.json(
                { error: "Project ID, category ID, description, and amount are required" },
                { status: 400 }
            );
        }

        const userId = await getSessionUserId();

        const transaction = await withAuditUser(userId, async (tx) => {
            return await tx.transaction.create({
                data: {
                    transactionType: "project",
                    projectId: parseInt(projectId),
                    categoryId: parseInt(categoryId),
                    itemDescription: description,
                    cost: parseFloat(amount),
                    datePurchased: new Date(),
                    status: "completed",
                    attachment: attachment || null,
                    note: note || null,
                    link: link || null,
                },
                include: {
                    budgetCategory: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                        },
                    },
                },
            });
        });

        return NextResponse.json({
            id: transaction.id,
            projectId: transaction.projectId,
            categoryId: transaction.categoryId,
            category: transaction.budgetCategory,
            description: transaction.itemDescription,
            amount: Number(transaction.cost),
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
        const { id, categoryId, description, amount, attachment, note, link } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            );
        }

        const updateData: {
            categoryId?: number;
            itemDescription?: string;
            cost?: number;
            attachment?: string | null;
            note?: string | null;
            link?: string | null;
        } = {};

        if (categoryId !== undefined) updateData.categoryId = parseInt(categoryId);
        if (description !== undefined) updateData.itemDescription = description;
        if (amount !== undefined) updateData.cost = parseFloat(amount);
        if (attachment !== undefined) updateData.attachment = attachment || null;
        if (note !== undefined) updateData.note = note || null;
        if (link !== undefined) updateData.link = link || null;

        const userId = await getSessionUserId();

        const transaction = await withAuditUser(userId, async (tx) => {
            return await tx.transaction.update({
                where: { id: parseInt(id) },
                data: updateData,
                include: {
                    budgetCategory: {
                        select: {
                            id: true,
                            name: true,
                            color: true,
                        },
                    },
                },
            });
        });

        return NextResponse.json({
            id: transaction.id,
            projectId: transaction.projectId,
            categoryId: transaction.categoryId,
            category: transaction.budgetCategory,
            description: transaction.itemDescription,
            amount: Number(transaction.cost),
            attachment: transaction.attachment,
            note: transaction.note,
            link: transaction.link,
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

        const userId = await getSessionUserId();

        await withAuditUser(userId, async (tx) => {
            await tx.transaction.delete({
                where: { id: parseInt(id) },
            });
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
