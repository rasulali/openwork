import { type NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = process.env.API_ENDPOINT || "http://localhost:11434";

// Model configuration
const OCR_MODEL = "deepseek-ocr";
const REASONING_MODEL = "deepseek-r1:14b";

// --- UPDATED: Matches your successful curl command ---
const OCR_PROMPT = "Free OCR.";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Please use POST." },
    { status: 405 },
  );
}

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

    // Only process images for now
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Currently only image files are supported" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    console.log("Processing image with OCR...", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    console.log("Making OCR API call:", {
      url: `${API_ENDPOINT}/api/chat`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        model: OCR_MODEL,
        messages: [
          {
            role: "user",
            content: OCR_PROMPT,
            images: [`${base64Image.substring(0, 50)}...`], // Log first 50 chars
          },
        ],
        stream: false,
        options: { temperature: 0 },
      },
    });

    // Step 1: Extract text from image using deepseek-ocr
    // This matches the logic of: ollama run deepseek-ocr "image" + "Free OCR."
    const ocrResponse = await fetch(`${API_ENDPOINT}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OCR_MODEL,
        messages: [
          {
            role: "user",
            content: OCR_PROMPT, // "Free OCR."
            images: [base64Image], // Base64 image string
          },
        ],
        stream: false,
        options: {
          temperature: 0, // Deterministic output
        },
      }),
    });

    console.log("OCR Response status:", ocrResponse.status);
    console.log("OCR Response statusText:", ocrResponse.statusText);
    console.log(
      "OCR Response headers:",
      Object.fromEntries(ocrResponse.headers.entries()),
    );

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error("OCR failed:", errorText);
      throw new Error(`OCR failed: ${ocrResponse.statusText}`);
    }

    const ocrData = await ocrResponse.json();
    const extractedText = ocrData.message?.content || "";

    if (!extractedText) {
      throw new Error("No text extracted from image");
    }

    console.log("Extracted text:", extractedText.substring(0, 200) + "...");

    // Step 2: Structure the text into MetaResume format using deepseek-r1
    const structurePrompt = `You are a resume parser. Convert the following resume text into a structured JSON format.

Resume Text:
${extractedText}

Return ONLY valid JSON matching this exact structure (no markdown, no commentary):
{
  "personal": {
    "firstName": "string",
    "lastName": "string",
    "headline": "string or empty",
    "email": "string",
    "phone": "string or empty",
    "location": "string or empty",
    "linkedin": "string or empty",
    "summary": "string or empty"
  },
  "experience": [
    {
      "id": "unique-id",
      "company": "string",
      "position": "string",
      "location": "string or empty",
      "startDate": "YYYY-MM-DD or empty",
      "endDate": "YYYY-MM-DD or empty",
      "current": false,
      "description": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "id": "unique-id",
      "institution": "string",
      "degree": "string",
      "field": "string",
      "startDate": "YYYY-MM-DD or empty",
      "endDate": "YYYY-MM-DD or empty"
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "languages": ["language1", "language2"]
  }
}

Important:
- Extract all information accurately
- Use empty strings for missing data (not null)
- Generate unique IDs for experience and education entries
- Format dates as YYYY-MM-DD (use YYYY-01-01 if only year is available)
- Separate technical skills from languages
- Return ONLY the JSON object, no other text`;

    const structureResponse = await fetch(`${API_ENDPOINT}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: REASONING_MODEL,
        messages: [
          {
            role: "user",
            content: structurePrompt,
          },
        ],
        stream: false,
        options: {
          temperature: 0,
        },
      }),
    });

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error("Structure parsing failed:", errorText);
      throw new Error(
        `Structure parsing failed: ${structureResponse.statusText}`,
      );
    }

    const structureData = await structureResponse.json();
    let jsonResponse = structureData.message?.content || "";

    // Clean up response - remove markdown code blocks and any thinking process tags
    jsonResponse = jsonResponse
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();

    // If there are multiple JSON objects, try to find the one that looks like our resume format
    const jsonMatch = jsonResponse.match(/\{[\s\S]*"personal"[\s\S]*\}/);
    if (jsonMatch) {
      jsonResponse = jsonMatch[0];
    }

    console.log("Structured JSON:", jsonResponse.substring(0, 300) + "...");

    let metaResume;
    try {
      metaResume = JSON.parse(jsonResponse);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw response:", jsonResponse);
      throw new Error("Failed to parse structured resume data");
    }

    if (
      !metaResume.personal ||
      !metaResume.experience ||
      !metaResume.education ||
      !metaResume.skills
    ) {
      throw new Error("Invalid resume structure");
    }

    return NextResponse.json({
      success: true,
      message: "Resume processed successfully",
      data: metaResume,
    });
  } catch (error) {
    console.error("OCR route error:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
