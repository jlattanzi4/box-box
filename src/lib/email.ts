import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "Box Box <onboarding@resend.dev>";

export async function sendPickReminder({
  to,
  userName,
  raceName,
  raceRound,
  leagueName,
  leagueId,
}: {
  to: string;
  userName: string;
  raceName: string;
  raceRound: number;
  leagueName: string;
  leagueId: string;
}) {
  const pickUrl = `${process.env.NEXTAUTH_URL}/leagues/${leagueId}/picks`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Race day tomorrow! Make your pick for R${raceRound}: ${raceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #e10600; color: white; font-weight: 900; font-size: 14px; padding: 8px 12px; border-radius: 8px; letter-spacing: 1px;">BB</div>
        </div>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #f5f5f5;">Hey ${userName},</h1>
        <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          <strong style="color: #f5f5f5;">Round ${raceRound}: ${raceName}</strong> is tomorrow and you haven't made your pick yet for <strong style="color: #f5f5f5;">${leagueName}</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${pickUrl}" style="display: inline-block; background: #e10600; color: white; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 32px; border-radius: 8px;">Make Your Pick</a>
        </div>
        <p style="color: #666; font-size: 13px; text-align: center;">
          Don't miss out — picks lock when the race starts.
        </p>
      </div>
    `,
  });
}

interface RaceAlertItem {
  round: number;
  name: string;
  daysOverdue: number;
}

/**
 * Admin alert sent by the results cron when a past race can't be scored.
 * Always logs to the server console; additionally emails if Resend +
 * recipients are configured, so failures are never silent.
 */
export async function sendProcessingAlert({
  to,
  stuckRaces,
  cancelledRaces,
}: {
  to: string[];
  stuckRaces: RaceAlertItem[];
  cancelledRaces: { round: number; name: string }[];
}) {
  // Fallback: always make the problem visible in the server logs.
  if (stuckRaces.length > 0) {
    console.error(
      "[results-cron] Races overdue for scoring:",
      stuckRaces.map((r) => `R${r.round} ${r.name} (${r.daysOverdue}d overdue)`).join(", ")
    );
  }
  if (cancelledRaces.length > 0) {
    console.error(
      "[results-cron] Races auto-cancelled (no results after threshold):",
      cancelledRaces.map((r) => `R${r.round} ${r.name}`).join(", ")
    );
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[results-cron] RESEND_API_KEY not set — skipping admin alert email.");
    return;
  }
  if (to.length === 0) {
    console.error("[results-cron] No admin recipients resolved — skipping alert email.");
    return;
  }

  const stuckHtml = stuckRaces.length
    ? `<p style="color:#f5f5f5;font-size:15px;font-weight:600;margin:0 0 8px;">Overdue for scoring (no results from the F1 API yet):</p>
       <ul style="color:#a0a0a0;font-size:14px;line-height:1.7;margin:0 0 20px;padding-left:20px;">
         ${stuckRaces.map((r) => `<li><strong style="color:#f5f5f5;">R${r.round}: ${r.name}</strong> — ${r.daysOverdue} day(s) overdue</li>`).join("")}
       </ul>
       <p style="color:#666;font-size:13px;margin:0 0 20px;">These will be retried automatically each day, and auto-cancelled if still empty after 5 days. If a result really exists, check for a driver/circuit data mismatch.</p>`
    : "";

  const cancelledHtml = cancelledRaces.length
    ? `<p style="color:#f5f5f5;font-size:15px;font-weight:600;margin:0 0 8px;">Auto-cancelled (no results after 5 days):</p>
       <ul style="color:#a0a0a0;font-size:14px;line-height:1.7;margin:0 0 20px;padding-left:20px;">
         ${cancelledRaces.map((r) => `<li><strong style="color:#f5f5f5;">R${r.round}: ${r.name}</strong></li>`).join("")}
       </ul>`
    : "";

  const subject = `Box Box: ${stuckRaces.length} race(s) need attention`;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px;">
          <div style="margin-bottom: 24px;">
            <div style="display: inline-block; background: #e10600; color: white; font-weight: 900; font-size: 14px; padding: 8px 12px; border-radius: 8px; letter-spacing: 1px;">BB</div>
          </div>
          <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 16px; color: #f5f5f5;">Results processing needs a look</h1>
          ${stuckHtml}
          ${cancelledHtml}
          <p style="color:#666;font-size:13px;border-top:1px solid #333;padding-top:16px;margin-top:8px;">Automated message from the Box Box results cron.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[results-cron] Failed to send admin alert email:", err);
  }
}
