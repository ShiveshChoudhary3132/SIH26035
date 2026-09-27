import { readFile } from "node:fs/promises";
import path from "node:path";

// Sends the SQLite file as a download. The db path matches the
// datasource url in prisma/schema.prisma ("file:./dev.db").
export async function GET() {
  const file = path.join(process.cwd(), "prisma", "dev.db");
  try {
    const data = await readFile(file);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="nawi-backup-${stamp}.db"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Database file not found", { status: 404 });
  }
}
