export default {
  async fetch(_req: Request): Promise<Response> {
    return Response.json({ message: "Hello from RTG Sports" });
  }
} satisfies ExportedHandler;
