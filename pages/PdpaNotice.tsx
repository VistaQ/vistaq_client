
import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const PdpaNotice: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-blue-900 p-6 flex items-center text-white">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="w-6 h-6 mr-2" /> PDPA Notice
          </h1>
        </div>
        
        <div className="p-8 space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">PERSONAL DATA PROTECTION NOTICE</h2>
            <p className="mb-4">
              This Personal Data Protection Notice ("Notice") is issued pursuant to the Personal Data Protection Act 2010 ("PDPA") of Malaysia. It explains how VistaQ collects, uses, and processes your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Collection of Personal Data</h2>
            <p>
              We collect your personal data directly from you when you register for an account, update your profile, or input sales data. This data includes, but is not limited to, your name, NRIC/Passport number (if applicable for Agent verification), email address, contact number, and sales performance metrics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Purpose of Processing</h2>
            <p>Your personal data is processed for the following purposes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Verification of your identity as an authorized Agent.</li>
              <li>Administration of the VistaQ platform services.</li>
              <li>Compliance with internal compliance and audit requirements.</li>
              <li>Performance tracking and commission calculation (simulated).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Disclosure to Third Parties</h2>
            <p>
              Your personal data may be disclosed to related companies, group leaders, trainers, and third-party service providers (such as cloud hosting providers) for the purposes stated above. We ensure that these parties process your data in accordance with the PDPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Your Rights</h2>
            <p>
              Under the PDPA, you have the right to access and correct your personal data held by us. You may also withdraw your consent to the processing of your personal data, subject to contractual restrictions and reasonable notice. To exercise these rights, please contact our support team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Consent</h2>
            <p>
              By clicking the checkbox during registration, you acknowledge that you have read this Notice and consent to the processing of your personal data as described herein.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PdpaNotice;
