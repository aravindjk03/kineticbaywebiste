/**
 * Sample conversations for the Inbox preview, shown only while no Gmail
 * account is connected. Every name and address here is fictional.
 */
const h = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600e3).toISOString();

export interface PreviewMessage { id: string; from: { name: string; email: string }; to: string; cc: string; subject: string; date: string; text: string; html: string; attachments: { id: string; name: string; mime: string; size: number }[]; message_id: string; references: string; unread: boolean; snippet: string }
export interface PreviewThread { id: string; subject: string; from: { name: string; email: string }; participants: string[]; snippet: string; date: string; count: number; unread: boolean; starred: boolean; inbox: boolean; has_attachments: boolean; labels: string[]; messages: PreviewMessage[] }

const msg = (id: string, name: string, email: string, subject: string, hoursAgo: number, text: string, attachments: PreviewMessage['attachments'] = []): PreviewMessage => ({
  id, from: { name, email }, to: 'hello@kineticbay.example', cc: '', subject, date: h(hoursAgo), text, html: '', attachments,
  message_id: `<${id}@preview>`, references: '', unread: false, snippet: text.slice(0, 120),
});

const thread = (id: string, labels: string[], unread: boolean, starred: boolean, messages: PreviewMessage[]): PreviewThread => {
  const last = messages[messages.length - 1];
  return {
    id, subject: messages[0].subject, from: last.from, participants: [...new Set(messages.map((m) => m.from.name))],
    snippet: last.snippet, date: last.date, count: messages.length, unread, starred, inbox: !labels.includes('sent'),
    has_attachments: messages.some((m) => m.attachments.length > 0), labels, messages,
  };
};

export const PREVIEW_THREADS: PreviewThread[] = [
  thread('p1', ['inbox', 'proposals'], true, true, [
    msg('p1a', 'Priya Raman', 'priya.raman@sample-logistics.example', 'Request for proposal: fleet tracking with IoT sensors', 2,
      'Hello Kinetic Bay team,\n\nWe run 140 delivery vehicles across Tamil Nadu and want live location, fuel and temperature tracking for our cold-chain trucks.\n\nCould you send a proposal with timeline and pricing by next Friday? We would also like a short call this week.\n\nRegards,\nPriya Raman\nOperations Head, Sample Logistics', [{ id: 'a1', name: 'Fleet-requirements.pdf', mime: 'application/pdf', size: 482000 }]),
  ]),
  thread('p2', ['inbox'], true, false, [
    msg('p2a', 'Arjun Mehta', 'arjun@sample-retail.example', 'Quotation for HRMS and attendance module', 20,
      'Hi,\n\nFollowing our demo, please share the quotation for 250 employees including the attendance module and payroll integration.\n\nThanks,\nArjun'),
    msg('p2b', 'You (Kinetic Bay)', 'hello@kineticbay.example', 'Re: Quotation for HRMS and attendance module', 18,
      'Hi Arjun,\n\nThanks for your time today. We are preparing the quotation and will send it by tomorrow evening.\n\nBest,\nKinetic Bay'),
    msg('p2c', 'Arjun Mehta', 'arjun@sample-retail.example', 'Re: Quotation for HRMS and attendance module', 3,
      'Great, thank you. Please also include the price for the mobile app for field staff.'),
  ]),
  thread('p3', ['inbox'], false, false, [
    msg('p3a', 'Accounts, Sample Manufacturing', 'accounts@sample-mfg.example', 'Payment advice: Milestone 2', 30,
      'Dear team,\n\nWe have transferred INR 1,20,000 towards Milestone 2 of the smart factory project. UTR: SAMPLE000123.\n\nPlease acknowledge.\n\nAccounts Team', [{ id: 'a2', name: 'Payment-advice.pdf', mime: 'application/pdf', size: 95000 }]),
  ]),
  thread('p4', ['inbox', 'proposals'], false, false, [
    msg('p4a', 'Dr. Kavya Iyer', 'kavya.iyer@sample-hospital.example', 'Tender: visitor management system for 3 campuses', 52,
      'Greetings,\n\nOur hospital group has opened a tender for a visitor management system across three campuses. The tender document is attached. Last date for submission is the 30th.\n\nWith regards,\nDr. Kavya Iyer', [{ id: 'a3', name: 'VMS-tender.pdf', mime: 'application/pdf', size: 1240000 }]),
  ]),
  thread('p5', ['inbox'], false, false, [
    msg('p5a', 'Sample Cloud Billing', 'billing@sample-cloud.example', 'Your monthly invoice is ready', 70,
      'Your invoice for last month is ready. Amount due: INR 18,450. This is an automated message.'),
  ]),
  thread('p6', ['sent'], false, false, [
    msg('p6a', 'You (Kinetic Bay)', 'hello@kineticbay.example', 'Proposal: AI document processing for Sample Legal', 96,
      'Dear Rahul,\n\nPlease find our proposal for AI-based contract review attached. Happy to walk you through it on a call.\n\nWarm regards,\nKinetic Bay', [{ id: 'a4', name: 'KineticBay-Proposal.pdf', mime: 'application/pdf', size: 860000 }]),
  ]),
];
