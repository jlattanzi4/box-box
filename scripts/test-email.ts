import "dotenv/config";
import { sendProcessingAlert } from "../src/lib/email";

// Sends a sample admin alert through the real code path so we can confirm
// RESEND_API_KEY + ADMIN_EMAIL are wired up correctly. Safe to run anytime.
async function main() {
  const to =
    process.env.ADMIN_EMAIL?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  console.log("RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
  console.log("ADMIN_EMAIL recipients:", to.length ? to.join(", ") : "(none)");

  if (!process.env.RESEND_API_KEY || to.length === 0) {
    console.log(
      "\nMissing config locally. Add RESEND_API_KEY and ADMIN_EMAIL to .env to run this test."
    );
    return;
  }

  await sendProcessingAlert({
    to,
    stuckRaces: [{ round: 99, name: "Test Grand Prix", daysOverdue: 3 }],
    cancelledRaces: [],
  });

  console.log(`\nSent. Check the inbox for: ${to.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
