
import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

const TUTORIALS = [
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
        title: 'Password Reset',
        description: 'Forgot your password? Follow these steps to reset it and regain access to your account.',
        url: 'https://app.tango.us/app/workflow/3--Reset-Password-in-VistaQ-014bee4462f44775a399ec901162b02a',
    },
    {
        number: '04',
        title: 'Introduction to VistaQ',
        description: 'Get an overview of the VistaQ platform and learn how to navigate its key features.',
        url: 'https://app.tango.us/app/workflow/4--Introduction-to-VistaQ-c623f8d3ebcb44149d660e94f62a6f1b',
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
        title: 'Update Prospect Status & Sales Outcome',
        description: 'Keep your pipeline up to date by recording sales outcomes and updating prospect statuses.',
        url: 'https://app.tango.us/app/workflow/7--Update-Prospect-Status-and-Sales-Outcome-in-VistaQ-fdaebb056e2041639ce9b8c872036255',
    },
];

const Tutorials: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
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

            {/* Tutorial Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {TUTORIALS.map((tutorial) => (
                    <div
                        key={tutorial.number}
                        className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden flex flex-col"
                    >
                        {/* Accent top bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />

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
                            <a
                                href={tutorial.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-5 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm shadow-indigo-200 active:scale-95"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View Tutorial
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom note */}
            <p className="text-center text-xs text-gray-400 pb-4">
                Tutorials open in a new tab via Tango interactive guides.
            </p>
        </div>
    );
};

export default Tutorials;
