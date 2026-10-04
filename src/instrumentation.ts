export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { warmServerCatalog } = await import("./lib/server-catalog");
    await warmServerCatalog();
    console.log("Seen It catalog warmed and shared.");
  } catch (error) {
    console.error("Seen It catalog warmup failed:", error);
  }
}
