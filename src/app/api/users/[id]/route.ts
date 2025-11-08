import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { withAuditUser } from '@/lib/audit-context';
import { getSessionUserId, getSessionUser } from '@/lib/get-session-user';
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// PATCH - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    const body = await request.json();

    // Get current user's session to check permissions
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user can edit passwords
    const canEditPassword =
      currentUser.department === "Executive" ||
      currentUser.department === "ICT (Information and Communications Technology)";

    // Only allow updating certain fields
    const allowedFields = [
      "department",
      "position",
      "contact",
      "isActive",
      "firstName",
      "secondName",
      "middleName",
      "lastName",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Handle password update if user has permission
    if (body.password && canEditPassword) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      const hashedPassword = await bcrypt.hash(body.password, 10);
      updateData.password = hashedPassword;
    } else if (body.password && !canEditPassword) {
      return NextResponse.json(
        { error: "You do not have permission to update passwords" },
        { status: 403 }
      );
    }

    const sessionUserId = await getSessionUserId();

    const user = await withAuditUser(sessionUserId, async (tx) => {
      return await tx.user.update({
        where: { id: userId },
        data: updateData,
      });
    });

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      secondName: user.secondName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      position: user.position,
      contact: user.contact,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (optional - you may want to just deactivate instead)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    const sessionUserId = await getSessionUserId();

    await withAuditUser(sessionUserId, async (tx) => {
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
