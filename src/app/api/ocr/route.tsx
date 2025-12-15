import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF, DOCX, PNG, or JPEG" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log("File received:", {
      name: file.name,
      type: file.type,
      size: file.size,
      bufferLength: buffer.length,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
      data: {
        text: "OCR processing would happen here",
        extractedInfo: {},
      },
    });
  } catch (error) {
    console.error("OCR route error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 },
    );
  }
}
