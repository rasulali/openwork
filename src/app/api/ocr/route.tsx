import { type NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const API_ENDPOINT = process.env.API_ENDPOINT || "http://localhost:11434";
const OCR_MODEL = "deepseek-ocr";
const REASONING_MODEL = "deepseek-r1:32b";
const OCR_PROMPT = "Free OCR.";
const MIN_TEXT_LENGTH = 100;
const MIN_WORD_COUNT = 20;

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Please use POST." },
    { status: 405 },
  );
}

function isTextSufficient(text: string): boolean {
  const trimmedText = text.trim();
  if (trimmedText.length < MIN_TEXT_LENGTH) return false;

  const words = trimmedText.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < MIN_WORD_COUNT) return false;

  const meaningfulChars = trimmedText.replace(/[\s\d\W]/g, "").length;
  if (meaningfulChars < 50) return false;

  return true;
}

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "pdfjs-dist/legacy/build/pdf.worker.mjs";

    const uint8Array = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .trim();

      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    return pageTexts.join("\n\n");
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const base64Image = buffer.toString("base64");

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
          content: OCR_PROMPT,
          images: [base64Image],
        },
      ],
      stream: false,
      options: {
        temperature: 0,
      },
    }),
  });

  if (!ocrResponse.ok) {
    throw new Error(`OCR failed: ${ocrResponse.statusText}`);
  }

  const ocrData = await ocrResponse.json();
  return ocrData.message?.content || "";
}

async function structureResumeData(extractedText: string) {
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
    throw new Error(
      `Structure parsing failed: ${structureResponse.statusText}`,
    );
  }

  const structureData = await structureResponse.json();
  let jsonResponse = structureData.message?.content || "";

  jsonResponse = jsonResponse
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();

  const jsonMatch = jsonResponse.match(/\{[\s\S]*"personal"[\s\S]*\}/);
  if (jsonMatch) {
    jsonResponse = jsonMatch[0];
  }

  const metaResume = JSON.parse(jsonResponse);

  if (
    !metaResume.personal ||
    !metaResume.experience ||
    !metaResume.education ||
    !metaResume.skills
  ) {
    throw new Error("Invalid resume structure");
  }

  return metaResume;
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText: string;

    if (file.type === "application/pdf") {
      console.log("Extracting text from PDF...");
      extractedText = await extractTextFromPDF(buffer);
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      console.log("Extracting text from DOCX...");
      extractedText = await extractTextFromDOCX(buffer);
    } else {
      console.log("Processing image with OCR...");
      extractedText = await extractTextFromImage(buffer);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error: "No text could be extracted from the file",
          details:
            "The file appears to be empty or contains no readable text. " +
            "For scanned PDFs or image-based documents, please upload as PNG/JPEG for OCR processing.",
        },
        { status: 400 },
      );
    }

    if (!isTextSufficient(extractedText)) {
      return NextResponse.json(
        {
          success: false,
          insufficientText: true,
          message:
            "The extracted text appears to be insufficient or the document may be image-based.",
          suggestion:
            "Could you please take a screenshot of your resume and upload it as a PNG or JPEG image? This will allow us to use OCR to extract the text more accurately.",
        },
        { status: 200 },
      );
    }

    console.log("Structuring resume data...");
    const metaResume = await structureResumeData(extractedText);

    return NextResponse.json({
      success: true,
      message: "Resume processed successfully",
      data: metaResume,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
