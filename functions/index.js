const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Configure Nodemailer Transporter.
 *
 * Dynamically resolves transport based on environment variables.
 * Defaults to a mock transporter that logs emails to console for local emulator testing.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: port == 465,
      auth: { user, pass },
    });
  }

  // Fallback / local testing: Log emails to functions console
  logger.info("SMTP configuration not fully set. Using console fallback logger transporter.");
  return {
    sendMail: async (mailOptions) => {
      logger.info("--- [FALLBACK EMAIL LOG] ---");
      logger.info(`To: ${mailOptions.to}`);
      logger.info(`Subject: ${mailOptions.subject}`);
      logger.info(`Body: ${mailOptions.text}`);
      logger.info("----------------------------");
      return { messageId: "console-mock-id" };
    }
  };
}

const mailFrom = process.env.SMTP_FROM || "NSD Leave Entry <noreply@neoshosd.org>";

/**
 * Helper to fetch employee email by their Auth UID.
 * Maps back using the 'users' collection where document ID is the email and 'uid' matches.
 */
async function getEmployeeEmailAndName(uid) {
  try {
    const userQuery = await db.collection("users").where("uid", "==", uid).limit(1).get();
    if (userQuery.empty) {
      return { email: null, name: "Employee" };
    }
    const doc = userQuery.docs[0];
    const data = doc.data();
    return {
      email: doc.id, // Email is the doc ID
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Employee"
    };
  } catch (err) {
    logger.error(`Error looking up user with UID ${uid}:`, err);
    return { email: null, name: "Employee" };
  }
}

/**
 * Helper to get email addresses for a list of UIDs.
 */
async function getEmailsForUids(uids) {
  if (!uids || !uids.length) return [];
  try {
    const snap = await db.collection("users").where("uid", "in", uids).get();
    return snap.docs.map(doc => doc.id); // Email is the document ID
  } catch (err) {
    logger.error("Error looking up emails for UIDs:", err);
    return [];
  }
}

/**
 * Trigger 1: onRequestCreated
 * Triggers when a new leaveRequest is submitted.
 * Notifies Building Admins for the request's building.
 */
exports.onRequestCreated = onDocumentCreated("leaveRequests/{requestId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("No data associated with the event");
    return;
  }

  const requestData = snapshot.data();
  const { uid, buildingId, leaveTypeName, startDate, endDate, reason, employeeRole } = requestData;

  logger.info(`New request created: ${event.params.requestId} for user ${uid} in building ${buildingId}`);

  try {
    let targetEmails = [];

    if (employeeRole === 'admin') {
      // 1. Route to District Admins instead of Building Admins
      const districtAdminQuery = await db.collection("users").where("role", "==", "districtAdmin").get();
      targetEmails = districtAdminQuery.docs.map(doc => doc.id); // Email is the doc ID
      
      if (!targetEmails.length) {
        logger.warn("No District Admins found to route building admin leave request.");
        return;
      }
    } else {
      // 1. Fetch admin email addresses for this building directly from users collection
      const adminsQuery = await db.collection("users")
        .where("buildingId", "==", buildingId)
        .where("role", "==", "admin")
        .get();
      
      targetEmails = adminsQuery.docs.map(doc => doc.id); // Email is the doc ID

      if (!targetEmails.length) {
        logger.warn(`No Building Admins assigned to building ${buildingId} in users collection.`);
        return;
      }
    }

    // 3. Fetch requesting employee name & email
    const employee = await getEmployeeEmailAndName(uid);

    // 4. Send email notification to admins
    const transporter = getTransporter();
    const subject = `[NSD Leave Entry] New Request Pending - ${employee.name}`;
    const textContent = `
A new leave request is pending your approval:
Employee: ${employee.name} (${employee.email || "Unknown Email"})
Type: ${leaveTypeName}
Dates: ${startDate} to ${endDate}
Reason: ${reason || "None provided"}

Please log into the NSD Leave Entry portal to approve or deny this request.
    `.trim();

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
        <h2 style="color: #4a6ae0; margin-top: 0;">New Leave Request Pending</h2>
        <p>A new leave request has been submitted and is awaiting your review.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 120px;">Employee:</td>
            <td style="padding: 8px 0;">${employee.name} (${employee.email || "N/A"})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Leave Type:</td>
            <td style="padding: 8px 0;">${leaveTypeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Dates:</td>
            <td style="padding: 8px 0;">${startDate} to ${endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
            <td style="padding: 8px 0; font-style: italic;">${reason || "None provided"}</td>
          </tr>
        </table>
        <p style="margin-bottom: 25px;">Please log in to the administrator dashboard to process this request.</p>
        <div style="text-align: center;">
          <a href="https://nsd-leave-entry.web.app/" style="background-color: #4a6ae0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Open Leave Portal</a>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: mailFrom,
      to: targetEmails.join(", "),
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info(`Successfully sent pending notifications to target emails: ${targetEmails.join(", ")}`);
  } catch (err) {
    logger.error("Error processing onRequestCreated trigger:", err);
  }
});

