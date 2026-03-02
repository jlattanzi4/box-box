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
