import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    CalendarDays, Clock, MapPin, User as UserIcon,
    ExternalLink, Download, Link as LinkIcon, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

interface PublicEvent {
    id: string;
    event_title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    type?: string;
    venue?: string;
    meeting_link?: string;
    created_by_name?: string;
    status?: string;
}

const formatICSDate = (iso: string) => iso.replace(/[-:.]/g, '').slice(0, 15) + 'Z';

const EventPublicPage: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const [event, setEvent] = useState<PublicEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!eventId) { setError(true); setLoading(false); return; }
        fetch(`${API_BASE_URL}/events/${eventId}/public`, { cache: 'no-store' })
            .then(r => {
                if (!r.ok) throw new Error('Not found');
                return r.json();
            })
            .then(d => setEvent(d.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [eventId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading event…</p>
                </div>
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-7 h-7 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Event Not Found</h1>
                    <p className="text-sm text-gray-500 mb-6">
                        This event link may be invalid, expired, or the event has been cancelled.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        Go to VistaQ
                    </Link>
                </div>
            </div>
        );
    }

    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    const validDate = !isNaN(startDate.getTime());

    const dateStr = validDate
        ? startDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'Date not set';

    const timeStr = validDate
        ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : '';

    const endTimeStr = endDate && !isNaN(endDate.getTime())
        ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : '';

    const timeDisplay = timeStr && endTimeStr
        ? `${timeStr} – ${endTimeStr}`
        : timeStr;

    const isOnline = event.type === 'Online';

    // Calendar URLs
    const startISO = event.start_date;
    const endISO = event.end_date || event.start_date;

    const googleUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + `&text=${encodeURIComponent(event.event_title)}`
        + `&dates=${formatICSDate(startISO)}/${formatICSDate(endISO)}`
        + `&details=${encodeURIComponent(event.description || '')}`
        + `&location=${encodeURIComponent(event.venue || event.meeting_link || '')}`;

    const outlookUrl = 'https://outlook.live.com/calendar/0/deeplink/compose'
        + `?subject=${encodeURIComponent(event.event_title)}`
        + `&startdt=${startISO}&enddt=${endISO}`
        + `&body=${encodeURIComponent(event.description || '')}`
        + `&location=${encodeURIComponent(event.venue || '')}`;

    const downloadICS = () => {
        const ics = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VistaQ//EN',
            'BEGIN:VEVENT',
            `SUMMARY:${event.event_title}`,
            `DTSTART:${formatICSDate(startISO)}`,
            `DTEND:${formatICSDate(endISO)}`,
            `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
            `LOCATION:${event.venue || event.meeting_link || ''}`,
            'END:VEVENT', 'END:VCALENDAR',
        ].join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${event.event_title.replace(/\s+/g, '_')}.ics`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
            {/* Minimal navbar */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <Link to="/login" className="flex items-center gap-2 text-blue-600 font-bold text-lg tracking-tight">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-white" />
                    </div>
                    VistaQ
                </Link>
                <span className="text-xs text-gray-400 font-medium">Public Event</span>
            </header>

            <main className="flex-1 flex items-start justify-center p-4 pt-8 pb-16">
                <div className="w-full max-w-lg">
                    {/* Event Card */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Coloured top bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white">
                            <div className="flex items-start gap-4">
                                <div className="bg-white/20 rounded-xl p-3 text-center min-w-[56px] flex-shrink-0">
                                    <div className="text-xs font-bold uppercase opacity-80">
                                        {validDate ? startDate.toLocaleString('default', { month: 'short' }) : '--'}
                                    </div>
                                    <div className="text-3xl font-black leading-none">
                                        {validDate ? startDate.getDate() : '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 block mb-1">
                                        {isOnline ? 'Online Event' : 'Event'}
                                    </span>
                                    <h1 className="text-2xl font-bold leading-tight">{event.event_title}</h1>
                                    {event.status && event.status !== 'upcoming' && (
                                        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-2 ${event.status === 'completed'
                                            ? 'bg-green-400/30 text-green-100'
                                            : 'bg-red-400/30 text-red-100'
                                        }`}>
                                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-6 space-y-4">
                            {/* Date */}
                            <div className="flex items-start gap-3 text-sm text-gray-700">
                                <CalendarDays className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                <span className="font-medium">{dateStr}</span>
                            </div>

                            {/* Time */}
                            {timeDisplay && (
                                <div className="flex items-start gap-3 text-sm text-gray-700">
                                    <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>{timeDisplay}</span>
                                </div>
                            )}

                            {/* Venue */}
                            {event.venue && (
                                <div className="flex items-start gap-3 text-sm text-gray-700">
                                    <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>{event.venue}</span>
                                </div>
                            )}

                            {/* Organizer */}
                            {event.created_by_name && (
                                <div className="flex items-start gap-3 text-sm text-gray-700">
                                    <UserIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                    <span>Organised by <span className="font-semibold">{event.created_by_name}</span></span>
                                </div>
                            )}

                            {/* Description */}
                            {event.description && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p>
                                </div>
                            )}

                            {/* Join button (online) */}
                            {event.meeting_link && (
                                <a
                                    href={event.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md mt-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Join Online Meeting
                                </a>
                            )}
                        </div>

                        {/* Add to Calendar section */}
                        <div className="px-6 pb-6">
                            <div className="border-t pt-5">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    Save to Your Calendar
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={googleUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 shadow-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="2"/>
                                            <path d="M16 2v4M8 2v4M3 10h18" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        Google Calendar
                                    </a>
                                    <button
                                        onClick={downloadICS}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 shadow-sm"
                                    >
                                        <Download className="w-4 h-4 text-gray-500" />
                                        Apple / Outlook
                                    </button>
                                    <a
                                        href={outlookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 shadow-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0072C6" strokeWidth="2"/>
                                            <path d="M16 2v4M8 2v4M3 10h18" stroke="#0072C6" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                        Outlook Web
                                    </a>
                                    <button
                                        onClick={copyLink}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-gray-700 shadow-sm"
                                    >
                                        {copied
                                            ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copied!</>
                                            : <><LinkIcon className="w-4 h-4 text-gray-500" /> Copy Link</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        Powered by{' '}
                        <Link to="/login" className="text-blue-500 hover:underline font-medium">VistaQ</Link>
                        {' '}· Event management for sales teams
                    </p>
                </div>
            </main>
        </div>
    );
};

export default EventPublicPage;
