
import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Link } from 'react-router-dom';
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
    ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, getRoleLabel } from '../types';

const ADMIN_FAQS = [
    {
        question: 'How do I add or remove users?',
        answer: 'Go to the Admin Users panel from the sidebar. Click "Invite User" to add a new user, or select an existing user to edit their details or deactivate their account. Only Admin users can create or remove accounts.',
    },
    {
        question: 'How do I create and manage groups?',
        answer: 'Navigate to Admin Groups from the sidebar. You can create a new group, assign a group leader, and add or remove members. Group assignments determine what data each agent and trainer can see.',
    },
    {
        question: 'How do I configure the points and badge system?',
        answer: 'Go to Admin Rewards from the sidebar. From there you can set point values for each activity type (prospects, coaching, sales), and configure badge tier names, thresholds, and colours.',
    },
    {
        question: 'How do I reset a user\'s password?',
        answer: 'In the Admin Users panel, locate the user and click Edit. Use the Reset Password option to send them a password reset email. Users can also reset their own passwords from the Login screen.',
    },
    {
        question: 'How do I view system-wide reports?',
        answer: 'The Reports page is accessible from the sidebar. As an Admin, you can see all agents across all groups. Use the Group and Outcome filters to drill down into specific segments.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer: 'First, try refreshing the page. If the issue persists, log out and log back in. If the problem continues, submit a support enquiry using the form below with as much detail as possible.',
    },
];

const MASTER_TRAINER_FAQS = [
    {
        question: 'How do I view performance across all groups?',
        answer: 'Your Dashboard provides a company-wide overview including total prospects, appointments, and revenue across all groups. Use the Group Progress page for a detailed breakdown by group.',
    },
    {
        question: 'How do I compare group rankings?',
        answer: 'Navigate to the Leaderboard page and select the Group tab. Groups are ranked by aggregated member points. Use the MTD/YTD toggle to switch between monthly and yearly views.',
    },
    {
        question: 'How do I monitor coaching session attendance?',
        answer: 'On the Coaching page, select any session to view its Attendance Log. You can see who joined, who did not attend, and when the session took place.',
    },
    {
        question: 'How do I access reports for all trainers and groups?',
        answer: 'The Reports page shows all closed sales across every group in scope. Use the Group filter to isolate a specific group, and the Outcome filter to focus on won, lost, or KIV records.',
    },
    {
        question: 'How do I view the company-wide leaderboard?',
        answer: 'Navigate to the Leaderboard page. As a Master Trainer you have visibility across all agents. Toggle between MTD and YTD to change the scoring period.',
    },
    {
        question: 'How do I manage events that span multiple groups?',
        answer: 'Go to the Events & Meetups page and create a new event. Events are visible to all groups by default. You can specify dates, locations, and descriptions for each event.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer: 'First, try refreshing the page. If the issue persists, log out and log back in. If the problem continues, submit a support enquiry using the form below with as much detail as possible.',
    },
];

const TRAINER_FAQS = [
    {
        question: 'How do I create a coaching session?',
        answer: 'Go to the Coaching page and click "Create Session". Fill in the session type, date, time, and duration. Once saved, agents within your group will be able to see and join the session.',
    },
    {
        question: 'How do I track attendance for my sessions?',
        answer: 'On the Coaching page, click on any session to open its details. The Attendance Log panel shows each participant\'s status — Joined, Pending, or Did Not Attend — after the join window has closed.',
    },
    {
        question: 'How do I view my group\'s performance?',
        answer: 'The Group Progress page provides a breakdown of each agent\'s activity, including prospects added, appointments completed, and sales outcomes. Use the date filters to narrow down the view.',
    },
    {
        question: 'How do I schedule a company event or meetup?',
        answer: 'Navigate to the Events & Meetups page and click "Create Event". Enter the event details including title, date, time, and location. Events are visible to all members in your group.',
    },
    {
        question: 'How do I cancel or edit a coaching session?',
        answer: 'On the Coaching page, locate the session and click Edit. You can update session details or cancel it. Edits and cancellations are only available up to 1 hour before the session start time.',
    },
    {
        question: 'How do I see which agents haven\'t joined a session?',
        answer: 'After a session\'s join window has closed, the Attendance Log will display all agents with a "Did Not Attend" status for those who did not join within the window.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer: 'First, try refreshing the page. If the issue persists, log out and log back in. If the problem continues, submit a support enquiry using the form below with as much detail as possible.',
    },
];

const GROUP_LEADER_FAQS = [
    {
        question: 'How do I create a coaching or Peer Circle session?',
        answer: 'Go to the Coaching page and click "Create Session". As a Group Leader you can create all session types including Peer Circles. Fill in the details and save — your agents will be able to see and join the session.',
    },
    {
        question: 'How do I view my team\'s attendance?',
        answer: 'On the Coaching page, select any session to open its details. The Attendance Log shows each agent\'s status — Joined, Pending, or Did Not Attend — once the join window has closed.',
    },
    {
        question: 'How do I track my agents\' prospect activity?',
        answer: 'The Group Progress page gives you a breakdown of each agent\'s activity including prospects added, appointments completed, and sales outcomes. You can filter by date range.',
    },
    {
        question: 'How do I view the leaderboard for my group?',
        answer: 'Navigate to the Leaderboard page. Your group\'s agents are ranked by total points. Toggle between MTD and YTD for different scoring periods. The Group tab shows overall group rankings.',
    },
    {
        question: 'How do I manage my own prospects?',
        answer: 'Go to the Prospects page from the sidebar. You can add new prospects, update their stages, log appointments, and record sales outcomes from your own prospect cards.',
    },
    {
        question: 'What is my Agent Code and where can I find it?',
        answer: 'Your Agent Code was assigned at the time of registration. If you have forgotten it, please contact your administrator — Agent Codes can only be viewed or changed by an Admin.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer: 'First, try refreshing the page. If the issue persists, log out and log back in. If the problem continues, submit a support enquiry using the form below with as much detail as possible.',
    },
];