/**
 * Trigger 2: onRequestUpdated
 * Triggers when a request status changes.
 * Route approvals to Employee and Building Assistants.
 * Route denials to Employee only.
 */
exports.onRequestUpdated = onDocumentUpdated("leaveRequests/{requestId}", async (event) => {
  const change = event.data;
  if (!change) {
    logger.error("No change data associated with the event");
    return;
  }

  const beforeData = change.before.data();
  const afterData = change.after.data();

  // Exit if status has not changed
  if (beforeData.status === afterData.status) {
    return;
  }

  const { uid, buildingId, leaveTypeName, startDate, endDate, status, reviewerNote } = afterData;
  logger.info(`Request ${event.params.requestId} status updated from ${beforeData.status} to ${status}`);

  try {
    // 1. Fetch employee details
    const employee = await getEmployeeEmailAndName(uid);
    if (!employee.email) {
      logger.warn(`Could not find email address for employee UID ${uid}. Aborting email route.`);
      return;
    }

    const transporter = getTransporter();

    // ─────────────────────────────────────────────────────────────
    // APPROVED STATUS
    // ─────────────────────────────────────────────────────────────
    if (status === "approved") {
      // 1a. Fetch Assistant emails for the building directly from users collection
      const assistantsQuery = await db.collection("users")
        .where("buildingId", "==", buildingId)
        .where("role", "==", "assistant")
        .get();
      const assistantEmails = assistantsQuery.docs.map(doc => doc.id);

      // 1b. Email Employee
      const empSubject = `[NSD Leave Entry] Leave Request Approved!`;
      const empText = `Hi ${employee.name},\n\nYour leave request for ${leaveTypeName} from ${startDate} to ${endDate} has been APPROVED.\n\nReviewer Notes: ${reviewerNote || "None"}`;
      const empHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
          <h2 style="color: #69f0ae; margin-top: 0;">Leave Request Approved</h2>
          <p>Hi ${employee.name},</p>
          <p>Your leave request has been approved by your administrator.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Leave Type:</td>
              <td style="padding: 8px 0;">${leaveTypeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Dates:</td>
              <td style="padding: 8px 0;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Notes:</td>
              <td style="padding: 8px 0; font-style: italic;">${reviewerNote || "None"}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #777;">No further action is required on your part.</p>
        </div>
      `;

      await transporter.sendMail({
        from: mailFrom,
        to: employee.email,
        subject: empSubject,
        text: empText,
        html: empHtml
      });
      logger.info(`Approved email sent to employee: ${employee.email}`);

      // 1c. Email Building Assistants
      if (assistantEmails.length) {
        const astSubject = `[HR Action Required] Approved Leave: ${employee.name}`;
        const astText = `Building Assistant Notification:\n\nLeave has been approved for ${employee.name}.\nPlease enter this record into the HR system.\n\nDetails:\nType: ${leaveTypeName}\nDates: ${startDate} to ${endDate}`;
        const astHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px; background-color: #fafafa;">
            <h2 style="color: #7c4dff; margin-top: 0;">HR Entry Action Required</h2>
            <p><strong>Approved leave has been recorded. Please complete entry into the main HR/payroll system.</strong></p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Employee:</td>
                <td style="padding: 8px 0;">${employee.name} (${employee.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Leave Type:</td>
                <td style="padding: 8px 0;">${leaveTypeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Dates:</td>
                <td style="padding: 8px 0;">${startDate} to ${endDate}</td>
              </tr>
            </table>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; font-size: 12px; color: #555;">
              This is an automated request for building payroll entry.
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: mailFrom,
          to: assistantEmails.join(", "),
          subject: astSubject,
          text: astText,
          html: astHtml
        });
        logger.info(`Approved email sent to building assistants: ${assistantEmails.join(", ")}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // DENIED STATUS
    // ─────────────────────────────────────────────────────────────
    if (status === "denied") {
      const denySubject = `[NSD Leave Entry] Leave Request Denied`;
      const denyText = `Hi ${employee.name},\n\nYour leave request for ${leaveTypeName} from ${startDate} to ${endDate} has been DENIED.\n\nReviewer Notes: ${reviewerNote || "None"}`;
      const denyHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
          <h2 style="color: #ff5252; margin-top: 0;">Leave Request Denied</h2>
          <p>Hi ${employee.name},</p>
          <p>Your leave request has been denied by your administrator.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Leave Type:</td>
              <td style="padding: 8px 0;">${leaveTypeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Dates:</td>
              <td style="padding: 8px 0;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Admin Notes:</td>
              <td style="padding: 8px 0; font-style: italic; color: #d32f2f;">${reviewerNote || "None provided"}</td>
            </tr>
          </table>
          <p style="font-size: 12px; color: #777;">If you have questions, please reach out directly to your building administrator.</p>
        </div>
      `;

      await transporter.sendMail({
        from: mailFrom,
        to: employee.email,
        subject: denySubject,
        text: denyText,
        html: denyHtml
      });
      logger.info(`Denied email sent to employee: ${employee.email}`);
    }

  } catch (err) {
    logger.error("Error processing onRequestUpdated trigger:", err);
  }
});
