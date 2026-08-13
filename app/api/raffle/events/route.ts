import { getRaffleState } from "@/lib/raffle";
import { hasStaffSession } from "@/lib/staff-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const encoder = new TextEncoder();

export async function GET(request: Request) {
  if (!(await hasStaffSession())) return Response.json({ message: "Staff access required." }, { status: 401 });
  const mode = new URL(request.url).searchParams.get("mode") === "live" ? "live" : "rehearsal";
  let closed = false;
  let interval: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let revision = -1;
      const sendState = async () => {
        if (closed) return;
        try {
          const state = await getRaffleState(mode);
          if (state.revision !== revision) {
            revision = state.revision;
            controller.enqueue(encoder.encode(`event: state\ndata: ${JSON.stringify(state)}\n\n`));
          } else controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          controller.enqueue(encoder.encode("event: error\ndata: {}\n\n"));
        }
      };
      await sendState();
      interval = setInterval(() => void sendState(), 1_000);
      request.signal.addEventListener("abort", () => {
        closed = true;
        if (interval) clearInterval(interval);
        try { controller.close(); } catch { /* stream already closed */ }
      }, { once: true });
    },
    cancel() {
      closed = true;
      if (interval) clearInterval(interval);
    },
  });

  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "private, no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  } });
}