const AGENT_FAQS = [
    {
        question: 'How do I add a new prospect?',
        answer: 'Go to the Prospects page from the sidebar and click "+ Add Prospect". Fill in the prospect\'s name, contact number, and current stage. Your prospects are private to your account.',
    },
    {
        question: 'What is my Agent Code and where can I find it?',
        answer: 'Your Agent Code was assigned at registration. If you have forgotten it, contact your group leader or administrator — Agent Codes can only be viewed or reset by an Admin.',
    },
    {
        question: 'How do I join a coaching session?',
        answer: 'Go to the Coaching page. Sessions show a "Join" button that becomes active 15 minutes before the session starts and closes 15 minutes after it ends. You must join within this window to be marked as attended.',
    },
    {
        question: 'How do I view my points and badge level?',
        answer: 'Navigate to the My Points page from the sidebar. You will see your total points, current badge tier, progress towards the next badge, and a breakdown by activity category.',
    },
    {
        question: 'How do I update a prospect\'s appointment or sales details?',
        answer: 'Open the Prospects page and click on a prospect to open their card. From there you can update their appointment status, log a sales meeting outcome, and record products sold.',
    },
    {
        question: 'How do I join or change my group?',
        answer: 'Groups are assigned by your administrator. If you need to change groups, contact your Admin — group changes cannot be made from within the app.',
    },
    {
        question: 'How do I reset my password?',
        answer: 'On the Login screen, click the "Forgot Password?" link and enter your registered email. You will receive a reset link. Check your spam folder if the email does not arrive within a few minutes.',
    },
    {
        question: 'I\'m experiencing a technical issue — what should I do?',
        answer: 'First, try refreshing the page. If the issue persists, log out and log back in. If the problem continues, submit a support enquiry using the form below with as much detail as possible.',
    },
];

const getFaqsForRole = (role?: string): { question: string; answer: string }[] => {
    switch (role) {
        case UserRole.ADMIN:          return ADMIN_FAQS;
        case UserRole.MASTER_TRAINER: return MASTER_TRAINER_FAQS;
        case UserRole.TRAINER:        return TRAINER_FAQS;
        case UserRole.GROUP_LEADER:   return GROUP_LEADER_FAQS;
        default:                      return AGENT_FAQS;
    }
};

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
            className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
        >
            <span className="font-semibold text-gray-800 pr-4">{question}</span>
            {isOpen ? (
                <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
            ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
        </button>
        {isOpen && (
            <div className="px-6 pb-5 pt-1 bg-gray-50 border-t border-gray-100">
                <p className="text-gray-600 leading-relaxed text-sm">{answer}</p>
            </div>
        )}
    </div>
);

// ────────────────────────────────────────────────────────────────────────────

const Support: React.FC = () => {
    const { currentUser } = useAuth();
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const faqs = getFaqsForRole(currentUser?.role);

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

        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const adminTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_SUPPORT_ADMIN_ID;
        const replyTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_SUPPORT_REPLY_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (!serviceId || !adminTemplateId || !replyTemplateId || !publicKey) {
            setError('Support email is not configured. Please contact us directly.');
            return;
        }

        setLoading(true);
        try {
            const templateParams = {
                from_name: name,
                from_email: email,
                phone,
                problem_type: problemType,
                message,
            };
            await emailjs.send(serviceId, adminTemplateId, templateParams, { publicKey });
            await emailjs.send(serviceId, replyTemplateId, templateParams, { publicKey });
            setSubmitted(true);
        } catch (e) {
            console.error('[Support] emailjs.send failed:', e);
            setError('Failed to send your enquiry. Please try again or contact us directly.');
        } finally {
            setLoading(false);
        }
    };

    const fieldClass =
        'block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors text-gray-900 text-sm';

    return (
        <div className={`max-w-4xl mx-auto space-y-10 ${!currentUser ? 'px-4 py-8' : ''}`}>
            {/* Back link — shown only when accessed publicly (not logged in) */}
            {!currentUser && (
                <div>
                    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>
                </div>
            )}

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
                    <h2 className="text-lg font-bold text-gray-800">
                        Frequently Asked Questions
                        {currentUser?.role && (
                            <span className="ml-2 text-sm font-normal text-gray-400">— {getRoleLabel(currentUser.role)}</span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Browse the topics below for quick answers.</p>
                </div>
                <div className="space-y-3">
                    {faqs.map((faq, idx) => (
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
                                        className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-colors text-gray-900 text-sm resize-none"
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
