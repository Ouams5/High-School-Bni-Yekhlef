import React, { useState } from 'react';
import { Club } from '../types';
import { Scale, FileText, Check, X, ShieldAlert } from 'lucide-react';

interface JoinAgreementModalProps {
  isOpen: boolean;
  club: Club | null;
  userMerit: number;
  onClose: () => void;
  onConfirm: (code?: string) => void;
}

export const JoinAgreementModal: React.FC<JoinAgreementModalProps> = ({
  isOpen,
  club,
  userMerit,
  onClose,
  onConfirm,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  if (!isOpen || !club) return null;

  const requiredMerit = club.requiredMerit ?? 60;
  const hasEnoughMerit = userMerit >= requiredMerit;

  const handleConfirm = async () => {
    if (hasEnoughMerit && agreed) {
      setIsJoining(true);
      await onConfirm(club.requireRegistrationCode ? registrationCode : undefined);
      setIsJoining(false);
      setAgreed(false);
      setRegistrationCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="text-indigo-500" size={22} />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Club Enrollment & Community Rules
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          
          {/* Merit Scoring Criteria validation */}
          {!hasEnoughMerit ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex gap-3 text-rose-700 dark:text-rose-300">
              <ShieldAlert className="flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-sm">Merit Score Too Low</p>
                <p className="text-xs mt-1">
                  This club requires a minimum merit standing of <span className="font-bold">{requiredMerit} / 20</span>. Your current merit score is <span className="font-bold">{userMerit} / 20</span>.
                </p>
                <p className="text-xs mt-1.5 text-rose-500 font-medium">
                  You can play activities or contribute to projects on your Profile to recover your merit score.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/25 border border-indigo-150 dark:border-indigo-900/45 rounded-xl text-indigo-700 dark:text-indigo-300 flex items-center gap-3">
              <span className="p-1 px-2.5 bg-indigo-100 dark:bg-indigo-900 text-xs font-mono font-bold rounded-full">
                Eligible
              </span>
              <p className="text-xs font-medium">
                Your merit standing ({userMerit} / 20) is enough to join this club (requires at least {requiredMerit}).
              </p>
            </div>
          )}

          {/* Primordial Servers Contract Card */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <FileText size={14} className="text-slate-400" /> General Guidelines
            </h4>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <p className="font-medium text-slate-600 dark:text-slate-350">1. Clean Community: No bullying, spamming, offensive language, or visual harassment of any kind.</p>
              <p className="font-medium text-slate-600 dark:text-slate-350">2. Active Participation: Try to be helpful and participate in club projects or announcements honestly.</p>
              <p className="font-medium text-slate-600 dark:text-slate-350">3. Staff Rules: Club leaders and administrators can remove members who disrupt the community. People who are removed will lose points from their Merit Score.</p>
            </div>
          </div>

          {/* Particular Club Rules list */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Scale size={14} className="text-slate-400" /> Club Rules ({club.name})
            </h4>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-xs text-slate-400 italic mb-2">Please follow this club's local rules:</p>
              <ul className="list-disc pl-5 space-y-1 text-xs font-medium text-slate-705 dark:text-slate-350">
                {club.rules && club.rules.length > 0 ? (
                  club.rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))
                ) : (
                  <>
                    <li>Do not spam announcements or project threads.</li>
                    <li>Help with creative project timelines and support other members.</li>
                    <li>Always be polite and constructive in channels and group chats.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Contract Consent Checkbox */}
          {hasEnoughMerit && (
            <label className="flex items-start gap-3 p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/40 dark:border-indigo-900/20 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 text-indigo-600 rounded bg-slate-100 border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 select-none">
                I agree to follow the general guidelines and the club rules of <span className="font-bold">{club.name}</span>. I understand that violating these rules may cause me to lose merit points or get suspended.
              </span>
            </label>
          )}

          {/* Registration Code Input */}
          {club.requireRegistrationCode && hasEnoughMerit && (
            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registration Code Required</label>
              <input 
                  type="text" 
                  value={registrationCode}
                  onChange={e => setRegistrationCode(e.target.value)}
                  placeholder="Enter access code here..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider uppercase"
              />
              <p className="text-[10px] text-slate-400 italic">This club is set to private. Ask the President or Teacher to generate a time-limited registration code for you.</p>
            </div>
          )}

        </div>

        {/* Action Panel */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold rounded-xl text-xs transition-all"
          >
            Dismiss
          </button>
          
          {hasEnoughMerit && (
            <button 
              onClick={handleConfirm}
              disabled={!agreed || (club.requireRegistrationCode && registrationCode.trim() === '') || isJoining}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              {isJoining ? "Joining..." : (
                 <>
                   <Check size={16} /> Submit Membership Pledge
                 </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
