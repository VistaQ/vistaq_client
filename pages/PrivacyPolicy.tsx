
import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface Props {
  onBack?: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">{title}</h2>
    {children}
  </section>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-sm leading-relaxed">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const PrivacyPolicy: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-[#0F172A] p-6 flex items-center text-white">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-slate-400 text-sm mt-0.5">Talent Keys — VistaQ Platform</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8 text-gray-700 leading-relaxed">
          <p className="text-sm text-gray-500 italic">Last Updated: 24 February 2026</p>

          <p className="text-sm text-gray-600 leading-relaxed">
            This Privacy Policy ("Policy") explains how <strong>Talent Keys</strong> ("Company", "we", "our", or "us")
            collects, uses, processes, stores, discloses, and protects Personal Data in compliance with the{' '}
            <strong>Personal Data Protection Act 2010</strong> of Malaysia (PDPA) and other applicable laws.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This Policy applies to all users, clients, trainees, trainers, coaches, administrators, partners, and visitors
            (collectively, "Users") who access or use our Software-as-a-Service (SaaS) platform ("Platform"), including
            all related applications, tools, dashboards, APIs, and services.
          </p>

          <Section title="1. Definitions">
            <BulletList
              items={[
                'Personal Data: Any information relating directly or indirectly to an identifiable individual, as defined under the PDPA.',
                'Sensitive Personal Data: Personal Data relating to physical or mental health, religious beliefs, biometric data, or other categories protected under the PDPA.',
                'Processing: Any operation performed on Personal Data, including collection, recording, storage, use, disclosure, or deletion.',
                'Data User: As defined under the PDPA, referring to the Company.',
                'Data Subject: Any individual whose Personal Data is processed.',
                'Client: Companies, Financial institutions, agencies, organisations, or corporate entities using the Platform.',
              ]}
            />
          </Section>

          <Section title="2. Scope and Nature of Data Collected">
            <p className="text-sm text-gray-600">
              We collect and process Personal Data strictly for legitimate business, contractual, training, and compliance purposes.
            </p>
            <h3 className="text-sm font-bold text-gray-800 mt-2">2.1 Personal Data Collected May Include:</h3>
            <BulletList
              items={[
                'Full name, NRIC/Passport number (where applicable)',
                'Contact information (email, phone number, residential and business address)',
                'Employment details (company name, agent code, role, licensing status)',
                'Professional credentials and certifications',
                'Training progress, assessments, examination readiness and completion records',
                'Login credentials, user IDs and authentication data',
                'Payment and billing information (processed via secure third-party gateways)',
                'System usage data, logs, IP address and device information',
              ]}
            />
            <h3 className="text-sm font-bold text-gray-800 mt-3">2.2 Sensitive Personal Data</h3>
            <p className="text-sm text-gray-600">
              We do not intentionally collect Sensitive Personal Data unless explicitly required by law or regulatory bodies
              and only with explicit consent from the Data Subject.
            </p>
          </Section>

          <Section title="3. Purpose of Data Processing">
            <p className="text-sm text-gray-600">
              Personal Data is processed strictly for purposes including but not limited to:
            </p>
            <BulletList
              items={[
                'Delivering professional and/or enrichment training and/or coaching programmes',
                'User onboarding, identity verification and access control',
                'Performance tracking, certification and reporting',
                'Compliance with Client\'s internal audit requirements',
                'Subscription management, invoicing and financial reconciliation',
                'Platform security, fraud prevention and risk management',
                'Customer support, troubleshooting and service communications',
                'Analytics and system improvement (using anonymised or aggregated data where possible)',
                'Legal, regulatory, and contractual compliance',
              ]}
            />
            <p className="text-sm text-gray-600 font-semibold">We do not sell, rent, or trade Personal Data.</p>
          </Section>

          <Section title="4. Consent and Lawful Basis">
            <p className="text-sm text-gray-600">
              By using the Platform, Users acknowledge and consent to the processing of Personal Data in accordance with this Policy.
            </p>
            <h3 className="text-sm font-bold text-gray-800 mt-2">Where required under PDPA:</h3>
            <BulletList
              items={[
                'Consent is obtained explicitly',
                'Users may withdraw consent in writing',
                'Withdrawal may affect access to certain services',
              ]}
            />
            <h3 className="text-sm font-bold text-gray-800 mt-2">Processing is carried out based on:</h3>
            <BulletList
              items={[
                'Consent of the Data Subject',
                'Performance of contractual obligations',
                'Legal and regulatory requirements',
                'Legitimate business interests that do not override user rights',
              ]}
            />
          </Section>

          <Section title="5. Disclosure of Personal Data">
            <p className="text-sm text-gray-600">Personal Data may be disclosed only to:</p>
            <BulletList
              items={[
                'Authorised employees and/or trainers and coaches under strict confidentiality',
                'Clients for training and compliance purposes',
                'Regulatory authorities where legally required',
                'Trusted third-party service providers (cloud hosting, payment gateways, analytics, email services, communication tools like WhatsApp and Viber)',
              ]}
            />
            <p className="text-sm text-gray-600 mt-2">All third parties are contractually bound to:</p>
            <BulletList
              items={[
                'PDPA-compliant data protection obligations',
                'Confidentiality and security standards',
                'Use data strictly for defined purposes',
              ]}
            />
          </Section>

          <Section title="6. Cross-Border Data Transfer">
            <p className="text-sm text-gray-600">Where Personal Data is transferred outside Malaysia:</p>
            <BulletList
              items={[
                'Transfers comply with PDPA Section 129',
                'Data is hosted in jurisdictions with adequate data protection laws',
                'Industry-standard encryption is applied',
              ]}
            />
          </Section>

          <Section title="7. Data Security Measures">
            <p className="text-sm text-gray-600">We implement enterprise-grade security controls, including:</p>
            <BulletList
              items={[
                'Encryption at rest and in transit (AES-256 / TLS 1.2+)',
                'Role-based access control (RBAC)',
                'Secure cloud infrastructure with ISO 27001-aligned controls',
                'Regular penetration testing and vulnerability assessments',
                'Continuous monitoring, logging, and intrusion detection',
                'Secure development lifecycle (SDLC)',
              ]}
            />
            <p className="text-sm text-gray-500 italic mt-2">
              Despite best efforts, no system is completely secure. Users acknowledge inherent risks in digital platforms.
            </p>
          </Section>

          <Section title="8. Data Retention Policy">
            <p className="text-sm text-gray-600">Personal Data is retained only for:</p>
            <BulletList
              items={[
                'The duration of the contractual relationship',
                'Regulatory and audit requirements',
                'Legal dispute resolution',
              ]}
            />
            <p className="text-sm text-gray-600 mt-2">Upon expiry:</p>
            <BulletList
              items={[
                'Data is securely deleted, anonymised, or archived',
                'Backups are purged in accordance with retention schedules',
              ]}
            />
          </Section>

          <Section title="9. Data Subject Rights (PDPA Compliance)">
            <p className="text-sm text-gray-600">Data Subjects have the right to:</p>
            <BulletList
              items={[
                'Access their Personal Data',
                'Request correction or updates',
                'Withdraw consent',
                'Limit processing where applicable',
                'Request deletion (subject to legal obligations)',
              ]}
            />
            <p className="text-sm text-gray-600 mt-2">
              Requests must be submitted in writing and will be responded to within 21 days in accordance with PDPA requirements.
            </p>
          </Section>

          <Section title="10. Cookies and Tracking Technologies">
            <p className="text-sm text-gray-600">The Platform uses cookies and similar technologies for:</p>
            <BulletList
              items={[
                'Authentication and session management',
                'Performance monitoring',
                'Feature optimisation',
              ]}
            />
            <p className="text-sm text-gray-600 mt-2">
              Users may disable cookies, but some features may not function properly.
            </p>
          </Section>

          <Section title="11. Breach Notification">
            <p className="text-sm text-gray-600">In the event of a data breach:</p>
            <BulletList
              items={[
                'Immediate containment and investigation will be initiated',
                'Affected Clients and Users will be notified without undue delay',
                'Regulatory authorities will be informed where required by law',
              ]}
            />
          </Section>

          <Section title="12. PDPA Notice & Disclosure (Malaysia)">
            <p className="text-sm font-semibold text-gray-700">
              Personal Data Protection Act 2010 Notice
            </p>
            <p className="text-sm text-gray-600">
              In accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia, this notice is issued to all
              Data Subjects whose Personal Data is processed by Talent Keys.
            </p>

            <h3 className="text-sm font-bold text-gray-800 mt-3">a) Nature of Personal Data Collected</h3>
            <BulletList
              items={[
                'Full name, identification details (NRIC / Passport where applicable)',
                'Contact information such as email address, telephone number and business address',
                'Employment details, agent codes, licensing status and professional affiliations',
                'Training records, assessments, certifications and completion records',
                'Login credentials, authentication data, system usage logs and audit trails',
                'Billing, invoicing and payment-related information (where applicable)',
              ]}
            />

            <h3 className="text-sm font-bold text-gray-800 mt-3">b) Purpose of Collection and Processing</h3>
            <BulletList
              items={[
                'Administration and delivery of training and coaching programmes',
                'User onboarding, identity verification, and access control',
                'Monitoring training progress, performance evaluation and certification issuance',
                'Compliance with regulatory, audit and reporting obligations',
                'Subscription management, billing and contractual administration',
                'Platform security, fraud prevention and system optimisation',
              ]}
            />

            <h3 className="text-sm font-bold text-gray-800 mt-3">c) Disclosure of Personal Data</h3>
            <p className="text-sm text-gray-600">Personal Data may be disclosed, on a need-to-know basis, to:</p>
            <BulletList
              items={[
                'Authorised employees, trainers and system administrators',
                'Clients, including licensed entities and/or companies',
                'Regulatory authorities, government bodies, or law enforcement agencies where required by law',
                'Third-party service providers engaged for hosting, payment processing, analytics, or communications, all of whom are contractually bound by confidentiality and PDPA-compliant obligations',
              ]}
            />

            <h3 className="text-sm font-bold text-gray-800 mt-3">d) Mandatory or Voluntary Supply of Data</h3>
            <p className="text-sm text-gray-600">
              The supply of certain Personal Data is mandatory to enable access to the Platform and related services.
              Failure to provide such data may result in:
            </p>
            <BulletList
              items={[
                'Inability to create or maintain a user account',
                'Restricted access to training and/or coaching programmes or certification records',
                'Incomplete compliance or reporting outcomes',
              ]}
            />

            <h3 className="text-sm font-bold text-gray-800 mt-3">e) Data Subject Rights</h3>
            <p className="text-sm text-gray-600">In accordance with the PDPA, Data Subjects have the right to:</p>
            <BulletList
              items={[
                'Request access to their Personal Data',
                'Request correction or updating of inaccurate or incomplete data',
                'Withdraw consent for the processing of Personal Data, subject to legal, regulatory, and contractual restrictions',
              ]}
            />
            <p className="text-sm text-gray-600 mt-2">
              All requests shall be made in writing to the Data Protection Officer as stated in this Policy.
            </p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p className="text-sm text-gray-600">
              We reserve the right to update this Policy. Changes will be communicated via the Platform or official channels.
              Continued use constitutes acceptance of the updated Policy.
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 italic">
              This Privacy Policy is governed by the laws of Malaysia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
