import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId } from '@/lib/get-session-user';

// GET /api/stock-transactions?product_id={productId}
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("product_id");
    const expand = searchParams.get("expand");

    const where = productId ? { productId: parseInt(productId) } : {};

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: expand === "true" ? { product: true } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching stock transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock transactions" },
      { status: 500 }
    );
  }
}

// POST /api/stock-transactions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, type, quantity, referenceId, status, remarks } = body;

    // Validate required fields
    if (!productId || !type || quantity === undefined || !status) {
      return NextResponse.json(
        { error: "Missing required fields: productId, type, quantity, status" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["incoming", "outgoing", "received", "delivered", "adjustment"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["pending", "approved", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const userId = await getSessionUserId();

    // Create transaction and update product stock in a single transaction
    const result = await withAuditUser(userId, async (tx) => {
      // Create the stock transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          productId: parseInt(productId),
          type,
          quantity: parseFloat(quantity),
          referenceId: referenceId || null,
          status,
          remarks: remarks || null,
        },
      });

      // Get current product
      const product = await tx.product.findUnique({
        where: { id: parseInt(productId) },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // Update product stock based on transaction type and status
      const stockUpdate: {
        incomingStock?: number;
        outgoingStock?: number;
        currentStock?: number;
      } = {};

      const qty = parseFloat(quantity);

      switch (type) {
        case "incoming":
          if (status === "pending" || status === "approved") {
            stockUpdate.incomingStock = product.incomingStock + qty;
          } else if (status === "completed") {
            stockUpdate.currentStock = product.currentStock + qty;
          }
          break;

        case "outgoing":
          if (status === "pending" || status === "approved") {
            stockUpdate.outgoingStock = product.outgoingStock + qty;
          } else if (status === "completed") {
            stockUpdate.currentStock = product.currentStock - qty;
          }
          break;

        case "received":
          stockUpdate.currentStock = product.currentStock + qty;
          stockUpdate.incomingStock = Math.max(0, product.incomingStock - qty);
          break;

        case "delivered":
          stockUpdate.currentStock = product.currentStock - qty;
          stockUpdate.outgoingStock = Math.max(0, product.outgoingStock - qty);
          break;

        case "adjustment":
          // Adjustment directly modifies currentStock (can be positive or negative)
          stockUpdate.currentStock = product.currentStock + qty;
          break;
      }

      // Update the product if there are stock changes
      if (Object.keys(stockUpdate).length > 0) {
        await tx.product.update({
          where: { id: parseInt(productId) },
          data: stockUpdate,
        });
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating stock transaction:", error);
    return NextResponse.json(
      { error: "Failed to create stock transaction" },
      { status: 500 }
    );
  }
}

// PATCH /api/stock-transactions
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, quantity, referenceId, remarks } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    // Get the current transaction
    const currentTransaction = await prisma.stockTransaction.findUnique({
      where: { id: parseInt(id) },
      include: { product: true },
    });

    if (!currentTransaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      status?: "pending" | "approved" | "completed";
      quantity?: number;
      referenceId?: string | null;
      remarks?: string | null;
    } = {};

    if (status) updateData.status = status as "pending" | "approved" | "completed";
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (referenceId !== undefined) updateData.referenceId = referenceId || null;
    if (remarks !== undefined) updateData.remarks = remarks || null;

    // Update transaction and adjust stock if status changed
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      // If status changed, we need to recalculate stock
      if (status && status !== currentTransaction.status) {
        const product = currentTransaction.product;
        const stockUpdate: {
          incomingStock?: number;
          outgoingStock?: number;
          currentStock?: number;
        } = {};

        const qty = transaction.quantity;
        const oldStatus = currentTransaction.status;
        const newStatus = status;

        // Revert old status effect
        switch (currentTransaction.type) {
          case "incoming":
            if (oldStatus === "pending" || oldStatus === "approved") {
              stockUpdate.incomingStock = (stockUpdate.incomingStock ?? product.incomingStock) - qty;
            } else if (oldStatus === "completed") {
              stockUpdate.currentStock = (stockUpdate.currentStock ?? product.currentStock) - qty;
            }
            break;

          case "outgoing":
            if (oldStatus === "pending" || oldStatus === "approved") {
              stockUpdate.outgoingStock = (stockUpdate.outgoingStock ?? product.outgoingStock) - qty;
            } else if (oldStatus === "completed") {
              stockUpdate.currentStock = (stockUpdate.currentStock ?? product.currentStock) + qty;
            }
            break;
        }

        // Apply new status effect
        switch (currentTransaction.type) {
          case "incoming":
            if (newStatus === "pending" || newStatus === "approved") {
              stockUpdate.incomingStock = (stockUpdate.incomingStock ?? product.incomingStock) + qty;
            } else if (newStatus === "completed") {
              stockUpdate.currentStock = (stockUpdate.currentStock ?? product.currentStock) + qty;
            }
            break;

          case "outgoing":
            if (newStatus === "pending" || newStatus === "approved") {
              stockUpdate.outgoingStock = (stockUpdate.outgoingStock ?? product.outgoingStock) + qty;
            } else if (newStatus === "completed") {
              stockUpdate.currentStock = (stockUpdate.currentStock ?? product.currentStock) - qty;
            }
            break;
        }

        // Update product if there are changes
        if (Object.keys(stockUpdate).length > 0) {
          await tx.product.update({
            where: { id: product.id },
            data: stockUpdate,
          });
        }
      }

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating stock transaction:", error);
    return NextResponse.json(
      { error: "Failed to update stock transaction" },
      { status: 500 }
    );
  }
}
