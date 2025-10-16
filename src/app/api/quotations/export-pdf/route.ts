import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { pdfData, fileName } = await request.json();

    if (!pdfData || !fileName) {
      return NextResponse.json(
        { error: 'Missing PDF data or filename' },
        { status: 400 }
      );
    }

    // Remove data:application/pdf;base64, prefix if present
    const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // Define file path in public/exportedPDFs
    const filePath = path.join(process.cwd(), 'public', 'exportedPDFs', fileName);

    // Write file
    await writeFile(filePath, buffer);

    return NextResponse.json(
      {
        success: true,
        filePath: `/exportedPDFs/${fileName}`,
        message: 'PDF saved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving PDF:', error);
    return NextResponse.json(
      { error: 'Failed to save PDF' },
      { status: 500 }
    );
  }
}
