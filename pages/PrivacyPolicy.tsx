
import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-blue-900 p-6 flex items-center text-white">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="w-6 h-6 mr-2" /> Privacy Policy
          </h1>
        </div>
        
        <div className="p-8 space-y-6 text-gray-700 leading-relaxed">
          <p className="text-sm text-gray-500">Last Updated: October 26, 2023</p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Introduction</h2>
            <p>
              Welcome to VistaQ ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our sales performance and coaching platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Information We Collect</h2>
            <p>We collect information that identifies, relates to, describes, or could reasonably be linked, directly or indirectly, with you ("Personal Data"). This includes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Identity Data:</strong> Name, Agent ID, Group affiliation.</li>
              <li><strong>Contact Data:</strong> Email address, phone number.</li>
              <li><strong>Performance Data:</strong> Sales figures, prospect information, appointment logs.</li>
              <li><strong>Technical Data:</strong> Login timestamps, IP address, browser type.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. How We Use Your Information</h2>
            <p>We use your Personal Data for the following purposes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To provide and maintain the VistaQ service.</li>
              <li>To generate performance reports and leaderboards.</li>
              <li>To facilitate coaching sessions and feedback from trainers.</li>
              <li>To manage your account and authentication.</li>
              <li>To communicate with you regarding updates, security alerts, and support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your Personal Data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Contact Us</h2>
            <p>
              If you have questions or comments about this policy, you may contact our Data Protection Officer at privacy@vistaq.com.my.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
