
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ExternalLink, ChevronRight, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

type TutorialItem = {
    number: string;
    title: string;
    description: string;
    url?: string;
    page?: string;
};

const AGENT_TUTORIALS: TutorialItem[] = [
    {
        number: '01',
        title: 'First Time Registration',
        description: 'A step-by-step walkthrough for registering your VistaQ account for the very first time.',
        url: 'https://app.tango.us/app/workflow/1--First-Time-Register-in-VistaQ-264e0bceafb84974869ca5138d27f557',
    },
    {
        number: '02',
        title: 'Sign In to VistaQ',
        description: 'Learn how to log in to your VistaQ account quickly and securely.',
        url: 'https://app.tango.us/app/workflow/2--Sign-In-to-VistaQ-f6b57657639049d88a1a456748ccb70a',
    },
    {
        number: '03',
        title: 'Introduction to VistaQ',
        description: 'Get an overview of the VistaQ platform and learn how to navigate its key features as an agent.',
        url: 'https://app.tango.us/app/workflow/Agent-Introduction-to-VistaQ-8c46ffa4ce8c4fc890dfa73e40529921',
    },
    {
        number: '04',
        title: 'Reset Password',
        description: 'Forgot your password? Follow these steps to reset it and regain access to your account.',
        url: 'https://app.tango.us/app/workflow/3--Reset-Password-in-VistaQ-014bee4462f44775a399ec901162b02a',
    },
    {
        number: '05',
        title: 'Add a Prospect',
        description: 'Learn how to add and manage prospects within the VistaQ Prospects module.',
        url: 'https://app.tango.us/app/workflow/5--Add-a-Prospect-in-VistaQ-113f6f2b361d4fde8aa730223ee6faec',
    },
    {
        number: '06',
        title: 'Set Appointment & Send Invite',
        description: 'Discover how to schedule appointments and send calendar invites to your prospects.',
        url: 'https://app.tango.us/app/workflow/6--Set-Appointment-and-Send-Invite-in-VistaQ-e710bf1243b44a05b6e39d4696eccb32',
    },
    {
        number: '07',
        title: 'Update Prospect Status',
        description: 'Keep your pipeline up to date by recording sales outcomes and updating prospect statuses.',
        url: 'https://app.tango.us/app/workflow/7--Update-Prospect-Status-and-Sales-Outcome-in-VistaQ-fdaebb056e2041639ce9b8c872036255',
    },
    {
        number: '08',
        title: 'Export Prospects to Excel',
        description: 'Export your full prospect list to an Excel file for offline review or reporting.',
        url: 'https://app.tango.us/app/workflow/Export-Prospects-to-Excel-from-VistaQ-7d7d909d6dd64605ac4391ce0636ac52',
    },
    {
        number: '09',
        title: 'FAQ & Support Enquiry',
        description: 'Find answers to common questions and learn how to submit a support enquiry in VistaQ.',
        url: 'https://app.tango.us/app/workflow/FAQ-and-Support-Enquiries-on-VistaQ-25cdecb8740647e58a5a8c2b31db646b',
    },
    {
        number: '10',
        title: 'Join a Coaching Session',
        description: 'Learn how to browse, register, and join coaching sessions available to you in VistaQ.',
        url: 'https://app.tango.us/app/workflow/Join-VistaQ-Coaching-Sessions-e549981714024e3bbce57b8c9a6c2c03',
    },
    {
        number: '11',
        title: 'View Events in Calendar',
        description: 'See how to view upcoming events and get details directly from your VistaQ calendar.',
        url: 'https://app.tango.us/app/workflow/View-Event-Details-in-your-Calendar-a71bd1dcec3a45f884d0102d160e09fe',
    },
    {
        number: '12',
        title: 'My Points',
        description: 'Track your earned points and understand how activities contribute to your rewards score.',
        url: 'https://app.tango.us/app/workflow/View-Your-Points-in-VistaQ-d43ec1190c4241af97f6389733c910d6',
    },
    {
        number: '13',
        title: 'Leaderboard',
        description: 'Check where you stand against your peers on the VistaQ leaderboard rankings.',
        url: 'https://app.tango.us/app/workflow/View-VistaQ-Leaderboard-cc4f50af28eb4aeb976af742e97a1cc8',
    },
    {
        number: '14',
        title: 'My Sales',
        description: 'Review your successful sales, total ACE, and your personal sales portfolio in VistaQ.',
        url: 'https://app.tango.us/app/workflow/View-Your-Sales-in-VistaQ-32af57d2af914ad091827b030d651989',
    },
    {
        number: '15',
        title: 'Add to Home Screen',
        description: 'Install VistaQ on your iPhone, iPad, or Android device for instant one-tap access — no App Store required.',
        page: 'add-to-home-screen',
    },
];

