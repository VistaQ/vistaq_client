
import React, { useState } from 'react';
import {
    HelpCircle,
    ChevronDown,
    ChevronUp,
    Send,
    CheckCircle,
    User,
    Phone,
    Mail,
    MessageSquare,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Web3Forms access key (set VITE_WEB3FORMS_KEY in .env) ─────────────────
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string;
const SUPPORT_EMAIL = 'vistaqtech@gmail.com';

const FAQS = [
    {
        question: 'How do I reset my password?',
        answer:
            'On the login screen, click the "Forgot Password?" link and enter your registered email address. You will receive a password reset link. If you do not receive an email within a few minutes, please check your spam folder or contact your administrator.',
    },
    {
        question: 'What is my Agent Code and where can I find it?',
        answer:
            'Your Agent Code is a unique identifier assigned to you by your group leader or administrator at the time of registration. It is used to verify your identity within VistaQ. If you have lost or forgotten your Agent Code, please contact your group leader or submit a support enquiry below.',
    },
    {
        question: 'How do I add a new prospect to the system?',
        answer:
            'Navigate to the "Prospects" page from the sidebar. Click the "+ Add Prospect" button in the top right corner and fill in the required details such as the prospect\'s name, contact information, and current status. Your prospects are private to your account and are not visible to other agents.',
    },
    {
        question: 'How do I log or update a sales record?',
        answer:
            'Sales records are tied to your prospects. Open a prospect\'s card and use the activity log or sales update fields to record a new sale or update the status. Your trainer or group leader will be able to view your aggregated performance from the Group Progress dashboard.',
    },
    {
        question: 'How do I join or change my group?',
        answer:
            'Groups are assigned during registration. If you need to change your group, please contact your administrator. Group changes can only be performed by an Admin user from the Group Management panel. You cannot change your own group from within the app.',
    },
    {
        question: 'How do I register for an upcoming event or meetup?',
        answer:
            'Navigate to the "Events & Meetups" page from the sidebar. Browse the list of upcoming events and click on an event to view its details. Registration links or instructions are provided within each event listing. Contact your group leader if you need further assistance.',
    },
    {
        question: 'Why can\'t I see the Group Progress or Reports sections?',
        answer:
            'Access to certain sections is role-based. The Group Progress and Reports pages are only visible to Trainers, Group Leaders, Master Trainers, and Administrators. If you believe your access level is incorrect, please contact your administrator.',
    },
    {
        question: 'How is my personal data protected?',
        answer:
            'VistaQ is operated by Talent Keys and complies with the Personal Data Protection Act 2010 (PDPA) of Malaysia. Your data is encrypted in transit and at rest, and is only accessible to authorised personnel. For full details, please review our Privacy Policy accessible from the sidebar.',
    },
    {
        question: 'How do I update my profile information?',
        answer:
            'Click on your profile card at the bottom of the left sidebar, or click "Profile Settings" to navigate to the Profile page. From there you can update your display name, contact details, and change your password. Note that your Agent Code and Group can only be changed by an Administrator.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer:
            'First, try refreshing the page. If the issue persists, try logging out and logging back in. If you continue to experience problems, please submit a support enquiry using the form below, describing the issue in as much detail as possible including what you were doing when the error occurred.',
    },
];

const PROBLEM_TYPES = [
    'Login / Password Issue',
    'Account Setup or Registration',
    'Agent Code or Group Query',
    'Data / Records Error',
    'Technical Bug or Error',
    'Events & Meetups Query',
    'Privacy or Data Request',
    'Other',
];

interface FAQItemProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => (
    <div className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
        >
            <span className="font-semibold text-gray-800 pr-4">{question}</span>
            {isOpen ? (
                <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
            ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
        </button>
        {isOpen && (
            <div className="px-6 pb-5 pt-1 bg-slate-50 border-t border-gray-100">
                <p className="text-gray-600 leading-relaxed text-sm">{answer}</p>
            </div>
        )}
    </div>
);

// ─── Helper: send via Web3Forms ──────────────────────────────────────────────
async function sendEnquiry(params: {
    name: string;
    email: string;
    phone: string;
    problemType: string;
    message: string;
}) {
    const { name, email, phone, problemType, message } = params;

    const htmlMessage = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:28px 36px;border-radius:12px 12px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">VistaQ Support</h1>
    <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">New Support Enquiry Received</p>
  </div>
  <div style="background:#fff;padding:32px 36px;border:1px solid #e2e8f0;border-top:none;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#64748b;width:34%;">Full Name</td>
          <td style="padding:8px 0;color:#0f172a;font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Email</td>
          <td style="padding:8px 0;color:#0f172a;font-weight:600;">${email}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Phone</td>
          <td style="padding:8px 0;color:#0f172a;font-weight:600;">${phone}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;">Type of Issue</td>
          <td style="padding:8px 0;color:#0f172a;font-weight:600;">${problemType}</td></tr>
    </table>
    <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid #3b82f6;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Message</p>
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${message.replace(/\n/g, '<br/>')}</p>
    </div>
  </div>
  <div style="background:#f1f5f9;padding:16px 36px;border-radius:0 0 12px 12px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Sent via VistaQ Support Centre &mdash; reply directly to ${email}</p>
  </div>
</div>`;

    const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `[VistaQ Support] ${problemType} — from ${name}`,
            from_name: name,
            // Web3Forms sends the notification to the registered admin address (vistaqtech@gmail.com).
            // The 'cc' field is the correct Web3Forms way to send a copy to the submitter.
            replyto: email,
            cc: email,       // user receives a copy of the enquiry email as confirmation
            message: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nType: ${problemType}\n\n${message}`,
            // HTML version for clients that support it
            html: htmlMessage,
            redirect: false,
        }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Submission failed');
    return data;
}

// ────────────────────────────────────────────────────────────────────────────

const Support: React.FC = () => {
    const { currentUser } = useAuth();
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    // Form state
    const [name, setName] = useState(currentUser?.name || '');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState(currentUser?.email || '');
    const [problemType, setProblemType] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !phone.trim() || !email.trim() || !problemType || !message.trim()) {
            setError('Please fill in all fields before submitting.');
            return;
        }

        setLoading(true);
        try {
            await sendEnquiry({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                problemType,
                message: message.trim(),
            });
            setSubmitted(true);
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(
                `Sorry, we could not send your enquiry right now. Please try again or email us directly at ${SUPPORT_EMAIL}.`
            );
        } finally {
            setLoading(false);
        }
    };

    const fieldClass =
        'block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 text-sm';

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-200">
                    <HelpCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Centre</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Find answers to common questions or send us an enquiry</p>
                </div>
            </div>

            {/* FAQ Section */}
            <section>
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-800">Frequently Asked Questions</h2>
                    <p className="text-sm text-gray-500 mt-1">Browse the topics below for quick answers.</p>
                </div>
                <div className="space-y-3">
                    {FAQS.map((faq, idx) => (
                        <FAQItem
                            key={idx}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openFaq === idx}
                            onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
                        />
                    ))}
                </div>
            </section>

            {/* Enquiry Form Section */}
            <section>
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-gray-800">Send a Support Enquiry</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Can't find what you're looking for? Fill in the form below and our support team will get back to you.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {submitted ? (
                        /* ── Success State ── */
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
                                <CheckCircle className="w-9 h-9 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Enquiry Submitted!</h3>
                            <p className="text-gray-500 max-w-sm leading-relaxed">
                                Thank you for reaching out. Our support team has received your enquiry and will be in touch
                                with you shortly, usually within 1–2 business days. A confirmation has been sent to{' '}
                                <span className="font-semibold text-gray-700">{email}</span>.
                            </p>
                            <button
                                onClick={() => {
                                    setSubmitted(false);
                                    setPhone('');
                                    setProblemType('');
                                    setMessage('');
                                    setError('');
                                }}
                                className="mt-8 px-6 py-2.5 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Submit Another Enquiry
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            {error && (
                                <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Name — spans full width */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={fieldClass}
                                            placeholder="Your full name"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className={fieldClass}
                                            placeholder="+60 12-345 6789"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={fieldClass}
                                            placeholder="you@company.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Problem Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                    Type of Problem
                                </label>
                                <select
                                    value={problemType}
                                    onChange={(e) => setProblemType(e.target.value)}
                                    className={`${fieldClass} pl-3 appearance-none`}
                                >
                                    <option value="" disabled>
                                        Select the type of issue...
                                    </option>
                                    {PROBLEM_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                    Message
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={5}
                                        className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 text-sm resize-none"
                                        placeholder="Please describe your issue or question in as much detail as possible..."
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {loading ? 'Submitting...' : 'Submit Enquiry'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </section>

            {/* Bottom padding */}
            <div className="h-4" />
        </div>
    );
};

export default Support;
