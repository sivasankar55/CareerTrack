import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const today = new Date().toISOString().split("T")[0];

    const { data: dueFollowUps, error: queryError } = await supabase
      .from("follow_ups")
      .select(
        `
        id,
        due_date,
        note,
        application_id,
        applications!inner (
          company_name,
          role_title,
          user_id
        )
      `,
      )
      .eq("completed", false)
      .lte("due_date", today);

    if (queryError) {
      console.error("Cron: query error", queryError);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const userFollowUps = new Map<string, typeof dueFollowUps>();

    for (const fu of dueFollowUps) {
      const app = fu.applications as unknown as {
        company_name: string;
        role_title: string;
        user_id: string;
      };
      const userId = app.user_id;
      if (!userFollowUps.has(userId)) {
        userFollowUps.set(userId, []);
      }
      userFollowUps.get(userId)!.push(fu);
    }

    let sentCount = 0;

    for (const [userId, fups] of userFollowUps) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;

      const followUpList = fups
        .map(
          (fu) => {
            const app = fu.applications as unknown as {
              company_name: string;
              role_title: string;
            };
            return `- ${app.role_title} at ${app.company_name}${fu.note ? ` (${fu.note})` : ""}`;
          },
        )
        .join("\n");

      const { error: emailError } = await resend.emails.send({
        from: "CareerTrack <reminders@careertrack.app>",
        to: email,
        subject: `Follow-up reminders — ${fups.length} application${fups.length === 1 ? "" : "s"} due`,
        text: `You have follow-ups due for the following applications:\n\n${followUpList}\n\nLog in to CareerTrack to update them.`,
      });

      if (emailError) {
        console.error(`Cron: email failed for ${email}`, emailError);
      } else {
        sentCount++;
      }
    }

    return NextResponse.json({
      sent: sentCount,
      total_due: dueFollowUps.length,
    });
  } catch (err) {
    console.error("Cron: unexpected error", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
