import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Fetch all categories for a project with calculated expenses
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("projectId");

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        const categories = await prisma.budgetCategory.findMany({
            where: {
                projectId: parseInt(projectId),
            },
            include: {
                transactions: {
                    where: {
                        transactionType: "project",
                    },
                    select: {
                        cost: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        // Empty array is valid - return it without error
        if (categories.length === 0) {
            return NextResponse.json([]);
        }

        // Calculate expenses and remaining for each category
        const categoriesWithCalculations = categories.map((category) => {
            const expenses = category.transactions.reduce(
                (sum, transaction) => sum + Number(transaction.cost),
                0
            );
            const remaining = Number(category.budget) - expenses;

            return {
                id: category.id,
                name: category.name,
                description: category.description,
                budget: Number(category.budget),
                color: category.color,
                expenses,
                remaining,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt,
            };
        });

        return NextResponse.json(categoriesWithCalculations);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json(
            { error: "Failed to fetch categories" },
            { status: 500 }
        );
    }
}

// POST - Create a new category
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId, name, description, budget, color } = body;

        if (!projectId || !name || budget === undefined) {
            return NextResponse.json(
                { error: "Project ID, name, and budget are required" },
                { status: 400 }
            );
        }

        const category = await prisma.budgetCategory.create({
            data: {
                projectId: parseInt(projectId),
                name,
                description: description || null,
                budget: parseFloat(budget),
                color: color || "#3b82f6",
            },
        });

        return NextResponse.json({
            id: category.id,
            name: category.name,
            description: category.description,
            budget: Number(category.budget),
            color: category.color,
            expenses: 0,
            remaining: Number(category.budget),
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}

// PATCH - Update a category
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, description, budget, color } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Category ID is required" },
                { status: 400 }
            );
        }

        const updateData: {
            name?: string;
            description?: string | null;
            budget?: number;
            color?: string;
        } = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description || null;
        if (budget !== undefined) updateData.budget = parseFloat(budget);
        if (color !== undefined) updateData.color = color;

        const category = await prisma.budgetCategory.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                transactions: {
                    where: {
                        transactionType: "project",
                    },
                    select: {
                        cost: true,
                    },
                },
            },
        });

        const expenses = category.transactions.reduce(
            (sum, transaction) => sum + Number(transaction.cost),
            0
        );
        const remaining = Number(category.budget) - expenses;

        return NextResponse.json({
            id: category.id,
            name: category.name,
            description: category.description,
            budget: Number(category.budget),
            color: category.color,
            expenses,
            remaining,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        return NextResponse.json(
            { error: "Failed to update category" },
            { status: 500 }
        );
    }
}
