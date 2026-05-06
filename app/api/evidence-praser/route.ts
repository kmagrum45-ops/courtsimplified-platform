import { NextResponse } from "next/server";

type ParsedMessage = {
  date: string;
  time: string;
  sender: string;
  message: string;
};

function decodeXml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getXmlAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function formatSmsDate(timestamp: string) {
  const date = new Date(Number(timestamp));

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function parseAndroidXml(text: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const smsTags = text.match(/<sms\b[^>]*\/?>/gi) || [];

  for (const tag of smsTags) {
    const body = getXmlAttribute(tag, "body");
    const dateValue = getXmlAttribute(tag, "date");
    const type = getXmlAttribute(tag, "type");
    const address = getXmlAttribute(tag, "address");

    if (!body || !dateValue) continue;

    const formatted = formatSmsDate(dateValue);

    messages.push({
      date: formatted.date,
      time: formatted.time,
      sender: type === "1" ? address || "Other person" : "You",
      message: body,
    });
  }

  return messages;
}

function parseTextMessages(text: string): ParsedMessage[] {
  const lines = text.split(/\r?\n/);
  const messages: ParsedMessage[] = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;

    const whatsappMatch = cleaned.match(
      /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[AP]M)?)\s+-\s+([^:]+):\s+(.*)$/i
    );

    if (whatsappMatch) {
      messages.push({
        date: whatsappMatch[1],
        time: whatsappMatch[2],
        sender: whatsappMatch[3],
        message: whatsappMatch[4],
      });
      continue;
    }

    const bracketMatch = cleaned.match(
      /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[,\s]+(\d{1,2}:\d{2}(?:\s?[AP]M)?)\]?\s+([^:]+):\s+(.*)$/i
    );

    if (bracketMatch) {
      messages.push({
        date: bracketMatch[1],
        time: bracketMatch[2],
        sender: bracketMatch[3],
        message: bracketMatch[4],
      });
    }
  }

  return messages;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();
    const fileName = file.name.toLowerCase();

    const messages =
      fileName.endsWith(".xml") || text.includes("<smses")
        ? parseAndroidXml(text)
        : parseTextMessages(text);

    return NextResponse.json(
      {
        fileName: file.name,
        messages,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to process evidence file." },
      { status: 500 }
    );
  }
}