const GROUP_LEADER_TUTORIALS: TutorialItem[] = [
    {
        number: 'GL-01',
        title: 'Create Peer Circle Session',
        description: 'Learn how to create and manage a Peer Circle coaching session for your group members.',
        url: 'https://app.tango.us/app/workflow/Create-VistaQ-Peer-Circle-Session-for-your-Group-95dc9eb4efd54733af2498bf36ce1d5b',
    },
    {
        number: 'GL-02',
        title: 'View Group Progress',
        description: "See how to monitor your group's overall performance and individual progress in VistaQ.",
        url: 'https://app.tango.us/app/workflow/View-Group-Progress-in-VistaQ-7244b92c53ca4ae887f9e54b82945547',
    },
];

const TutorialCard: React.FC<{ tutorial: TutorialItem; accentClass: string }> = ({ tutorial, accentClass }) => {
    const navigate = useNavigate();
    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden flex flex-col">
            {/* Accent top bar */}
            <div className={`h-1 w-full ${accentClass}`} />

            <div className="p-6 flex flex-col flex-1">
                {/* Step number badge */}
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
                    <span className="text-xs font-black text-indigo-600 tracking-wide">{tutorial.number}</span>
                </div>

                {/* Title */}
                <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug group-hover:text-indigo-700 transition-colors">
                    {tutorial.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    {tutorial.description}
                </p>

                {/* Button */}
                {tutorial.url ? (
                    <a
                        href={tutorial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Tutorial
                    </a>
                ) : (
                    <button
                        onClick={() => navigate(`/${tutorial.page!}`)}
                        className="mt-5 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95"
                    >
                        <ChevronRight className="w-4 h-4" />
                        View Tutorial
                    </button>
                )}
            </div>
        </div>
    );
};

const Tutorials: React.FC = () => {
    const { currentUser } = useAuth();
    const isGroupLeader = currentUser?.role === UserRole.GROUP_LEADER;

    return (
        <div className="max-w-5xl mx-auto space-y-10">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-200">
                    <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tutorials</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Step-by-step guides to help you get the most out of VistaQ</p>
                </div>
            </div>

            {/* Agent Tutorials */}
            <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Agent Tutorials</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {AGENT_TUTORIALS.map((tutorial) => (
                        <TutorialCard
                            key={tutorial.number}
                            tutorial={tutorial}
                            accentClass="bg-gradient-to-r from-violet-500 to-indigo-500"
                        />
                    ))}
                </div>
            </section>

            {/* Group Leader Tutorials — only visible to group leaders */}
            {isGroupLeader && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Group Leader Tutorials</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {GROUP_LEADER_TUTORIALS.map((tutorial) => (
                            <TutorialCard
                                key={tutorial.number}
                                tutorial={tutorial}
                                accentClass="bg-gradient-to-r from-emerald-500 to-teal-500"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Bottom note */}
            <p className="text-center text-xs text-gray-400 pb-4">
                Tutorials open in a new tab via Tango interactive guides.
            </p>
        </div>
    );
};

export default Tutorials;
