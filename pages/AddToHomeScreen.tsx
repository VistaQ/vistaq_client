
import React from 'react';
import { ArrowLeft, Smartphone, Info, CheckCircle, ExternalLink } from 'lucide-react';

interface Props {
    onBack: () => void;
}

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 leading-relaxed">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
        <span>{children}</span>
    </div>
);

const SuccessBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800 leading-relaxed">
        <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
        <span>{children}</span>
    </div>
);

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="flex gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold shrink-0 mt-0.5">
            {number}
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{children}</p>
        </div>
    </div>
);

const AddToHomeScreen: React.FC<Props> = ({ onBack }) => {
    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-200">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Add to Home Screen</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Install VistaQ on your device</p>
                    </div>
                </div>
            </div>

            {/* Intro */}
            <InfoBox>
                Access VistaQ from any browser by visiting <strong>app.vistaq.co</strong>. Once added to your home screen, it opens instantly like a native app — no App Store required.
            </InfoBox>

            {/* iOS Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                <div className="p-6 space-y-5">
                    <h2 className="text-base font-bold text-gray-900">📱 iOS — iPhone &amp; iPad</h2>

                    <InfoBox>
                        You must use <strong>Safari</strong> on iPhone or iPad. Chrome and Firefox do not support the 'Add to Home Screen' option on iOS.
                    </InfoBox>

                    <div className="space-y-4">
                        <Step number={1} title="Open Safari">
                            Tap the Safari icon on your iPhone or iPad to launch the browser.
                        </Step>
                        <Step number={2} title="Go to app.vistaq.co">
                            Tap the address bar at the top and type <strong>app.vistaq.co</strong>, then tap <strong>Go</strong> on your keyboard. Wait for the page to fully load.
                        </Step>
                        <Step number={3} title="Tap the Share button">
                            Tap the <strong>Share icon</strong> at the bottom of the screen. It looks like a square with an arrow pointing upward (⬆).
                        </Step>
                        <Step number={4} title="Select 'Add to Home Screen'">
                            Scroll down in the Share menu and tap <strong>'Add to Home Screen'</strong>. If you don't see it, tap 'Edit Actions' at the bottom and add it first.
                        </Step>
                        <Step number={5} title="Name it 'VistaQ' and tap Add">
                            A preview will appear. Make sure the name says <strong>VistaQ</strong>, then tap <strong>'Add'</strong> in the top-right corner to confirm.
                        </Step>
                    </div>

                    <a
                        href="https://www.youtube.com/watch?v=OaFHtFC_jls"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Visual walkthrough — iOS iPhone
                    </a>

                    <SuccessBox>
                        VistaQ will now appear on your home screen and open fullscreen — without the Safari browser bar — just like a native app.
                    </SuccessBox>
                </div>
            </div>

            {/* Android Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                <div className="p-6 space-y-5">
                    <h2 className="text-base font-bold text-gray-900">🤖 Android — Chrome Browser</h2>

                    <InfoBox>
                        These steps use <strong>Google Chrome</strong>, which is recommended. Samsung Internet and Firefox are also supported with slightly different menu labels.
                    </InfoBox>

                    <div className="space-y-4">
                        <Step number={1} title="Open Chrome">
                            Tap the Google Chrome icon to open the browser on your Android device.
                        </Step>
                        <Step number={2} title="Go to app.vistaq.co">
                            Tap the address bar and type <strong>app.vistaq.co</strong>, then tap <strong>Go</strong>. Wait for the page to fully load.
                        </Step>
                        <Step number={3} title="Tap the 3-dot menu (⋮)">
                            Tap the three vertical dots in the top-right corner of Chrome to open the browser options menu.
                        </Step>
                        <Step number={4} title="Tap 'Add to Home screen'">
                            Look for <strong>'Add to Home screen'</strong> or <strong>'Install App'</strong> in the dropdown menu and tap it. A dialog will appear with the app icon and name.
                        </Step>
                        <Step number={5} title="Name it 'VistaQ' and confirm">
                            Confirm the name as <strong>VistaQ</strong> and tap <strong>'Add'</strong> or <strong>'Install'</strong>. The icon will appear on your home screen automatically.
                        </Step>
                    </div>

                    <a
                        href="https://www.youtube.com/watch?v=ImfF5l_bBzw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Visual walkthrough — Android
                    </a>

                    <SuccessBox>
                        On some Android devices, Chrome may show an automatic <strong>'Install App'</strong> banner at the bottom of the screen when you visit VistaQ — you can tap that directly instead.
                    </SuccessBox>
                </div>
            </div>
        </div>
    );
};

export default AddToHomeScreen;
